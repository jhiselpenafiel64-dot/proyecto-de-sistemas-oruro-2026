USE la_polar;

ALTER TABLE pagos
    ADD COLUMN comprobante_qr VARCHAR(255) NULL AFTER codigo_transaccion;
