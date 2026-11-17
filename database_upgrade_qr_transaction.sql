USE la_polar;

ALTER TABLE pagos
    ADD COLUMN codigo_transaccion VARCHAR(100) NULL AFTER estado;
