USE la_polar;

CREATE TABLE IF NOT EXISTS notificaciones_cliente (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    pedido_id BIGINT UNSIGNED NOT NULL UNIQUE,
    creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leida_en TIMESTAMP NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    INDEX (cliente_id, leida_en, creada_en)
) ENGINE=InnoDB;
