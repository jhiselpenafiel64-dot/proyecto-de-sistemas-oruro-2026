USE la_polar;

ALTER TABLE pedidos
    ADD COLUMN repartidor_id INT UNSIGNED NULL AFTER estado_entrega,
    ADD CONSTRAINT fk_pedidos_repartidor
        FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    ADD INDEX idx_pedidos_repartidor_delivery (repartidor_id, tipo_entrega, estado);
