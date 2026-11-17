USE la_polar;

ALTER TABLE arqueos_caja
    ADD COLUMN efectivo_egresos DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER efectivo_ventas;

CREATE TABLE IF NOT EXISTS arqueo_egresos (
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
) ENGINE=InnoDB;
