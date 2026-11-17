CREATE DATABASE IF NOT EXISTS la_polar
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE la_polar;

CREATE TABLE IF NOT EXISTS usuarios (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('Administrador', 'Vendedor', 'Repartidor') NOT NULL DEFAULT 'Vendedor',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_acceso DATETIME NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clientes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    telefono VARCHAR(30) NULL,
    correo VARCHAR(254) NULL UNIQUE,
    password_hash VARCHAR(255) NULL,
    origen_registro ENUM('pagina_cliente', 'empleado', 'desconocido') NOT NULL DEFAULT 'desconocido',
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contenido_inicio (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    contenido MEDIUMTEXT NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS productos (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion VARCHAR(255) NULL,
    categoria VARCHAR(50) NULL,
    precio DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock INT UNSIGNED NOT NULL DEFAULT 0,
    imagen VARCHAR(255) NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedidos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT UNSIGNED NOT NULL,
    usuario_id INT UNSIGNED NULL,
    estado ENUM('Pendiente', 'Preparando', 'Entregado', 'Cancelado') NOT NULL DEFAULT 'Pendiente',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    tipo_entrega ENUM('Retiro', 'Delivery') NOT NULL DEFAULT 'Retiro',
    direccion_entrega VARCHAR(255) NULL,
    zona_entrega VARCHAR(100) NULL,
    costo_delivery DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado_entrega ENUM('Pendiente', 'En camino', 'Entregado') NOT NULL DEFAULT 'Pendiente',
    repartidor_id INT UNSIGNED NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    INDEX (estado),
    INDEX (creado_en),
    INDEX (repartidor_id, tipo_entrega, estado)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pedido_detalles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id BIGINT UNSIGNED NOT NULL,
    producto_id INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) AS (cantidad * precio_unitario) STORED,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id),
    UNIQUE KEY pedido_producto (pedido_id, producto_id)
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS facturas (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id BIGINT UNSIGNED NOT NULL UNIQUE,
    numero VARCHAR(30) NOT NULL UNIQUE,
    nombre_fiscal VARCHAR(120) NOT NULL,
    nit_ci VARCHAR(30) NOT NULL,
    direccion VARCHAR(255) NULL,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado_emision ENUM('Pendiente SIAT', 'Emitida', 'Error') NOT NULL DEFAULT 'Pendiente SIAT',
    cuf VARCHAR(100) NULL,
    respuesta_siat MEDIUMTEXT NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pedido_id BIGINT UNSIGNED NOT NULL,
    factura_id BIGINT UNSIGNED NOT NULL,
    metodo ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'QR') NOT NULL,
    monto DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado ENUM('Pagado', 'Pendiente') NOT NULL DEFAULT 'Pagado',
    pagado_en DATETIME NULL,
    codigo_transaccion VARCHAR(100) NULL,
    comprobante_qr VARCHAR(255) NULL,
    creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE,
    INDEX (metodo, estado, pagado_en)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS arqueos_caja (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_apertura_id INT UNSIGNED NOT NULL,
    usuario_cierre_id INT UNSIGNED NULL,
    efectivo_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_ventas DECIMAL(10,2) NOT NULL DEFAULT 0,
    efectivo_egresos DECIMAL(10,2) NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS configuracion_empresa (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    configuracion MEDIUMTEXT NOT NULL,
    actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO usuarios (nombre, usuario, password_hash, rol) VALUES
    ('Administrador', 'admin', '$2y$10$cRIvZhL7zVpzeM5dg8obLOGE1.hglnND8/5/vX7JXnlZvRZKrQA3C', 'Administrador');

INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Café Americano', 'Café filtrado tradicional', 12.00, 50
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Café Americano');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Capuchino', 'Café con leche espumada', 18.00, 40
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Capuchino');
INSERT INTO productos (nombre, descripcion, precio, stock)
SELECT 'Torta de chocolate', 'Porción individual', 22.00, 25
WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Torta de chocolate');

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
SELECT 'Combo Dulce Vita', 'Combo de la casa', 55.00, 25 WHERE NOT EXISTS (SELECT 1 FROM productos WHERE nombre = 'Combo Dulce Vita');
