<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/core.php";
try {
    if (query("SELECT id FROM admin LIMIT 1")) {
        throw new RuntimeException("Administrator already exists.");
    }
    $username = text(getenv("BOOTSTRAP_USERNAME") ?: "admin");
    $pass = password(getenv("BOOTSTRAP_PASSWORD") ?: "");
    change("INSERT INTO admin(username,password) VALUES (?,?)", [
        $username,
        password_hash($pass, PASSWORD_BCRYPT),
    ]);
    echo "Administrator created.\n";
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "Bootstrap did not create an account. Check that the database is empty and BOOTSTRAP_PASSWORD has at least 12 characters.\n",
    );
    exit(1);
}
