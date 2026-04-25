FROM php:8.5-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql mbstring exif pcntl bcmath gd

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application files
COPY . /var/www

# Create Laravel required directories and set permissions
RUN mkdir -p /var/www/storage /var/www/cache && \
    chown -R www-data:www-data /var/www

# Install dependencies via composer
RUN composer install --no-dev --optimize-autoloader

USER www-data

# Start the app on the platform provided port, with a safe fallback.
CMD ["sh", "-c", "PORT=${PORT:-8000}; php artisan serve --host=0.0.0.0 --port=${PORT}"]
