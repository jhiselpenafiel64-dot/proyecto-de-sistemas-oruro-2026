USE la_polar;

ALTER TABLE pagos
    ADD COLUMN pagado_en DATETIME NULL AFTER estado,
    ADD INDEX idx_pagos_metodo_estado_pagado (metodo, estado, pagado_en);

UPDATE pagos
SET pagado_en = creado_en
WHERE estado = 'Pagado';

CREATE TABLE IF NOT EXISTS arqueos_caja (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_apertura_id INT UNSIGNED NOT NULL,
    usuario_cierre_id INT UNSIGNED NULL,
    efectivo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_ventas DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_contado DECIMAL(10,2) NULL,
    diferencia DECIMAL(10,2) NULL,
    apertura DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cierre DATETIME NULL,
    caja_activa TINYINT UNSIGNED GENERATED ALWAYS AS (IF(cierre IS NULL, 1, NULL)) STORED,
    UNIQUE KEY uq_arqueo_caja_activa (caja_activa),
    INDEX (apertura),
    FOREIGN KEY (usuario_apertura_id) REFERENCES usuarios(id),
    FOREIGN KEY (usuario_cierre_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;
