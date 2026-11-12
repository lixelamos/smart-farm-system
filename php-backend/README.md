# Smart Farm PHP API

Deploy `public/` as the web document root, keeping the other files private.
Set the variables in `.env.example` through your host; PHP does not load it itself.
Run `php migrate.php` with a database backup first. Configure a persistent private
`UPLOAD_DIR`. The full two-host deployment guide is `PHP-HOSTING.md` in the repository.

CLI commands:

- `php migrate.php` — schema setup, retaining records.
- `php migrate-photos.php /path/to/original/photos` — private image import.
- `php recover.php manager USERNAME` — private recovery link (set FRONTEND_URL).
- `php bootstrap.php` — first administrator only, using BOOTSTRAP_PASSWORD.

The API supports PHP 8.3. Its public endpoint is `api.php?route=...` and accepts
only requests with the configured random 64-hex-character X-Smart-Farm-Key header.
User permissions are checked independently for every authenticated operation.
