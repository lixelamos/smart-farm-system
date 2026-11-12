# Smart Farm for Vercel

The application now runs on Next.js 16 / React 19 / Node.js with an external MySQL
8-compatible database. It does not require PHP on Vercel. The Narok identity,
self-hosted Newsreader and Source Sans 3 fonts, and four role workspaces are retained.
The old PHP sources remain in the repository for reference and rollback; Vercel
does not serve them. No live deployment or external database has been created yet.

## 1. Keep a backup of your existing records

Keep your original PHP project and database until you have checked the new site.
In your **old local project folder**, export a data-only dump:

```sh
docker compose -f .local-docker/compose.yaml exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" mariadb-dump -u "$MARIADB_USER" --no-create-info --skip-triggers --complete-insert "$MARIADB_DATABASE"' > ~/Downloads/smart-farm-data.sql
```

This file contains personal farm records and password hashes or legacy passwords.
Keep it private; do not commit it or upload it to the public website.
Also keep the original `photos` directory. Database exports do not contain image files.

## 2. Create your external database

Use an external MySQL-compatible provider, such as Aiven for MySQL or another
provider that accepts connections from Vercel. The database must be reachable from
Vercel; your Mac's `localhost` database will not be reachable there. Check the
provider's current plans, connection limits, and availability before choosing one.

Copy `.env.example` to `.env.local` in this project and set:

- `DATABASE_URL`: the provider's MySQL connection URL. Percent-encode special
  characters in its username/password if constructing the URL yourself.
- `DATABASE_SSL=true` for the hosted database. TLS verification is enabled.
- `DATABASE_CA` only if the provider supplies a private CA certificate (PEM).
- `APP_URL=http://localhost:3000` while testing locally.

Never prefix secrets with `NEXT_PUBLIC_` or put real credentials in Git.

## 3. Install and import

Use Node.js 22 or newer and run:

```sh
npm ci
npm run db:migrate
npm run db:import -- ~/Downloads/smart-farm-data.sql
npm run db:check
npm run dev
```

Open `http://localhost:3000` on your Mac. Existing usernames and passwords continue
to work after import. Existing account IDs, phone numbers, farm records, and chat
participant IDs are retained. Imported plaintext passwords are upgraded to bcrypt.
Farmer approval status is preserved.

The importer accepts data-only exports and the original project SQL dump. It
imports only the 14 application record tables, in a transaction, and refuses to
replace a nonempty destination. It does not copy legacy sessions or recovery tokens.
Re-running it against an already populated database stops without replacing data.
Schema migration is idempotent and can also operate on an existing compatible
MySQL database, but schedule a cutover first: the old PHP login code cannot use all
the upgraded password hashes.

The migration widens password/photo fields, converts tables to UTF-8, adds unique
account identifiers, and creates session, recovery, payment-allocation, and audit
tables. If existing duplicate phone numbers or usernames prevent a unique index,
resolve those records before cutover; the migration does not delete them.

If you intentionally start a fresh database, `BOOTSTRAP_USERNAME` and
`BOOTSTRAP_PASSWORD` can be supplied securely in your terminal environment before
`npm run db:bootstrap`. Bootstrap refuses to replace an existing administrator.
No default production administrator or demo farm records are created.

## 4. Move existing photos and enable uploads

Create a **private Vercel Blob store** for this project. Set its
`BLOB_READ_WRITE_TOKEN` in `.env.local` and later in Vercel environment settings.
Then migrate the original photo directory:

```sh
npm run assets:migrate -- /absolute/path/to/old-project/photos
```

The script uploads referenced images and rewrites their database references only
after successful upload. Existing chat pictures retain conversation-specific
permissions. Re-running skips migrated references. Missing/unsupported files remain
unchanged and are reported with a nonzero exit code; supply the actual originals
and retry before claiming the image migration is complete. If originals also live
in an `images` directory, rerun with that directory; migrated references are skipped. Missing historical
images display a placeholder. Uploads are limited to JPEG, PNG, and WebP.

The app writes no uploads to Vercel's temporary filesystem. New image uploads
require Blob; they return a clear configuration message until it is connected.
The public landing-page illustration and fonts are bundled locally.

## 5. Deploy on Vercel

Push the migrated code to your GitHub repository, then import that repository in
Vercel. Keep the repository root as the project root; the framework should be
**Next.js**. The build command is `npm run build` and install command is `npm ci`.
Use a supported Node.js 22+ runtime.

Add the same hosted database settings and Blob token in Vercel's project
**Environment Variables**, with `APP_URL` set to your deployed HTTPS URL.
Enable them for the intended Production/Preview environments and redeploy after
changing values. Deploy previews should use a separate database if test changes
must not affect production. Choose a function region near the database and monitor
provider connection limits. The server uses a small per-instance connection pool.

Run migrations explicitly against the target database before deploying. Builds do
not import, reset, or migrate databases automatically. Do not run bootstrap against
your migrated production database.

Verify the deployed site before switching users over: sign in as all four roles,
check record counts, try a test delivery/order, download reports, and check private
images. Publishing a cloud development environment is not a Vercel deployment and
does not sync the code to your Mac or GitHub automatically.

## Payments

The app supports orders, unpaid purchase records, delivery verification, and
administrator-recorded settlements. **Recording a settlement does not send money.**
It requires confirmed real-world payment, one farmer per settlement, a unique
reference, and (for produce) a verified delivery. Records cannot be settled twice.

For online purchase payment verification, configure `PAYMENT_VERIFY_URL` (HTTPS)
and optionally `PAYMENT_API_KEY`. The server sends:

```json
{
  "reference": "TRANSACTION_CODE",
  "amount": 250,
  "currency": "KES",
  "phone": "712345678"
}
```

The trusted provider must return:

```json
{
  "verified": true,
  "reference": "TRANSACTION_CODE",
  "amount": 250,
  "currency": "KES"
}
```

The server verifies the reference, amount, currency, ownership, unpaid state, and
uniqueness before recording it. Failed/unconfigured verification does not mark an
order paid. This adapter is not an M-Pesa STK-push implementation. The old PHP code
called an HTTP endpoint that accepted raw SQL; that interface has deliberately not
been carried into a public hosted deployment. A trusted HTTPS payment integration
must be connected and tested before accepting online payments.

## Password recovery and sessions

Signed-in administrators can issue single-use, 30-minute recovery links from
**Account recovery** after verifying the owner's identity. Links use a URL fragment,
are removed from the address bar after loading, and only their hashes are stored.
A successful reset revokes all the account's sessions. Existing accounts have no
verified email addresses, so the app does not pretend to send reset emails.

A trusted operator can also issue a link locally with hosted database access:

```sh
npm run db:recovery -- manager ben
```

Do not share recovery links in chat or public logs. Authentication uses opaque,
server-stored session tokens, HttpOnly/SameSite cookies, same-origin mutation
checks, prepared queries, per-role authorization, account-scoped record reads, and
login-attempt limits. All production traffic should use HTTPS.

## Validation commands

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Integration tests use a running app and a **disposable database**, because they
create and remove temporary records. Set `TEST_ADMIN_USERNAME` and
`TEST_ADMIN_PASSWORD` for that test database, then run `npm run test:integration`.
Do not run integration tests against your live farm database.

## Workflow coverage and changes

- All four roles have dedicated workspaces, account editing, and session-based access.
- Farmer registration remains subject to administrator approval.
- Administrators manage demand, stations, products, inputs, approval, verification,
  settlement records, and recovery. Managers manage agronomists and county updates.
- Farmers submit/cancel supplies, order inputs/products, view their own purchases
  and payments, and message agronomists in their sub-county.
- Agronomists message farmers, manage their profile, and publish county news.
- CSV and PDF exports use the same record permissions as the screen. PDFs are
  compact summaries; CSV contains the full field values for detailed analysis.
- New supply cancellations restore reserved demand. Old imported supplies have no
  reliable demand IDs, so cancelling those retains the original application's
  behavior without guessing which demand record to change.
- Historical supply/sales/payment records are retained when a user is suspended.
  Farmer accounts with history are suspended rather than hard-deleted.
- Legacy public `.php` page URLs redirect to the new pages. Old unauthenticated PHP
  AJAX mutation endpoints are not published; their workflows use authenticated APIs.
- Data lists load all server batches and paginate/filter in the browser. Very large
  datasets may need server-side search as the project grows.
