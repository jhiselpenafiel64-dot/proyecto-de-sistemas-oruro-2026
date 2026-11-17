FROM php:8.3-apache

# Instalar dependencias necesarias para PHP
RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install mbstring pdo_mysql \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Configuración de archivos
RUN printf '%s\n' \
    'upload_max_filesize=6M' \
    'post_max_size=64M' \
    'max_file_uploads=20' \
    > /usr/local/etc/php/conf.d/uploads.ini \
    && a2enmod rewrite

WORKDIR /var/www/html

COPY . /var/www/html/

# Proteger la carpeta de imágenes
RUN printf '%s\n' \
    '<Directory "/var/www/html/la polar/uploads">' \
    '    AllowOverride All' \
    '    Require all granted' \
    '    <FilesMatch "\.(php[0-9]?|phtml|phar)$">' \
    '        Require all denied' \
    '    </FilesMatch>' \
    '</Directory>' \
    > /etc/apache2/conf-available/la-polar-uploads.conf \
    && a2enconf la-polar-uploads \
    && mkdir -p "/var/www/html/la polar/uploads/productos" \
    && chown -R www-data:www-data "/var/www/html/la polar/uploads"

ENV PORT=10000

EXPOSE 10000

CMD ["sh", "-c", "sed -i \"s/Listen 80/Listen ${PORT}/\" /etc/apache2/ports.conf && sed -i \"s/<VirtualHost \\*:80>/<VirtualHost *:${PORT}>/\" /etc/apache2/sites-available/000-default.conf && exec apache2-foreground"]

