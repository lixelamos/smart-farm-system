<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/core.php";
try {
    $source = realpath($argv[1] ?? "");
    $target = getenv("UPLOAD_DIR") ?: "";
    if (
        !$source ||
        !is_dir($source) ||
        !is_dir($target) ||
        !is_writable($target)
    ) {
        throw new RuntimeException();
    }
    $missing = 0;
    $copied = 0;
    $move = function (
        string $filename,
        string $scope,
        string $role,
        int $owner,
        ?int $peer,
    ) use ($source, $target, &$missing, &$copied): ?string {
        if (
            !$filename ||
            in_array($filename, ["none", "text"], true) ||
            str_starts_with($filename, "/api/files/")
        ) {
            return $filename;
        }
        $path = realpath($source . "/" . $filename);
        if (
            basename($filename) !== $filename ||
            !$path ||
            !str_starts_with($path, $source . DIRECTORY_SEPARATOR) ||
            !is_file($path)
        ) {
            $missing++;
            return null;
        }
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($path);
        $ext =
            [
                "image/jpeg" => "jpg",
                "image/png" => "png",
                "image/webp" => "webp",
            ][$mime] ?? null;
        if (!$ext || !getimagesize($path)) {
            $missing++;
            return null;
        }
        $hex = bin2hex(random_bytes(16));
        $id =
            substr($hex, 0, 8) .
            "-" .
            substr($hex, 8, 4) .
            "-4" .
            substr($hex, 13, 3) .
            "-8" .
            substr($hex, 17, 3) .
            "-" .
            substr($hex, 20);
        $name = $id . "." . $ext;
        if (!copy($path, $target . "/" . $name)) {
            throw new RuntimeException();
        }
        try {
            change(
                "INSERT INTO sf_files(id,pathname,owner_role,owner_id,scope,peer_id,mime) VALUES (?,?,?,?,?,?,?)",
                [$id, $name, $role, $owner, $scope, $peer, $mime],
            );
        } catch (Throwable $e) {
            unlink($target . "/" . $name);
            throw $e;
        }
        $copied++;
        return "/api/files/" . $id;
    };
    foreach (
        ["inputs", "products", "sales", "purchases", "agronomists"]
        as $t
    ) {
        foreach (query("SELECT id,photo FROM $t") as $row) {
            $url = $move(
                $row["photo"],
                $t === "agronomists" ? "profile" : "catalog",
                $t === "agronomists" ? "agronomist" : "admin",
                $t === "agronomists" ? (int) $row["id"] : 0,
                null,
            );
            if ($url && $url !== $row["photo"]) {
                change("UPDATE $t SET photo=? WHERE id=?", [$url, $row["id"]]);
            }
        }
    }
    foreach (
        query("SELECT id,sender,receiver,type FROM chats WHERE type<>'text'")
        as $row
    ) {
        if (
            !preg_match('/^([af])-(\d+)$/D', $row["sender"], $sender) ||
            !preg_match('/^([af])-(\d+)$/D', $row["receiver"], $peer)
        ) {
            $missing++;
            continue;
        }
        $url = $move(
            $row["type"],
            "chat",
            $sender[1] === "f" ? "farmer" : "agronomist",
            (int) $sender[2],
            (int) $peer[2],
        );
        if ($url && $url !== $row["type"]) {
            change("UPDATE chats SET type=? WHERE id=?", [$url, $row["id"]]);
        }
    }
    echo "Migrated $copied images. $missing missing or unsupported references retained.\n";
    exit($missing ? 2 : 0);
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "Image migration failed. Check source files, private storage permissions, and database settings.\n",
    );
    exit(1);
}
