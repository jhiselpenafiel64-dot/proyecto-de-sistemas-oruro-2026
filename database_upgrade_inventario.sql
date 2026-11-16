USE la_polar;

CREATE TABLE IF NOT EXISTS inventario_lotes (
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
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventario_movimientos (
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
) ENGINE=InnoDB;

INSERT INTO inventario_lotes
    (producto_id, cantidad_inicial, cantidad_disponible, fecha_ingreso, fecha_vencimiento, origen)
SELECT p.id, p.stock, p.stock, CURRENT_DATE, NULL, 'Inicial'
FROM productos p
WHERE NOT EXISTS (SELECT 1 FROM inventario_lotes l WHERE l.producto_id = p.id);

INSERT INTO inventario_movimientos
    (producto_id, lote_id, tipo, cantidad, fecha_movimiento, motivo, observacion)
SELECT l.producto_id, l.id, 'Inicial', l.cantidad_inicial, l.fecha_ingreso,
    'Migración de stock existente', 'Stock disponible antes del control por lotes'
FROM inventario_lotes l
WHERE l.origen = 'Inicial' AND l.cantidad_inicial > 0
    AND NOT EXISTS (
        SELECT 1 FROM inventario_movimientos m
        WHERE m.lote_id = l.id AND m.tipo = 'Inicial'
    );
