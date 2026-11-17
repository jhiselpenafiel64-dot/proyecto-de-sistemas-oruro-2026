USE la_polar;

CREATE TABLE IF NOT EXISTS contenido_inicio (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    contenido MEDIUMTEXT NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE clientes
    MODIFY telefono VARCHAR(30) NULL;

ALTER TABLE clientes
    ADD COLUMN correo VARCHAR(254) NULL,
    ADD COLUMN password_hash VARCHAR(255) NULL,
    ADD UNIQUE KEY uq_clientes_correo (correo);

ALTER TABLE pedidos
    DROP FOREIGN KEY pedidos_ibfk_2,
    MODIFY usuario_id INT UNSIGNED NULL,
    ADD CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

ALTER TABLE productos
    ADD COLUMN categoria VARCHAR(50) NULL AFTER descripcion;

ALTER TABLE productos
    ADD COLUMN imagen VARCHAR(255) NULL AFTER stock;

INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta Pistachon', 'Torta artesanal', 29.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta Pistachon');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta Cocolemon', 'Torta artesanal', 189.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta Cocolemon');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta Brownie', 'Torta artesanal', 229.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta Brownie');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta Selva Negra', 'Torta artesanal', 220.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta Selva Negra');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta Tres Leches', 'Torta artesanal', 200.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta Tres Leches');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Espresso', 'Café espresso', 12.00, 50 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Espresso');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Americano', 'Café americano', 15.00, 50 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Americano');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Espresso Cortado', 'Café espresso con leche', 18.00, 40 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Espresso Cortado');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Espresso Panna', 'Café espresso con crema', 22.00, 40 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Espresso Panna');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Espresso Affogato', 'Espresso con helado', 25.00, 40 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Espresso Affogato');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Frappé Latte', 'Bebida fría de café', 35.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Frappé Latte');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Frappé Oreo', 'Bebida fría con Oreo', 38.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Frappé Oreo');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Frappé Chocolate', 'Bebida fría de chocolate', 35.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Frappé Chocolate');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Bubba Blueberry', 'Bebida de blueberry', 30.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Bubba Blueberry');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Bubba Latte', 'Bebida de café y tapioca', 32.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Bubba Latte');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Bubba Matcha', 'Bebida de matcha y tapioca', 35.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Bubba Matcha');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Crepe Chocolate', 'Crepe artesanal', 35.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Crepe Chocolate');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Crepe Frutilla', 'Crepe artesanal', 38.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Crepe Frutilla');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Crepe Especial', 'Crepe artesanal', 45.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Crepe Especial');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Brownie', 'Brownie artesanal', 20.00, 30 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Brownie');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Galleta Artesanal', 'Galleta artesanal', 12.00, 40 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Galleta Artesanal');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Cheesecake', 'Porción de cheesecake', 35.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Cheesecake');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Panini Clasico', 'Panini artesanal', 35.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Panini Clasico');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Panini Especial', 'Panini artesanal', 45.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Panini Especial');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Combo Dulce Vita', 'Combo de la casa', 55.00, 25
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre IN ('Combo Dulce Vita', 'Combo La Polar'));