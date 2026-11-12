<?php
require __DIR__ . "/../actions.php";
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
date_default_timezone_set("Africa/Nairobi");
try {
    $key = getenv("PHP_API_KEY") ?: "";
    if (
        !preg_match('/^[a-f0-9]{64}$/D', $key) ||
        !hash_equals($key, $_SERVER["HTTP_X_SMART_FARM_KEY"] ?? "")
    ) {
        fail(403, "The API connection is not authorized.");
    }
    $path = explode("/", trim($_GET["route"] ?? "", "/"));
    $route = $path[0];
    $post = $_SERVER["REQUEST_METHOD"] === "POST";
    if ($post && $route === "login") {
        $b = body();
        $r = role($b["role"] ?? "");
        $identifier = text($b["identifier"] ?? "");
        $pass = $b["password"] ?? "";
        if (!is_string($pass) || strlen($pass) > 1000) {
            fail(400, "Invalid password.");
        }
        $identity = hash("sha256", $r . ":" . strtolower($identifier));
        $limit =
            query(
                "SELECT attempts,expires FROM sf_login_limits WHERE identity_hash=?",
                [$identity],
            )[0] ?? null;
        if (
            $limit &&
            (int) $limit["expires"] > time() &&
            (int) $limit["attempts"] >= 10
        ) {
            fail(429, "Too many attempts. Try again in 15 minutes.");
        }
        $field = in_array($r, ["farmer", "agronomist"], true)
            ? "phone"
            : "username";
        $a =
            query("SELECT * FROM `" . table($r) . "` WHERE $field=? LIMIT 1", [
                $identifier,
            ])[0] ?? null;
        if (!$a || !password_match($pass, $a["password"])) {
            change(
                "INSERT INTO sf_login_limits(identity_hash,attempts,expires) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(expires<?,1,attempts+1),expires=IF(expires<?,VALUES(expires),expires)",
                [$identity, time() + 900, time(), time()],
            );
            fail(401, "Incorrect sign-in details.");
        }
        if ($r === "farmer" && (int) $a["status"] !== 1) {
            fail(
                403,
                "Your farmer account is awaiting administrator approval.",
            );
        }
        if (!password_get_info($a["password"])["algo"]) {
            change("UPDATE `" . table($r) . "` SET password=? WHERE id=?", [
                password_hash($pass, PASSWORD_BCRYPT),
                $a["id"],
            ]);
        }
        change("DELETE FROM sf_login_limits WHERE identity_hash=?", [
            $identity,
        ]);
        $token = bin2hex(random_bytes(32));
        change(
            "INSERT INTO sf_sessions(token_hash,role,user_id,expires) VALUES (?,?,?,?)",
            [hash("sha256", $token), $r, $a["id"], time() + 604800],
        );
        setcookie("sf_session", $token, [
            "expires" => time() + 604800,
            "path" => "/",
            "httponly" => true,
            "samesite" => "Lax",
        ]);
        respond(["role" => $r, "id" => (int) $a["id"]]);
    }
    if ($post && $route === "register") {
        $b = body();
        $name = text($b["name"] ?? "", 3);
        if (count(preg_split("/\s+/", $name)) < 2) {
            fail(400, "Enter your full name.");
        }
        change(
            "INSERT INTO farmers(name,phone,idno,password,location,status,time) VALUES (?,?,?,?,?,0,?)",
            [
                $name,
                phone($b["phone"] ?? ""),
                (int) number($b["idno"] ?? null, 1),
                password_hash(password($b["password"] ?? ""), PASSWORD_BCRYPT),
                county($b["location"] ?? ""),
                time(),
            ],
        );
        respond(
            [
                "message" =>
                    "Your account was created and is awaiting administrator approval.",
            ],
            201,
        );
    }
    if ($post && $route === "reset") {
        $b = body();
        $token = text($b["token"] ?? "", 64, 64);
        $pass = password($b["password"] ?? "");
        if ($pass !== ($b["confirmation"] ?? null)) {
            fail(400, "The passwords do not match.");
        }
        transaction(function () use ($token, $pass) {
            $reset =
                query(
                    "SELECT * FROM sf_reset_tokens WHERE token_hash=? AND expires>? FOR UPDATE",
                    [hash("sha256", $token), time()],
                )[0] ?? null;
            if (!$reset) {
                fail(
                    400,
                    "This recovery link has expired or has already been used.",
                );
            }
            $r = role($reset["role"]);
            change("UPDATE `" . table($r) . "` SET password=? WHERE id=?", [
                password_hash($pass, PASSWORD_BCRYPT),
                $reset["user_id"],
            ]);
            change("DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?", [
                $r,
                $reset["user_id"],
            ]);
            change("DELETE FROM sf_sessions WHERE role=? AND user_id=?", [
                $r,
                $reset["user_id"],
            ]);
        });
        respond(["message" => "Password updated. You can sign in now."]);
    }
    $u = actor();
    if (!$post) {
        if ($route === "me") {
            respond(["user" => $u]);
        }
        if ($route === "data") {
            respond([
                "rows" => records(
                    $u,
                    $path[1] ?? "",
                    isset($_GET["after"])
                        ? (int) number($_GET["after"], 1)
                        : null,
                ),
            ]);
        }
        if ($route === "overview") {
            $counts = in_array($u["role"], ["admin", "manager"], true)
                ? query(
                    "SELECT (SELECT COUNT(*) FROM farmers) AS farmers,(SELECT COUNT(*) FROM demand WHERE status=0) AS demand,(SELECT COUNT(*) FROM stations) AS stations",
                )[0]
                : query(
                    "SELECT (SELECT COUNT(*) FROM demand WHERE status=0) AS demand,(SELECT COUNT(*) FROM inputs WHERE county=?) AS inputs,(SELECT COUNT(*) FROM news) AS news",
                    [$u["location"]],
                )[0];
            respond([
                "counts" => $counts,
                "news" => query(
                    "SELECT id,county,source,message,time FROM news ORDER BY time DESC LIMIT 5",
                ),
            ]);
        }
        if ($route === "contacts") {
            respond(["rows" => contacts($u)]);
        }
        if ($route === "messages") {
            respond([
                "rows" => conversation(
                    $u,
                    (int) number($_GET["peer"] ?? null, 1),
                ),
            ]);
        }
        if ($route === "accounts") {
            require_role($u, ["admin"]);
            $all = [];
            foreach (["admin", "manager", "farmer", "agronomist"] as $r) {
                foreach (
                    query(
                        "SELECT id," .
                            (in_array($r, ["farmer", "agronomist"], true)
                                ? "name,phone"
                                : "username") .
                            " FROM `" .
                            table($r) .
                            "`",
                    )
                    as $a
                ) {
                    $all[] = [
                        "id" => $a["id"],
                        "role" => $r,
                        "name" => $a["name"] ?? $a["username"],
                        "identifier" => $a["phone"] ?? $a["username"],
                    ];
                }
            }
            respond(["rows" => $all]);
        }
        if ($route === "files") {
            $file =
                query("SELECT * FROM sf_files WHERE id=?", [
                    $path[1] ?? "",
                ])[0] ?? null;
            if (!$file) {
                fail(404, "Image not found.");
            }
            if ($file["scope"] === "chat") {
                $owner =
                    $file["owner_role"] === $u["role"] &&
                    (int) $file["owner_id"] === $u["id"];
                $peer =
                    (int) $file["peer_id"] === $u["id"] &&
                    (($file["owner_role"] === "farmer" &&
                        $u["role"] === "agronomist") ||
                        ($file["owner_role"] === "agronomist" &&
                            $u["role"] === "farmer"));
                if (!$owner && !$peer) {
                    fail(403, "This image belongs to another conversation.");
                }
            }
            $root = getenv("UPLOAD_DIR") ?: "";
            $name = $file["pathname"];
            if (
                !$root ||
                basename($name) !== $name ||
                !is_file($root . "/" . $name)
            ) {
                fail(404, "Image is unavailable.");
            }
            header("Content-Type: " . $file["mime"]);
            readfile($root . "/" . $name);
            exit();
        }
        if ($route === "report") {
            require __DIR__ . "/../reports.php";
            report($u, $path[1] ?? "", $_GET["format"] ?? "csv");
        }
        fail(404, "Endpoint not found.");
    }
    if ($route === "logout") {
        change("DELETE FROM sf_sessions WHERE token_hash=?", [
            hash("sha256", $_COOKIE["sf_session"] ?? ""),
        ]);
        setcookie("sf_session", "", [
            "expires" => 1,
            "path" => "/",
            "httponly" => true,
            "samesite" => "Lax",
        ]);
        respond(["ok" => true]);
    }
    if ($route === "upload") {
        $scope = $_POST["scope"] ?? "";
        if (!in_array($scope, ["catalog", "profile", "chat"], true)) {
            fail(400, "Invalid image scope.");
        }
        if ($scope === "catalog") {
            require_role($u, ["admin", "manager"]);
        }
        if ($scope === "profile") {
            require_role($u, ["agronomist"]);
        }
        $peer =
            $scope === "chat"
                ? (int) number($_POST["peerId"] ?? null, 1)
                : null;
        if ($peer) {
            conversation($u, $peer);
        }
        $file = $_FILES["file"] ?? null;
        if (
            !$file ||
            $file["error"] !== UPLOAD_ERR_OK ||
            $file["size"] > 3 * 1024 * 1024 ||
            !$file["size"]
        ) {
            fail(400, "Choose an image smaller than 3 MB.");
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file["tmp_name"]);
        $ext =
            [
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/webp" => "webp",
            ][$mime] ?? null;
        if (!$ext || !getimagesize($file["tmp_name"])) {
            fail(400, "Choose a valid JPEG, PNG, or WebP image.");
        }
        $root = getenv("UPLOAD_DIR") ?: "";
        if (!$root || !is_dir($root) || !is_writable($root)) {
            fail(503, "Persistent image storage is not configured.");
        }
        $id = uuid();
        $name = $id . "." . $ext;
        if (!move_uploaded_file($file["tmp_name"], $root . "/" . $name)) {
            fail(503, "Could not save the image.");
        }
        try {
            change(
                "INSERT INTO sf_files(id,pathname,owner_role,owner_id,scope,peer_id,mime) VALUES (?,?,?,?,?,?,?)",
                [$id, $name, $u["role"], $u["id"], $scope, $peer, $mime],
            );
        } catch (Throwable $e) {
            unlink($root . "/" . $name);
            throw $e;
        }
        respond(["url" => "/api/files/" . $id], 201);
    }
    $b = body();
    if ($route === "data") {
        mutate($u, $path[1] ?? "", $b);
        respond(["message" => "Changes saved."]);
    }
    if ($route === "supplies") {
        supply($u, $b);
        respond(["message" => "Supply record updated."]);
    }
    if ($route === "orders") {
        order($u, $b);
        respond([
            "message" =>
                "Order recorded. You can review it in your purchase records.",
        ]);
    }
    if ($route === "payments") {
        settlement($u, $b);
        respond([
            "message" => "Payment recorded. This did not initiate a transfer.",
        ]);
    }
    if ($route === "verify-payment") {
        verify_payment($u, $b);
        respond(["message" => "Payment verified and recorded."]);
    }
    if ($route === "account") {
        respond(account_update($u, $b));
    }
    if ($route === "messages") {
        if (($b["action"] ?? "") === "delete") {
            change("DELETE FROM chats WHERE id=? AND sender=?", [
                (int) number($b["id"] ?? null, 1),
                chat_key($u),
            ]);
        } else {
            $peer = (int) number($b["peerId"] ?? null, 1);
            conversation($u, $peer);
            $message = text($b["message"] ?? "", 0, 10000);
            $photo = $b["photo"] ?? "";
            if (!$photo && !$message) {
                fail(400, "Write a message or attach a photo.");
            }
            if ($photo) {
                image_reference($photo);
                $f =
                    query("SELECT * FROM sf_files WHERE id=?", [
                        basename($photo),
                    ])[0] ?? [];
                if (
                    ($f["scope"] ?? "") !== "chat" ||
                    ($f["owner_role"] ?? "") !== $u["role"] ||
                    (int) ($f["owner_id"] ?? 0) !== $u["id"] ||
                    (int) ($f["peer_id"] ?? 0) !== $peer
                ) {
                    fail(
                        403,
                        "This attachment belongs to another conversation.",
                    );
                }
            }
            change(
                "INSERT INTO chats(sender,receiver,message,type,status,time) VALUES (?,?,?,?,0,?)",
                [
                    chat_key($u),
                    ($u["role"] === "farmer" ? "a" : "f") . "-" . $peer,
                    $message,
                    $photo ?: "text",
                    time(),
                ],
            );
        }
        respond(["message" => "Conversation updated."]);
    }
    if ($route === "recovery") {
        require_role($u, ["admin"]);
        $r = role($b["role"] ?? "");
        $id = (int) number($b["id"] ?? null, 1);
        $token = recovery($r, $id);
        respond([
            "path" => "/reset-password#token=" . $token,
            "message" => "Private link. Expires in 30 minutes.",
        ]);
    }
    fail(404, "Endpoint not found.");
} catch (ApiFailure $e) {
    respond(["error" => $e->getMessage()], $e->status);
} catch (mysqli_sql_exception $e) {
    error_log("Smart Farm database error code " . $e->getCode());
    respond(
        [
            "error" =>
                $e->getCode() === 1062
                    ? "This account identifier or transaction reference is already in use."
                    : "The backend could not complete the database request.",
        ],
        $e->getCode() === 1062 ? 409 : 500,
    );
} catch (Throwable $e) {
    error_log("Smart Farm API error: " . get_class($e));
    respond(["error" => "The backend could not complete this request."], 500);
}
function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 15) | 64);
    $b[8] = chr((ord($b[8]) & 63) | 128);
    $h = bin2hex($b);
    return substr($h, 0, 8) .
        "-" .
        substr($h, 8, 4) .
        "-" .
        substr($h, 12, 4) .
        "-" .
        substr($h, 16, 4) .
        "-" .
        substr($h, 20);
}
function recovery(string $role, int $id): string
{
    $token = bin2hex(random_bytes(32));
    transaction(function () use ($role, $id, $token) {
        if (
            !query(
                "SELECT id FROM `" . table($role) . "` WHERE id=? FOR UPDATE",
                [$id],
            )
        ) {
            fail(404, "Account not found.");
        }
        change("DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?", [
            $role,
            $id,
        ]);
        change(
            "INSERT INTO sf_reset_tokens(token_hash,role,user_id,expires) VALUES (?,?,?,?)",
            [hash("sha256", $token), $role, $id, time() + 1800],
        );
    });
    return $token;
}
