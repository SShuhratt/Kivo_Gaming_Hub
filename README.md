# Kivo Gaming Hub Backend

This Laravel app provides the backend for the Kivo Gaming Hub frontend, plus Swagger-style API documentation for frontend integration.

## What Is Included

- Phone/password login API
- Bearer token authentication
- Auth endpoints for login, current user, and logout
- Dashboard bootstrap endpoint powered by live database records
- Swagger UI page at `/api/docs`
- OpenAPI JSON spec at `/docs/openapi.json`

## Local Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh
php artisan serve
```

## API Base URL

For local development:

```text
http://127.0.0.1:8000/api/v1
```

## Swagger Docs

- Swagger UI: `http://127.0.0.1:8000/api/docs`
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

- Fresh installs start with no seeded business data.
- Dashboard responses are generated from the current database state.
