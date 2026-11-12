<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/core.php";
try {
    $r = role($argv[1] ?? "");
    $identifier = $argv[2] ?? "";
    $field = in_array($r, ["farmer", "agronomist"], true)
        ? "phone"
        : "username";
    $account =
        query("SELECT id FROM `" . table($r) . "` WHERE $field=?", [
            $identifier,
        ])[0] ?? null;
    if (!$account) {
        throw new RuntimeException("Account not found.");
    }
    $token = bin2hex(random_bytes(32));
    transaction(function () use ($r, $account, $token) {
        query("SELECT id FROM `" . table($r) . "` WHERE id=? FOR UPDATE", [
            $account["id"],
        ]);
        change("DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?", [
            $r,
            $account["id"],
        ]);
        change(
            "INSERT INTO sf_reset_tokens(token_hash,role,user_id,expires) VALUES (?,?,?,?)",
            [hash("sha256", $token), $r, $account["id"], time() + 1800],
        );
    });
    echo rtrim(getenv("FRONTEND_URL") ?: "http://localhost:3000", "/") .
    "/reset-password#token=" .
    $token,
        "\nPrivate link. Expires in 30 minutes.\n";
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "Could not issue a link. Usage: php recover.php manager USERNAME. Check the account and database configuration.\n",
    );
    exit(1);
}
