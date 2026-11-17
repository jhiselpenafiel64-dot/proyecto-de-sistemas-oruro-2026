# Despliegue de La Polar en Render

La rama `migracion-postgresql` está preparada para usar PostgreSQL mediante PDO. No configures variables de MySQL (`DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) en Render para esta versión.

## 1. Base de datos PostgreSQL

1. Crea una base PostgreSQL en Render.
2. En el servicio web `la-polar`, abre **Environment** y configura `DATABASE_URL` con la **Internal Database URL** de esa base PostgreSQL. No publiques ni compartas ese valor: contiene credenciales.
3. Conserva la base MySQL original y su respaldo hasta verificar que todas las tablas y registros estén presentes en PostgreSQL.

El archivo de conversión de datos `la_polar_postgresql.sql` debe ejecutarse únicamente en la base PostgreSQL nueva. Antes de importarlo, comprueba que corresponde al respaldo más reciente y que el despliegue de la aplicación ya está validado. No ejecutes los archivos MySQL `database.sql` ni `database_upgrade_*.sql` en PostgreSQL.

Después de importar, verifica los conteos de registros de las 14 tablas y prueba el acceso, catálogo, pedidos, pagos, clientes, inventario y arqueo. No borres ni desconectes la base de origen hasta completar estas pruebas.

## 2. Client ID de Google

En Google Cloud Console, selecciona el proyecto `la-polar-511820` y configura Google Auth Platform. Crea un cliente OAuth de tipo **Aplicación web**. Cuando Render haya asignado la URL pública, añádela como **Origen autorizado de JavaScript**, por ejemplo `https://la-polar.onrender.com`. No añadas una ruta como `/la%20polar/cuenta.html` en el campo de origen.

En Render, configura `GOOGLE_CLIENT_ID` con el ID del cliente OAuth terminado en `.apps.googleusercontent.com`. No se necesita el secreto de cliente para este flujo. El mismo origen se usa para la web de cliente y la API.

Si también se probará el sitio desde XAMPP, agrega `http://localhost` como otro origen autorizado en el cliente OAuth de Google.

## 3. Guardar imágenes subidas

Las imágenes que subas desde el editor de la página de inicio, el catálogo y Configuración (logo y QR) se guardan en `la polar/uploads`. En Render, conecta un disco persistente al servicio y móntalo en `/var/www/html/la polar/uploads`; sin ese disco, las imágenes subidas al sistema de archivos se perderán al reemplazarse la instancia durante un nuevo despliegue. El disco persistente puede tener un costo según el plan de Render.

La pantalla **Configuración** guarda identidad, datos fiscales, QR de pago y tarifas de delivery por zona. Para habilitar facturas fiscales electrónicas todavía se requiere completar la integración y configuración autorizada de SIAT en el servidor; los números internos y comprobantes impresos se identifican expresamente como no fiscales hasta que exista autorización SIAT.

## 4. Desplegar

Conecta el repositorio en Render y crea el servicio usando el blueprint `render.yaml`, o crea un servicio web Docker con este `Dockerfile`. Configura primero `DATABASE_URL` y `GOOGLE_CLIENT_ID`. La aplicación utiliza el controlador PDO de PostgreSQL incluido en la imagen Docker.

No despliegues esta rama a producción ni la fusiones con `main` hasta completar la importación de prueba y verificar las funciones principales. La cuenta del cliente está en `/la%20polar/cuenta.html`.

El personal inicia sesión en **Mi cuenta → Acceso para el personal** con las cuentas creadas por un administrador en el panel. Administradores y personal de caja llegan al mismo panel; los usuarios con rol **Repartidor** llegan únicamente a su pantalla de entregas.
