# Manager password recovery

Manager accounts have usernames but no verified email addresses. Recovery therefore
uses a private link issued by someone who already has access to the application’s
Docker container and database. The public page never issues recovery links.

## On your Mac

From your local `smart-farm-system` directory, list manager usernames:

```sh
docker compose -f .local-docker/compose.yaml exec app php tools/manager-reset.php --list
```

Generate a link for your manager (replace `ben` with the username if different):

```sh
docker compose -f .local-docker/compose.yaml exec app php tools/manager-reset.php ben
```

Open `http://localhost:8000` followed by the printed `/manager/reset-password.php?token=...`
path in your Mac browser. Set and confirm your new password, then sign in normally.
Do not paste recovery links or passwords into chat. Generating the link does not
change a password until it is redeemed. If your Compose file has another location,
use that location with `-f`.

The tool creates its recovery table on first use and widens short legacy manager
password columns to 255 characters when needed. It does not replace the database,
reset accounts, or change database credentials. No manual database import is needed.

## Behavior

- A manager’s newest recovery link invalidates their previous links.
- Links contain 256 random bits, expire after 30 minutes, and work once.
- Only SHA-256 token hashes are stored in the database.
- Reset forms use session-bound CSRF protection and remove tokens from the address
  bar before rendering assets. Reset pages use no-store and no-referrer headers.
- New manager passwords use bcrypt; old manager passwords continue to work until changed.
- Saving account details with an empty password field retains the existing password.
- Manager account screens no longer send stored passwords to the browser.
- Issuance is CLI-only. Calling the issuer over HTTP returns 404.

This does not add email delivery or change recovery for administrator, farmer, or
agronomist accounts. It does not add global session revocation to the legacy app.
Use HTTPS when deploying beyond local development.

## Run the recovery tests

```sh
docker compose -f .local-docker/compose.yaml exec app php tests/manager-password-reset.php
```

The tests create and remove a temporary manager account. They leave existing
manager passwords unchanged.
