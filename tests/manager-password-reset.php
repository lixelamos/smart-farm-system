<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/../dbcon.php";
require __DIR__ . "/../includes/manager-passwords.php";
function check_reset(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
    echo "PASS: $message\n";
}
$ids = [];
try {
    sf_manager_reset_schema($con);
    $username = "reset_test_" . bin2hex(random_bytes(8));
    $original = "legacy-" . bin2hex(random_bytes(12));
    $insert = $con->prepare(
        "INSERT INTO manager (username, password) VALUES (?, ?)",
    );
    $insert->bind_param("ss", $username, $original);
    $insert->execute();
    $id = (int) $con->insert_id;
    $ids[] = $id;
    check_reset(
        sf_manager_password_matches($original, $original),
        "legacy manager password remains compatible",
    );
    check_reset(
        !sf_manager_password_matches(strtoupper($original), $original),
        "password comparison is case-sensitive",
    );
    $first = sf_manager_issue_reset($con, $username);
    $read = $con->prepare(
        "SELECT token_hash FROM manager_password_resets WHERE manager_id = ?",
    );
    $read->bind_param("i", $id);
    $read->execute();
    $stored = $read->get_result()->fetch_assoc()["token_hash"];
    check_reset(
        $stored === hash("sha256", $first) && $stored !== $first,
        "database stores only the token hash",
    );
    check_reset(sf_manager_valid_reset($con, $first), "fresh token is valid");
    check_reset(
        !sf_manager_valid_reset($con, str_repeat("f", 64)),
        "unknown token is rejected",
    );
    check_reset(
        !sf_manager_valid_reset($con, "' OR 1=1"),
        "malformed token is rejected",
    );
    $second = sf_manager_issue_reset($con, $username);
    check_reset(
        !sf_manager_valid_reset($con, $first),
        "new link invalidates older link",
    );
    $expire = $con->prepare(
        "UPDATE manager_password_resets SET expires_at = ? WHERE manager_id = ?",
    );
    $past = time() - 1;
    $expire->bind_param("ii", $past, $id);
    $expire->execute();
    check_reset(
        !sf_manager_valid_reset($con, $second),
        "expired token is rejected",
    );
    check_reset(
        !sf_manager_consume_reset($con, $second, "Never accepted password"),
        "expired token cannot change a password",
    );
    $third = sf_manager_issue_reset($con, $username);
    $newPassword = "A new private passphrase " . bin2hex(random_bytes(4));
    check_reset(
        sf_manager_consume_reset($con, $third, $newPassword),
        "valid token updates the password",
    );
    $account = $con->prepare("SELECT password FROM manager WHERE id = ?");
    $account->bind_param("i", $id);
    $account->execute();
    $hash = $account->get_result()->fetch_assoc()["password"];
    check_reset(
        $hash !== $newPassword && password_verify($newPassword, $hash),
        "new password is stored with bcrypt",
    );
    check_reset(
        sf_manager_password_matches($newPassword, $hash),
        "new password is accepted by manager login verification",
    );
    check_reset(
        !sf_manager_password_matches($original, $hash),
        "previous password is rejected",
    );
    check_reset(
        !sf_manager_consume_reset($con, $third, "Another private passphrase"),
        "a used link cannot be replayed",
    );
    try {
        sf_manager_issue_reset($con, "missing_" . bin2hex(random_bytes(10)));
        throw new RuntimeException("Missing manager was accepted");
    } catch (RuntimeException $error) {
        check_reset(
            str_starts_with($error->getMessage(), "Manager not found."),
            "issuer rejects a nonexistent manager",
        );
    }
} finally {
    foreach ($ids as $id) {
        $delete = $con->prepare(
            "DELETE FROM manager_password_resets WHERE manager_id = ?",
        );
        $delete->bind_param("i", $id);
        $delete->execute();
        $delete = $con->prepare("DELETE FROM manager WHERE id = ?");
        $delete->bind_param("i", $id);
        $delete->execute();
    }
}
