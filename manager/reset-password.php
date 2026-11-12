<?php
session_start(["cookie_httponly" => true, "cookie_samesite" => "Lax"]);
header("Cache-Control: no-store");
header("Referrer-Policy: no-referrer");
header("X-Robots-Tag: noindex, nofollow");
require __DIR__ . "/../includes/ui.php";
require __DIR__ . "/../includes/manager-passwords.php";
require __DIR__ . "/dbcon.php";
if (isset($_GET["token"])) {
    $_SESSION["manager_reset_token"] = is_string($_GET["token"])
        ? $_GET["token"]
        : "";
    $_SESSION["manager_reset_csrf"] = bin2hex(random_bytes(32));
    // Remove the recovery token from the address bar before rendering resources.
    header("Location: reset-password.php", true, 303);
    exit();
}
$token = $_SESSION["manager_reset_token"] ?? "";
$done = !empty($_SESSION["manager_reset_completed"]);
unset($_SESSION["manager_reset_completed"]);
$error = "";
$available = true;
try {
    $valid = sf_manager_valid_reset($con, $token);
} catch (Throwable $failure) {
    $valid = false;
    $available = false;
}
if (!isset($_SESSION["manager_reset_csrf"])) {
    $_SESSION["manager_reset_csrf"] = bin2hex(random_bytes(32));
}
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $csrf = is_string($_POST["csrf"] ?? null) ? $_POST["csrf"] : "";
    $password = is_string($_POST["password"] ?? null) ? $_POST["password"] : "";
    $confirmation = is_string($_POST["confirmation"] ?? null)
        ? $_POST["confirmation"]
        : "";
    if (!hash_equals($_SESSION["manager_reset_csrf"], $csrf)) {
        $error = "Your form expired. Refresh this page and try again.";
    } elseif (!$valid) {
        $error =
            "This recovery link has expired or has already been used. Ask for a new link.";
    } elseif (mb_strlen($password) < 12) {
        $error = "Use a password with at least 12 characters.";
    } elseif (strlen($password) > 72) {
        $error = "Your password is too long. Choose a shorter passphrase.";
    } elseif ($password !== $confirmation) {
        $error = "The passwords do not match.";
    } else {
        try {
            if (sf_manager_consume_reset($con, $token, $password)) {
                unset(
                    $_SESSION["manager_reset_token"],
                    $_SESSION["manager_reset_csrf"],
                );
                $_SESSION["manager_reset_completed"] = true;
                session_regenerate_id(true);
                header("Location: reset-password.php", true, 303);
                exit();
            }
            $valid = false;
            $error =
                "This recovery link is no longer valid. Ask for a new link.";
        } catch (Throwable $failure) {
            $error =
                "We couldn’t reset your password right now. Please try again.";
        }
    }
}
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset manager password · Smart Farm Narok</title><link rel="stylesheet" href="<?= sf_asset(
    "css/design.css",
    "../",
) ?>"></head>
<body class="auth-page"><header class="public-header container"><?php sf_brand(
    "../",
); ?><a class="text-link" href="index.php">← Back to manager sign in</a></header>
<main class="auth-layout container"><section class="auth-story"><p class="eyebrow">NAROK COUNTY · ACCOUNT RECOVERY</p><h1>Back to your<br>farming community.</h1><p>Recover access to your manager workspace and choose a new password.</p><img src="<?= sf_asset(
    "images/field-map.svg",
    "../",
) ?>" width="640" height="450" alt="Narok-inspired highland fields"></section>
<section class="auth-panel" aria-labelledby="reset-heading"><div class="auth-panel-top"><span class="section-number">ACCOUNT RECOVERY</span><span class="role-tag">Manager</span></div>
<?php if ($done): ?>
<h2 id="reset-heading">Password updated.</h2><p class="feedback success" role="status">Your new password is ready. Sign in to return to your manager workspace.</p><a class="button button-primary auth-submit" href="index.php">Return to sign in →</a>
<?php elseif ($valid): ?>
<h2 id="reset-heading">Choose a new password.</h2><p class="muted">Use a passphrase with at least 12 characters. This recovery link works once.</p>
<?php if ($error): ?><p class="feedback error" role="alert"><?= sf_escape(
    $error,
) ?></p><?php endif; ?>
<form method="post" action="reset-password.php"><input type="hidden" name="csrf" value="<?= sf_escape(
    $_SESSION["manager_reset_csrf"],
) ?>"><label for="new-password">New password</label><input type="password" id="new-password" name="password" autocomplete="new-password" minlength="12" required><label for="confirm-password">Confirm new password</label><input type="password" id="confirm-password" name="confirmation" autocomplete="new-password" minlength="12" required><button class="button button-primary auth-submit" type="submit">Save new password →</button></form>
<?php else: ?>
<h2 id="reset-heading">Need a recovery link?</h2>
<?php if (
    $error ||
    $token
): ?><p class="feedback error" role="alert"><?= sf_escape(
    $error ?: "This recovery link has expired or has already been used.",
) ?></p><?php endif; ?>
<p class="muted"><?= $available
    ? "Ask your system administrator for a manager recovery link. Links expire after 30 minutes and can only be used once."
    : "Account recovery is temporarily unavailable. Please contact your system administrator." ?></p><p class="muted" style="margin-top:16px">Manager accounts don’t have a verified email address, so we can’t send a reset email.</p><a class="button button-outline auth-submit" href="index.php">Return to sign in →</a>
<?php endif; ?>
</section></main><footer class="simple-footer container"><span>Smart Farm · Narok County</span><span>Agriculture, rooted in Narok.</span></footer></body></html>
