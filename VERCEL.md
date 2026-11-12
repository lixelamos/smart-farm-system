# Hosting architecture

The active version uses **Vercel for the Next.js frontend** and **PHP/MySQL on a
separate host**. Follow [PHP-HOSTING.md](PHP-HOSTING.md) for deployment, data
preservation, environment variables, uploads, and password recovery.

The frontend requires `APP_URL`, `PHP_API_URL`, and `PHP_API_KEY`.
It does not require `DATABASE_URL` or Vercel Blob.

The earlier all-Next.js database backend was committed as `7a0bca0` and remains
available in Git history if you decide to use that architecture again.
