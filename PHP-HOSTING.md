# Vercel frontend + PHP/MySQL backend

This is the active architecture. The Narok React/Next.js interface runs on Vercel.
Authentication, authorization, farm workflows, database access, payment verification,
private image storage, CSV, and PDF generation run in `php-backend/` on a PHP host.
The frontend does not need database credentials. The earlier all-Next.js backend
remains in Git history and old Node migration utilities remain for reference.

## How requests work

Browser → Vercel `/api/...` proxy → HTTPS PHP `public/api.php` → MySQL.

The browser only contacts its own Vercel origin. The server-side proxy sends a
shared API key and forwards only the farm session cookie. The PHP API checks the
key and authenticates/authorizes each request. Vercel rewrites session cookies as
HttpOnly, Secure in production, and SameSite=Lax. Tokens are hashed in MySQL.
The API key is not a substitute for user authorization and is never public.

## 1. Keep your existing database

Export a backup from your current local PHP project before moving it:

```sh
docker compose -f .local-docker/compose.yaml exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb-dump -u "$MARIADB_USER" "$MARIADB_DATABASE"' > ~/Downloads/smart-farm-backup.sql
```

Keep this file private. Import your current database into MySQL on the PHP host
using that host's database tooling. Also copy your original `photos` directory.
Do not expose backups, configuration, source files, or old PHP mutation endpoints
under the backend's public document root.

Configure database variables on the PHP host using `php-backend/.env.example` as
a reference. That file is documentation; PHP does not automatically load `.env`.
Use the host's environment-variable settings or a protected bootstrap outside the
public document root. Use TLS with verification when connecting to a remote DB;
a same-host local MySQL socket does not require remote DB TLS.

Run on the PHP host (with those environment variables):

```sh
php migrate.php
```

Run it from `php-backend/`. It retains records, widens password/photo fields, and
adds the metadata tables needed for sessions, recovery, uploads, and payments.
Back up first: MySQL schema changes are not transactional. Duplicate usernames,
phone numbers, or national IDs must be resolved if unique-index creation fails;
the script does not delete records to make an index pass. Existing plaintext
passwords are upgraded on successful sign-in.

For a genuinely new database only, set `BOOTSTRAP_USERNAME` and a secure
`BOOTSTRAP_PASSWORD` and run `php bootstrap.php`. It refuses to replace an admin.

## 2. Host PHP

You need PHP 8.3 with mysqli, mbstring, fileinfo, HTTPS, MySQL access, and persistent
writable disk. Suitable options include a PHP/cPanel host or a Docker/VPS host.
The frontend can remain on Vercel, but Vercel does not run this PHP API.

Set the web document root to **`php-backend/public` only**. The API URL will then be
`https://your-php-domain/api.php`. Put the backend config/core/CLI tools outside
that document root. Do not publish the repository root or the legacy PHP UI.

A production Apache Dockerfile is included. Build from `php-backend/` and mount a
persistent volume at `/var/lib/smart-farm/uploads`. Keep the service's HTTPS
termination and environment secrets configured through the hosting provider.

Generate a random key locally with `openssl rand -hex 32`. Set it as `PHP_API_KEY`
on **both** hosts. Never paste it into chat, commit it, or use `NEXT_PUBLIC_`.

Set `UPLOAD_DIR` to an absolute writable persistent directory **outside** the public
root. The included Apache image creates `/var/lib/smart-farm/uploads`; on a shared
host, create an equivalent private directory owned by the PHP process. Configure
upload limits of 3 MB and a post limit of 4 MB. The API validates image contents,
uses random filenames, and authorizes image reads. It does not need Vercel Blob.

## 3. Deploy the frontend to Vercel

Import the repository root as a Next.js project. Use Node.js 22+, `npm ci`, and
`npm run build`. Configure only:

```text
APP_URL=https://your-frontend.vercel.app
PHP_API_URL=https://your-php-domain/api.php
PHP_API_KEY=<same private random key as the PHP host>
```

Use the actual deployed frontend URL for `APP_URL`; mismatches block mutations.
Production PHP API connections must use HTTPS with certificate verification.
The frontend contains no database password or storage-provider token.

Local development can use `PHP_API_URL=http://localhost:8080/api.php` and
`APP_URL=http://localhost:3000`; unencrypted backend URLs are allowed only for
loopback development. Run `npm run dev`. This still requires your PHP API and
its database to be running.

## Photos and recovery

Historical `photos` references need conversion to private file records. Use
`php migrate-photos.php /absolute/path/to/original/photos` on the PHP host after
setting `UPLOAD_DIR`. It keeps missing references unchanged and reports them;
retry with other original image directories if necessary. Do not expose private
chat pictures as public static files.

Administrators issue recovery links from the app's Account recovery screen.
A trusted operator can also run:

```sh
FRONTEND_URL=https://your-frontend.vercel.app php recover.php manager ben
```

Links work once, expire after 30 minutes, and password resets revoke sessions.
Accounts do not have verified email addresses, so automatic reset email is not
claimed or configured.

## Payments and validation

Manual settlement records do not initiate a transfer. Optional online reference
verification uses `PAYMENT_VERIFY_URL` and `PAYMENT_API_KEY` on the PHP host only,
with the same trusted HTTPS JSON contract described in the previous VERCEL.md
history. It accepts a verified reference, amount, and KES currency; failed or
unconfigured verification never marks purchases paid. Raw SQL-over-HTTP payment
integration is not enabled.

Run frontend lint, type-check, unit tests, and build with the package scripts.
The existing API integration test can exercise this proxy/PHP combination against
a disposable database; its test-only DB connection is not a frontend dependency.
Do not run it on production. Validate all roles and real uploads before cutover.

Neither PHP hosting nor a Vercel deployment is created by changing the code.
The PHP host's persistent volume and MySQL backups are your operational data store.
