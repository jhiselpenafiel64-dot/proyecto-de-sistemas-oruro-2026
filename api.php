<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/config.php';
$action = $_GET['action'] ?? '';
$nombreTextoValido = static fn (string $valor): bool =>
    preg_match("~^[\\p{L}\\p{M} .’'-]+$~u", $valor) === 1 && preg_match('~\\p{L}~u', $valor) === 1;
$telefonoValido = static function (string $valor): bool {
    $digitos = preg_replace('/\D/', '', $valor);
    return preg_match('/^\+?[0-9\s().-]+$/', $valor) === 1
        && is_string($digitos)
        && strlen($digitos) >= 7
        && strlen($digitos) <= 15;
};
$normalizarProductos = static function (array $productos): array {
    $categorias = ['Tortas', 'Espressos', 'Frappes', 'Bubbas', 'Crepes', 'Pasteleria', 'Paninis', 'Combos', 'Otros'];
    foreach ($productos as &$producto) {
        $producto['id'] = (int) $producto['id'];
        $producto['precio'] = (float) $producto['precio'];
        $producto['stock'] = (int) $producto['stock'];
        if (!in_array($producto['categoria'], $categorias, true)) {
            $nombre = strtolower((string) $producto['nombre']);
            $producto['categoria'] = match (true) {
                str_starts_with($nombre, 'torta ') => 'Tortas',
                str_contains($nombre, 'espresso'),
                in_array($nombre, ['americano', 'café americano', 'capuchino'], true) => 'Espressos',
                str_contains($nombre, 'frapp') => 'Frappes',
                str_contains($nombre, 'bubba') => 'Bubbas',
                str_starts_with($nombre, 'crepe') => 'Crepes',
                str_starts_with($nombre, 'panini') => 'Paninis',
                str_contains($nombre, 'combo') => 'Combos',
                in_array($nombre, ['brownie', 'galleta artesanal', 'cheesecake'], true) => 'Pasteleria',
                default => 'Otros',
            };
        }
    }
    unset($producto);
    return $productos;
};

$archivoComprobanteGuardado = null;

try {
    $pdo = db();
    if ($action === 'productos_web') {
        ensureInventarioSchema($pdo);
    }
    $ventanaCancelacionPedidoWebMinutos = 10;
    $configuracionPorDefecto = [
        'marca' => [
            'nombre' => 'Dulce Vita',
            'lema' => 'Café y pastelería artesanal',
            'logo' => '../logo.png',
            'color_principal' => '#6B2635',
            'color_secundario' => '#C9A45C',
            'telefono' => '',
            'correo' => '',
        ],
        'empresa' => [
            'razon_social' => '',
            'nit' => '',
            'direccion' => '',
            'municipio' => '',
            'telefono' => '',
            'correo' => '',
        ],
        'qr' => '',
        'zonas_delivery' => [],
    ];
    $obtenerConfiguracion = static function () use ($pdo, $configuracionPorDefecto): array {
        $fila = $pdo->query('SELECT configuracion FROM configuracion_empresa WHERE id = 1')->fetch();
        if (!$fila) {
            return $configuracionPorDefecto;
        }
        $configuracion = json_decode((string) $fila['configuracion'], true);
        if (!is_array($configuracion)) {
            jsonResponse(['ok' => false, 'mensaje' => 'La configuración de empresa guardada no es válida.'], 500);
        }
        $resultado = array_replace_recursive($configuracionPorDefecto, $configuracion);
        foreach (['marca', 'empresa'] as $seccion) {
            if (!is_array($resultado[$seccion] ?? null)) {
                $resultado[$seccion] = $configuracionPorDefecto[$seccion];
            }
        }
        if (!is_array($resultado['zonas_delivery'] ?? null)) {
            $resultado['zonas_delivery'] = [];
        }
        if (!is_string($resultado['qr'] ?? null)) {
            $resultado['qr'] = '';
        }
        return $resultado;
    };
    $obtenerStockVendible = static function (int $productoId) use ($pdo): int {
        $stmt = $pdo->prepare("SELECT COALESCE(SUM(cantidad_disponible), 0)
            FROM inventario_lotes
            WHERE producto_id = ? AND cantidad_disponible > 0
                AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)");
        $stmt->execute([$productoId]);
        return (int) $stmt->fetchColumn();
    };
    $actualizarStockProducto = static function (int $productoId) use ($pdo): void {
        $stmt = $pdo->prepare("UPDATE productos
            SET stock = (SELECT COALESCE(SUM(l.cantidad_disponible), 0)
                FROM inventario_lotes l
                WHERE l.producto_id = productos.id AND l.cantidad_disponible > 0
                    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE))
            WHERE id = ?");
        $stmt->execute([$productoId]);
    };
    $registrarSalidaStock = static function (
        int $productoId,
        int $cantidad,
        int $pedidoId,
        ?int $usuarioId
    ) use ($pdo, $actualizarStockProducto): bool {
        $stmt = $pdo->prepare("SELECT id, cantidad_disponible
            FROM inventario_lotes
            WHERE producto_id = ? AND cantidad_disponible > 0
                AND (fecha_vencimiento IS NULL OR fecha_vencimiento >= CURRENT_DATE)
            ORDER BY fecha_vencimiento IS NULL, fecha_vencimiento, fecha_ingreso, id
            FOR UPDATE");
        $stmt->execute([$productoId]);
        $lotes = $stmt->fetchAll();
        $disponible = array_sum(array_map(static fn (array $lote): int => (int) $lote['cantidad_disponible'], $lotes));
        if ($disponible < $cantidad) {
            return false;
        }
        $actualizarLote = $pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?');
        $insertarMovimiento = $pdo->prepare("INSERT INTO inventario_movimientos
            (producto_id, lote_id, pedido_id, usuario_id, tipo, cantidad, fecha_movimiento, motivo, observacion)
            VALUES (?, ?, ?, ?, 'Salida', ?, CURRENT_DATE, 'Pedido', ?)");
        $restante = $cantidad;
        foreach ($lotes as $lote) {
            if ($restante === 0) {
                break;
            }
            $descontado = min($restante, (int) $lote['cantidad_disponible']);
            $actualizarLote->execute([$descontado, (int) $lote['id']]);
            $insertarMovimiento->execute([
                $productoId,
                (int) $lote['id'],
                $pedidoId,
                $usuarioId,
                $descontado,
                'Salida para el pedido #' . $pedidoId,
            ]);
            $restante -= $descontado;
        }
        $actualizarStockProducto($productoId);
        return true;
    };
    $registrarReintegroPedido = static function (int $pedidoId, ?int $usuarioId) use ($pdo, $actualizarStockProducto): bool {
        $stmt = $pdo->prepare('SELECT DISTINCT producto_id FROM pedido_detalles WHERE pedido_id = ? ORDER BY producto_id');
        $stmt->execute([$pedidoId]);
        $productos = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        $bloquearProducto = $pdo->prepare('SELECT id FROM productos WHERE id = ? FOR UPDATE');
        foreach ($productos as $productoId) {
            $bloquearProducto->execute([$productoId]);
        }
        $stmt = $pdo->prepare("SELECT lote_id, producto_id, cantidad
            FROM inventario_movimientos
            WHERE pedido_id = ? AND tipo = 'Salida' AND lote_id IS NOT NULL
            ORDER BY id
            FOR UPDATE");
        $stmt->execute([$pedidoId]);
        $salidas = $stmt->fetchAll();
        if (!$salidas) {
            $stmt = $pdo->prepare('SELECT producto_id, cantidad FROM pedido_detalles WHERE pedido_id = ? ORDER BY producto_id');
            $stmt->execute([$pedidoId]);
            $detalles = $stmt->fetchAll();
            $buscarLoteInicial = $pdo->prepare("SELECT id FROM inventario_lotes
                WHERE producto_id = ? AND origen = 'Inicial'
                ORDER BY id LIMIT 1 FOR UPDATE");
            $salidas = [];
            foreach ($detalles as $detalle) {
                $buscarLoteInicial->execute([(int) $detalle['producto_id']]);
                $loteId = $buscarLoteInicial->fetchColumn();
                if ($loteId === false) {
                    return false;
                }
                $salidas[] = [
                    'lote_id' => (int) $loteId,
                    'producto_id' => (int) $detalle['producto_id'],
                    'cantidad' => (int) $detalle['cantidad'],
                ];
            }
        }
        $restaurarLote = $pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible = cantidad_disponible + ? WHERE id = ?');
        $insertarMovimiento = $pdo->prepare("INSERT INTO inventario_movimientos
            (producto_id, lote_id, pedido_id, usuario_id, tipo, cantidad, fecha_movimiento, motivo, observacion)
            VALUES (?, ?, ?, ?, 'Reintegro', ?, CURRENT_DATE, 'Pedido cancelado', ?)");
        $productosActualizados = [];
        foreach ($salidas as $salida) {
            $productoId = (int) $salida['producto_id'];
            $loteId = (int) $salida['lote_id'];
            $cantidad = (int) $salida['cantidad'];
            $restaurarLote->execute([$cantidad, $loteId]);
            $insertarMovimiento->execute([
                $productoId,
                $loteId,
                $pedidoId,
                $usuarioId,
                $cantidad,
                'Reintegro de stock del pedido cancelado #' . $pedidoId,
            ]);
            $productosActualizados[$productoId] = true;
        }
        foreach (array_keys($productosActualizados) as $productoId) {
            $actualizarStockProducto((int) $productoId);
        }
        return true;
    };
    $fechaValida = static function (string $valor): bool {
        $fecha = DateTimeImmutable::createFromFormat('!Y-m-d', $valor);
        return $fecha !== false && $fecha->format('Y-m-d') === $valor;
    };
    $guardarImagenConfiguracion = static function (string $campo): ?string {
        $archivo = $_FILES[$campo] ?? null;
        if (!is_array($archivo) || $archivo['error'] === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if ($archivo['error'] !== UPLOAD_ERR_OK || $archivo['size'] > 5 * 1024 * 1024 || !is_uploaded_file($archivo['tmp_name'])) {
            jsonResponse(['ok' => false, 'mensaje' => 'La imagen debe pesar como máximo 5 MB.'], 422);
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
        $extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        if (!isset($extensiones[$mime]) || @getimagesize($archivo['tmp_name']) === false) {
            jsonResponse(['ok' => false, 'mensaje' => 'La imagen debe ser JPG, PNG o WebP válida.'], 422);
        }
        $directorio = __DIR__ . '/la polar/uploads/configuracion';
        if (!is_dir($directorio) && !mkdir($directorio, 0755, true) && !is_dir($directorio)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el almacenamiento de configuración.'], 500);
        }
        $nombre = bin2hex(random_bytes(16)) . '.' . $extensiones[$mime];
        if (!move_uploaded_file($archivo['tmp_name'], $directorio . '/' . $nombre)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo guardar la imagen de configuración.'], 500);
        }
        return 'uploads/configuracion/' . $nombre;
    };

    if ($action === 'configuracion_publica') {
        $configuracion = $obtenerConfiguracion();
        $zonasActivas = array_values(array_filter(
            $configuracion['zonas_delivery'],
            static fn ($zona): bool => is_array($zona) && !empty($zona['activa'])
        ));
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'configuracion' => [
            'marca' => $configuracion['marca'],
            'qr' => $configuracion['qr'],
            'zonas_delivery' => $zonasActivas,
        ]]);
    }

    if ($action === 'login_personal') {
        $data = requestBody();
        $stmt = $pdo->prepare('SELECT id, nombre, usuario, password_hash, rol FROM usuarios WHERE usuario = ? AND activo = 1 LIMIT 1');
        $stmt->execute([trim((string) ($data['usuario'] ?? ''))]);
        $record = $stmt->fetch();
        if (!$record || !password_verify((string) ($data['password'] ?? ''), $record['password_hash'])) {
            jsonResponse(['ok' => false, 'mensaje' => 'Usuario o contraseña incorrectos.'], 401);
        }
        $pdo->prepare('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?')->execute([$record['id']]);
        unset($record['password_hash']);
        if (empty($_SESSION['usuario']) && empty($_SESSION['cliente'])) {
            session_regenerate_id(true);
        }
        $_SESSION['usuario'] = $record;
        jsonResponse(['ok' => true, 'usuario' => $record]);
    }

    if (in_array($action, ['logout', 'logout_admin'], true)) {
        unset($_SESSION['usuario']);
        jsonResponse(['ok' => true]);
    }

    if ($action === 'modo_cliente_catalogo') {
        $usuario = $_SESSION['usuario'] ?? null;
        if (!is_array($usuario) || ($usuario['rol'] ?? '') !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión como administrador para cambiar el modo.'], 401);
        }
        jsonResponse(['ok' => true]);
    }

    if ($action === 'sesion_catalogo_admin') {
        $usuario = $_SESSION['usuario'] ?? null;
        if (is_array($usuario) && ($usuario['rol'] ?? '') === 'Administrador') {
            jsonResponse(['ok' => true, 'autenticado' => true, 'usuario' => $usuario, 'sesion_panel' => true, 'modo_cliente' => false]);
        }
        jsonResponse(['ok' => true, 'autenticado' => false, 'usuario' => null, 'sesion_panel' => false, 'modo_cliente' => false]);
    }

    if ($action === 'sesion') {
        jsonResponse(['ok' => true, 'autenticado' => !empty($_SESSION['usuario']), 'usuario' => $_SESSION['usuario'] ?? null]);
    }

    if ($action === 'cliente_sesion') {
        jsonResponse(['ok' => true, 'cliente' => $_SESSION['cliente'] ?? null]);
    }

    if ($action === 'google_config') {
        jsonResponse(['ok' => true, 'client_id' => GOOGLE_CLIENT_ID]);
    }

    if ($action === 'inicio_contenido') {
        $stmt = $pdo->query('SELECT contenido FROM contenido_inicio WHERE id = 1');
        $fila = $stmt->fetch();
        $contenido = $fila ? json_decode($fila['contenido'], true) : null;
        if ($fila && !is_array($contenido)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El contenido de la página de inicio no es válido.'], 500);
        }
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'contenido' => $contenido]);
    }

    if ($action === 'registro_google_cliente') {
        if (GOOGLE_CLIENT_ID === '') {
            jsonResponse(['ok' => false, 'mensaje' => 'El registro con Google todavía no está configurado.'], 503);
        }
        $data = requestBody();
        $credential = trim((string) ($data['credential'] ?? ''));
        if ($credential === '') {
            jsonResponse(['ok' => false, 'mensaje' => 'Google no devolvió una credencial válida.'], 422);
        }
        $context = stream_context_create(['http' => ['timeout' => 8, 'ignore_errors' => true]]);
        $response = @file_get_contents('https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($credential), false, $context);
        $claims = is_string($response) ? json_decode($response, true) : null;
        $issuerValido = is_array($claims) && in_array($claims['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true);
        $tokenValido = is_array($claims)
            && ($claims['aud'] ?? '') === GOOGLE_CLIENT_ID
            && $issuerValido
            && in_array($claims['email_verified'] ?? null, [true, 'true'], true)
            && (int) ($claims['exp'] ?? 0) > time()
            && !empty($claims['sub'])
            && filter_var($claims['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$tokenValido) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo verificar tu cuenta de Google. Inténtalo nuevamente.'], 401);
        }

        $correo = strtolower((string) $claims['email']);
        $stmt = $pdo->prepare('SELECT id, nombre, correo, telefono, password_hash FROM clientes WHERE correo = ? LIMIT 1');
        $stmt->execute([$correo]);
        $cliente = $stmt->fetch();
        $cuentaCreada = false;
        if (!$cliente) {
            $nombre = trim((string) ($claims['name'] ?? ''));
            if ($nombre === '') {
                $nombre = strstr($correo, '@', true) ?: $correo;
            }
            $nombre = mb_substr($nombre, 0, 120, 'UTF-8');
            $stmt = $pdo->prepare("INSERT INTO clientes (nombre, telefono, correo, password_hash, origen_registro) VALUES (?, NULL, ?, NULL, 'pagina_cliente')");
            try {
                $stmt->execute([$nombre, $correo]);
                $cliente = ['id' => (int) $pdo->lastInsertId(), 'nombre' => $nombre, 'correo' => $correo, 'telefono' => null];
                $cuentaCreada = true;
            } catch (PDOException $exception) {
                if ($exception->getCode() !== '23000') {
                    throw $exception;
                }
                $stmt = $pdo->prepare('SELECT id, nombre, correo, telefono, password_hash FROM clientes WHERE correo = ? LIMIT 1');
                $stmt->execute([$correo]);
                $cliente = $stmt->fetch();
            }
        }
        if (!$cliente) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo crear la cuenta. Inténtalo nuevamente.'], 500);
        }
        unset($cliente['password_hash']);
        $cliente['id'] = (int) $cliente['id'];
        if (empty($_SESSION['usuario']) && empty($_SESSION['cliente'])) {
            session_regenerate_id(true);
        }
        $_SESSION['cliente'] = $cliente;
        jsonResponse(['ok' => true, 'cliente' => $cliente, 'creada' => $cuentaCreada], $cuentaCreada ? 201 : 200);
    }

    if ($action === 'registro_cliente') {
        $data = requestBody();
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $correo = strtolower(trim((string) ($data['correo'] ?? '')));
        $telefono = trim((string) ($data['telefono'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        if ($nombre === '' || mb_strlen($nombre, 'UTF-8') > 120 || !$nombreTextoValido($nombre)
            || !filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 254
            || !$telefonoValido($telefono) || strlen($telefono) > 30 || strlen($password) < 6) {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa un nombre solo con letras, un correo válido, un teléfono de 7 a 15 dígitos y una contraseña de al menos 6 caracteres.'], 422);
        }
        $stmt = $pdo->prepare("INSERT INTO clientes (nombre, telefono, correo, password_hash, origen_registro) VALUES (?, ?, ?, ?, 'pagina_cliente')");
        try {
            $stmt->execute([$nombre, $telefono, $correo, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                jsonResponse(['ok' => false, 'mensaje' => 'Ya existe una cuenta con ese correo.'], 409);
            }
            throw $exception;
        }
        if (empty($_SESSION['usuario']) && empty($_SESSION['cliente'])) {
            session_regenerate_id(true);
        }
        $_SESSION['cliente'] = ['id' => (int) $pdo->lastInsertId(), 'nombre' => $nombre, 'correo' => $correo, 'telefono' => $telefono];
        jsonResponse(['ok' => true, 'cliente' => $_SESSION['cliente']], 201);
    }

    if ($action === 'login_cliente') {
        $data = requestBody();
        $stmt = $pdo->prepare('SELECT id, nombre, correo, telefono, password_hash FROM clientes WHERE correo = ? LIMIT 1');
        $stmt->execute([strtolower(trim((string) ($data['correo'] ?? '')))]);
        $cliente = $stmt->fetch();
        if (!$cliente || !$cliente['password_hash'] || !password_verify((string) ($data['password'] ?? ''), $cliente['password_hash'])) {
            jsonResponse(['ok' => false, 'mensaje' => 'Correo o contraseña incorrectos.'], 401);
        }
        unset($cliente['password_hash']);
        $cliente['id'] = (int) $cliente['id'];
        if (empty($_SESSION['usuario']) && empty($_SESSION['cliente'])) {
            session_regenerate_id(true);
        }
        $_SESSION['cliente'] = $cliente;
        jsonResponse(['ok' => true, 'cliente' => $cliente]);
    }

    if ($action === 'logout_cliente') {
        unset($_SESSION['cliente']);
        jsonResponse(['ok' => true]);
    }

    if ($action === 'notificaciones_cliente') {
        $cliente = $_SESSION['cliente'] ?? null;
        if (!is_array($cliente)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión para consultar tus notificaciones.'], 401);
        }
        $stmt = $pdo->prepare("SELECT n.id, n.pedido_id, n.creada_en, n.leida_en, p.total
            FROM notificaciones_cliente n
            INNER JOIN pedidos p ON p.id = n.pedido_id
            WHERE n.cliente_id = ? AND p.usuario_id IS NULL
            ORDER BY n.creada_en DESC LIMIT 50");
        $stmt->execute([(int) $cliente['id']]);
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'notificaciones' => $stmt->fetchAll()]);
    }

    if ($action === 'marcar_notificacion_cliente_leida') {
        $cliente = $_SESSION['cliente'] ?? null;
        if (!is_array($cliente)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión para actualizar tus notificaciones.'], 401);
        }
        $data = requestBody();
        $notificacionId = filter_var($data['notificacion_id'] ?? null, FILTER_VALIDATE_INT);
        if ($notificacionId === false || $notificacionId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Notificación inválida.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE notificaciones_cliente SET leida_en = COALESCE(leida_en, CURRENT_TIMESTAMP) WHERE id = ? AND cliente_id = ?');
        $stmt->execute([$notificacionId, (int) $cliente['id']]);
        if ($stmt->rowCount() !== 1) {
            $stmt = $pdo->prepare('SELECT 1 FROM notificaciones_cliente WHERE id = ? AND cliente_id = ?');
            $stmt->execute([$notificacionId, (int) $cliente['id']]);
            if (!$stmt->fetchColumn()) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se encontró esa notificación en tu cuenta.'], 404);
            }
        }
        jsonResponse(['ok' => true]);
    }

    if ($action === 'pedidos_cliente') {
        $cliente = $_SESSION['cliente'] ?? null;
        if (!$cliente) {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión para consultar tus pedidos.'], 401);
        }
        $stmt = $pdo->prepare("SELECT p.id, p.estado, p.total, p.tipo_entrega, p.direccion_entrega,
            p.zona_entrega, p.costo_delivery, p.estado_entrega, p.creado_en AS fecha,
            f.estado_emision AS estado_factura, f.cuf AS factura_cuf,
            pa.estado AS estado_pago, pa.metodo AS metodo_pago,
            CASE WHEN p.estado = 'Pendiente' AND pa.estado = 'Pendiente'
                AND p.tipo_entrega = 'Retiro' AND pa.metodo = 'Efectivo'
                THEN GREATEST(0, TIMESTAMPDIFF(SECOND, CURRENT_TIMESTAMP, DATE_ADD(p.creado_en, INTERVAL {$ventanaCancelacionPedidoWebMinutos} MINUTE)))
                ELSE 0 END AS segundos_cancelacion,
            CASE WHEN p.estado = 'Pendiente' AND pa.estado = 'Pendiente'
                AND p.tipo_entrega = 'Retiro' AND pa.metodo = 'Efectivo'
                THEN DATE_ADD(p.creado_en, INTERVAL {$ventanaCancelacionPedidoWebMinutos} MINUTE)
                ELSE NULL END AS fecha_limite_cancelacion,
            (pa.comprobante_qr IS NOT NULL) AS tiene_comprobante_qr,
            EXISTS(SELECT 1 FROM notificaciones_cliente n WHERE n.pedido_id = p.id AND n.cliente_id = p.cliente_id) AS comprobante_enviado
            FROM pedidos p
            LEFT JOIN facturas f ON f.pedido_id = p.id
            LEFT JOIN pagos pa ON pa.pedido_id = p.id
            WHERE p.cliente_id = ? AND p.usuario_id IS NULL
            ORDER BY p.id DESC");
        $stmt->execute([(int) $cliente['id']]);
        $pedidos = $stmt->fetchAll();
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'pedidos' => $pedidos]);
    }

    if ($action === 'cancelar_pedido_cliente') {
        $cliente = $_SESSION['cliente'] ?? null;
        if (!is_array($cliente)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión para cancelar un pedido.'], 401);
        }
        ensureInventarioSchema($pdo);
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT p.estado, p.tipo_entrega, pa.estado AS estado_pago, pa.metodo AS metodo_pago,
            (p.creado_en >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL {$ventanaCancelacionPedidoWebMinutos} MINUTE)) AS dentro_plazo
            FROM pedidos p
            LEFT JOIN pagos pa ON pa.pedido_id = p.id
            WHERE p.id = ? AND p.cliente_id = ? AND p.usuario_id IS NULL
            FOR UPDATE");
        $stmt->execute([$pedidoId, (int) $cliente['id']]);
        $pedido = $stmt->fetch();
        if (!$pedido) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró ese pedido en tu cuenta.'], 404);
        }
        if ($pedido['estado'] !== 'Pendiente' || $pedido['estado_pago'] !== 'Pendiente'
            || $pedido['metodo_pago'] !== 'Efectivo' || $pedido['tipo_entrega'] !== 'Retiro') {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'Solo puedes cancelar pedidos pendientes con pago en efectivo y retiro en tienda.'], 409);
        }
        if (!(bool) $pedido['dentro_plazo']) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'El tiempo para cancelar este pedido ya terminó.'], 409);
        }
        $stmt = $pdo->prepare("UPDATE pedidos SET estado = 'Cancelado' WHERE id = ? AND estado = 'Pendiente'");
        $stmt->execute([$pedidoId]);
        if ($stmt->rowCount() !== 1) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'El pedido cambió de estado. Actualiza la página e inténtalo nuevamente.'], 409);
        }
        if (!$registrarReintegroPedido($pedidoId, null)) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo identificar el lote original para devolver el stock. Contacta al administrador.'], 409);
        }
        $pdo->commit();
        jsonResponse(['ok' => true, 'mensaje' => 'Pedido cancelado correctamente.']);
    }

    if ($action === 'productos_web') {
        $productos = $pdo->query("SELECT p.id, CASE WHEN p.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE p.nombre END AS nombre,
            p.descripcion, p.categoria, p.precio,
            (SELECT COALESCE(SUM(l.cantidad_disponible), 0) FROM inventario_lotes l
                WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
                    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)) AS stock,
            p.imagen
            FROM productos p WHERE p.activo = 1 ORDER BY p.categoria, p.nombre")->fetchAll();
        jsonResponse(['ok' => true, 'productos' => $normalizarProductos($productos)]);
    }

    if ($action === 'crear_pedido_web') {
        $cliente = $_SESSION['cliente'] ?? null;
        if (!$cliente) {
            jsonResponse(['ok' => false, 'mensaje' => 'Inicia sesión para confirmar tu pedido.'], 401);
        }
        ensureInventarioSchema($pdo);
        $data = isset($_POST['pedido']) ? json_decode((string) $_POST['pedido'], true) : requestBody();
        if (!is_array($data)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Los datos del pedido no son válidos.'], 422);
        }
        $items = is_array($data['productos'] ?? null) ? $data['productos'] : [];
        $factura = is_array($data['factura'] ?? null) ? $data['factura'] : [];
        $nombreFiscal = trim((string) ($factura['nombre'] ?? ''));
        $nitCi = trim((string) ($factura['nit_ci'] ?? ''));
        $direccionFiscal = trim((string) ($factura['direccion'] ?? ''));
        $metodosPago = ['Efectivo', 'QR'];
        $metodoPago = (string) ($data['metodo_pago'] ?? '');
        $tipoEntrega = (string) ($data['tipo_entrega'] ?? 'Retiro');
        $direccionEntrega = trim((string) ($data['direccion_entrega'] ?? ''));
        $zonaEntrega = trim((string) ($data['zona_entrega'] ?? ''));
        if (!$items || $nombreFiscal === '' || mb_strlen($nombreFiscal, 'UTF-8') > 120
            || !$nombreTextoValido($nombreFiscal) || $nitCi === '' || strlen($nitCi) > 30
            || preg_match('/^[0-9-]+$/', $nitCi) !== 1 || !preg_match('/[0-9]/', $nitCi)
            || mb_strlen($direccionFiscal, 'UTF-8') > 255
            || !in_array($metodoPago, $metodosPago, true)
            || !in_array($tipoEntrega, ['Retiro', 'Delivery'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Verifica los datos de facturación: nombre solo con letras y NIT/CI numérico.'], 422);
        }
        $configuracionPago = $obtenerConfiguracion();
        if ($metodoPago === 'QR' && $configuracionPago['qr'] === '') {
            jsonResponse(['ok' => false, 'mensaje' => 'La tienda todavía no ha configurado un código QR de pago. Elige efectivo o inténtalo más tarde.'], 409);
        }
        $archivoComprobante = $_FILES['comprobante_qr'] ?? null;
        $rutaComprobanteQr = null;
        if ($metodoPago === 'QR') {
            $extensionesComprobante = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
                'application/pdf' => 'pdf',
            ];
            if (!is_array($archivoComprobante) || $archivoComprobante['error'] !== UPLOAD_ERR_OK) {
                jsonResponse(['ok' => false, 'mensaje' => 'Adjunta el comprobante del pago QR para confirmar el pedido.'], 422);
            }
            if ($archivoComprobante['size'] > 5 * 1024 * 1024 || !is_uploaded_file($archivoComprobante['tmp_name'])) {
                jsonResponse(['ok' => false, 'mensaje' => 'El comprobante QR debe pesar como máximo 5 MB.'], 422);
            }
            $mimeComprobante = (new finfo(FILEINFO_MIME_TYPE))->file($archivoComprobante['tmp_name']);
            if (!isset($extensionesComprobante[$mimeComprobante])
                || (str_starts_with($mimeComprobante, 'image/') && @getimagesize($archivoComprobante['tmp_name']) === false)) {
                jsonResponse(['ok' => false, 'mensaje' => 'Adjunta una imagen JPG, PNG o WebP, o un archivo PDF válido.'], 422);
            }
            $rutaComprobanteQr = 'uploads/comprobantes_qr/' . bin2hex(random_bytes(16)) . '.' . $extensionesComprobante[$mimeComprobante];
        } elseif (is_array($archivoComprobante) && $archivoComprobante['error'] !== UPLOAD_ERR_NO_FILE) {
            jsonResponse(['ok' => false, 'mensaje' => 'El comprobante adjunto solo se admite para pagos QR.'], 422);
        }
        $costoDelivery = 0.0;
        if ($tipoEntrega === 'Delivery') {
            if ($direccionEntrega === '' || mb_strlen($direccionEntrega, 'UTF-8') > 255 || $zonaEntrega === '') {
                jsonResponse(['ok' => false, 'mensaje' => 'Indica la dirección y la zona para la entrega.'], 422);
            }
            $configuracion = $obtenerConfiguracion();
            $zonaConfigurada = null;
            foreach ($configuracion['zonas_delivery'] as $zona) {
                if (is_array($zona) && ($zona['nombre'] ?? '') === $zonaEntrega && !empty($zona['activa'])) {
                    $zonaConfigurada = $zona;
                    break;
                }
            }
            if (!$zonaConfigurada) {
                jsonResponse(['ok' => false, 'mensaje' => 'La zona de delivery seleccionada ya no está disponible. Actualiza la página.'], 422);
            }
            $costoDelivery = (float) $zonaConfigurada['costo'];
        }

        $pdo->beginTransaction();
        $cantidades = [];
        foreach ($items as $item) {
            $id = (int) ($item['id'] ?? 0);
            $cantidad = (int) ($item['cantidad'] ?? 0);
            if ($id < 1 || $cantidad < 1) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'El carrito contiene un producto o una cantidad inválidos.'], 422);
            }
            $cantidades[$id] = ($cantidades[$id] ?? 0) + $cantidad;
        }

        $productosPedido = [];
        $total = 0.0;
        $productoStmt = $pdo->prepare('SELECT id, nombre, precio FROM productos WHERE id = ? AND activo = 1 FOR UPDATE');
        foreach ($cantidades as $id => $cantidad) {
            $productoStmt->execute([$id]);
            $producto = $productoStmt->fetch();
            if (!$producto || $cantidad > $obtenerStockVendible((int) $id)) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'Un producto ya no está disponible en la cantidad solicitada. Actualiza tu carrito.'], 422);
            }
            $producto['precio'] = (float) $producto['precio'];
            $total += $cantidad * $producto['precio'];
            $productosPedido[] = [$producto, $cantidad];
        }

        $total += $costoDelivery;
        $stmt = $pdo->prepare('INSERT INTO pedidos (cliente_id, usuario_id, total, tipo_entrega, direccion_entrega, zona_entrega, costo_delivery) VALUES (?, NULL, ?, ?, ?, ?, ?)');
        $stmt->execute([
            (int) $cliente['id'],
            $total,
            $tipoEntrega,
            $tipoEntrega === 'Delivery' ? $direccionEntrega : null,
            $tipoEntrega === 'Delivery' ? $zonaEntrega : null,
            $costoDelivery,
        ]);
        $pedidoId = (int) $pdo->lastInsertId();
        $numeroFacturaPendiente = 'PEND-' . str_pad((string) $pedidoId, 8, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare("INSERT INTO facturas (pedido_id, numero, nombre_fiscal, nit_ci, direccion, total, estado_emision) VALUES (?, ?, ?, ?, ?, ?, 'Pendiente SIAT')");
        $stmt->execute([$pedidoId, $numeroFacturaPendiente, $nombreFiscal, $nitCi, $direccionFiscal !== '' ? $direccionFiscal : null, $total]);
        $facturaId = (int) $pdo->lastInsertId();
        if ($rutaComprobanteQr !== null) {
            $directorioComprobantes = __DIR__ . '/la polar/uploads/comprobantes_qr';
            if (!is_dir($directorioComprobantes) && !mkdir($directorioComprobantes, 0755, true) && !is_dir($directorioComprobantes)) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el almacenamiento de comprobantes QR.'], 500);
            }
            $archivoComprobanteGuardado = $directorioComprobantes . '/' . basename($rutaComprobanteQr);
            if (!move_uploaded_file($archivoComprobante['tmp_name'], $archivoComprobanteGuardado)) {
                $archivoComprobanteGuardado = null;
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo guardar el comprobante QR.'], 500);
            }
        }
        $stmt = $pdo->prepare("INSERT INTO pagos (pedido_id, factura_id, metodo, monto, estado, comprobante_qr) VALUES (?, ?, ?, ?, 'Pendiente', ?)");
        $stmt->execute([$pedidoId, $facturaId, $metodoPago, $total, $rutaComprobanteQr]);
        foreach ($productosPedido as [$producto, $cantidad]) {
            $pdo->prepare('INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)')->execute([$pedidoId, $producto['id'], $cantidad, $producto['precio']]);
            if (!$registrarSalidaStock((int) $producto['id'], (int) $cantidad, $pedidoId, null)) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'El stock cambió mientras se confirmaba el pedido. Actualiza tu carrito e inténtalo nuevamente.'], 409);
            }
        }
        $pdo->commit();
        jsonResponse([
            'ok' => true,
            'id' => $pedidoId,
            'costo_delivery' => $costoDelivery,
            'total' => $total,
            'metodo_pago' => $metodoPago,
            'tipo_entrega' => $tipoEntrega,
        ], 201);
    }

    $currentUser = requireLogin();
    if (in_array($action, [
        'inventario_estado', 'registrar_entrada_stock', 'dar_baja_stock', 'actualizar_fechas_lote', 'reporte_inventario',
        'productos', 'crear_producto', 'editar_producto', 'crear_pedido', 'cambiar_estado',
        'reportes_admin',
    ], true)) {
        ensureInventarioSchema($pdo);
    }
    if ($currentUser['rol'] === 'Repartidor' && !in_array($action, ['repartidor_pedidos', 'ver_comprobante_qr', 'confirmar_pago_delivery', 'cobrar_efectivo_delivery', 'actualizar_entrega_delivery'], true)) {
        jsonResponse(['ok' => false, 'mensaje' => 'El usuario de delivery solo puede consultar y actualizar sus pedidos de entrega.'], 403);
    }

    if (in_array($action, ['arqueo_estado', 'abrir_arqueo', 'registrar_egreso_arqueo', 'cerrar_arqueo', 'reporte_arqueos'], true)) {
        ensureArqueoSchema($pdo);
    }

    if ($action === 'arqueo_estado') {
        $arqueo = $pdo->query("SELECT a.id, a.efectivo_inicial, a.apertura, u.nombre AS usuario_apertura,
            COALESCE((SELECT SUM(p.total) FROM pagos pa
                INNER JOIN pedidos p ON p.id = pa.pedido_id
                WHERE pa.metodo = 'Efectivo' AND pa.estado = 'Pagado'
                AND p.tipo_entrega = 'Retiro'
                AND pa.pagado_en >= a.apertura AND pa.pagado_en <= NOW()), 0) AS efectivo_ventas
            , COALESCE((SELECT SUM(e.monto) FROM arqueo_egresos e
                WHERE e.arqueo_caja_id = a.id), 0) AS efectivo_egresos
            FROM arqueos_caja a
            INNER JOIN usuarios u ON u.id = a.usuario_apertura_id
            WHERE a.cierre IS NULL
            LIMIT 1")->fetch();
        if ($arqueo) {
            $arqueo['efectivo_esperado'] = (float) $arqueo['efectivo_inicial']
                + (float) $arqueo['efectivo_ventas'] - (float) $arqueo['efectivo_egresos'];
        }
        jsonResponse(['ok' => true, 'arqueo' => $arqueo ?: null]);
    }

    if ($action === 'abrir_arqueo') {
        $data = requestBody();
        $monto = $data['efectivo_inicial'] ?? null;
        if ((!is_string($monto) && !is_int($monto) && !is_float($monto))
            || !preg_match('/^\d{1,8}(?:\.\d{1,2})?$/', (string) $monto)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa un monto inicial válido, con máximo dos decimales.'], 422);
        }
        $pdo->beginTransaction();
        $pdo->query('SELECT id FROM usuarios ORDER BY id LIMIT 1 FOR UPDATE')->fetchColumn();
        $arqueoAbierto = $pdo->query('SELECT id FROM arqueos_caja WHERE cierre IS NULL LIMIT 1 FOR UPDATE')->fetchColumn();
        if ($arqueoAbierto !== false) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'Ya existe una caja abierta. Debe cerrarse antes de iniciar otro arqueo.'], 409);
        }
        $stmt = $pdo->prepare('INSERT INTO arqueos_caja (usuario_apertura_id, efectivo_inicial) VALUES (?, ?)');
        $stmt->execute([(int) $currentUser['id'], number_format((float) $monto, 2, '.', '')]);
        $arqueoId = (int) $pdo->lastInsertId();
        $pdo->commit();
        jsonResponse(['ok' => true, 'id' => $arqueoId], 201);
    }

    if ($action === 'registrar_egreso_arqueo') {
        $data = requestBody();
        $categoria = trim((string) ($data['categoria'] ?? ''));
        $concepto = trim((string) ($data['concepto'] ?? ''));
        $monto = $data['monto'] ?? null;
        $categorias = ['Compra de insumos', 'Servicios', 'Transporte', 'Mantenimiento', 'Otros'];
        if (!in_array($categoria, $categorias, true)
            || $concepto === '' || mb_strlen($concepto, 'UTF-8') > 160
            || preg_match('/[\x00-\x1F<>]/u', $concepto) !== 0
            || (!is_string($monto) && !is_int($monto) && !is_float($monto))
            || !preg_match('/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/', (string) $monto)
            || (float) $monto <= 0) {
            jsonResponse(['ok' => false, 'mensaje' => 'Revisa la categoría, el concepto y el monto del egreso.'], 422);
        }
        $pdo->beginTransaction();
        $arqueoStmt = $pdo->query('SELECT id FROM arqueos_caja WHERE cierre IS NULL LIMIT 1 FOR UPDATE');
        $arqueoId = $arqueoStmt->fetchColumn();
        if ($arqueoId === false) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'Abre la caja antes de registrar un egreso.'], 409);
        }
        $stmt = $pdo->prepare('INSERT INTO arqueo_egresos (arqueo_caja_id, usuario_id, categoria, concepto, monto) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([
            (int) $arqueoId,
            (int) $currentUser['id'],
            $categoria,
            $concepto,
            number_format((float) $monto, 2, '.', ''),
        ]);
        $pdo->commit();
        jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()], 201);
    }

    if ($action === 'cerrar_arqueo') {
        $data = requestBody();
        $monto = $data['efectivo_contado'] ?? null;
        if ((!is_string($monto) && !is_int($monto) && !is_float($monto))
            || !preg_match('/^\d{1,8}(?:\.\d{1,2})?$/', (string) $monto)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa el efectivo contado con máximo dos decimales.'], 422);
        }
        $pdo->beginTransaction();
        $arqueoStmt = $pdo->query('SELECT id, efectivo_inicial, apertura FROM arqueos_caja WHERE cierre IS NULL LIMIT 1 FOR UPDATE');
        $arqueo = $arqueoStmt->fetch();
        if (!$arqueo) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No hay una caja abierta para cerrar.'], 409);
        }
        $ventasStmt = $pdo->prepare("SELECT COALESCE(SUM(p.total), 0) FROM pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            WHERE pa.metodo = 'Efectivo' AND pa.estado = 'Pagado'
            AND p.tipo_entrega = 'Retiro'
            AND pa.pagado_en >= ? AND pa.pagado_en <= NOW()");
        $ventasStmt->execute([$arqueo['apertura']]);
        $efectivoVentas = (float) $ventasStmt->fetchColumn();
        $egresosStmt = $pdo->prepare('SELECT COALESCE(SUM(monto), 0) FROM arqueo_egresos WHERE arqueo_caja_id = ?');
        $egresosStmt->execute([(int) $arqueo['id']]);
        $efectivoEgresos = (float) $egresosStmt->fetchColumn();
        $contado = (float) $monto;
        $esperado = (float) $arqueo['efectivo_inicial'] + $efectivoVentas - $efectivoEgresos;
        $stmt = $pdo->prepare('UPDATE arqueos_caja
            SET usuario_cierre_id = ?, efectivo_ventas = ?, efectivo_egresos = ?, efectivo_contado = ?,
                diferencia = ?, cierre = NOW()
            WHERE id = ? AND cierre IS NULL');
        $stmt->execute([
            (int) $currentUser['id'],
            number_format($efectivoVentas, 2, '.', ''),
            number_format($efectivoEgresos, 2, '.', ''),
            number_format($contado, 2, '.', ''),
            number_format($contado - $esperado, 2, '.', ''),
            (int) $arqueo['id'],
        ]);
        $pdo->commit();
        jsonResponse([
            'ok' => true,
            'efectivo_ventas' => number_format($efectivoVentas, 2, '.', ''),
            'efectivo_egresos' => number_format($efectivoEgresos, 2, '.', ''),
            'efectivo_esperado' => number_format($esperado, 2, '.', ''),
            'diferencia' => number_format($contado - $esperado, 2, '.', ''),
        ]);
    }

    if ($action === 'reporte_arqueos') {
        $desde = (string) ($_GET['desde'] ?? '');
        $hasta = (string) ($_GET['hasta'] ?? '');
        $fechaValida = static function (string $fecha): bool {
            if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $fecha, $partes) !== 1) {
                return false;
            }
            return checkdate((int) $partes[2], (int) $partes[3], (int) $partes[1]);
        };
        if (!$fechaValida($desde) || !$fechaValida($hasta) || $desde > $hasta
            || (strtotime($hasta) - strtotime($desde)) > 366 * 86400) {
            jsonResponse(['ok' => false, 'mensaje' => 'Selecciona un periodo válido de hasta un año.'], 422);
        }
        $stmt = $pdo->prepare("SELECT a.id, a.apertura, a.cierre, a.efectivo_inicial, a.efectivo_egresos,
            CASE WHEN a.cierre IS NULL THEN
                COALESCE((SELECT SUM(p.total) FROM pagos pa
                    INNER JOIN pedidos p ON p.id = pa.pedido_id
                    WHERE pa.metodo = 'Efectivo' AND pa.estado = 'Pagado'
                    AND p.tipo_entrega = 'Retiro'
                    AND pa.pagado_en >= a.apertura AND pa.pagado_en <= NOW()), 0)
                ELSE a.efectivo_ventas END AS efectivo_ventas,
            CASE WHEN a.cierre IS NULL THEN
                COALESCE((SELECT SUM(e.monto) FROM arqueo_egresos e WHERE e.arqueo_caja_id = a.id), 0)
                ELSE a.efectivo_egresos END AS efectivo_egresos,
            a.efectivo_contado, a.diferencia,
            ua.nombre AS usuario_apertura, uc.nombre AS usuario_cierre
            FROM arqueos_caja a
            INNER JOIN usuarios ua ON ua.id = a.usuario_apertura_id
            LEFT JOIN usuarios uc ON uc.id = a.usuario_cierre_id
            WHERE a.apertura >= ? AND a.apertura < DATE_ADD(?, INTERVAL 1 DAY)
            ORDER BY a.apertura DESC");
        $stmt->execute([$desde, $hasta]);
        $arqueos = $stmt->fetchAll();
        $ingresosStmt = $pdo->prepare("SELECT pa.id, p.id AS pedido_id, c.nombre AS cliente,
            pa.metodo, p.tipo_entrega, p.total AS monto, pa.pagado_en AS fecha
            FROM pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            INNER JOIN clientes c ON c.id = p.cliente_id
            WHERE pa.estado = 'Pagado' AND pa.pagado_en >= ? AND pa.pagado_en < DATE_ADD(?, INTERVAL 1 DAY)
            ORDER BY pa.pagado_en DESC, pa.id DESC");
        $ingresosStmt->execute([$desde, $hasta]);
        $egresosStmt = $pdo->prepare("SELECT e.id, e.categoria, e.concepto, e.monto,
            e.creado_en AS fecha, u.nombre AS usuario
            FROM arqueo_egresos e
            INNER JOIN arqueos_caja a ON a.id = e.arqueo_caja_id
            LEFT JOIN usuarios u ON u.id = e.usuario_id
            WHERE e.creado_en >= ? AND e.creado_en < DATE_ADD(?, INTERVAL 1 DAY)
            ORDER BY e.creado_en DESC, e.id DESC");
        $egresosStmt->execute([$desde, $hasta]);
        $ingresos = $ingresosStmt->fetchAll();
        $egresos = $egresosStmt->fetchAll();
        $resumenIngresos = ['total' => 0.0, 'efectivo_caja' => 0.0, 'efectivo_delivery' => 0.0, 'Tarjeta' => 0.0, 'Transferencia' => 0.0, 'QR' => 0.0];
        foreach ($ingresos as $ingreso) {
            $montoIngreso = (float) $ingreso['monto'];
            $resumenIngresos['total'] += $montoIngreso;
            if ($ingreso['metodo'] === 'Efectivo' && $ingreso['tipo_entrega'] === 'Retiro') {
                $resumenIngresos['efectivo_caja'] += $montoIngreso;
            } elseif ($ingreso['metodo'] === 'Efectivo') {
                $resumenIngresos['efectivo_delivery'] += $montoIngreso;
            } elseif (array_key_exists($ingreso['metodo'], $resumenIngresos)) {
                $resumenIngresos[$ingreso['metodo']] += $montoIngreso;
            }
        }
        $totalEgresos = array_reduce($egresos, static fn (float $total, array $egreso): float => $total + (float) $egreso['monto'], 0.0);
        jsonResponse([
            'ok' => true,
            'arqueos' => $arqueos,
            'ingresos' => $ingresos,
            'egresos' => $egresos,
            'resumen' => [
                'ingresos_total' => $resumenIngresos['total'],
                'ingresos_efectivo' => $resumenIngresos['efectivo_caja'],
                'ingresos_efectivo_delivery' => $resumenIngresos['efectivo_delivery'],
                'ingresos_tarjeta' => $resumenIngresos['Tarjeta'],
                'ingresos_transferencia' => $resumenIngresos['Transferencia'],
                'ingresos_qr' => $resumenIngresos['QR'],
                'egresos_total' => $totalEgresos,
                'neto' => $resumenIngresos['total'] - $totalEgresos,
            ],
        ]);
    }

    if ($action === 'repartidores_delivery') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede asignar repartidores.'], 403);
        }
        $repartidores = $pdo->query("SELECT id, nombre FROM usuarios WHERE rol = 'Repartidor' AND activo = 1 ORDER BY nombre")->fetchAll();
        jsonResponse(['ok' => true, 'repartidores' => $repartidores]);
    }

    if ($action === 'asignar_repartidor_delivery') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede asignar repartidores.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        $repartidorId = array_key_exists('repartidor_id', $data) && $data['repartidor_id'] !== null
            ? filter_var($data['repartidor_id'], FILTER_VALIDATE_INT)
            : null;
        if ($pedidoId === false || $pedidoId < 1 || ($repartidorId !== null && ($repartidorId === false || $repartidorId < 1))) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido o repartidor inválido.'], 422);
        }
        if ($repartidorId !== null) {
            $stmt = $pdo->prepare("SELECT 1 FROM usuarios WHERE id = ? AND rol = 'Repartidor' AND activo = 1");
            $stmt->execute([$repartidorId]);
            if (!$stmt->fetchColumn()) {
                jsonResponse(['ok' => false, 'mensaje' => 'Selecciona un repartidor activo.'], 422);
            }
        }
        $stmt = $pdo->prepare("SELECT 1 FROM pedidos WHERE id = ? AND tipo_entrega = 'Delivery' AND estado NOT IN ('Entregado', 'Cancelado')");
        $stmt->execute([$pedidoId]);
        if (!$stmt->fetchColumn()) {
            jsonResponse(['ok' => false, 'mensaje' => 'El pedido no existe, no es delivery o ya fue cerrado.'], 404);
        }
        $stmt = $pdo->prepare("UPDATE pedidos SET repartidor_id = ? WHERE id = ? AND tipo_entrega = 'Delivery' AND estado NOT IN ('Entregado', 'Cancelado')");
        $stmt->execute([$repartidorId, $pedidoId]);
        if ($stmt->rowCount() !== 1) {
            $stmt = $pdo->prepare("SELECT repartidor_id FROM pedidos WHERE id = ? AND tipo_entrega = 'Delivery' AND estado NOT IN ('Entregado', 'Cancelado')");
            $stmt->execute([$pedidoId]);
            $asignacionActual = $stmt->fetchColumn();
            if ($asignacionActual === false
                || ($repartidorId === null ? $asignacionActual !== null : (int) $asignacionActual !== $repartidorId)) {
                jsonResponse(['ok' => false, 'mensaje' => 'El pedido se cerró o cambió de asignación. Actualiza la lista e inténtalo nuevamente.'], 409);
            }
        }
        jsonResponse(['ok' => true, 'mensaje' => $repartidorId === null ? 'Se quitó la asignación del pedido.' : 'Pedido asignado al repartidor correctamente.']);
    }

    if ($action === 'enviar_comprobante_cliente') {
        if (!in_array($currentUser['rol'], ['Administrador', 'Vendedor'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo el administrador o un vendedor puede enviar comprobantes a la cuenta del cliente.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        $stmt = $pdo->prepare("SELECT p.cliente_id
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            INNER JOIN facturas f ON f.pedido_id = p.id
            WHERE p.id = ? AND p.usuario_id IS NULL AND c.correo IS NOT NULL AND c.correo <> ''
            LIMIT 1");
        $stmt->execute([$pedidoId]);
        $clienteId = $stmt->fetchColumn();
        if ($clienteId === false) {
            jsonResponse(['ok' => false, 'mensaje' => 'El pedido no pertenece a una cuenta de cliente habilitada o no tiene comprobante.'], 404);
        }
        $stmt = $pdo->prepare("INSERT INTO notificaciones_cliente (cliente_id, pedido_id)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE cliente_id = VALUES(cliente_id), creada_en = CURRENT_TIMESTAMP, leida_en = NULL");
        $stmt->execute([(int) $clienteId, $pedidoId]);
        jsonResponse(['ok' => true, 'mensaje' => 'Comprobante enviado a las notificaciones de la cuenta del cliente.']);
    }

    if ($action === 'ver_comprobante_qr') {
        if (!in_array($currentUser['rol'], ['Administrador', 'Vendedor', 'Repartidor'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No tienes permiso para ver comprobantes QR.'], 403);
        }
        $pedidoId = filter_var($_GET['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        $stmt = $pdo->prepare("SELECT pa.comprobante_qr FROM pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            WHERE p.id = ? AND pa.metodo = 'QR' AND pa.comprobante_qr IS NOT NULL
            AND (? <> 'Repartidor' OR (p.tipo_entrega = 'Delivery' AND p.repartidor_id = ?)) LIMIT 1");
        $stmt->execute([$pedidoId, $currentUser['rol'], (int) $currentUser['id']]);
        $rutaComprobante = $stmt->fetchColumn();
        if (!is_string($rutaComprobante) || !preg_match('#^uploads/comprobantes_qr/[a-f0-9]{32}\.(?:jpg|png|webp|pdf)$#', $rutaComprobante)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el comprobante QR de este pedido.'], 404);
        }
        $rutaAbsoluta = __DIR__ . '/la polar/' . $rutaComprobante;
        if (!is_file($rutaAbsoluta)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El archivo del comprobante no está disponible.'], 404);
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($rutaAbsoluta);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El tipo del comprobante guardado no es válido.'], 415);
        }
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="comprobante-pedido-' . (int) $pedidoId . '.' . pathinfo($rutaAbsoluta, PATHINFO_EXTENSION) . '"');
        header('Content-Length: ' . (string) filesize($rutaAbsoluta));
        header('Cache-Control: private, no-store');
        header('X-Content-Type-Options: nosniff');
        readfile($rutaAbsoluta);
        exit;
    }

    if ($action === 'empresa_configuracion') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar la configuración.'], 403);
        }
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'configuracion' => $obtenerConfiguracion()]);
    }

    if ($action === 'guardar_empresa_configuracion') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede modificar la configuración.'], 403);
        }
        $entrada = json_decode((string) ($_POST['configuracion'] ?? ''), true);
        if (!is_array($entrada)) {
            jsonResponse(['ok' => false, 'mensaje' => 'La configuración enviada no es válida.'], 422);
        }
        $actual = $obtenerConfiguracion();
        $marca = is_array($entrada['marca'] ?? null) ? $entrada['marca'] : [];
        $empresa = is_array($entrada['empresa'] ?? null) ? $entrada['empresa'] : [];
        $nombre = trim((string) ($marca['nombre'] ?? ''));
        $lema = trim((string) ($marca['lema'] ?? ''));
        $colorPrincipal = (string) ($marca['color_principal'] ?? '');
        $colorSecundario = (string) ($marca['color_secundario'] ?? '');
        $telefono = trim((string) ($marca['telefono'] ?? ''));
        $correo = trim((string) ($marca['correo'] ?? ''));
        $razonSocial = trim((string) ($empresa['razon_social'] ?? ''));
        $nit = trim((string) ($empresa['nit'] ?? ''));
        $direccion = trim((string) ($empresa['direccion'] ?? ''));
        $municipio = trim((string) ($empresa['municipio'] ?? ''));
        $telefonoFiscal = trim((string) ($empresa['telefono'] ?? ''));
        $correoFiscal = trim((string) ($empresa['correo'] ?? ''));
        if ($nombre === '' || mb_strlen($nombre, 'UTF-8') > 120 || mb_strlen($lema, 'UTF-8') > 180
            || !preg_match('/^#[0-9a-fA-F]{6}$/', $colorPrincipal)
            || !preg_match('/^#[0-9a-fA-F]{6}$/', $colorSecundario)
            || strlen($telefono) > 30 || ($correo !== '' && !filter_var($correo, FILTER_VALIDATE_EMAIL))
            || mb_strlen($razonSocial, 'UTF-8') > 160 || mb_strlen($nit, 'UTF-8') > 30
            || mb_strlen($direccion, 'UTF-8') > 255 || mb_strlen($municipio, 'UTF-8') > 100
            || strlen($telefonoFiscal) > 30 || ($correoFiscal !== '' && !filter_var($correoFiscal, FILTER_VALIDATE_EMAIL))) {
            jsonResponse(['ok' => false, 'mensaje' => 'Revisa los datos de marca, contacto y facturación de la empresa.'], 422);
        }
        $zonasEntrada = is_array($entrada['zonas_delivery'] ?? null) ? $entrada['zonas_delivery'] : [];
        if (count($zonasEntrada) > 30) {
            jsonResponse(['ok' => false, 'mensaje' => 'Puedes configurar hasta 30 zonas de delivery.'], 422);
        }
        $zonas = [];
        $nombresZonas = [];
        foreach ($zonasEntrada as $zona) {
            if (!is_array($zona)) {
                jsonResponse(['ok' => false, 'mensaje' => 'Una zona de delivery no tiene un formato válido.'], 422);
            }
            $nombreZona = trim((string) ($zona['nombre'] ?? ''));
            $costoZona = filter_var($zona['costo'] ?? null, FILTER_VALIDATE_FLOAT);
            if ($nombreZona === '' || mb_strlen($nombreZona, 'UTF-8') > 100 || $costoZona === false
                || !is_finite((float) $costoZona) || $costoZona < 0 || $costoZona > 10000
                || in_array(mb_strtolower($nombreZona, 'UTF-8'), $nombresZonas, true)) {
                jsonResponse(['ok' => false, 'mensaje' => 'Revisa los nombres y costos de las zonas (sin duplicados).'], 422);
            }
            $nombresZonas[] = mb_strtolower($nombreZona, 'UTF-8');
            $zonas[] = [
                'nombre' => $nombreZona,
                'costo' => round((float) $costoZona, 2),
                'activa' => !empty($zona['activa']),
            ];
        }
        $configuracion = [
            'marca' => [
                'nombre' => $nombre,
                'lema' => $lema,
                'logo' => $actual['marca']['logo'],
                'color_principal' => $colorPrincipal,
                'color_secundario' => $colorSecundario,
                'telefono' => $telefono,
                'correo' => $correo,
            ],
            'empresa' => [
                'razon_social' => $razonSocial,
                'nit' => $nit,
                'direccion' => $direccion,
                'municipio' => $municipio,
                'telefono' => $telefonoFiscal,
                'correo' => $correoFiscal,
            ],
            'qr' => $actual['qr'],
            'zonas_delivery' => $zonas,
        ];
        $logo = $guardarImagenConfiguracion('logo');
        $qr = $guardarImagenConfiguracion('qr');
        if ($logo !== null) {
            $configuracion['marca']['logo'] = $logo;
        }
        if ($qr !== null) {
            $configuracion['qr'] = $qr;
        }
        $json = json_encode($configuracion, JSON_UNESCAPED_UNICODE);
        if (!is_string($json)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar la configuración para guardarla.'], 500);
        }
        $stmt = $pdo->prepare('INSERT INTO configuracion_empresa (id, configuracion) VALUES (1, ?) ON DUPLICATE KEY UPDATE configuracion = VALUES(configuracion)');
        $stmt->execute([$json]);
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'configuracion' => $configuracion]);
    }

    if ($action === 'repartidor_pedidos') {
        if ($currentUser['rol'] !== 'Repartidor') {
            jsonResponse(['ok' => false, 'mensaje' => 'Esta pantalla es solo para usuarios de delivery.'], 403);
        }
        $stmt = $pdo->prepare("SELECT p.id, c.nombre AS cliente, c.telefono, p.estado, p.total,
            p.direccion_entrega, p.zona_entrega, p.costo_delivery, p.estado_entrega,
            p.creado_en AS fecha, f.nombre_fiscal, f.nit_ci, f.estado_emision,
            pa.metodo AS metodo_pago, pa.estado AS estado_pago, pa.codigo_transaccion,
            (pa.comprobante_qr IS NOT NULL) AS tiene_comprobante_qr
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN facturas f ON f.pedido_id = p.id
            LEFT JOIN pagos pa ON pa.pedido_id = p.id
            WHERE p.tipo_entrega = 'Delivery' AND p.repartidor_id = ?
            AND p.estado NOT IN ('Entregado', 'Cancelado')
            ORDER BY p.id ASC");
        $stmt->execute([(int) $currentUser['id']]);
        $pedidos = $stmt->fetchAll();
        $detalleStmt = $pdo->prepare("SELECT CASE WHEN pr.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE pr.nombre END AS nombre,
            d.cantidad, d.precio_unitario AS precio
            FROM pedido_detalles d INNER JOIN productos pr ON pr.id = d.producto_id
            WHERE d.pedido_id = ? ORDER BY d.id");
        foreach ($pedidos as &$pedido) {
            $pedido['productos'] = [];
            $detalleStmt->execute([(int) $pedido['id']]);
            $pedido['productos'] = $detalleStmt->fetchAll();
        }
        unset($pedido);
        jsonResponse(['ok' => true, 'pedidos' => $pedidos]);
    }

    if ($action === 'confirmar_pago_delivery') {
        $esRepartidor = $currentUser['rol'] === 'Repartidor';
        if (!$esRepartidor && $currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'No tienes permiso para confirmar pagos de delivery.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        $codigoTransaccion = trim((string) ($data['codigo_transaccion'] ?? ''));
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        if (mb_strlen($codigoTransaccion, 'UTF-8') > 100 || preg_match('/[<>\x00-\x1F]/u', $codigoTransaccion)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El código de transacción no es válido.'], 422);
        }
        $pagoPendiente = $pdo->prepare("SELECT pa.metodo FROM pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            WHERE p.id = ? AND p.tipo_entrega = 'Delivery' AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.estado = 'Pendiente'
            AND (? <> 'Repartidor' OR p.repartidor_id = ?)");
        $pagoPendiente->execute([$pedidoId, $currentUser['rol'], (int) $currentUser['id']]);
        $metodoPendiente = $pagoPendiente->fetchColumn();
        if ($metodoPendiente === false) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un pago pendiente para ese pedido delivery.'], 409);
        }
        if ($metodoPendiente !== 'QR') {
            jsonResponse(['ok' => false, 'mensaje' => 'La confirmación manual de pago solo está disponible para pagos QR.'], 409);
        }
        if ($codigoTransaccion === '') {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa el código de transacción del pago QR.'], 422);
        }
        $stmt = $pdo->prepare("UPDATE pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            SET pa.estado = 'Pagado', pa.pagado_en = NOW(), pa.codigo_transaccion = IF(pa.metodo = 'QR', ?, NULL)
            WHERE p.id = ? AND p.tipo_entrega = 'Delivery' AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.estado = 'Pendiente' AND pa.metodo = 'QR' AND ? <> ''
            AND (? <> 'Repartidor' OR p.repartidor_id = ?)");
        $stmt->execute([$codigoTransaccion, $pedidoId, $codigoTransaccion, $currentUser['rol'], (int) $currentUser['id']]);
        if ($stmt->rowCount() !== 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un pago pendiente o falta el código de transacción QR.'], 404);
        }
        jsonResponse(['ok' => true, 'mensaje' => 'Pago registrado. La factura electrónica sigue pendiente de emisión SIAT.']);
    }

    if ($action === 'cobrar_efectivo_delivery') {
        if ($currentUser['rol'] !== 'Repartidor') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo el repartidor asignado puede registrar el cobro de este pedido.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        $stmt = $pdo->prepare("UPDATE pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            SET pa.estado = 'Pagado', pa.pagado_en = NOW()
            WHERE p.id = ? AND p.repartidor_id = ? AND p.tipo_entrega = 'Delivery'
            AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.estado = 'Pendiente' AND pa.metodo = 'Efectivo'");
        $stmt->execute([$pedidoId, (int) $currentUser['id']]);
        if ($stmt->rowCount() !== 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un cobro pendiente en efectivo para un pedido asignado a tu cuenta.'], 409);
        }
        jsonResponse(['ok' => true, 'mensaje' => 'Cobro en efectivo registrado. Ya puedes completar la entrega.']);
    }

    if ($action === 'actualizar_entrega_delivery') {
        if ($currentUser['rol'] !== 'Repartidor') {
            jsonResponse(['ok' => false, 'mensaje' => 'Esta acción es solo para usuarios de delivery.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        $estadoEntrega = (string) ($data['estado_entrega'] ?? '');
        if ($pedidoId === false || $pedidoId < 1 || !in_array($estadoEntrega, ['En camino', 'Entregado'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido o estado de entrega inválido.'], 422);
        }
        $stmt = $pdo->prepare("UPDATE pedidos p
            INNER JOIN pagos pa ON pa.pedido_id = p.id
            SET p.estado_entrega = ?, p.estado = IF(? = 'Entregado', 'Entregado', p.estado)
            WHERE p.id = ? AND p.repartidor_id = ? AND p.tipo_entrega = 'Delivery' AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND (pa.estado = 'Pagado' OR ? <> 'Entregado')");
        $stmt->execute([$estadoEntrega, $estadoEntrega, $pedidoId, (int) $currentUser['id'], $estadoEntrega]);
        if ($stmt->rowCount() !== 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se puede cambiar el estado: verifica que el pedido exista y el pago esté confirmado antes de entregarlo.'], 409);
        }
        jsonResponse(['ok' => true]);
    }

    if ($action === 'confirmar_pago_pedido') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede validar pagos QR desde el panel de pedidos.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        $codigoTransaccion = trim((string) ($data['codigo_transaccion'] ?? ''));
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        if (mb_strlen($codigoTransaccion, 'UTF-8') > 100 || preg_match('/[<>\x00-\x1F]/u', $codigoTransaccion)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El código de transacción no es válido.'], 422);
        }
        $pagoPendiente = $pdo->prepare("SELECT pa.metodo FROM pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            WHERE p.id = ? AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.estado = 'Pendiente'");
        $pagoPendiente->execute([$pedidoId]);
        $metodoPendiente = $pagoPendiente->fetchColumn();
        if ($metodoPendiente === false) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un pago QR pendiente para este pedido.'], 409);
        }
        if ($metodoPendiente !== 'QR') {
            jsonResponse(['ok' => false, 'mensaje' => 'La confirmación manual de pago solo está disponible para pagos QR.'], 409);
        }
        if ($codigoTransaccion === '') {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa el código de transacción del pago QR.'], 422);
        }
        $stmt = $pdo->prepare("UPDATE pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            SET pa.estado = 'Pagado', pa.pagado_en = NOW(), pa.codigo_transaccion = IF(pa.metodo = 'QR', ?, NULL)
            WHERE p.id = ? AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.estado = 'Pendiente' AND pa.metodo = 'QR' AND ? <> ''");
        $stmt->execute([$codigoTransaccion, $pedidoId, $codigoTransaccion]);
        if ($stmt->rowCount() !== 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un pago pendiente o falta el código de transacción QR.'], 404);
        }
        jsonResponse(['ok' => true, 'mensaje' => 'Pago validado. La factura electrónica sigue pendiente de emisión SIAT.']);
    }

    if ($action === 'registrar_pago_efectivo_retiro') {
        if (!in_array($currentUser['rol'], ['Administrador', 'Vendedor'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador o vendedor puede registrar el cobro en tienda.'], 403);
        }
        $data = requestBody();
        $pedidoId = filter_var($data['pedido_id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Pedido inválido.'], 422);
        }
        $stmt = $pdo->prepare("UPDATE pagos pa
            INNER JOIN pedidos p ON p.id = pa.pedido_id
            SET pa.estado = 'Pagado', pa.pagado_en = NOW()
            WHERE p.id = ? AND p.usuario_id IS NULL AND p.tipo_entrega = 'Retiro'
            AND p.estado NOT IN ('Entregado', 'Cancelado')
            AND pa.metodo = 'Efectivo' AND pa.estado = 'Pendiente'");
        $stmt->execute([$pedidoId]);
        if ($stmt->rowCount() !== 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró un pedido web de retiro con pago en efectivo pendiente. Actualiza la lista y verifica el pedido.'], 409);
        }
        jsonResponse(['ok' => true, 'mensaje' => 'Cobro en efectivo registrado. Ya puedes cambiar el estado del pedido a Entregado cuando lo hayas entregado al cliente.']);
    }

    if ($action === 'guardar_inicio_contenido') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede editar la página de inicio.'], 403);
        }

        $camposTexto = [
            'hero_titulo' => 200,
            'hero_subtitulo' => 200,
            'hero_descripcion' => 1000,
            'hero_boton' => 200,
            'promociones_titulo' => 200,
            'destacados_titulo' => 200,
            'contacto_titulo' => 200,
            'contacto_direccion' => 300,
            'contacto_dias' => 200,
            'contacto_horario' => 200,
            'contacto_boton' => 200,
            'footer_descripcion' => 1000,
            'footer_horario' => 200,
            'footer_direccion' => 300,
            'footer_sucursal' => 200,
            'footer_telefono' => 200,
            'footer_redes' => 2500,
            'footer_copyright' => 200,
        ];
        $camposImagen = [
            'hero_imagen_1', 'hero_imagen_2', 'hero_imagen_3', 'hero_imagen_4',
            'destacado_1_imagen', 'destacado_2_imagen',
            'destacado_3_imagen', 'destacado_4_imagen', 'contacto_imagen',
        ];
        for ($numero = 1; $numero <= 4; $numero++) {
            $camposTexto['destacado_' . $numero . '_titulo'] = 200;
            $camposTexto['destacado_' . $numero . '_descripcion'] = 1000;
        }

        $contenido = json_decode((string) ($_POST['contenido'] ?? ''), true);
        if (!is_array($contenido)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Los datos de la página de inicio no son válidos.'], 422);
        }
        $contenido = array_intersect_key($contenido, array_flip(array_merge(array_keys($camposTexto), $camposImagen, ['hero_slides', 'destacados', 'promociones'])));
        foreach ($camposTexto as $campo => $maximo) {
            if (!isset($contenido[$campo]) || !is_string($contenido[$campo])) {
                jsonResponse(['ok' => false, 'mensaje' => 'Falta completar uno de los textos de la página de inicio.'], 422);
            }
            $valor = trim($contenido[$campo]);
            if (($valor === '' && $campo !== 'footer_redes') || mb_strlen($valor, 'UTF-8') > $maximo) {
                $mensaje = $campo === 'footer_redes'
                    ? 'Los enlaces de redes sociales superan el máximo permitido de ' . $maximo . ' caracteres.'
                    : 'Revisa el campo "' . $campo . '": no debe estar vacío y debe tener como máximo ' . $maximo . ' caracteres.';
                jsonResponse(['ok' => false, 'mensaje' => $mensaje], 422);
            }
            $contenido[$campo] = $valor;
        }

        $stmt = $pdo->query('SELECT contenido FROM contenido_inicio WHERE id = 1');
        $fila = $stmt->fetch();
        $contenidoAnterior = $fila ? json_decode($fila['contenido'], true) : [];
        if (!is_array($contenidoAnterior)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El contenido guardado de la página de inicio no es válido.'], 500);
        }
        foreach ($camposImagen as $campo) {
            $valorGuardado = $contenido[$campo] ?? $contenidoAnterior[$campo] ?? '';
            if (!is_string($valorGuardado)) {
                jsonResponse(['ok' => false, 'mensaje' => 'Una de las imágenes de la página no es válida.'], 422);
            }
            $valor = trim($valorGuardado);
            if ($valor === '' || str_contains($valor, '..') || str_contains($valor, ':')
                || (str_contains($valor, '/') && !str_starts_with($valor, 'uploads/inicio/'))) {
                jsonResponse(['ok' => false, 'mensaje' => 'Una de las imágenes de la página no es válida.'], 422);
            }
            $contenido[$campo] = $valor;
        }

        $directorioImagenes = __DIR__ . '/la polar/uploads/inicio';
        $extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
        foreach ($camposImagen as $campo) {
            $archivoImagen = $_FILES['imagen_' . $campo] ?? null;
            if (!is_array($archivoImagen) || $archivoImagen['error'] === UPLOAD_ERR_NO_FILE) {
                continue;
            }
            if ($archivoImagen['error'] !== UPLOAD_ERR_OK || $archivoImagen['size'] > 5 * 1024 * 1024
                || !is_uploaded_file($archivoImagen['tmp_name'])) {
                jsonResponse(['ok' => false, 'mensaje' => 'Cada imagen debe pesar como máximo 5 MB.'], 422);
            }
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivoImagen['tmp_name']);
            if (!isset($extensiones[$mime]) || @getimagesize($archivoImagen['tmp_name']) === false) {
                jsonResponse(['ok' => false, 'mensaje' => 'Las imágenes deben ser archivos JPG, PNG o WebP válidos.'], 422);
            }
            if (!is_dir($directorioImagenes) && !mkdir($directorioImagenes, 0755, true) && !is_dir($directorioImagenes)) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el almacenamiento de imágenes.'], 500);
            }
            $nombreImagen = bin2hex(random_bytes(16)) . '.' . $extensiones[$mime];
            if (!move_uploaded_file($archivoImagen['tmp_name'], $directorioImagenes . '/' . $nombreImagen)) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo guardar una de las imágenes.'], 500);
            }
            $contenido[$campo] = 'uploads/inicio/' . $nombreImagen;
        }

        $coleccionesImagenes = [
            'hero_slides' => ['maximo' => 8, 'campos' => ['imagen']],
            'destacados' => ['maximo' => 12, 'campos' => ['imagen', 'titulo', 'descripcion']],
            'promociones' => ['maximo' => 12, 'campos' => ['imagen', 'titulo', 'descripcion']],
        ];
        foreach ($coleccionesImagenes as $coleccion => $definicion) {
            if (!array_key_exists($coleccion, $contenido)) {
                continue;
            }
            $elementos = $contenido[$coleccion];
            if (!is_array($elementos) || count($elementos) < 1 || count($elementos) > $definicion['maximo']) {
                jsonResponse(['ok' => false, 'mensaje' => 'La cantidad de imágenes, productos destacados o promociones no es válida.'], 422);
            }
            foreach ($elementos as $indice => $elemento) {
                if (!is_array($elemento)) {
                    jsonResponse(['ok' => false, 'mensaje' => 'Los datos de una imagen de inicio no son válidos.'], 422);
                }
                foreach ($definicion['campos'] as $campoElemento) {
                    $valorElemento = $elemento[$campoElemento] ?? null;
                    if (!is_string($valorElemento)) {
                        jsonResponse(['ok' => false, 'mensaje' => 'Falta completar los datos de una imagen, producto destacado o promoción.'], 422);
                    }
                    $maximoTexto = $campoElemento === 'titulo' ? 200 : 1000;
                    if ($campoElemento !== 'imagen' && (trim($valorElemento) === '' || mb_strlen($valorElemento, 'UTF-8') > $maximoTexto)) {
                        jsonResponse(['ok' => false, 'mensaje' => 'Revisa los nombres y las descripciones de los productos destacados o promociones.'], 422);
                    }
                }
                $campoArchivo = 'imagen_' . $coleccion . '_' . $indice;
                $archivoImagen = $_FILES[$campoArchivo] ?? null;
                $rutaImagen = trim($elemento['imagen']);
                if ($archivoImagen && $archivoImagen['error'] !== UPLOAD_ERR_NO_FILE) {
                    if ($archivoImagen['error'] !== UPLOAD_ERR_OK || $archivoImagen['size'] > 5 * 1024 * 1024
                        || !is_uploaded_file($archivoImagen['tmp_name'])) {
                        jsonResponse(['ok' => false, 'mensaje' => 'Cada imagen debe pesar como máximo 5 MB.'], 422);
                    }
                    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivoImagen['tmp_name']);
                    if (!isset($extensiones[$mime]) || @getimagesize($archivoImagen['tmp_name']) === false) {
                        jsonResponse(['ok' => false, 'mensaje' => 'Las imágenes deben ser archivos JPG, PNG o WebP válidos.'], 422);
                    }
                    if (!is_dir($directorioImagenes) && !mkdir($directorioImagenes, 0755, true) && !is_dir($directorioImagenes)) {
                        jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el almacenamiento de imágenes.'], 500);
                    }
                    $nombreImagen = bin2hex(random_bytes(16)) . '.' . $extensiones[$mime];
                    if (!move_uploaded_file($archivoImagen['tmp_name'], $directorioImagenes . '/' . $nombreImagen)) {
                        jsonResponse(['ok' => false, 'mensaje' => 'No se pudo guardar una de las imágenes.'], 500);
                    }
                    $rutaImagen = 'uploads/inicio/' . $nombreImagen;
                }
                if ($rutaImagen === '' || str_contains($rutaImagen, '..') || str_contains($rutaImagen, ':')
                    || (str_contains($rutaImagen, '/') && !str_starts_with($rutaImagen, 'uploads/inicio/'))) {
                    jsonResponse(['ok' => false, 'mensaje' => 'Una de las imágenes de la página no es válida.'], 422);
                }
                $contenido[$coleccion][$indice]['imagen'] = $rutaImagen;
                if (in_array($coleccion, ['destacados', 'promociones'], true)) {
                    $contenido[$coleccion][$indice]['titulo'] = trim($elemento['titulo']);
                    $contenido[$coleccion][$indice]['descripcion'] = trim($elemento['descripcion']);
                }
            }
        }

        $contenidoJson = json_encode($contenido, JSON_UNESCAPED_UNICODE);
        if (!is_string($contenidoJson)) {
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el contenido para guardarlo.'], 500);
        }
        $stmt = $pdo->prepare('INSERT INTO contenido_inicio (id, contenido) VALUES (1, ?) ON DUPLICATE KEY UPDATE contenido = VALUES(contenido)');
        $stmt->execute([$contenidoJson]);
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'contenido' => $contenido]);
    }

    if ($action === 'usuarios') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar usuarios.'], 403);
        }
        jsonResponse(['ok' => true, 'usuarios' => $pdo->query('SELECT id, nombre, usuario, rol, activo, ultimo_acceso, creado_en FROM usuarios ORDER BY id DESC')->fetchAll()]);
    }

    if ($action === 'clientes') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar clientes.'], 403);
        }
        $clientes = $pdo->query('SELECT id, nombre, correo, telefono, origen_registro, creado_en FROM clientes ORDER BY id DESC')->fetchAll();
        jsonResponse(['ok' => true, 'clientes' => $clientes]);
    }

    if ($action === 'editar_cliente') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede editar clientes.'], 403);
        }
        $data = requestBody();
        $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $correo = strtolower(trim((string) ($data['correo'] ?? '')));
        $telefono = trim((string) ($data['telefono'] ?? ''));
        if ($id === false || $id < 1 || $nombre === '' || mb_strlen($nombre, 'UTF-8') > 120
            || !$nombreTextoValido($nombre)
            || ($correo !== '' && (!filter_var($correo, FILTER_VALIDATE_EMAIL) || strlen($correo) > 254))
            || strlen($telefono) > 30 || ($telefono !== '' && !$telefonoValido($telefono))) {
            jsonResponse(['ok' => false, 'mensaje' => 'Verifica el nombre, el correo y el teléfono del cliente.'], 422);
        }
        try {
            $stmt = $pdo->prepare('UPDATE clientes SET nombre = ?, correo = ?, telefono = ? WHERE id = ?');
            $stmt->execute([$nombre, $correo !== '' ? $correo : null, $telefono !== '' ? $telefono : null, $id]);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                jsonResponse(['ok' => false, 'mensaje' => 'Ya existe otro cliente con ese correo.'], 409);
            }
            throw $exception;
        }
        if ($stmt->rowCount() === 0) {
            $stmt = $pdo->prepare('SELECT id FROM clientes WHERE id = ?');
            $stmt->execute([$id]);
            if (!$stmt->fetch()) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el cliente.'], 404);
            }
        }
        jsonResponse(['ok' => true, 'mensaje' => 'Cliente actualizado correctamente.']);
    }

    if ($action === 'crear_usuario') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede crear usuarios.'], 403);
        }
        $data = requestBody();
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $usuario = trim((string) ($data['usuario'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $rol = (string) ($data['rol'] ?? 'Vendedor');
        if ($nombre === '' || mb_strlen($nombre, 'UTF-8') > 100 || $usuario === '' || mb_strlen($usuario, 'UTF-8') > 50
            || strlen($password) < 6 || !in_array($rol, ['Administrador', 'Vendedor', 'Repartidor'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Nombre, usuario y una contraseña de 6 caracteres son obligatorios.'], 422);
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, usuario, password_hash, rol) VALUES (?, ?, ?, ?)');
            $stmt->execute([$nombre, $usuario, password_hash($password, PASSWORD_DEFAULT), $rol]);
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                jsonResponse(['ok' => false, 'mensaje' => 'Ya existe otro usuario con ese nombre de usuario.'], 409);
            }
            throw $exception;
        }
        jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()], 201);
    }

    if ($action === 'editar_usuario') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede editar usuarios.'], 403);
        }
        $data = requestBody();
        $id = (int) ($data['id'] ?? 0);
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $usuario = trim((string) ($data['usuario'] ?? ''));
        $password = (string) ($data['password'] ?? '');
        $rol = (string) ($data['rol'] ?? 'Vendedor');
        if ($id < 1 || $nombre === '' || mb_strlen($nombre, 'UTF-8') > 100 || $usuario === '' || mb_strlen($usuario, 'UTF-8') > 50
            || ($password !== '' && strlen($password) < 6) || !in_array($rol, ['Administrador', 'Vendedor', 'Repartidor'], true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Nombre y usuario son obligatorios; la contraseña debe tener 6 caracteres.'], 422);
        }
        try {
            if ($password === '') {
                $stmt = $pdo->prepare('UPDATE usuarios SET nombre = ?, usuario = ?, rol = ? WHERE id = ?');
                $stmt->execute([$nombre, $usuario, $rol, $id]);
            } else {
                $stmt = $pdo->prepare('UPDATE usuarios SET nombre = ?, usuario = ?, password_hash = ?, rol = ? WHERE id = ?');
                $stmt->execute([$nombre, $usuario, password_hash($password, PASSWORD_DEFAULT), $rol, $id]);
            }
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                jsonResponse(['ok' => false, 'mensaje' => 'Ya existe otro usuario con ese nombre de usuario.'], 409);
            }
            throw $exception;
        }
        jsonResponse(['ok' => true]);
    }

    if ($action === 'estado_usuario') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede cambiar el estado de usuarios.'], 403);
        }
        $data = requestBody();
        $id = (int) ($data['id'] ?? 0);
        $activo = !empty($data['activo']) ? 1 : 0;
        if ($id < 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Usuario inválido.'], 422);
        }
        if ($id === (int) $currentUser['id'] && $activo === 0) {
            jsonResponse(['ok' => false, 'mensaje' => 'No puedes desactivar tu propio usuario.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE usuarios SET activo = ? WHERE id = ?');
        $stmt->execute([$activo, $id]);
        jsonResponse(['ok' => true]);
    }

    if ($action === 'inventario_estado') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar el inventario.'], 403);
        }
        $productos = $pdo->query("SELECT p.id, CASE WHEN p.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE p.nombre END AS nombre,
            p.descripcion, p.categoria, p.precio,
            (SELECT COALESCE(SUM(l.cantidad_disponible), 0)
                FROM inventario_lotes l
                WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
                    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)) AS stock,
            p.imagen
            FROM productos p WHERE p.activo = 1 ORDER BY p.nombre")->fetchAll();
        $lotes = $pdo->query("SELECT l.id AS lote_id, l.producto_id, p.nombre AS producto, l.cantidad_inicial,
            l.cantidad_disponible, l.fecha_ingreso, l.fecha_vencimiento, l.origen,
            DATEDIFF(l.fecha_vencimiento, CURRENT_DATE) AS dias_para_vencer,
            CASE
                WHEN l.fecha_vencimiento IS NULL THEN 'Sin vencimiento'
                WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'Vencido'
                WHEN l.fecha_vencimiento <= DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY) THEN 'Por vencer'
                ELSE 'Vigente'
            END AS estado,
            u.nombre AS usuario
            FROM inventario_lotes l
            INNER JOIN productos p ON p.id = l.producto_id
            LEFT JOIN usuarios u ON u.id = l.usuario_id
            WHERE l.cantidad_disponible > 0 AND p.activo = 1
            ORDER BY l.fecha_vencimiento IS NULL, l.fecha_vencimiento, l.fecha_ingreso, l.id")->fetchAll();
        header('Cache-Control: no-store, private');
        jsonResponse([
            'ok' => true,
            'productos' => $normalizarProductos($productos),
            'lotes' => $lotes,
        ]);
    }

    if ($action === 'registrar_entrada_stock') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede registrar entradas de stock.'], 403);
        }
        $data = requestBody();
        $productoId = filter_var($data['producto_id'] ?? null, FILTER_VALIDATE_INT);
        $cantidad = filter_var($data['cantidad'] ?? null, FILTER_VALIDATE_INT);
        $fechaIngreso = trim((string) ($data['fecha_ingreso'] ?? ''));
        $fechaVencimiento = trim((string) ($data['fecha_vencimiento'] ?? ''));
        if ($productoId === false || $productoId < 1 || $cantidad === false || $cantidad < 1 || $cantidad > 100000
            || !$fechaValida($fechaIngreso) || !$fechaValida($fechaVencimiento)
            || $fechaIngreso > date('Y-m-d') || $fechaVencimiento < $fechaIngreso) {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa un producto, una cantidad válida y fechas correctas. El vencimiento debe ser igual o posterior al ingreso.'], 422);
        }
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id FROM productos WHERE id = ? AND activo = 1 FOR UPDATE');
        $stmt->execute([$productoId]);
        if (!$stmt->fetchColumn()) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el producto seleccionado.'], 404);
        }
        $stmt = $pdo->prepare("INSERT INTO inventario_lotes
            (producto_id, cantidad_inicial, cantidad_disponible, fecha_ingreso, fecha_vencimiento, origen, usuario_id)
            VALUES (?, ?, ?, ?, ?, 'Entrada', ?)");
        $stmt->execute([$productoId, $cantidad, $cantidad, $fechaIngreso, $fechaVencimiento, (int) $currentUser['id']]);
        $loteId = (int) $pdo->lastInsertId();
        $stmt = $pdo->prepare("INSERT INTO inventario_movimientos
            (producto_id, lote_id, usuario_id, tipo, cantidad, fecha_movimiento, motivo)
            VALUES (?, ?, ?, 'Entrada', ?, ?, 'Ingreso de nuevo stock')");
        $stmt->execute([$productoId, $loteId, (int) $currentUser['id'], $cantidad, $fechaIngreso]);
        $actualizarStockProducto((int) $productoId);
        $pdo->commit();
        jsonResponse(['ok' => true, 'lote_id' => $loteId, 'mensaje' => 'Entrada de stock registrada correctamente.'], 201);
    }

    if ($action === 'dar_baja_stock') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede dar de baja stock.'], 403);
        }
        $data = requestBody();
        $loteId = filter_var($data['lote_id'] ?? null, FILTER_VALIDATE_INT);
        $cantidad = filter_var($data['cantidad'] ?? null, FILTER_VALIDATE_INT);
        $motivo = trim((string) ($data['motivo'] ?? ''));
        $observacion = trim((string) ($data['observacion'] ?? ''));
        $motivos = ['Vencido', 'Próximo a vencer', 'Dañado', 'Otro'];
        if ($loteId === false || $loteId < 1 || $cantidad === false || $cantidad < 1
            || !in_array($motivo, $motivos, true) || mb_strlen($observacion, 'UTF-8') > 255
            || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', $observacion) === 1) {
            jsonResponse(['ok' => false, 'mensaje' => 'Verifica el lote, la cantidad y el motivo de la baja.'], 422);
        }
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id FROM productos WHERE id = (SELECT producto_id FROM inventario_lotes WHERE id = ?) FOR UPDATE');
        $stmt->execute([$loteId]);
        if (!$stmt->fetchColumn()) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el lote seleccionado.'], 404);
        }
        $stmt = $pdo->prepare("SELECT id, producto_id, cantidad_disponible, fecha_vencimiento
            FROM inventario_lotes WHERE id = ? FOR UPDATE");
        $stmt->execute([$loteId]);
        $lote = $stmt->fetch();
        if (!$lote || $cantidad > (int) $lote['cantidad_disponible']) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'La cantidad de baja supera el stock disponible del lote. Actualiza la página e inténtalo nuevamente.'], 409);
        }
        $vence = $lote['fecha_vencimiento'];
        $hoy = date('Y-m-d');
        $esVencido = is_string($vence) && $vence < $hoy;
        $esProximoAVencer = is_string($vence) && $vence >= $hoy
            && $vence <= (new DateTimeImmutable($hoy))->modify('+30 days')->format('Y-m-d');
        if (($motivo === 'Vencido' && !$esVencido)
            || ($motivo === 'Próximo a vencer' && !$esProximoAVencer)) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'El motivo de baja no coincide con la fecha de vencimiento del lote.'], 422);
        }
        $stmt = $pdo->prepare('UPDATE inventario_lotes SET cantidad_disponible = cantidad_disponible - ? WHERE id = ?');
        $stmt->execute([$cantidad, $loteId]);
        $stmt = $pdo->prepare("INSERT INTO inventario_movimientos
            (producto_id, lote_id, usuario_id, tipo, cantidad, fecha_movimiento, motivo, observacion)
            VALUES (?, ?, ?, 'Baja', ?, CURRENT_DATE, ?, ?)");
        $stmt->execute([(int) $lote['producto_id'], $loteId, (int) $currentUser['id'], $cantidad, $motivo, $observacion !== '' ? $observacion : null]);
        $actualizarStockProducto((int) $lote['producto_id']);
        $pdo->commit();
        jsonResponse(['ok' => true, 'mensaje' => 'Baja de stock registrada correctamente.']);
    }

    if ($action === 'actualizar_fechas_lote') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede actualizar las fechas del lote inicial.'], 403);
        }
        $data = requestBody();
        $loteId = filter_var($data['lote_id'] ?? null, FILTER_VALIDATE_INT);
        $fechaIngreso = trim((string) ($data['fecha_ingreso'] ?? ''));
        $fechaVencimiento = trim((string) ($data['fecha_vencimiento'] ?? ''));
        if ($loteId === false || $loteId < 1 || !$fechaValida($fechaIngreso) || !$fechaValida($fechaVencimiento)
            || $fechaIngreso > date('Y-m-d') || $fechaVencimiento < $fechaIngreso) {
            jsonResponse(['ok' => false, 'mensaje' => 'Ingresa fechas válidas. El vencimiento debe ser igual o posterior al ingreso.'], 422);
        }
        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT producto_id FROM inventario_lotes WHERE id = ?');
        $stmt->execute([$loteId]);
        $productoId = $stmt->fetchColumn();
        if ($productoId === false) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el lote seleccionado.'], 404);
        }
        $stmt = $pdo->prepare('SELECT id FROM productos WHERE id = ? FOR UPDATE');
        $stmt->execute([(int) $productoId]);
        if (!$stmt->fetchColumn()) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el producto asociado al lote.'], 404);
        }
        $stmt = $pdo->prepare("UPDATE inventario_lotes
            SET fecha_ingreso = ?, fecha_vencimiento = ?
            WHERE id = ? AND origen = 'Inicial' AND fecha_vencimiento IS NULL AND cantidad_disponible > 0");
        $stmt->execute([$fechaIngreso, $fechaVencimiento, $loteId]);
        if ($stmt->rowCount() !== 1) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'Solo se pueden completar las fechas de lotes iniciales sin vencimiento que todavía tienen stock.'], 409);
        }
        $stmt = $pdo->prepare("UPDATE inventario_movimientos
            SET fecha_movimiento = ?, observacion = 'Fechas del lote inicial completadas'
            WHERE lote_id = ? AND tipo = 'Inicial'");
        $stmt->execute([$fechaIngreso, $loteId]);
        $actualizarStockProducto((int) $productoId);
        $pdo->commit();
        jsonResponse(['ok' => true, 'mensaje' => 'Fechas del inventario inicial actualizadas correctamente.']);
    }

    if ($action === 'reporte_inventario') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar los movimientos de inventario.'], 403);
        }
        $desde = trim((string) ($_GET['desde'] ?? ''));
        $hasta = trim((string) ($_GET['hasta'] ?? ''));
        if (($desde !== '' && !$fechaValida($desde)) || ($hasta !== '' && !$fechaValida($hasta))
            || ($desde !== '' && $hasta !== '' && $desde > $hasta)) {
            jsonResponse(['ok' => false, 'mensaje' => 'El rango de fechas del reporte de inventario no es válido.'], 422);
        }
        $condiciones = [];
        $parametros = [];
        if ($desde !== '') {
            $condiciones[] = 'm.fecha_movimiento >= ?';
            $parametros[] = $desde;
        }
        if ($hasta !== '') {
            $condiciones[] = 'm.fecha_movimiento <= ?';
            $parametros[] = $hasta;
        }
        $where = $condiciones ? 'WHERE ' . implode(' AND ', $condiciones) : '';
        $stmt = $pdo->prepare("SELECT m.id, m.tipo, m.cantidad, m.fecha_movimiento, m.creado_en,
            m.motivo, m.observacion, p.nombre AS producto, l.fecha_ingreso, l.fecha_vencimiento,
            l.id AS lote_id, u.nombre AS usuario, m.pedido_id
            FROM inventario_movimientos m
            INNER JOIN productos p ON p.id = m.producto_id
            LEFT JOIN inventario_lotes l ON l.id = m.lote_id
            LEFT JOIN usuarios u ON u.id = m.usuario_id
            $where
            ORDER BY m.fecha_movimiento DESC, m.id DESC");
        $stmt->execute($parametros);
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'movimientos' => $stmt->fetchAll()]);
    }

    if ($action === 'reportes_admin') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar los reportes.'], 403);
        }
        $stmt = $pdo->query("SELECT p.id, p.estado, p.total, p.tipo_entrega, p.zona_entrega, p.estado_entrega,
            p.creado_en AS fecha, p.usuario_id, COALESCE(v.nombre, 'Ventas web') AS vendedor,
            p.repartidor_id, COALESCE(r.nombre, 'Sin asignar') AS repartidor, c.nombre AS cliente,
            CASE WHEN p.estado = 'Entregado'
                OR EXISTS (SELECT 1 FROM pagos pa WHERE pa.pedido_id = p.id AND pa.estado = 'Pagado')
                THEN 1 ELSE 0 END AS venta_valida
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN usuarios v ON v.id = p.usuario_id
            LEFT JOIN usuarios r ON r.id = p.repartidor_id
            ORDER BY p.creado_en DESC");
        $ventas = $stmt->fetchAll();
        $detalleStmt = $pdo->prepare("SELECT CASE WHEN pr.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE pr.nombre END AS nombre,
            d.cantidad, d.precio_unitario AS precio
            FROM pedido_detalles d
            INNER JOIN productos pr ON pr.id = d.producto_id
            WHERE d.pedido_id = ?
            ORDER BY d.id");
        foreach ($ventas as &$venta) {
            $detalleStmt->execute([(int) $venta['id']]);
            $venta['productos'] = $detalleStmt->fetchAll();
        }
        unset($venta);
        $productos = $pdo->query("SELECT p.id, p.nombre, p.categoria, p.precio,
            (SELECT COALESCE(SUM(l.cantidad_disponible), 0) FROM inventario_lotes l
                WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
                    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)) AS stock
            FROM productos p
            WHERE p.activo = 1
            ORDER BY stock DESC, p.nombre")->fetchAll();
        header('Cache-Control: no-store, private');
        jsonResponse(['ok' => true, 'pedidos' => $ventas, 'productos' => $normalizarProductos($productos)]);
    }

    if ($action === 'productos') {
        $productos = $pdo->query("SELECT p.id, CASE WHEN p.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE p.nombre END AS nombre,
            p.descripcion, p.categoria, p.precio,
            (SELECT COALESCE(SUM(l.cantidad_disponible), 0) FROM inventario_lotes l
                WHERE l.producto_id = p.id AND l.cantidad_disponible > 0
                    AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)) AS stock,
            p.imagen
            FROM productos p WHERE p.activo = 1 ORDER BY p.categoria, p.nombre")->fetchAll();
        jsonResponse(['ok' => true, 'productos' => $normalizarProductos($productos)]);
    }

    if ($action === 'crear_producto' || $action === 'editar_producto') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede administrar productos.'], 403);
        }
        $data = $_POST + requestBody();
        $id = (int) ($data['id'] ?? 0);
        $nombre = trim((string) ($data['nombre'] ?? ''));
        $descripcion = trim((string) ($data['descripcion'] ?? ''));
        $precio = (float) ($data['precio'] ?? 0);
        $categoria = (string) ($data['categoria'] ?? '');
        $categorias = ['Tortas', 'Espressos', 'Frappes', 'Bubbas', 'Crepes', 'Pasteleria', 'Paninis', 'Combos', 'Otros'];
        if ($nombre === '' || mb_strlen($nombre, 'UTF-8') > 120 || !is_numeric($data['precio'] ?? null) || !is_finite($precio) || $precio < 0 || !in_array($categoria, $categorias, true) || ($action === 'editar_producto' && $id < 1)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Nombre, categoría y precio deben ser válidos. El stock se registra desde el módulo de inventario.'], 422);
        }
        $imagen = null;
        $archivoImagen = $_FILES['imagen'] ?? null;
        if (is_array($archivoImagen) && $archivoImagen['error'] !== UPLOAD_ERR_NO_FILE) {
            if ($archivoImagen['error'] !== UPLOAD_ERR_OK) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo recibir la foto. Verifica que pese menos de 5 MB.'], 422);
            }
            if ($archivoImagen['size'] > 5 * 1024 * 1024 || !is_uploaded_file($archivoImagen['tmp_name'])) {
                jsonResponse(['ok' => false, 'mensaje' => 'La foto debe pesar menos de 5 MB.'], 422);
            }
            $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivoImagen['tmp_name']);
            $extensiones = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            if (!isset($extensiones[$mime]) || @getimagesize($archivoImagen['tmp_name']) === false) {
                jsonResponse(['ok' => false, 'mensaje' => 'La foto debe ser JPG, PNG o WebP válida.'], 422);
            }
            $directorioImagenes = __DIR__ . '/la polar/uploads/productos';
            if (!is_dir($directorioImagenes) && !mkdir($directorioImagenes, 0755, true) && !is_dir($directorioImagenes)) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar el almacenamiento de fotos.'], 500);
            }
            $nombreImagen = bin2hex(random_bytes(16)) . '.' . $extensiones[$mime];
            if (!move_uploaded_file($archivoImagen['tmp_name'], $directorioImagenes . '/' . $nombreImagen)) {
                jsonResponse(['ok' => false, 'mensaje' => 'No se pudo guardar la foto del producto.'], 500);
            }
            $imagen = 'uploads/productos/' . $nombreImagen;
        }
        if ($action === 'crear_producto') {
            $stmt = $pdo->prepare('INSERT INTO productos (nombre, descripcion, categoria, precio, stock, imagen) VALUES (?, ?, ?, ?, 0, ?)');
            $stmt->execute([$nombre, $descripcion !== '' ? $descripcion : null, $categoria, $precio, $imagen]);
            jsonResponse(['ok' => true, 'id' => (int) $pdo->lastInsertId()], 201);
        }
        $sql = 'UPDATE productos SET nombre = ?, descripcion = ?, categoria = ?, precio = ?';
        $parametros = [$nombre, $descripcion !== '' ? $descripcion : null, $categoria, $precio];
        if ($imagen !== null) {
            $sql .= ', imagen = ?';
            $parametros[] = $imagen;
        }
        $sql .= ' WHERE id = ? AND activo = 1';
        $parametros[] = $id;
        $stmt = $pdo->prepare($sql);
        $stmt->execute($parametros);
        jsonResponse(['ok' => true]);
    }

    if ($action === 'pedidos') {
        $rows = $pdo->query("SELECT p.id, c.nombre AS cliente, c.telefono, p.estado, p.total,
            p.tipo_entrega, p.direccion_entrega, p.zona_entrega, p.costo_delivery, p.estado_entrega,
            p.repartidor_id, r.nombre AS nombre_repartidor,
            p.creado_en AS fecha,
            IF(p.usuario_id IS NULL, 'Web', 'Panel') AS origen,
            f.numero AS factura_numero, f.nombre_fiscal, f.nit_ci, f.direccion AS direccion_fiscal,
            f.estado_emision, f.cuf,
            pa.metodo AS metodo_pago, pa.monto AS monto_pago, pa.estado AS estado_pago,
            pa.codigo_transaccion, (pa.comprobante_qr IS NOT NULL) AS tiene_comprobante_qr,
            EXISTS(SELECT 1 FROM notificaciones_cliente n WHERE n.pedido_id = p.id AND n.cliente_id = p.cliente_id) AS comprobante_enviado
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN usuarios r ON r.id = p.repartidor_id
            LEFT JOIN facturas f ON f.pedido_id = p.id
            LEFT JOIN pagos pa ON pa.pedido_id = p.id
            ORDER BY p.id DESC")->fetchAll();
        $detalleStmt = $pdo->prepare("SELECT d.producto_id AS id, CASE WHEN pr.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE pr.nombre END AS nombre, d.cantidad, d.precio_unitario AS precio FROM pedido_detalles d INNER JOIN productos pr ON pr.id = d.producto_id WHERE d.pedido_id = ? ORDER BY d.id");
        foreach ($rows as &$row) {
            $detalleStmt->execute([(int) $row['id']]);
            $row['productos'] = $detalleStmt->fetchAll();
        }
        unset($row);
        jsonResponse(['ok' => true, 'pedidos' => $rows]);
    }

    if ($action === 'crear_pedido') {
        $data = requestBody();
        $cliente = trim((string) ($data['cliente'] ?? ''));
        $telefono = trim((string) ($data['telefono'] ?? ''));
        $items = is_array($data['productos'] ?? null) ? $data['productos'] : [];
        $factura = is_array($data['factura'] ?? null) ? $data['factura'] : [];
        $pago = is_array($data['pago'] ?? null) ? $data['pago'] : [];
        $nombreFiscal = trim((string) ($factura['nombre'] ?? ''));
        $nitCi = trim((string) ($factura['nit_ci'] ?? ''));
        $direccionFiscal = trim((string) ($factura['direccion'] ?? ''));
        $metodosPago = ['Efectivo', 'Tarjeta', 'Transferencia', 'QR'];
        $metodoPago = (string) ($pago['metodo'] ?? '');
        $montoPago = (float) ($pago['monto'] ?? 0);
        if ($cliente === '' || mb_strlen($cliente, 'UTF-8') > 120 || !$nombreTextoValido($cliente)
            || !$telefonoValido($telefono) || strlen($telefono) > 30
            || count($items) === 0 || $nombreFiscal === '' || mb_strlen($nombreFiscal, 'UTF-8') > 120
            || !$nombreTextoValido($nombreFiscal) || $nitCi === '' || strlen($nitCi) > 30
            || preg_match('/^[0-9-]+$/', $nitCi) !== 1 || !preg_match('/[0-9]/', $nitCi)
            || mb_strlen($direccionFiscal, 'UTF-8') > 255
            || !in_array($metodoPago, $metodosPago, true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Verifica nombre, teléfono, datos de facturación y método de pago. Nombres solo con letras, teléfono de 7 a 15 dígitos y NIT/CI numérico.'], 422);
        }

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT id FROM clientes WHERE nombre = ? AND telefono = ? LIMIT 1');
        $stmt->execute([$cliente, $telefono]);
        $clienteId = $stmt->fetchColumn();
        if (!$clienteId) {
            $stmt = $pdo->prepare("INSERT INTO clientes (nombre, telefono, origen_registro) VALUES (?, ?, 'empleado')");
            $stmt->execute([$cliente, $telefono]);
            $clienteId = $pdo->lastInsertId();
        } else {
            $stmt = $pdo->prepare("UPDATE clientes SET origen_registro = 'empleado' WHERE id = ? AND origen_registro = 'desconocido' AND correo IS NULL AND password_hash IS NULL");
            $stmt->execute([$clienteId]);
        }

        $total = 0;
        $productos = [];
        foreach ($items as $item) {
            $stmt = $pdo->prepare('SELECT id, precio, nombre FROM productos WHERE id = ? AND activo = 1 FOR UPDATE');
            $stmt->execute([(int) ($item['id'] ?? 0)]);
            $producto = $stmt->fetch();
            $cantidad = (int) ($item['cantidad'] ?? 0);
            if (!$producto || $cantidad < 1 || $cantidad > $obtenerStockVendible((int) $item['id'])) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'Stock insuficiente o producto inválido.'], 422);
            }
            $total += $cantidad * (float) $producto['precio'];
            $productos[] = [$producto, $cantidad];
        }

        if ($montoPago < $total) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'El monto del pago debe cubrir el total del pedido.'], 422);
        }

        $stmt = $pdo->prepare('INSERT INTO pedidos (cliente_id, usuario_id, total) VALUES (?, ?, ?)');
        $stmt->execute([$clienteId, $currentUser['id'], $total]);
        $pedidoId = $pdo->lastInsertId();
        $numeroFactura = 'PEND-' . str_pad((string) $pedidoId, 8, '0', STR_PAD_LEFT);
        $stmt = $pdo->prepare("INSERT INTO facturas (pedido_id, numero, nombre_fiscal, nit_ci, direccion, total, estado_emision) VALUES (?, ?, ?, ?, ?, ?, 'Pendiente SIAT')");
        $stmt->execute([$pedidoId, $numeroFactura, $nombreFiscal, $nitCi, $direccionFiscal !== '' ? $direccionFiscal : null, $total]);
        $facturaId = $pdo->lastInsertId();
        $stmt = $pdo->prepare("INSERT INTO pagos (pedido_id, factura_id, metodo, monto, estado, pagado_en) VALUES (?, ?, ?, ?, 'Pagado', NOW())");
        $stmt->execute([$pedidoId, $facturaId, $metodoPago, $montoPago]);
        foreach ($productos as [$producto, $cantidad]) {
            $pdo->prepare('INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)')->execute([$pedidoId, $producto['id'], $cantidad, $producto['precio']]);
            if (!$registrarSalidaStock((int) $producto['id'], (int) $cantidad, (int) $pedidoId, (int) $currentUser['id'])) {
                $pdo->rollBack();
                jsonResponse(['ok' => false, 'mensaje' => 'El stock cambió mientras se registraba el pedido. Actualiza el inventario e inténtalo nuevamente.'], 409);
            }
        }
        $pdo->commit();
        jsonResponse(['ok' => true, 'id' => (int) $pedidoId, 'factura' => ['id' => (int) $facturaId, 'numero' => $numeroFactura]], 201);
    }

    if ($action === 'cambiar_estado') {
        $data = requestBody();
        $estados = ['Pendiente', 'Preparando', 'Entregado', 'Cancelado'];
        $estado = (string) ($data['estado'] ?? '');
        $pedidoId = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
        if ($pedidoId === false || $pedidoId < 1 || !in_array($estado, $estados, true)) {
            jsonResponse(['ok' => false, 'mensaje' => 'Estado inválido.'], 422);
        }
        $pdo->beginTransaction();
        $stmt = $pdo->prepare("SELECT p.estado, p.usuario_id, pa.estado AS estado_pago
            FROM pedidos p
            LEFT JOIN pagos pa ON pa.pedido_id = p.id
            WHERE p.id = ?
            FOR UPDATE");
        $stmt->execute([$pedidoId]);
        $pedido = $stmt->fetch();
        if (!$pedido) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se encontró el pedido.'], 404);
        }
        if ($pedido['estado'] === 'Cancelado' || $pedido['estado'] === 'Entregado') {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se puede cambiar un pedido que ya fue entregado o cancelado.'], 409);
        }
        if ($estado === 'Entregado' && $pedido['usuario_id'] === null && $pedido['estado_pago'] !== 'Pagado') {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'Registra primero el pago del pedido web antes de marcarlo como entregado.'], 409);
        }
        if ($estado === $pedido['estado']) {
            $pdo->rollBack();
            jsonResponse(['ok' => true]);
        }
        $stmt = $pdo->prepare('UPDATE pedidos SET estado = ? WHERE id = ?');
        $stmt->execute([$estado, $pedidoId]);
        if ($estado === 'Cancelado' && !$registrarReintegroPedido((int) $pedidoId, (int) $currentUser['id'])) {
            $pdo->rollBack();
            jsonResponse(['ok' => false, 'mensaje' => 'No se pudo identificar el lote original para devolver el stock. Contacta al administrador.'], 409);
        }
        $pdo->commit();
        jsonResponse([
            'ok' => true,
            'mensaje' => $estado === 'Cancelado' && $pedido['estado_pago'] === 'Pagado'
                ? 'Pedido cancelado. Si ya se había pagado, gestiona el reembolso por separado.'
                : 'Estado del pedido actualizado.',
        ]);
    }

    if ($action === 'reportes') {
        if ($currentUser['rol'] !== 'Administrador') {
            jsonResponse(['ok' => false, 'mensaje' => 'Solo un administrador puede consultar reportes.'], 403);
        }
        $summary = $pdo->query("SELECT COUNT(*) AS ventas, COALESCE(SUM(total), 0) AS ingresos FROM pedidos WHERE estado = 'Entregado'")->fetch();
        $summary['productos'] = (int) $pdo->query("SELECT COALESCE(SUM(d.cantidad), 0) FROM pedido_detalles d INNER JOIN pedidos p ON p.id = d.pedido_id WHERE p.estado = 'Entregado'")->fetchColumn();
        $summary['clientes'] = (int) $pdo->query('SELECT COUNT(*) FROM clientes')->fetchColumn();
        jsonResponse(['ok' => true, 'resumen' => $summary]);
    }

    jsonResponse(['ok' => false, 'mensaje' => 'Acción no encontrada.'], 404);
} catch (PDOException $exception) {
    if (is_string($archivoComprobanteGuardado) && is_file($archivoComprobanteGuardado)) {
        unlink($archivoComprobanteGuardado);
    }
    jsonResponse(['ok' => false, 'mensaje' => 'Error de base de datos.', 'detalle' => $exception->getMessage()], 500);
}