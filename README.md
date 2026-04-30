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

## Brevo SMTP Debugging

- Registration attempts a welcome email after the user is created.
- Registration never rolls back if email sending fails.
- Registration email logs now include:
  - `Registration email sending started`
  - `Registration email sent successfully`
  - `Registration email sending failed`
- Safe mail config values are logged with those entries:
  - `mailer`
  - `host`
  - `port`
  - `encryption`
  - `username_configured`
  - `from_address`

### Render cache reset

If Render environment variables were changed, clear cached config before testing:

```bash
php artisan config:clear
php artisan cache:clear
```

The Render startup script now runs those commands before migrations.

### Direct test email

Use the protected debug endpoint after logging in and getting a bearer token:

```bash
curl -X POST https://YOUR-BACKEND/api/test-mail \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-address@example.com"}'
```

That endpoint sends a raw message with subject `Laravel Brevo Test` and returns the active safe mail config in the response.
