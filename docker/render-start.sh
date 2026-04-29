#!/usr/bin/env sh
set -eu

PORT="${PORT:-10000}"

mkdir -p /run/nginx
sed "s/__PORT__/${PORT}/g" /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

php artisan migrate --force

php-fpm -D
exec nginx -g "daemon off;"
