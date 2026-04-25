# Kivo Gaming Hub Backend

This Laravel app now includes a starter backend for the Kivo Gaming Hub frontend, plus Swagger-style API documentation for frontend integration.

## What Is Included

- Phone/password login API
- Bearer token authentication
- Auth endpoints for login, current user, and logout
- Dashboard bootstrap endpoint with demo data
- Swagger UI page at `/api/docs`
- OpenAPI JSON spec at `/docs/openapi.json`
- Seeded demo users that match the current frontend login screen

## Demo Accounts

- Admin
  - Phone: `+998 90 123 45 67`
  - Password: `admin`
- User
  - Phone: `+998 91 765 43 21`
  - Password: `user123`

## Local Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve
```

## API Base URL

For local development:

```text
http://127.0.0.1:8000/api/v1
```

## Swagger Docs

- Swagger UI: `http://127.0.0.1:8000/api-docs`
- OpenAPI JSON: `http://127.0.0.1:8000/docs/openapi.json`

## Implemented Endpoints

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET /api/v1/dashboard/bootstrap`

## Login Example

```bash
curl -X POST http://127.0.0.1:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"+998 90 123 45 67","password":"admin"}'
```

Use the returned token like this:

```bash
curl http://127.0.0.1:8000/api/v1/dashboard/bootstrap \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Notes

- The current dashboard data is static demo data returned by the controller.
- This is the first backend layer to support frontend integration quickly.
- The next step would be replacing static dashboard payloads with database-backed modules for bookings, cashier, inventory, staff, finance, and analytics.

## Deployment Stability Notes

- The Docker image now starts Laravel with `PORT` fallback to `8000`, which prevents startup hangs on platforms that do not inject a `PORT` variable.
- `docker-compose` now serves the app on `app:8000` and Nginx proxies HTTP traffic to that upstream, avoiding FastCGI misrouting.
- Session / cache / queue defaults are now file/sync-safe (`SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=sync`) so the homepage and docs do not block on database connectivity during boot.
- In production, the app force-falls back from DB-backed state drivers to file/sync (`session`, `cache`, `queue`) when those values resolve to `database`, preventing slow startup failures from DB connectivity issues.

### Render-Specific DB Checklist

- Use Render PostgreSQL **Internal Database URL** values for `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`.
- Ensure `DB_CONNECTION=pgsql`.
- If config is cached, run `php artisan config:clear` after changing environment variables.
