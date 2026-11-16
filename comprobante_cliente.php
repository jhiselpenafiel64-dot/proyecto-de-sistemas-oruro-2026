<?php
declare(strict_types=1);

session_start();
require_once __DIR__ . '/config.php';

$cliente = $_SESSION['cliente'] ?? null;
if (!is_array($cliente)) {
    http_response_code(401);
    exit('Inicia sesión en tu cuenta de cliente para consultar este comprobante.');
}
$pedidoId = filter_var($_GET['id'] ?? null, FILTER_VALIDATE_INT);
if ($pedidoId === false || $pedidoId < 1) {
    http_response_code(400);
    exit('Pedido inválido.');
}

$pdo = db();
$stmt = $pdo->prepare("SELECT p.id, p.cliente_id, p.total, p.creado_en, c.nombre AS cliente,
    c.telefono, f.numero AS numero_comprobante, f.nombre_fiscal, f.nit_ci, f.direccion,
    f.estado_emision, pa.metodo AS metodo_pago
    FROM pedidos p
    INNER JOIN clientes c ON c.id = p.cliente_id
    INNER JOIN facturas f ON f.pedido_id = p.id
    LEFT JOIN pagos pa ON pa.pedido_id = p.id
    INNER JOIN notificaciones_cliente n ON n.pedido_id = p.id AND n.cliente_id = p.cliente_id
    WHERE p.id = ? AND p.cliente_id = ? AND p.usuario_id IS NULL
    LIMIT 1");
$stmt->execute([$pedidoId, (int) $cliente['id']]);
$pedido = $stmt->fetch();
if (!$pedido) {
    http_response_code(404);
    exit('Este comprobante todavía no está disponible en tu cuenta.');
}

$stmt = $pdo->prepare("SELECT CASE WHEN pr.nombre = 'Combo La Polar' THEN 'Combo Dulce Vita' ELSE pr.nombre END AS nombre,
    d.cantidad, d.precio_unitario AS precio
    FROM pedido_detalles d
    INNER JOIN productos pr ON pr.id = d.producto_id
    WHERE d.pedido_id = ?
    ORDER BY d.id");
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
$totalItems = array_sum(array_map(static fn (array $producto): int => (int) $producto['cantidad'], $productos));
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Comprobante #<?= (int) $pedido['id'] ?> | <?= $escapar($nombreMarca) ?></title>
    <style>
        @page{size:80mm auto;margin:0}
        *{box-sizing:border-box}
        body{width:74mm;margin:0 auto;padding:4mm;color:#111;background:#fff;font:11px/1.35 Arial,sans-serif}
        header{text-align:center;border-bottom:1px dashed #555;padding-bottom:3mm;margin-bottom:3mm}
        header img{display:block;max-width:28mm;max-height:18mm;object-fit:contain;margin:0 auto 2mm}
        h1{font-size:15px;margin:1mm 0}
        h2{font-size:12px;margin:2mm 0}
        p{margin:1mm 0}
        .datos{display:grid;gap:1.5mm;margin:3mm 0}
        .datos p{overflow-wrap:anywhere}
        table{width:100%;border-collapse:collapse;table-layout:fixed;margin:3mm 0}
        th,td{padding:1.2mm .5mm;border-bottom:1px solid #bbb;text-align:left;vertical-align:top;overflow-wrap:anywhere}
        th{border-top:1px solid #555;border-bottom:1px solid #555}
        th:first-child,td:first-child{width:46%}
        th:nth-child(2),td:nth-child(2){width:12%}
        th:nth-child(3),td:nth-child(3){width:20%}
        th:nth-child(4),td:nth-child(4){width:22%}
        .numero{text-align:right}
        .total{display:flex;justify-content:space-between;border-top:1px solid #555;padding-top:2mm;font-size:16px;font-weight:bold}
        .aviso{text-align:center;border:1px solid #777;padding:2mm;margin:3mm 0;font-size:9px}
        footer{text-align:center;border-top:1px solid #aaa;padding-top:2mm;margin-top:4mm}
        .acciones{text-align:center;padding:4mm}
        @media print{.acciones{display:none}body{padding:2mm}}
    </style>
</head>
<body>
    <header>
        <img src="<?= $escapar($logoUrl) ?>" alt="Logo <?= $escapar($nombreMarca) ?>">
        <h1><?= $escapar($nombreMarca) ?></h1>
        <?php if (!empty($marca['lema'])): ?><p><?= $escapar($marca['lema']) ?></p><?php endif; ?>
        <?php if (!empty($empresa['razon_social'])): ?><p><?= $escapar($empresa['razon_social']) ?></p><?php endif; ?>
        <?php if (!empty($empresa['nit'])): ?><p>NIT: <?= $escapar($empresa['nit']) ?></p><?php endif; ?>
        <?php if (!empty($empresa['direccion'])): ?><p><?= $escapar($empresa['direccion']) ?></p><?php endif; ?>
        <?php if (!empty($marca['telefono'])): ?><p>Tel.: <?= $escapar($marca['telefono']) ?></p><?php endif; ?>
        <h2>COMPROBANTE DE VENTA</h2>
        <p>Pedido #<?= (int) $pedido['id'] ?></p>
    </header>
    <section class="datos">
        <p><strong>Fecha:</strong> <?= $escapar($pedido['creado_en']) ?></p>
        <p><strong>Cliente:</strong> <?= $escapar($pedido['cliente']) ?></p>
        <p><strong>Teléfono:</strong> <?= $escapar($pedido['telefono'] ?: '—') ?></p>
        <p><strong>Nombre / razón social:</strong> <?= $escapar($pedido['nombre_fiscal']) ?></p>
        <p><strong>NIT / CI:</strong> <?= $escapar($pedido['nit_ci']) ?></p>
        <?php if (!empty($pedido['direccion'])): ?><p><strong>Dirección:</strong> <?= $escapar($pedido['direccion']) ?></p><?php endif; ?>
        <p><strong>Forma de pago:</strong> <?= $escapar($pedido['metodo_pago'] ?: '—') ?></p>
        <p><strong>Estado SIAT:</strong> <?= $escapar($pedido['estado_emision']) ?></p>
    </section>
    <table>
        <thead><tr><th>Producto</th><th class="numero">Cant.</th><th class="numero">Precio</th><th class="numero">Subtotal</th></tr></thead>
        <tbody>
        <?php foreach ($productos as $producto): ?>
            <tr>
                <td><?= $escapar($producto['nombre']) ?></td>
                <td class="numero"><?= (int) $producto['cantidad'] ?></td>
                <td class="numero"><?= number_format((float) $producto['precio'], 2) ?></td>
                <td class="numero"><?= number_format((float) $producto['precio'] * (int) $producto['cantidad'], 2) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>
    <p><strong>Cantidad de artículos:</strong> <?= $totalItems ?></p>
    <p class="total"><span>Total</span><span><?= number_format((float) $pedido['total'], 2) ?> Bs.</span></p>
    <p class="aviso">COMPROBANTE INTERNO. NO ES FACTURA FISCAL. La factura electrónica estará disponible únicamente después de la autorización SIAT.</p>
    <footer><strong><?= $escapar($nombreMarca) ?></strong><br>Gracias por su compra</footer>
    <div class="acciones"><button type="button" onclick="window.print()">Imprimir comprobante</button></div>
</body>
</html>
