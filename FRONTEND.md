# Smart Farm frontend

The site uses the existing PHP routes and AJAX endpoints. There is no JavaScript
framework, frontend build step, or package installation required to serve it.

## Shared presentation

- `css/design.css`: colour, typography, spacing, public pages, and form components.
- `css/workspace.css`: the application shell, records, responsive tables, and chat.
- `includes/ui.php`: branding, role navigation, workspace headers, and database-backed overview counts.
- `includes/auth.php`: the shared farmer/agronomist, manager, and administrator sign-in view.
- `js/design.js`: mobile navigation and progressive accessibility improvements for the existing AJAX fragments.
- `js/auth.js` and `js/signup.js`: form feedback, validation, and the existing authentication/registration endpoints.
- `js/chat-ui.js`: keyboard interactions for the existing photo attachment dialog.
- `images/field-map.svg`: original Narok-inspired highland illustration.
- `fonts/`: self-hosted Source Sans 3 and Newsreader, with their OFL licences; no external font service is required.

Change design tokens in `css/design.css` to adjust the shared identity. The workspace
stylesheet deliberately scopes overrides to `.app-page` because existing AJAX
responses contain inline presentation styles. Keep form names and endpoint URLs
when changing those fragments.

## Validation

Run PHP's syntax checker on changed PHP files, and `node --check` on changed
JavaScript files. The repository does not define lint, type-check, or build scripts.
Use PHP 8.3 with the required mysqli, GD, and mbstring extensions and the existing
MariaDB setup. See the environment's startup instructions for its Compose file.

The redesign was checked in Chromium at 320, 390, 820, and 1440px. All four roles
were signed in through the actual login forms, and every workspace navigation
section was opened at desktop, tablet, and mobile sizes. Additional checks covered
form errors, a failed network request, password visibility, registration validation,
and the photo dialog's focus and Escape behavior. Registration success was mocked
to avoid creating a test account. Automated WCAG A/AA scans covered the public
pages, chat, and the four dashboard overviews. External payment transactions were
not triggered.

The Narok visual identity pairs charcoal and warm paper with restrained red and ochre accents. Newsreader is used for editorial headings; Source Sans 3 is used for forms, navigation, and records. This is an original community-project identity, not an official county seal or brand.
