<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/config.php';
$pedidoId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($pedidoId === false || $pedidoId < 1) {
    http_response_code(400);
    exit('Pedido inválido.');
}
$pdo = db();
$stmt = $pdo->prepare("SELECT p.id, p.cliente_id, p.estado, p.total, p.tipo_entrega, p.direccion_entrega,
    p.zona_entrega, p.costo_delivery, p.creado_en, c.nombre AS cliente, c.telefono,
    f.nombre_fiscal, f.nit_ci, pa.metodo AS metodo_pago, pa.estado AS estado_pago
    FROM pedidos p INNER JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN facturas f ON f.pedido_id = p.id LEFT JOIN pagos pa ON pa.pedido_id = p.id
    WHERE p.id = ? AND p.usuario_id IS NULL LIMIT 1");
$stmt->execute([$pedidoId]);
$pedido = $stmt->fetch();
if (!$pedido) {
    http_response_code(404);
    exit('No se encontró el pedido.');
}
$cliente = $_SESSION['cliente'] ?? null;
$usuario = $_SESSION['usuario'] ?? null;
$esPropietario = is_array($cliente) && (int) $cliente['id'] === (int) $pedido['cliente_id'];
$esPersonal = is_array($usuario) && in_array($usuario['rol'] ?? '', ['Administrador', 'Vendedor'], true);
if (!$esPropietario && !$esPersonal) {
    http_response_code(403);
    exit('No tienes permiso para ver este comprobante.');
}
if ($pedido['tipo_entrega'] !== 'Retiro' || $pedido['metodo_pago'] !== 'Efectivo') {
    http_response_code(409);
    exit('Este pedido no corresponde a un comprobante de efectivo para retiro en tienda.');
}
if ($pedido['estado_pago'] !== 'Pendiente') {
    http_response_code(409);
    exit('El pago ya fue registrado. Consulta tu cuenta para ver el estado de la factura electrónica.');
}
$stmt = $pdo->prepare("SELECT pr.nombre, d.cantidad, d.precio_unitario
    FROM pedido_detalles d INNER JOIN productos pr ON pr.id = d.producto_id
    WHERE d.pedido_id = ? ORDER BY d.id");
$stmt->execute([$pedidoId]);
$productos = $stmt->fetchAll();
$filaConfig = $pdo->query('SELECT configuracion FROM configuracion_empresa WHERE id = 1')->fetch();
$configuracion = $filaConfig ? json_decode((string) $filaConfig['configuracion'], true) : [];
$marca = is_array($configuracion) && is_array($configuracion['marca'] ?? null) ? $configuracion['marca'] : [];
$empresa = is_array($configuracion) && is_array($configuracion['empresa'] ?? null) ? $configuracion['empresa'] : [];
$nombreMarca = (string) ($marca['nombre'] ?? 'Dulce Vita');
$logo = (string) ($marca['logo'] ?? '');
$logoUrl = $logo !== '' ? 'la%20polar/' . str_replace(' ', '%20', $logo) : 'logo.png';
$escapar = static fn ($valor): string => htmlspecialchars((string) $valor, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprobante de pedido #<?= (int) $pedido['id'] ?> | <?= $escapar($nombreMarca) ?></title>
    <style>
        @page{size:80mm auto;margin:4mm}
        body{font:12px/1.4 monospace;color:#111;margin:0 auto;width:72mm}
        header{text-align:center;border-bottom:1px dashed #111;padding-bottom:8px}
        header img{max-width:32mm;max-height:24mm;object-fit:contain}
        h1{font-size:16px;margin:4px 0}
        h2{font-size:13px;text-align:center;margin:8px 0}
        p{margin:3px 0}
        table{width:100%;border-collapse:collapse}
        th,td{text-align:left;padding:3px 0;vertical-align:top}
        .number{text-align:right;white-space:nowrap}
        .line{border-top:1px dashed #111;margin:7px 0}
        .total{font-weight:bold;font-size:14px}
        .no-fiscal{text-align:center;font-weight:bold;border:1px solid #111;padding:5px;margin-top:9px}
        .actions{text-align:center;margin:16px}
        @media print{.actions{display:none}body{width:auto}}
    </style>
</head>
<body>
    <header>
        <img src="<?= $escapar($logoUrl) ?>" alt="Logo <?= $escapar($nombreMarca) ?>">
        <h1><?= $escapar($nombreMarca) ?></h1>
        <p><?= $escapar($marca['lema'] ?? '') ?></p>
        <?php if (!empty($empresa['razon_social'])): ?><p><?= $escapar($empresa['razon_social']) ?></p><?php endif; ?>
        <?php if (!empty($empresa['nit'])): ?><p>NIT: <?= $escapar($empresa['nit']) ?></p><?php endif; ?>
        <?php if (!empty($empresa['direccion'])): ?><p><?= $escapar($empresa['direccion']) ?></p><?php endif; ?>
        <h2>COMPROBANTE DE PEDIDO</h2>
    </header>
    <p>Pedido: #<?= (int) $pedido['id'] ?></p>
    <p>Fecha: <?= $escapar($pedido['creado_en']) ?></p>
    <p>Cliente: <?= $escapar($pedido['cliente']) ?></p>
    <p>Teléfono: <?= $escapar($pedido['telefono'] ?? '—') ?></p>
    <p>Pago: Efectivo en tienda</p>
    <div class="line"></div>
    <table>
        <thead><tr><th>Producto</th><th class="number">Cant.</th><th class="number">Subtotal</th></tr></thead>
        <tbody>
        <?php foreach ($productos as $producto): ?>
            <tr>
                <td><?= $escapar($producto['nombre']) ?><br><?= number_format((float) $producto['precio_unitario'], 2) ?> Bs. c/u</td>
                <td class="number"><?= (int) $producto['cantidad'] ?></td>
                <td class="number"><?= number_format((float) $producto['precio_unitario'] * (int) $producto['cantidad'], 2) ?> Bs.</td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <div class="line"></div>
    <?php if ((float) $pedido['costo_delivery'] > 0): ?>
        <p>Delivery: <?= number_format((float) $pedido['costo_delivery'], 2) ?> Bs.</p>
    <?php endif; ?>
    <p class="total">TOTAL: <?= number_format((float) $pedido['total'], 2) ?> Bs.</p>
    <p>Estado del pedido: <?= $escapar($pedido['estado']) ?></p>
    <div class="no-fiscal">NO ES FACTURA FISCAL. PAGO PENDIENTE EN TIENDA.</div>
    <div class="actions"><button type="button" onclick="window.print()">Imprimir comprobante</button></div>
    <?php if (($_GET['imprimir'] ?? '') === '1'): ?>
        <script>window.addEventListener("load",()=>window.print());</script>
    <?php endif; ?>
</body>
</html>
