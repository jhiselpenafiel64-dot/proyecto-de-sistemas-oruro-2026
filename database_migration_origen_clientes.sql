USE la_polar;

SET @agregar_origen_registro = IF(
    (
        SELECT COUNT(*)
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'clientes'
          AND COLUMN_NAME = 'origen_registro'
    ) = 0,
    'ALTER TABLE clientes ADD COLUMN origen_registro ENUM(''pagina_cliente'', ''empleado'', ''desconocido'') NOT NULL DEFAULT ''desconocido''',
    'SELECT 1'
);
PREPARE migracion_origen_registro FROM @agregar_origen_registro;
EXECUTE migracion_origen_registro;
DEALLOCATE PREPARE migracion_origen_registro;

UPDATE clientes c
SET origen_registro = CASE
    WHEN (c.correo IS NOT NULL AND c.correo <> '')
      OR (c.password_hash IS NOT NULL AND c.password_hash <> '')
        THEN 'pagina_cliente'
    WHEN EXISTS (
        SELECT 1
        FROM pedidos p
        WHERE p.cliente_id = c.id
          AND p.usuario_id IS NOT NULL
    )
        THEN 'empleado'
    ELSE 'desconocido'
END
WHERE c.origen_registro = 'desconocido';
