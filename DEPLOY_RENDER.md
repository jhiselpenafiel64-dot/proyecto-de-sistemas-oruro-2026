# Despliegue de La Polar en Render

El servicio web se despliega con el `Dockerfile` y obtiene la configuración sensible desde variables de entorno. No subas contraseñas ni secretos al repositorio.

## 1. Base de datos MySQL

La aplicación requiere una base de datos MySQL compatible y persistente. Render no crea una base MySQL con este servicio; configura un proveedor externo de MySQL y carga en ella `database.sql` (o actualiza una base existente siguiendo `database_upgrade.sql` y luego `database_upgrade_checkout.sql`). Para habilitar la asignación de pedidos delivery a un repartidor, ejecuta `database_upgrade_asignacion_delivery.sql` después de `database_upgrade_checkout.sql`. Para bases existentes, ejecuta `database_upgrade_qr_transaction.sql` y luego `database_upgrade_qr_receipt.sql` para habilitar el registro de códigos de transacción y los comprobantes QR enviados por clientes. Ejecuta también `database_upgrade_notificaciones_cliente.sql` para habilitar el envío de comprobantes a las notificaciones de las cuentas cliente. Para registrar el origen de nuevos clientes, ejecuta `database_migration_origen_clientes.sql`. Esa migración clasifica los registros antiguos con señales verificables: clientes con correo o contraseña como registro web cliente, y clientes sin cuenta web que tengan pedidos del panel como registro web administrativo. Los que no tengan señales suficientes se mantienen como «Registro anterior (sin dato)». Para nuevas bases de datos, `database.sql` instala las tablas del arqueo. En bases existentes, al abrir el módulo de arqueo la aplicación comprueba y aplica automáticamente los cambios de esquema requeridos para registrar ingresos y egresos detallados. `database_upgrade_arqueo_caja.sql` y `database_upgrade_arqueo_detalle.sql` quedan disponibles si se prefiere instalar esas migraciones manualmente.

En el servicio de Render, establece `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `DB_PORT` con los datos de conexión de esa base.

## 2. Crear el Client ID de Google

En Google Cloud Console, selecciona el proyecto `la-polar-511820` y configura Google Auth Platform. Crea un cliente OAuth de tipo **Aplicación web**. Cuando Render haya asignado la URL pública, añádela como **Origen autorizado de JavaScript**, por ejemplo `https://la-polar.onrender.com`. No añadas una ruta como `/la%20polar/cuenta.html` en el campo de origen.

En Render, añade `GOOGLE_CLIENT_ID` con el ID del cliente OAuth terminado en `.apps.googleusercontent.com`. No se necesita el secreto de cliente para este flujo. El mismo origen se usa para la web de cliente y la API.

Si también se probará el sitio desde XAMPP, agrega `http://localhost` como otro origen autorizado en el cliente OAuth de Google.

## 3. Guardar imágenes subidas

Las imágenes que subas desde el editor de la página de inicio, el catálogo y Configuración (logo y QR) se guardan en `la polar/uploads`. En Render, conecta un disco persistente al servicio y móntalo en `/var/www/html/la polar/uploads`; sin ese disco, las imágenes subidas al sistema de archivos se perderán al reemplazarse la instancia durante un nuevo despliegue. El disco persistente puede tener un costo según el plan de Render.

La pantalla **Configuración** guarda identidad, datos fiscales, QR de pago y tarifas de delivery por zona. Para habilitar facturas fiscales electrónicas todavía se requiere completar la integración y configuración autorizada de SIAT en el servidor; los números internos y comprobantes impresos se identifican expresamente como no fiscales hasta que exista autorización SIAT.

## 4. Desplegar

Conecta el repositorio en Render y crea el servicio usando el blueprint `render.yaml`, o crea un servicio web Docker con este `Dockerfile`. Configura primero la base MySQL y `GOOGLE_CLIENT_ID`; al iniciar, el sitio raíz redirige al catálogo de La Polar. La cuenta del cliente está en `/la%20polar/cuenta.html`.

El personal inicia sesión en **Mi cuenta → Acceso para el personal** con las cuentas creadas por un administrador en el panel. Administradores y personal de caja llegan al mismo panel; los usuarios con rol **Repartidor** llegan únicamente a su pantalla de entregas. La antigua pantalla de login del panel fue retirada.

Después del primer despliegue, abre **Mi cuenta → Crear cuenta → Registrarse con Google** para comprobar el inicio de sesión y el registro de clientes.
