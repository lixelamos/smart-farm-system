<?php
require_once __DIR__ . "/ui.php";
$staff = $authRole !== "farmer";
$base = $staff ? "../" : "";
$heading = $staff ? ucfirst($authRole) . " sign in" : "Welcome back.";
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="preload" href="<?= $base ?>fonts/SourceSans3.ttf" as="font" type="font/ttf" crossorigin><meta name="viewport" content="width=device-width, initial-scale=1"><title><?= sf_escape(
    $heading,
) ?> · Smart Farm</title><link rel="icon" href="<?= $base ?>images/favi.png"><link rel="stylesheet" href="<?= sf_asset("css/design.css", $base) ?>"><script src="<?= sf_asset("js/auth.js", $base) ?>" defer></script></head>
<body class="auth-page"><a class="skip-link" href="#auth-form">Skip to sign in</a><header class="public-header container"><?php sf_brand(
    $base,
); ?><a class="text-link" href="<?= $base ?>index.php">← Back to home</a></header>
<main class="auth-layout container"><section class="auth-story"><p class="eyebrow">NAROK COUNTY · ACCOUNT ACCESS</p><h1>Your farm.<br>Your Narok community.</h1><p>Sign in to manage your farm records, connect with an agronomist, and follow opportunities in your county.</p><img src="<?= sf_asset("images/field-map.svg", $base) ?>" width="640" height="450" alt="An illustration of Narok-inspired highland fields"><div class="story-note"><span class="status-dot"></span> Serving the Narok farming community.</div></section>
<section class="auth-panel" aria-labelledby="auth-heading"><div class="auth-panel-top"><span class="section-number">ACCOUNT ACCESS</span><span class="role-tag"><?= $staff
    ? sf_escape(ucfirst($authRole))
    : "Farmer & agronomist" ?></span></div><h2 id="auth-heading"><?= sf_escape(
    $heading,
) ?></h2><p class="muted">Enter your <?= $staff
    ? "username"
    : "phone number" ?> and password to access your workspace.</p>
<form id="auth-form" data-endpoint="<?= $staff
    ? "validate.php"
    : "loginvalidate.php" ?>" data-staff="<?= $staff
    ? "true"
    : "false" ?>" method="post" action="<?= $staff
    ? "validate.php"
    : "loginvalidate.php" ?>">
<div id="lgrespo" class="feedback error" role="alert" hidden></div><div id="successd" class="feedback success" role="status" hidden></div>
<label for="usern"><?= $staff
    ? "Username"
    : "Phone number" ?></label><input id="usern" name="<?= $staff
    ? "usern"
    : "fon" ?>" type="<?= $staff ? "text" : "tel" ?>" <?= $staff
    ? ""
    : 'inputmode="numeric" pattern="[0-9]+"' ?> autocomplete="username" placeholder="<?= $staff
     ? "Your username"
     : "e.g. 0712345678" ?>" required>
<label for="upass">Password</label><div class="password-field"><input id="upass" name="password" type="password" autocomplete="current-password" placeholder="Enter your password" required><button type="button" class="password-toggle" aria-label="Show password" aria-pressed="false">Show</button></div>
<button type="submit" class="button button-primary auth-submit" id="sbtn">Sign in <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg></span></button></form>
<?php if ($authRole === "manager"): ?><p class="auth-register"><a href="reset-password.php">Forgot your password?</a></p><?php endif; ?>
<?php if (
    !$staff
): ?><p class="auth-register">New to Smart Farm? <a href="signup.php">Create a farmer account</a></p><?php endif; ?>
<div class="auth-other"><p>Looking for another workspace?</p><div><?php
if (
    $authRole !== "farmer"
): ?><a href="<?= $base ?>login.php">Farmer / Agronomist</a><?php endif;
if (
    $authRole !== "manager"
): ?><a href="<?= $base ?>manager/index.php">Manager</a><?php endif;
if (
    $authRole !== "admin"
): ?><a href="<?= $base ?>admin/index.php">Administrator</a><?php endif;
?></div></div></section></main>
<footer class="simple-footer container"><span>© <?= date(
    "Y",
) ?> Smart Farm</span><span>Agriculture, rooted in Narok.</span></footer></body></html>
