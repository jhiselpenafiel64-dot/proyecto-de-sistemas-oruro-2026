<?php
declare(strict_types=1);

define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
define('DB_NAME', getenv('DB_NAME') ?: 'la_polar');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');

function db(): PDO
{
    static $connection;

    if ($connection instanceof PDO) {
        return $connection;
    }

    $connection = new PDO(
        'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASSWORD,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false]
    );
    return $connection;
}

function ensureInventarioSchema(PDO $connection): void
{
    $lockName = 'la_polar_inventario_schema';
    $lock = $connection->prepare('SELECT GET_LOCK(?, 10)');
    $lock->execute([$lockName]);
    if ((int) $lock->fetchColumn() !== 1) {
        jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar automáticamente la base de datos del inventario. Intenta nuevamente.'], 503);
    }

    try {
        $connection->exec("CREATE TABLE IF NOT EXISTS inventario_lotes (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            producto_id INT UNSIGNED NOT NULL,
            cantidad_inicial INT UNSIGNED NOT NULL,
            cantidad_disponible INT UNSIGNED NOT NULL,
            fecha_ingreso DATE NOT NULL,
            fecha_vencimiento DATE NULL,
            origen ENUM('Inicial', 'Entrada') NOT NULL DEFAULT 'Entrada',
            usuario_id INT UNSIGNED NULL,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
            INDEX idx_inventario_lote_stock (producto_id, cantidad_disponible, fecha_vencimiento)
        ) ENGINE=InnoDB");
        $connection->exec("CREATE TABLE IF NOT EXISTS inventario_movimientos (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            producto_id INT UNSIGNED NOT NULL,
            lote_id BIGINT UNSIGNED NULL,
            pedido_id BIGINT UNSIGNED NULL,
            usuario_id INT UNSIGNED NULL,
            tipo ENUM('Entrada', 'Salida', 'Baja', 'Reintegro', 'Inicial') NOT NULL,
            cantidad INT UNSIGNED NOT NULL,
            fecha_movimiento DATE NOT NULL,
            motivo VARCHAR(50) NULL,
            observacion VARCHAR(255) NULL,
            creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (producto_id) REFERENCES productos(id),
            FOREIGN KEY (lote_id) REFERENCES inventario_lotes(id) ON DELETE SET NULL,
            FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE SET NULL,
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
            INDEX idx_inventario_movimiento_fecha (fecha_movimiento, tipo),
            INDEX idx_inventario_movimiento_producto (producto_id, fecha_movimiento),
            INDEX idx_inventario_movimiento_pedido (pedido_id, tipo)
        ) ENGINE=InnoDB");
        $connection->exec("INSERT INTO inventario_lotes
            (producto_id, cantidad_inicial, cantidad_disponible, fecha_ingreso, fecha_vencimiento, origen)
            SELECT p.id, p.stock, p.stock, CURRENT_DATE, NULL, 'Inicial'
            FROM productos p
            WHERE NOT EXISTS (SELECT 1 FROM inventario_lotes l WHERE l.producto_id = p.id)");
        $connection->exec("INSERT INTO inventario_movimientos
            (producto_id, lote_id, tipo, cantidad, fecha_movimiento, motivo, observacion)
            SELECT l.producto_id, l.id, 'Inicial', l.cantidad_inicial, l.fecha_ingreso,
                'Migración de stock existente', 'Stock disponible antes del control por lotes'
            FROM inventario_lotes l
            WHERE l.origen = 'Inicial' AND l.cantidad_inicial > 0
                AND NOT EXISTS (
                    SELECT 1 FROM inventario_movimientos m
                    WHERE m.lote_id = l.id AND m.tipo = 'Inicial'
                )");
    } finally {
        $release = $connection->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
}

function ensureArqueoSchema(PDO $connection): void
{
    $lockName = 'la_polar_arqueo_schema';
    $lock = $connection->prepare('SELECT GET_LOCK(?, 10)');
    $lock->execute([$lockName]);
    if ((int) $lock->fetchColumn() !== 1) {
        jsonResponse(['ok' => false, 'mensaje' => 'No se pudo preparar automáticamente la base de datos del arqueo. Intenta nuevamente.'], 503);
    }

    $columnExists = static function (string $table, string $column) use ($connection): bool {
        $stmt = $connection->prepare('SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
        $stmt->execute([$table, $column]);
        return (int) $stmt->fetchColumn() > 0;
    };

    $tableExists = static function (string $table) use ($connection): bool {
        $stmt = $connection->prepare('SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = DATABASE() AND table_name = ?');
        $stmt->execute([$table]);
        return (int) $stmt->fetchColumn() > 0;
    };

    try {
        if (!$columnExists('pagos', 'pagado_en')) {
            $connection->exec('ALTER TABLE pagos ADD COLUMN pagado_en DATETIME NULL AFTER estado');
            $connection->exec("UPDATE pagos SET pagado_en = creado_en WHERE estado = 'Pagado' AND pagado_en IS NULL");
        }

        $index = $connection->prepare('SELECT COUNT(*) FROM information_schema.statistics
            WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?');
        $index->execute(['pagos', 'idx_pagos_metodo_estado_pagado']);
        if ((int) $index->fetchColumn() === 0) {
            $connection->exec('ALTER TABLE pagos ADD INDEX idx_pagos_metodo_estado_pagado (metodo, estado, pagado_en)');
        }

        if (!$tableExists('arqueos_caja')) {
            $connection->exec("CREATE TABLE arqueos_caja (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                usuario_apertura_id INT UNSIGNED NOT NULL,
                usuario_cierre_id INT UNSIGNED NULL,
                efectivo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
                efectivo_ventas DECIMAL(10,2) NOT NULL DEFAULT 0,
                efectivo_egresos DECIMAL(10,2) NOT NULL DEFAULT 0,
                efectivo_contado DECIMAL(10,2) NULL,
                diferencia DECIMAL(10,2) NULL,
                apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                cierre DATETIME NULL,
                caja_activa TINYINT UNSIGNED GENERATED ALWAYS AS (IF(cierre IS NULL, 1, NULL)) STORED,
                UNIQUE KEY uq_arqueo_caja_activa (caja_activa),
                INDEX (apertura),
                FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id),
                FOREIGN KEY (usuario_cierre_id) REFERENCES usuarios(id) ON DELETE SET NULL
            ) ENGINE=InnoDB");
        } elseif (!$columnExists('arqueos_caja', 'efectivo_egresos')) {
            $connection->exec('ALTER TABLE arqueos_caja ADD COLUMN efectivo_egresos DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER efectivo_ventas');
        }

        if (!$tableExists('arqueo_egresos')) {
            $connection->exec("CREATE TABLE arqueo_egresos (
                id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
                arqueo_caja_id BIGINT UNSIGNED NOT NULL,
                usuario_id INT UNSIGNED NULL,
                categoria VARCHAR(60) NOT NULL,
                concepto VARCHAR(160) NOT NULL,
                monto DECIMAL(10,2) NOT NULL,
                creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (arqueo_caja_id) REFERENCES arqueos_caja(id),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
                INDEX (arqueo_caja_id, creado_en)
            ) ENGINE=InnoDB");
        }
    } finally {
        $release = $connection->prepare('SELECT RELEASE_LOCK(?)');
        $release->execute([$lockName]);
    }
}

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requestBody(): array
{
    $body = json_decode(file_get_contents('php://input'), true);
    return is_array($body) ? $body : $_POST;
}

function requireLogin(): array
{
    if (empty($_SESSION['usuario'])) {
        jsonResponse(['ok' => false, 'mensaje' => 'Sesión no autorizada.'], 401);
    }
    return $_SESSION['usuario'];
}