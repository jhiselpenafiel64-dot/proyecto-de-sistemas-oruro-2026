USE la_polar;

ALTER TABLE usuarios
    MODIFY rol ENUM('Administrador', 'Vendedor', 'Repartidor') NOT NULL DEFAULT 'Vendedor';

ALTER TABLE pedidos
    ADD COLUMN tipo_entrega ENUM('Retiro', 'Delivery') NOT NULL DEFAULT 'Retiro' AFTER total,
    ADD COLUMN direccion_entrega VARCHAR(255) NULL AFTER tipo_entrega,
    ADD COLUMN zona_entrega VARCHAR(100) NULL AFTER direccion_entrega,
    ADD COLUMN costo_delivery DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER zona_entrega,
    ADD COLUMN estado_entrega ENUM('Pendiente', 'En camino', 'Entregado') NOT NULL DEFAULT 'Pendiente' AFTER costo_delivery;

ALTER TABLE facturas
    ADD COLUMN estado_emision ENUM('Pendiente SIAT', 'Emitida', 'Error') NOT NULL DEFAULT 'Pendiente SIAT' AFTER total,
    ADD COLUMN cuf VARCHAR(100) NULL AFTER estado_emision,
    ADD COLUMN respuesta_siat MEDIUMTEXT NULL AFTER cuf;

CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    configuracion MEDIUMTEXT NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
