# Smart Farm · Narok County

A Next.js application for Narok’s farmers, agronomists, managers, and administrators.
The app uses an external MySQL-compatible database and is designed to run on Vercel.

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

Use Node.js 22+ and a MySQL 8-compatible database.

```sh
npm ci
cp .env.example .env.local
```

Set the database connection and `APP_URL` in `.env.local`, then:

```sh
npm run db:migrate
npm run db:import -- /path/to/your/smart-farm-data.sql
npm run dev
```

Open `http://localhost:3000`. The importer refuses to replace a nonempty database.
For a genuinely fresh installation, see the administrator bootstrap instructions
in [VERCEL.md](VERCEL.md). No default production password is created.

## Deploy and move existing records

Read **[VERCEL.md](VERCEL.md)** for exporting your local Docker database, importing
records, moving photos into a private Vercel Blob store, environment settings, and
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
