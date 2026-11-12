<?php
/** Manager recovery helpers. Public requests can consume, but never issue, links. */
function sf_manager_password_matches(string $password, string $stored): bool
{
    return password_get_info($stored)["algo"] !== null
        ? password_verify($password, $stored)
        : hash_equals($stored, $password);
}

function sf_manager_reset_schema(mysqli $db): void
{
    // Only the trusted CLI issuer runs this idempotent setup.
    $column = $db
        ->query("SHOW COLUMNS FROM manager LIKE 'password'")
        ->fetch_assoc();
    if (
        preg_match('/^varchar\((\d+)\)$/i', $column["Type"], $length) &&
        (int) $length[1] < 255
    ) {
        $db->query("ALTER TABLE manager MODIFY password VARCHAR(255) NOT NULL");
    }
    $db->query('CREATE TABLE IF NOT EXISTS manager_password_resets (
        token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
        manager_id INT NOT NULL,
        expires_at BIGINT NOT NULL,
        INDEX manager_reset_account (manager_id),
        INDEX manager_reset_expiry (expires_at)
    ) ENGINE=InnoDB');
}

function sf_manager_issue_reset(mysqli $db, string $username): string
{
    sf_manager_reset_schema($db);
    $db->begin_transaction();
    try {
        $account = $db->prepare(
            "SELECT id FROM manager WHERE username = ? FOR UPDATE",
        );
        $account->bind_param("s", $username);
        $account->execute();
        $manager = $account->get_result()->fetch_assoc();
        if (!$manager) {
            throw new RuntimeException(
                "Manager not found. Use --list to see manager usernames.",
            );
        }
        $id = (int) $manager["id"];
        $delete = $db->prepare(
            "DELETE FROM manager_password_resets WHERE manager_id = ? OR expires_at <= ?",
        );
        $now = time();
        $delete->bind_param("ii", $id, $now);
        $delete->execute();
        $token = bin2hex(random_bytes(32));
        $hash = hash("sha256", $token);
        $expires = $now + 1800;
        $insert = $db->prepare(
            "INSERT INTO manager_password_resets (token_hash, manager_id, expires_at) VALUES (?, ?, ?)",
        );
        $insert->bind_param("sii", $hash, $id, $expires);
        $insert->execute();
        $db->commit();
        return $token;
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}

function sf_manager_valid_reset(mysqli $db, string $token): bool
{
    if (!preg_match("/\A[a-f0-9]{64}\z/D", $token)) {
        return false;
    }
    try {
        $hash = hash("sha256", $token);
        $now = time();
        $query = $db->prepare(
            "SELECT r.manager_id FROM manager_password_resets r INNER JOIN manager m ON m.id = r.manager_id WHERE r.token_hash = ? AND r.expires_at > ?",
        );
        $query->bind_param("si", $hash, $now);
        $query->execute();
        return (bool) $query->get_result()->fetch_assoc();
    } catch (mysqli_sql_exception $error) {
        if ($error->getCode() === 1146) {
            return false;
        }
        throw $error;
    }
}

function sf_manager_consume_reset(
    mysqli $db,
    string $token,
    string $password,
): bool {
    if (!preg_match("/\A[a-f0-9]{64}\z/D", $token)) {
        return false;
    }
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $tokenHash = hash("sha256", $token);
    $now = time();
    $db->begin_transaction();
    try {
        $find = $db->prepare(
            "SELECT manager_id FROM manager_password_resets WHERE token_hash = ? AND expires_at > ? FOR UPDATE",
        );
        $find->bind_param("si", $tokenHash, $now);
        $find->execute();
        $reset = $find->get_result()->fetch_assoc();
        if (!$reset) {
            $db->rollback();
            return false;
        }
        $id = (int) $reset["manager_id"];
        $update = $db->prepare("UPDATE manager SET password = ? WHERE id = ?");
        $update->bind_param("si", $passwordHash, $id);
        $update->execute();
        if ($update->affected_rows !== 1) {
            $db->rollback();
            return false;
        }
        $delete = $db->prepare(
            "DELETE FROM manager_password_resets WHERE manager_id = ?",
        );
        $delete->bind_param("i", $id);
        $delete->execute();
        $db->commit();
        return true;
    } catch (Throwable $error) {
        $db->rollback();
        throw $error;
    }
}
