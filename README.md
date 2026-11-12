# Smart Farm · Narok County

A Next.js application for Narok’s farmers, agronomists, managers, and administrators.
The frontend runs on Vercel and connects through a private server-side proxy to a separately hosted PHP/MySQL backend.

## Workflows

- Role-based sign-in, farmer registration/approval, account editing, and recovery.
- Produce demand, pickup stations, supply submission, cancellation, and verification.
- Farm input/product catalogues, orders, purchase history, and payment records.
- County news and farmer–agronomist conversations, including private photo attachments.
- Permission-scoped CSV and PDF exports.
- Migration of the original PHP application's records and image references.

The Narok visual identity uses warm paper, charcoal, ochre, and rust red, with
self-hosted Newsreader and Source Sans 3 fonts.

## Run locally

Use Node.js 22+ for the frontend and PHP 8.3/MySQL for the backend. See [PHP-HOSTING.md](PHP-HOSTING.md).

```sh
npm ci
cp .env.example .env.local
```

Set `APP_URL`, `PHP_API_URL`, and `PHP_API_KEY` in `.env.local`, then:

```sh
npm run dev
```

Open `http://localhost:3000`. Configure and migrate the PHP backend separately as
described in [PHP-HOSTING.md](PHP-HOSTING.md). The frontend holds no DB credentials.

## Deploy and move existing records

Read **[PHP-HOSTING.md](PHP-HOSTING.md)** for exporting your local Docker database, importing
records, moving photos into private persistent PHP storage, environment settings, and
deploying on Vercel. Database credentials and `.env.local` must not be committed.

Vercel still needs a reachable external database. Online payment verification needs
a trusted HTTPS provider; recording a settlement does not send money.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:integration` exercises a running app against a disposable database.
It creates and removes test records; do not target production.

The original PHP files remain for reference and rollback, and are excluded from
Vercel uploads. Legacy public `.php` URLs redirect to the corresponding Next.js pages.
New development belongs in `app/`, `components/`, `lib/`, and `scripts/`.
