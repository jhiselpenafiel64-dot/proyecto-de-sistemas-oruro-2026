-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 17-11-2026 a las 00:57:46
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `la_polar`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `arqueos_caja`
--

CREATE TABLE `arqueos_caja` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `usuario_apertura_id` int(10) UNSIGNED NOT NULL,
  `usuario_cierre_id` int(10) UNSIGNED DEFAULT NULL,
  `efectivo_inicial` decimal(10,2) NOT NULL DEFAULT 0.00,
  `efectivo_ventas` decimal(10,2) NOT NULL DEFAULT 0.00,
  `efectivo_egresos` decimal(10,2) NOT NULL DEFAULT 0.00,
  `efectivo_contado` decimal(10,2) DEFAULT NULL,
  `diferencia` decimal(10,2) DEFAULT NULL,
  `apertura` datetime NOT NULL DEFAULT current_timestamp(),
  `cierre` datetime DEFAULT NULL,
  `caja_activa` tinyint(3) UNSIGNED GENERATED ALWAYS AS (if(`cierre` is null,1,NULL)) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `arqueos_caja`
--

INSERT INTO `arqueos_caja` (`id`, `usuario_apertura_id`, `usuario_cierre_id`, `efectivo_inicial`, `efectivo_ventas`, `efectivo_egresos`, `efectivo_contado`, `diferencia`, `apertura`, `cierre`) VALUES
(1, 1, NULL, 1000.00, 0.00, 0.00, NULL, NULL, '2026-10-26 11:33:16', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `arqueo_egresos`
--

CREATE TABLE `arqueo_egresos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `arqueo_caja_id` bigint(20) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `categoria` varchar(60) NOT NULL,
  `concepto` varchar(160) NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `clientes`
--

CREATE TABLE `clientes` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `telefono` varchar(30) NOT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `correo` varchar(254) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `origen_registro` enum('pagina_cliente','empleado','desconocido') NOT NULL DEFAULT 'desconocido'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `clientes`
--

INSERT INTO `clientes` (`id`, `nombre`, `telefono`, `creado_en`, `correo`, `password_hash`, `origen_registro`) VALUES
(1, 'juan perez', '6787654', '2026-09-20 22:08:41', NULL, NULL, 'empleado'),
(2, 'Maria Lopez', '654565', '2026-09-20 22:27:41', NULL, NULL, 'empleado'),
(3, 'Martin Cabrera', '7545655', '2026-09-20 22:34:53', NULL, NULL, 'empleado'),
(4, 'Soledad Mamani', '7654478', '2026-09-20 22:45:11', NULL, NULL, 'empleado'),
(6, 'Juan Perez', '789876', '2026-10-01 00:14:53', 'juan@ejemplo.com', '$2y$10$OVals2nWo675nw60Yz0TN.8SrFDxwZTPSJYqReApKdYdCGOQE4NhS', 'pagina_cliente');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `configuracion_empresa`
--

CREATE TABLE `configuracion_empresa` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `configuracion` mediumtext NOT NULL,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `configuracion_empresa`
--

INSERT INTO `configuracion_empresa` (`id`, `configuracion`, `actualizado_en`) VALUES
(1, '{\"marca\":{\"nombre\":\"Dulce Vita\",\"lema\":\"Café y pastelería artesanal\",\"logo\":\"..\\/logo.png\",\"color_principal\":\"#6b2635\",\"color_secundario\":\"#c9a45c\",\"telefono\":\"\",\"correo\":\"\"},\"empresa\":{\"razon_social\":\"VITA SRL\",\"nit\":\"1007945676\",\"direccion\":\"La plata y Bolivar\",\"municipio\":\"ORURO\",\"telefono\":\"565432\",\"correo\":\"vita@ejemplo.com\"},\"qr\":\"uploads\\/configuracion\\/83d01240c37cce2cd18f26e227c5b48b.png\",\"zonas_delivery\":[{\"nombre\":\"Central\",\"costo\":10,\"activa\":true}]}', '2026-10-18 01:27:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `contenido_inicio`
--

CREATE TABLE `contenido_inicio` (
  `id` tinyint(3) UNSIGNED NOT NULL,
  `contenido` mediumtext NOT NULL,
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `contenido_inicio`
--

INSERT INTO `contenido_inicio` (`id`, `contenido`, `actualizado_en`) VALUES
(1, '{\"hero_titulo\":\"Dulce Vita\",\"hero_subtitulo\":\"Cafe & Pasteleria\",\"hero_descripcion\":\"Disfruta cafes, postres y momentos especiales en un ambiente calido y elegante.\",\"hero_boton\":\"Ver catalogo\",\"promociones_titulo\":\"Promociones especiales\",\"destacados_titulo\":\"Productos destacados\",\"destacado_1_titulo\":\"Tortas\",\"destacado_1_descripcion\":\"Postres artesanales preparados con ingredientes seleccionados.\",\"destacado_2_titulo\":\"Frappes\",\"destacado_2_descripcion\":\"Bebidas frías con sabores especiales.\",\"destacado_3_titulo\":\"Bubbas\",\"destacado_3_descripcion\":\"Bebidas modernas con combinaciones únicas.\",\"destacado_4_titulo\":\"Crepes\",\"destacado_4_descripcion\":\"Opciones dulces para disfrutar.\",\"contacto_titulo\":\"Visítanos\",\"contacto_direccion\":\"6 de Octubre, Parque de la Union Oruro, Bolivia\",\"contacto_dias\":\"Lunes a Domingo\",\"contacto_horario\":\"10:00 - 23:30\",\"contacto_boton\":\"Realizar pedido\",\"footer_descripcion\":\"Café y pastelería artesanal.\",\"footer_horario\":\"10:00 - 23:30\",\"footer_direccion\":\"6 de Octubre, Parque de la Union Oruro, Bolivia\",\"footer_sucursal\":\"Sucursal principal\",\"footer_telefono\":\"67876543\",\"footer_redes\":\"https:\\/www.facebook.com\\/vita\",\"footer_copyright\":\"© 2026 Ester & Jhisel\",\"destacado_1_imagen\":\"torta1.jpg\",\"destacado_2_imagen\":\"frapec.jpg\",\"destacado_3_imagen\":\"bubba.jpg\",\"destacado_4_imagen\":\"crepe.jpg\",\"contacto_imagen\":\"uploads\\/inicio\\/3ebc67dd756946c1e413fa98b93ee6d2.jpg\",\"hero_imagen_1\":\"uploads\\/inicio\\/2579ce8a544688ac1e20a1e1f53ce7c3.jpg\",\"hero_imagen_2\":\"imgsucursal3.jpg\",\"hero_imagen_3\":\"uploads\\/inicio\\/c411196e3a41d2c0f8f4e8f365aac49b.jpg\",\"hero_imagen_4\":\"imgsucursal.jpg\",\"hero_slides\":[{\"imagen\":\"uploads\\/inicio\\/2579ce8a544688ac1e20a1e1f53ce7c3.jpg\"},{\"imagen\":\"imgsucursal3.jpg\"},{\"imagen\":\"uploads\\/inicio\\/c411196e3a41d2c0f8f4e8f365aac49b.jpg\"},{\"imagen\":\"imgsucursal.jpg\"}],\"destacados\":[{\"titulo\":\"Tortas\",\"descripcion\":\"Postres artesanales preparados con ingredientes seleccionados.\",\"imagen\":\"torta1.jpg\"},{\"titulo\":\"Frappes\",\"descripcion\":\"Bebidas frías con sabores especiales.\",\"imagen\":\"frapec.jpg\"},{\"titulo\":\"Bubbas\",\"descripcion\":\"Bebidas modernas con combinaciones únicas.\",\"imagen\":\"bubba.jpg\"},{\"titulo\":\"Crepes\",\"descripcion\":\"Opciones dulces para disfrutar.\",\"imagen\":\"crepe.jpg\"}],\"promociones\":[{\"titulo\":\"Promoción especial\",\"descripcion\":\"Descubre nuestras ofertas y combos especiales. Consulta en tienda por las promociones vigentes.\",\"imagen\":\"historia2.jpg\"}]}', '2026-10-23 22:35:08');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `facturas`
--

CREATE TABLE `facturas` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pedido_id` bigint(20) UNSIGNED NOT NULL,
  `numero` varchar(30) NOT NULL,
  `nombre_fiscal` varchar(120) NOT NULL,
  `nit_ci` varchar(30) NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado_emision` enum('Pendiente SIAT','Emitida','Error') NOT NULL DEFAULT 'Pendiente SIAT',
  `cuf` varchar(100) DEFAULT NULL,
  `respuesta_siat` mediumtext DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `facturas`
--

INSERT INTO `facturas` (`id`, `pedido_id`, `numero`, `nombre_fiscal`, `nit_ci`, `direccion`, `total`, `estado_emision`, `cuf`, `respuesta_siat`, `creado_en`) VALUES
(1, 2, 'F-00000002', 'Lopez', '67654', 'Linares y Baptista', 54.00, 'Pendiente SIAT', NULL, NULL, '2026-09-20 22:27:41'),
(2, 3, 'F-00000003', 'Cabrera', '566543', 'La plata y Boliovar', 22.00, 'Pendiente SIAT', NULL, NULL, '2026-09-20 22:34:53'),
(3, 4, 'F-00000004', 'ENDE', '12345675', 'Av. España', 60.00, 'Pendiente SIAT', NULL, NULL, '2026-09-20 22:45:11'),
(5, 6, 'F-00000006', 'Juan Perez', '1234567890', 'la plata', 229.00, 'Pendiente SIAT', NULL, NULL, '2026-10-01 00:15:43'),
(7, 8, 'F-00000008', 'Juan Perez', '123456789', 'la plata', 20.00, 'Pendiente SIAT', NULL, NULL, '2026-10-01 00:34:37'),
(8, 9, 'F-00000009', 'Juan Perez', '1235', 'la plata', 38.00, 'Pendiente SIAT', NULL, NULL, '2026-10-01 00:38:31'),
(9, 10, 'F-00000010', 'Juan Perez', '45677', NULL, 30.00, 'Pendiente SIAT', NULL, NULL, '2026-10-17 23:59:19'),
(10, 11, 'PEND-00000011', 'Juan Perez', '543535', 'la plata', 15.00, 'Pendiente SIAT', NULL, NULL, '2026-10-18 01:21:05'),
(13, 15, 'PEND-00000015', 'Juan Perez', '34566', 'la plata y bolivar', 42.00, 'Pendiente SIAT', NULL, NULL, '2026-10-18 21:09:47'),
(14, 16, 'PEND-00000016', 'Juan Perez', '1321412421', NULL, 32.00, 'Pendiente SIAT', NULL, NULL, '2026-10-20 00:19:56'),
(15, 17, 'PEND-00000017', 'Juan Perez', '465465474', NULL, 130.00, 'Pendiente SIAT', NULL, NULL, '2026-10-20 00:21:55'),
(16, 18, 'PEND-00000018', 'Juan Perez', '1234567890', 'la plata y bolivar', 45.00, 'Pendiente SIAT', NULL, NULL, '2026-10-23 21:24:51'),
(17, 19, 'PEND-00000019', 'Juan Perez', '1234567890', 'la plata y bolivar', 35.00, 'Pendiente SIAT', NULL, NULL, '2026-10-23 21:48:54'),
(18, 20, 'PEND-00000020', 'Juan Perez', '543535', 'la plata', 30.00, 'Pendiente SIAT', NULL, NULL, '2026-10-23 22:25:46'),
(19, 21, 'PEND-00000021', 'Juan Perez', '34566', 'la plata', 32.00, 'Pendiente SIAT', NULL, NULL, '2026-10-23 22:32:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_lotes`
--

CREATE TABLE `inventario_lotes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `cantidad_inicial` int(10) UNSIGNED NOT NULL,
  `cantidad_disponible` int(10) UNSIGNED NOT NULL,
  `fecha_ingreso` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `origen` enum('Inicial','Entrada') NOT NULL DEFAULT 'Entrada',
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inventario_lotes`
--

INSERT INTO `inventario_lotes` (`id`, `producto_id`, `cantidad_inicial`, `cantidad_disponible`, `fecha_ingreso`, `fecha_vencimiento`, `origen`, `usuario_id`, `creado_en`) VALUES
(1, 1, 45, 45, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(2, 2, 36, 36, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(3, 3, 24, 24, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(4, 7, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(5, 8, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(6, 9, 24, 24, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(7, 10, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(8, 11, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(9, 12, 50, 50, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(10, 13, 47, 47, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(11, 14, 40, 40, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(12, 15, 40, 40, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(13, 16, 40, 40, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(14, 17, 30, 30, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(15, 18, 30, 30, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(16, 19, 30, 30, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(17, 20, 27, 27, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(18, 21, 28, 28, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(19, 22, 30, 30, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(20, 23, 24, 24, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(21, 24, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(22, 25, 24, 24, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(23, 26, 27, 27, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(24, 27, 40, 40, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(25, 28, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(26, 29, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(27, 30, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47'),
(28, 31, 25, 25, '2026-10-27', NULL, 'Inicial', NULL, '2026-10-27 22:06:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario_movimientos`
--

CREATE TABLE `inventario_movimientos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `lote_id` bigint(20) UNSIGNED DEFAULT NULL,
  `pedido_id` bigint(20) UNSIGNED DEFAULT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `tipo` enum('Entrada','Salida','Baja','Reintegro','Inicial') NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL,
  `fecha_movimiento` date NOT NULL,
  `motivo` varchar(50) DEFAULT NULL,
  `observacion` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inventario_movimientos`
--

INSERT INTO `inventario_movimientos` (`id`, `producto_id`, `lote_id`, `pedido_id`, `usuario_id`, `tipo`, `cantidad`, `fecha_movimiento`, `motivo`, `observacion`, `creado_en`) VALUES
(1, 1, 1, NULL, NULL, 'Inicial', 45, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(2, 2, 2, NULL, NULL, 'Inicial', 36, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(3, 3, 3, NULL, NULL, 'Inicial', 24, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(4, 7, 4, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(5, 8, 5, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(6, 9, 6, NULL, NULL, 'Inicial', 24, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(7, 10, 7, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(8, 11, 8, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(9, 12, 9, NULL, NULL, 'Inicial', 50, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(10, 13, 10, NULL, NULL, 'Inicial', 47, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(11, 14, 11, NULL, NULL, 'Inicial', 40, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(12, 15, 12, NULL, NULL, 'Inicial', 40, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(13, 16, 13, NULL, NULL, 'Inicial', 40, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(14, 17, 14, NULL, NULL, 'Inicial', 30, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(15, 18, 15, NULL, NULL, 'Inicial', 30, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(16, 19, 16, NULL, NULL, 'Inicial', 30, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(17, 20, 17, NULL, NULL, 'Inicial', 27, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(18, 21, 18, NULL, NULL, 'Inicial', 28, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(19, 22, 19, NULL, NULL, 'Inicial', 30, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(20, 23, 20, NULL, NULL, 'Inicial', 24, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(21, 24, 21, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(22, 25, 22, NULL, NULL, 'Inicial', 24, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(23, 26, 23, NULL, NULL, 'Inicial', 27, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(24, 27, 24, NULL, NULL, 'Inicial', 40, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(25, 28, 25, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(26, 29, 26, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(27, 30, 27, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47'),
(28, 31, 28, NULL, NULL, 'Inicial', 25, '2026-10-27', 'Migración de stock existente', 'Stock disponible antes del control por lotes', '2026-10-27 22:06:47');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notificaciones_cliente`
--

CREATE TABLE `notificaciones_cliente` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cliente_id` int(10) UNSIGNED NOT NULL,
  `pedido_id` bigint(20) UNSIGNED NOT NULL,
  `creada_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `leida_en` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `notificaciones_cliente`
--

INSERT INTO `notificaciones_cliente` (`id`, `cliente_id`, `pedido_id`, `creada_en`, `leida_en`) VALUES
(3, 6, 11, '2026-10-18 20:37:25', '2026-10-18 20:38:04'),
(4, 6, 15, '2026-10-18 21:11:00', '2026-10-18 21:11:29'),
(6, 6, 16, '2026-10-20 00:20:46', NULL),
(7, 6, 17, '2026-10-20 00:23:05', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pagos`
--

CREATE TABLE `pagos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pedido_id` bigint(20) UNSIGNED NOT NULL,
  `factura_id` bigint(20) UNSIGNED NOT NULL,
  `metodo` enum('Efectivo','Tarjeta','Transferencia','QR') NOT NULL,
  `monto` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado` enum('Pagado','Pendiente') NOT NULL DEFAULT 'Pagado',
  `pagado_en` datetime DEFAULT NULL,
  `codigo_transaccion` varchar(100) DEFAULT NULL,
  `comprobante_qr` varchar(255) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pagos`
--

INSERT INTO `pagos` (`id`, `pedido_id`, `factura_id`, `metodo`, `monto`, `estado`, `pagado_en`, `codigo_transaccion`, `comprobante_qr`, `creado_en`) VALUES
(1, 2, 1, 'Efectivo', 54.00, 'Pagado', '2026-09-20 18:27:41', NULL, NULL, '2026-09-20 22:27:41'),
(2, 3, 2, 'Efectivo', 22.00, 'Pagado', '2026-09-20 18:34:53', NULL, NULL, '2026-09-20 22:34:53'),
(3, 4, 3, 'Efectivo', 60.00, 'Pagado', '2026-09-20 18:45:11', NULL, NULL, '2026-09-20 22:45:11'),
(5, 6, 5, 'QR', 229.00, 'Pendiente', NULL, NULL, NULL, '2026-10-01 00:15:43'),
(7, 8, 7, 'QR', 20.00, 'Pendiente', NULL, NULL, NULL, '2026-10-01 00:34:37'),
(8, 9, 8, 'QR', 38.00, 'Pendiente', NULL, NULL, NULL, '2026-10-01 00:38:31'),
(9, 10, 9, 'QR', 30.00, 'Pagado', '2026-10-17 19:59:19', '1234', NULL, '2026-10-17 23:59:19'),
(10, 11, 10, 'QR', 15.00, 'Pagado', '2026-10-17 21:21:05', '1234567', NULL, '2026-10-18 01:21:05'),
(13, 15, 13, 'QR', 42.00, 'Pagado', '2026-10-18 17:09:47', '7654321', 'uploads/comprobantes_qr/870ce6c1ad5db8840952daa9695b7daf.png', '2026-10-18 21:09:47'),
(14, 16, 14, 'QR', 32.00, 'Pagado', '2026-10-19 20:19:56', '123454', 'uploads/comprobantes_qr/e3d319159bdb89c56877733e26a28bdc.png', '2026-10-20 00:19:56'),
(15, 17, 15, 'Efectivo', 130.00, 'Pagado', '2026-10-19 20:21:55', NULL, NULL, '2026-10-20 00:21:55'),
(16, 18, 16, 'Efectivo', 45.00, 'Pendiente', NULL, NULL, NULL, '2026-10-23 21:24:51'),
(17, 19, 17, 'Efectivo', 35.00, 'Pendiente', NULL, NULL, NULL, '2026-10-23 21:48:54'),
(18, 20, 18, 'Efectivo', 30.00, 'Pendiente', NULL, NULL, NULL, '2026-10-23 22:25:46'),
(19, 21, 19, 'Efectivo', 32.00, 'Pendiente', NULL, NULL, NULL, '2026-10-23 22:32:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedidos`
--

CREATE TABLE `pedidos` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `cliente_id` int(10) UNSIGNED NOT NULL,
  `usuario_id` int(10) UNSIGNED DEFAULT NULL,
  `estado` enum('Pendiente','Preparando','Entregado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  `total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tipo_entrega` enum('Retiro','Delivery') NOT NULL DEFAULT 'Retiro',
  `direccion_entrega` varchar(255) DEFAULT NULL,
  `zona_entrega` varchar(100) DEFAULT NULL,
  `costo_delivery` decimal(10,2) NOT NULL DEFAULT 0.00,
  `estado_entrega` enum('Pendiente','En camino','Entregado') NOT NULL DEFAULT 'Pendiente',
  `repartidor_id` int(10) UNSIGNED DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedidos`
--

INSERT INTO `pedidos` (`id`, `cliente_id`, `usuario_id`, `estado`, `total`, `tipo_entrega`, `direccion_entrega`, `zona_entrega`, `costo_delivery`, `estado_entrega`, `repartidor_id`, `creado_en`) VALUES
(1, 1, 1, 'Entregado', 18.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-09-20 22:08:41'),
(2, 2, 1, 'Entregado', 54.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-09-20 22:27:41'),
(3, 3, 1, 'Entregado', 22.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-09-20 22:34:53'),
(4, 4, 1, 'Entregado', 60.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-09-20 22:45:11'),
(6, 6, NULL, 'Pendiente', 229.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-01 00:15:43'),
(8, 6, NULL, 'Preparando', 20.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-01 00:34:37'),
(9, 6, NULL, 'Cancelado', 38.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-01 00:38:31'),
(10, 6, NULL, 'Preparando', 30.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-17 23:59:19'),
(11, 6, NULL, 'Entregado', 15.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-18 01:21:05'),
(15, 6, NULL, 'Entregado', 42.00, 'Delivery', 'la plata y bolivar', 'Central', 10.00, 'Entregado', 14, '2026-10-18 21:09:47'),
(16, 6, NULL, 'Entregado', 32.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-20 00:19:56'),
(17, 6, NULL, 'Entregado', 130.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-20 00:21:55'),
(18, 6, NULL, 'Pendiente', 45.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-23 21:24:51'),
(19, 6, NULL, 'Pendiente', 35.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-23 21:48:54'),
(20, 6, NULL, 'Cancelado', 30.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-23 22:25:46'),
(21, 6, NULL, 'Cancelado', 32.00, 'Retiro', NULL, NULL, 0.00, 'Pendiente', NULL, '2026-10-23 22:32:23');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `pedido_detalles`
--

CREATE TABLE `pedido_detalles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `pedido_id` bigint(20) UNSIGNED NOT NULL,
  `producto_id` int(10) UNSIGNED NOT NULL,
  `cantidad` int(10) UNSIGNED NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) GENERATED ALWAYS AS (`cantidad` * `precio_unitario`) STORED
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `pedido_detalles`
--

INSERT INTO `pedido_detalles` (`id`, `pedido_id`, `producto_id`, `cantidad`, `precio_unitario`) VALUES
(1, 1, 2, 1, 18.00),
(2, 2, 2, 3, 18.00),
(3, 3, 3, 1, 22.00),
(4, 4, 1, 5, 12.00),
(6, 6, 9, 1, 229.00),
(8, 8, 26, 1, 20.00),
(9, 9, 18, 1, 38.00),
(10, 10, 20, 1, 30.00),
(11, 11, 13, 1, 15.00),
(14, 15, 21, 1, 32.00),
(15, 16, 21, 1, 32.00),
(16, 17, 26, 2, 20.00),
(17, 17, 20, 2, 30.00),
(18, 17, 13, 2, 15.00),
(19, 18, 25, 1, 45.00),
(20, 19, 23, 1, 35.00),
(21, 20, 20, 1, 30.00),
(22, 21, 21, 1, 32.00);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(120) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `categoria` varchar(50) DEFAULT NULL,
  `precio` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `imagen` varchar(255) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id`, `nombre`, `descripcion`, `categoria`, `precio`, `stock`, `imagen`, `activo`, `creado_en`, `actualizado_en`) VALUES
(1, 'Café Americano', 'Café filtrado tradicional', NULL, 12.00, 45, NULL, 1, '2026-09-20 21:51:26', '2026-09-20 22:45:12'),
(2, 'Capuchino', 'Caf?? con leche espumada', NULL, 18.00, 36, NULL, 1, '2026-09-20 21:51:26', '2026-09-20 22:27:41'),
(3, 'Torta de chocolate', 'Porci??n individual', NULL, 22.00, 24, NULL, 1, '2026-09-20 21:51:26', '2026-09-20 22:34:54'),
(7, 'Torta Pistachon', 'Torta artesanal', NULL, 29.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-10-01 00:32:01'),
(8, 'Torta Cocolemon', 'Torta artesanal', NULL, 189.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(9, 'Torta Brownie', 'Torta artesanal', NULL, 229.00, 24, NULL, 1, '2026-09-30 23:47:06', '2026-10-01 00:15:44'),
(10, 'Torta Selva Negra', 'Torta artesanal', NULL, 220.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(11, 'Torta Tres Leches', 'Torta artesanal', NULL, 200.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(12, 'Espresso', 'Caf? espresso', NULL, 12.00, 50, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(13, 'Americano', 'Cafe americano', 'Espressos', 15.00, 47, NULL, 1, '2026-09-30 23:47:06', '2026-10-27 23:01:53'),
(14, 'Espresso Cortado', 'Caf? espresso con leche', NULL, 18.00, 40, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(15, 'Espresso Panna', 'Caf? espresso con crema', NULL, 22.00, 40, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(16, 'Espresso Affogato', 'Espresso con helado', NULL, 25.00, 40, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(17, 'Frappé Latte', 'Bebida fria de cafe', NULL, 35.00, 30, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:48:19'),
(18, 'Frappé Oreo', 'Bebida fria con Oreo', NULL, 38.00, 30, NULL, 1, '2026-09-30 23:47:06', '2026-10-23 20:42:50'),
(19, 'Frappé Chocolate', 'Bebida fria de chocolate', NULL, 35.00, 30, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:48:20'),
(20, 'Bubba Blueberry', 'Bebida de blueberry', NULL, 30.00, 27, NULL, 1, '2026-09-30 23:47:06', '2026-10-23 22:31:32'),
(21, 'Bubba Latte', 'Bebida de caf? y tapioca', NULL, 32.00, 28, NULL, 1, '2026-09-30 23:47:06', '2026-10-23 22:33:07'),
(22, 'Bubba Matcha', 'Bebida de matcha y tapioca', NULL, 35.00, 30, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(23, 'Crepe Chocolate', 'Crepe artesanal', NULL, 35.00, 24, NULL, 1, '2026-09-30 23:47:06', '2026-10-23 21:48:54'),
(24, 'Crepe Frutilla', 'Crepe artesanal', NULL, 38.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(25, 'Crepe Especial', 'Crepe artesanal', NULL, 45.00, 24, NULL, 1, '2026-09-30 23:47:06', '2026-10-23 21:24:51'),
(26, 'Brownie', 'Brownie artesanal', NULL, 20.00, 27, NULL, 1, '2026-09-30 23:47:06', '2026-10-20 00:21:55'),
(27, 'Galleta Artesanal', 'Galleta artesanal', NULL, 12.00, 40, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(28, 'Cheesecake', 'Porci?n de cheesecake', NULL, 35.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(29, 'Panini Clasico', 'Panini artesanal', NULL, 35.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(30, 'Panini Especial', 'Panini artesanal', NULL, 45.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06'),
(31, 'Combo La Polar', 'Combo de la casa', NULL, 55.00, 25, NULL, 1, '2026-09-30 23:47:06', '2026-09-30 23:47:06');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(10) UNSIGNED NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('Administrador','Vendedor','Repartidor') NOT NULL DEFAULT 'Vendedor',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `ultimo_acceso` datetime DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `usuario`, `password_hash`, `rol`, `activo`, `ultimo_acceso`, `creado_en`) VALUES
(1, 'Administrador', 'jhisel', '$2y$10$cRIvZhL7zVpzeM5dg8obLOGE1.hglnND8/5/vX7JXnlZvRZKrQA3C', 'Administrador', 1, '2026-10-27 18:31:41', '2026-09-20 21:51:26'),
(4, 'Administrador', 'admin', '$2y$10$V28e6NkUMQrPPZi1edT1IePZGEky5.sq3ClRJcYxLg2IZ3UpjITpa', 'Administrador', 1, NULL, '2026-09-20 22:17:56'),
(5, 'Marta Campos', 'vendedor', '$2y$10$FeptGbrUu/RK3gaOUkpAsOMYUu1P6.l76P2KqlniMneLc87Jsn8aK', 'Vendedor', 1, '2026-09-20 19:08:29', '2026-09-20 23:08:04'),
(14, 'Marco Solar', 'repartidor', '$2y$10$HJ44ad5eCNBBgEbK3QG0m.ouEhHDCfFyK/gT.sluANUB7HUCJ4Ioq', 'Repartidor', 1, '2026-10-18 17:19:40', '2026-10-18 21:05:41');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_arqueo_caja_activa` (`caja_activa`),
  ADD KEY `apertura` (`apertura`),
  ADD KEY `usuario_apertura_id` (`usuario_apertura_id`),
  ADD KEY `usuario_cierre_id` (`usuario_cierre_id`);

--
-- Indices de la tabla `arqueo_egresos`
--
ALTER TABLE `arqueo_egresos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `arqueo_caja_id` (`arqueo_caja_id`,`creado_en`);

--
-- Indices de la tabla `clientes`
--
ALTER TABLE `clientes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_clientes_correo` (`correo`);

--
-- Indices de la tabla `configuracion_empresa`
--
ALTER TABLE `configuracion_empresa`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `contenido_inicio`
--
ALTER TABLE `contenido_inicio`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `facturas`
--
ALTER TABLE `facturas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pedido_id` (`pedido_id`),
  ADD UNIQUE KEY `numero` (`numero`);

--
-- Indices de la tabla `inventario_lotes`
--
ALTER TABLE `inventario_lotes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `idx_inventario_lote_stock` (`producto_id`,`cantidad_disponible`,`fecha_vencimiento`);

--
-- Indices de la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `lote_id` (`lote_id`),
  ADD KEY `usuario_id` (`usuario_id`),
  ADD KEY `idx_inventario_movimiento_fecha` (`fecha_movimiento`,`tipo`),
  ADD KEY `idx_inventario_movimiento_producto` (`producto_id`,`fecha_movimiento`),
  ADD KEY `idx_inventario_movimiento_pedido` (`pedido_id`,`tipo`);

--
-- Indices de la tabla `notificaciones_cliente`
--
ALTER TABLE `notificaciones_cliente`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pedido_id` (`pedido_id`),
  ADD KEY `cliente_id` (`cliente_id`,`leida_en`,`creada_en`);

--
-- Indices de la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pedido_id` (`pedido_id`),
  ADD KEY `factura_id` (`factura_id`),
  ADD KEY `idx_pagos_metodo_estado_pagado` (`metodo`,`estado`,`pagado_en`);

--
-- Indices de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`),
  ADD KEY `estado` (`estado`),
  ADD KEY `creado_en` (`creado_en`),
  ADD KEY `fk_pedidos_usuario` (`usuario_id`),
  ADD KEY `idx_pedidos_repartidor_delivery` (`repartidor_id`,`tipo_entrega`,`estado`);

--
-- Indices de la tabla `pedido_detalles`
--
ALTER TABLE `pedido_detalles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `pedido_producto` (`pedido_id`,`producto_id`),
  ADD KEY `producto_id` (`producto_id`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `arqueo_egresos`
--
ALTER TABLE `arqueo_egresos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `clientes`
--
ALTER TABLE `clientes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT de la tabla `facturas`
--
ALTER TABLE `facturas`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `inventario_lotes`
--
ALTER TABLE `inventario_lotes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT de la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=39;

--
-- AUTO_INCREMENT de la tabla `notificaciones_cliente`
--
ALTER TABLE `notificaciones_cliente`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `pagos`
--
ALTER TABLE `pagos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT de la tabla `pedidos`
--
ALTER TABLE `pedidos`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=23;

--
-- AUTO_INCREMENT de la tabla `pedido_detalles`
--
ALTER TABLE `pedido_detalles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `arqueos_caja`
--
ALTER TABLE `arqueos_caja`
  ADD CONSTRAINT `arqueos_caja_ibfk_1` FOREIGN KEY (`usuario_apertura_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `arqueos_caja_ibfk_2` FOREIGN KEY (`usuario_cierre_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `arqueo_egresos`
--
ALTER TABLE `arqueo_egresos`
  ADD CONSTRAINT `arqueo_egresos_ibfk_1` FOREIGN KEY (`arqueo_caja_id`) REFERENCES `arqueos_caja` (`id`),
  ADD CONSTRAINT `arqueo_egresos_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `facturas`
--
ALTER TABLE `facturas`
  ADD CONSTRAINT `facturas_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `inventario_lotes`
--
ALTER TABLE `inventario_lotes`
  ADD CONSTRAINT `inventario_lotes_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  ADD CONSTRAINT `inventario_lotes_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `inventario_movimientos`
--
ALTER TABLE `inventario_movimientos`
  ADD CONSTRAINT `inventario_movimientos_ibfk_1` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`),
  ADD CONSTRAINT `inventario_movimientos_ibfk_2` FOREIGN KEY (`lote_id`) REFERENCES `inventario_lotes` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `inventario_movimientos_ibfk_3` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `inventario_movimientos_ibfk_4` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `notificaciones_cliente`
--
ALTER TABLE `notificaciones_cliente`
  ADD CONSTRAINT `notificaciones_cliente_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `notificaciones_cliente_ibfk_2` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pagos`
--
ALTER TABLE `pagos`
  ADD CONSTRAINT `pagos_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pagos_ibfk_2` FOREIGN KEY (`factura_id`) REFERENCES `facturas` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `pedidos`
--
ALTER TABLE `pedidos`
  ADD CONSTRAINT `fk_pedidos_repartidor` FOREIGN KEY (`repartidor_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pedidos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `clientes` (`id`);

--
-- Filtros para la tabla `pedido_detalles`
--
ALTER TABLE `pedido_detalles`
  ADD CONSTRAINT `pedido_detalles_ibfk_1` FOREIGN KEY (`pedido_id`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `pedido_detalles_ibfk_2` FOREIGN KEY (`producto_id`) REFERENCES `productos` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
