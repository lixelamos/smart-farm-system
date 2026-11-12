FROM php:8.3-apache-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev \
 && docker-php-ext-install mysqli mbstring \
 && rm -rf /var/lib/apt/lists/*
COPY . /var/www/backend
RUN sed -ri 's!/var/www/html!/var/www/backend/public!g' /etc/apache2/sites-available/*.conf \
 && mkdir -p /var/lib/smart-farm/uploads \
 && chown www-data:www-data /var/lib/smart-farm/uploads \
 && printf 'upload_max_filesize=3M\npost_max_size=4M\ndisplay_errors=Off\nlog_errors=On\n' > /usr/local/etc/php/conf.d/smart-farm.ini
ENV UPLOAD_DIR=/var/lib/smart-farm/uploads
EXPOSE 80
