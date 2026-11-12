# Migration validation

Verified in the cloud development workspace against a **separate local copy** of
the existing MySQL data. The original PHP database was not modified.

- ESLint: passed with zero warnings.
- TypeScript: passed.
- Unit tests: 5 passed. The integration suite is explicitly skipped by the default
  unit-test command and was run separately.
- API integration suite: passed registration/approval, role and ownership checks,
  same-origin enforcement, supply reservation/cancellation/verification, purchases,
  settlement amounts and replay prevention, messaging, news, recovery/session
  revocation, and CSV/PDF permission checks. Temporary test records were removed.
- Browser checks: 88 public-page and role-navigation checks at 1440px and 390px,
  plus mobile record creation/editing/search and confirmation-dialog interactions.
- Automated WCAG A/AA scans: no violations on the four public screens and each
  role's overview. This is an automated result, not a complete accessibility audit.
- Optimized production build: passed. Building without DATABASE_URL also passed;
  builds do not require connecting to or modifying the database.
- Production runtime: all four roles signed in using Secure, HttpOnly, SameSite
  cookies; protected database reads worked. Requests for old SQL/PHP/private files
  returned 404.
- Data import: IDs and counts matched all 14 source record tables. Imported
  plaintext passwords were upgraded to hashes. Re-running schema migration retained
  the records. This tests the cloud copy, not the current database on your Mac.

## Requires your external configuration

No Vercel deployment, hosted database, or private Blob store has been created by
this task. Configure these using VERCEL.md, then validate the hosted site before
cutover. Real Blob uploads/downloads and external payment verification were not
exercised because their credentials/provider configuration were not available.
The code reports these missing services rather than marking operations successful.
