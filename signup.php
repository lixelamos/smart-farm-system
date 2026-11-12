<?php
require_once __DIR__ . "/includes/ui.php";
$subs = [
    "Narok North",
    "Narok East",
    "Narok South",
    "Narok West",
    "Kilgoris",
    "Emurua Dikirr",
];
?>
<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="preload" href="fonts/SourceSans3.ttf" as="font" type="font/ttf" crossorigin><meta name="viewport" content="width=device-width, initial-scale=1"><title>Create a farmer account · Smart Farm</title><link rel="icon" href="images/favi.png"><link rel="stylesheet" href="<?= sf_asset("css/design.css", "") ?>"><script src="<?= sf_asset("js/signup.js", "") ?>" defer></script></head>
<body class="auth-page"><a class="skip-link" href="#registration-form">Skip to registration</a><header class="public-header container"><?php sf_brand(); ?><a class="text-link" href="index.php">← Back to home</a></header>
<main class="auth-layout container"><section class="auth-story"><p class="eyebrow">NAROK COUNTY · FARMER REGISTRATION</p><h1>A local connection.<br>For your next season.</h1><p>Join a community built around your farm. Find produce opportunities, access inputs, and connect with people who can help.</p><img src="<?= sf_asset("images/field-map.svg", "") ?>" width="640" height="450" alt="An illustration of Narok-inspired highland fields"><div class="story-note"><span class="status-dot"></span> Your account will be reviewed by an administrator.</div></section>
<section class="auth-panel register-panel" aria-labelledby="registration-heading"><div class="auth-panel-top"><span class="section-number">JOIN THE COMMUNITY</span><span class="role-tag">Farmer registration</span></div><h2 id="registration-heading">Join your farming community.</h2><p class="muted">Create your farmer account. Once approved, you can sign in and explore your workspace.</p>
<form id="registration-form" method="post" action="accountsaver.php"><div class="feedback error" id="registration-error" role="alert" hidden></div><div class="feedback success" id="registration-success" role="status" hidden></div>
<label for="full-name">Full name</label><input id="full-name" type="text" name="fname" placeholder="Your full name" autocomplete="name" maxlength="20" required>
<div class="form-row"><div><label for="phone">Phone number</label><input id="phone" type="tel" name="fon" placeholder="0712345678" inputmode="numeric" pattern="[0-9]+" autocomplete="tel" required></div><div><label for="id-number">ID number</label><input id="id-number" type="text" name="idno" placeholder="National ID number" inputmode="numeric" pattern="[0-9]+" required></div></div>
<label for="location">Sub-county</label><select id="location" name="loc" required><option value="" disabled selected>Select your sub-county</option><?php foreach (
    $subs
    as $sub
): ?><option value="<?= sf_escape($sub) ?>"><?= sf_escape(
    $sub,
) ?></option><?php endforeach; ?></select>
<label for="password">Password</label><input id="password" type="password" name="pass" autocomplete="new-password" placeholder="Choose a password" required>
<button class="button button-primary auth-submit" type="submit">Create farmer account <span aria-hidden="true"><svg class="arrow-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.5"/></svg></span></button></form><p class="auth-register">Already part of the community? <a href="login.php">Sign in</a></p></section></main><footer class="simple-footer container"><span>© <?= date(
    "Y",
) ?> Smart Farm</span><span>Agriculture, rooted in Narok.</span></footer></body></html>
