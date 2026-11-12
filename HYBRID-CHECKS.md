# PHP/Vercel split validation

The active frontend runtime uses `lib/php-backend.ts` and the `/api` proxy. It does
not import the Node MySQL/authentication service. The earlier all-Next.js version
is retained in commit `7a0bca0` and some standalone migration/test utilities.

Verified locally using PHP 8.3 with MySQL in a separate container:

- Full API integration suite passed through the Next.js proxy to PHP: registration,
  approval, ownership/role checks, same-origin checks, supplies, cancellation,
  verification, ordering, settlements, messages, recovery, and CSV/PDF reports.
- Real multipart image uploads passed through the proxy into persistent PHP storage.
  Catalogue access, authorized chat-peer access, unrelated-user denial, anonymous
  denial, unauthorized upload rejection, and direct API-key enforcement passed.
- Mobile React record editor passed create/edit/search/empty results and cancel/
  confirm deletion checks through PHP.
- PHP syntax checks, frontend lint, type-check, unit tests, and build were run.

The existing database copy was retained. Temporary integration records and images
were removed. PHP accepts both PHP `$2y$` and Node `$2b$` bcrypt hashes, and never
accepts the stored hash itself as a password.

No hosting accounts, public PHP deployment, or Vercel deployment have been created.
The local test backend used loopback HTTP; deployed backend connections require
HTTPS with verification. Live payment-provider calls were not exercised.

Follow PHP-HOSTING.md for the active architecture. MIGRATION-CHECKS.md describes
validation of the earlier all-Next.js implementation, not the current deployment.
