# WUWA Uzbek Language Campaign — Backend

This directory contains the production API for supporter voting.

## Stack

- Vercel Functions (Node.js)
- PostgreSQL / Neon
- `pg` database client

## API

- `GET /api/health` — database/API health check
- `GET /api/stats` — total supporters and country totals
- `POST /api/vote` — record a supporter

### POST /api/vote

```json
{
  "email": "player@example.com",
  "country": "UZ"
}
```

The `country` field is optional. Vercel/Cloudflare country headers are preferred when available.

## Environment variables

Set these in the Vercel project settings. Never commit real secrets.

- `DATABASE_URL` — PostgreSQL connection string
- `FRONTEND_ORIGIN` — exact GitHub Pages origin
- `RATE_LIMIT_SALT` — long random secret used to hash IP addresses

## Database setup

1. Create a PostgreSQL database (Neon is recommended for this project).
2. Run `schema.sql` once against the database.
3. Add the environment variables in Vercel.
4. Import this repository as a Vercel project with **Root Directory = `backend`**.
5. After deployment, test `/api/health` and `/api/stats`.
6. Put the deployed API base URL into the frontend configuration.

The public API never returns supporter email addresses.
