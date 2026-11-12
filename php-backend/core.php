<?php
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
function db(): mysqli
{
    static $db;
    if (!$db) {
        $db = mysqli_init();
        if (getenv("DB_SSL") === "true") {
            $db->options(MYSQLI_OPT_SSL_VERIFY_SERVER_CERT, true);
            $db->ssl_set(null, null, getenv("DB_CA_FILE") ?: null, null, null);
        }
        $db->real_connect(
            getenv("DB_HOST") ?: "localhost",
            getenv("DB_USER") ?: "",
            getenv("DB_PASSWORD") ?: "",
            getenv("DB_NAME") ?: "",
            (int) (getenv("DB_PORT") ?: 3306),
            null,
            getenv("DB_SSL") === "true" ? MYSQLI_CLIENT_SSL : 0,
        );
        $db->set_charset("utf8mb4");
    }
    return $db;
}
function query(string $sql, array $values = []): array
{
    $q = db()->prepare($sql);
    if ($values) {
        $q->bind_param(str_repeat("s", count($values)), ...$values);
    }
    $q->execute();
    $r = $q->get_result();
    return $r ? $r->fetch_all(MYSQLI_ASSOC) : [];
}
function change(string $sql, array $values = []): int
{
    query($sql, $values);
    return db()->insert_id;
}
function fail(int $status, string $message): never
{
    throw new ApiFailure($status, $message);
}
class ApiFailure extends RuntimeException
{
    public function __construct(public int $status, string $message)
    {
        parent::__construct($message);
    }
}
function respond($data, int $status = 200): never
{
    http_response_code($status);
    header("Content-Type: application/json");
    header("Cache-Control: no-store");
    echo json_encode($data, JSON_THROW_ON_ERROR);
    exit();
}
function body(): array
{
    $data = json_decode(file_get_contents("php://input"), true);
    if (!is_array($data)) {
        fail(400, "Invalid JSON request.");
    }
    return $data;
}
function text($v, int $min = 1, int $max = 255): string
{
    if (!is_string($v)) {
        fail(400, "Enter a valid text value.");
    }
    $v = trim($v);
    if (mb_strlen($v) < $min || mb_strlen($v) > $max) {
        fail(400, "Please check the required fields and their length.");
    }
    return $v;
}
function number($v, float $min = 0): float
{
    if (
        !is_numeric($v) ||
        !is_finite((float) $v) ||
        (float) $v < $min ||
        (float) $v > 1e12
    ) {
        fail(400, "Enter a valid number.");
    }
    return (float) $v;
}
function password($v): string
{
    if (!is_string($v) || mb_strlen($v) < 12 || strlen($v) > 72) {
        fail(
            400,
            "Use a password with at least 12 characters and no more than 72 bytes.",
        );
    }
    return $v;
}
function role($v): string
{
    if (!in_array($v, ["admin", "manager", "farmer", "agronomist"], true)) {
        fail(400, "Invalid account role.");
    }
    return $v;
}
function table(string $role): string
{
    return [
        "admin" => "admin",
        "manager" => "manager",
        "farmer" => "farmers",
        "agronomist" => "agronomists",
    ][$role];
}
function phone($v): int
{
    if (!is_string($v) || !preg_match('/^0?[17]\d{8}$/D', $v)) {
        fail(400, "Enter a Kenyan mobile number.");
    }
    return (int) $v;
}
function regions(): array
{
    return [
        "Narok North",
        "Narok East",
        "Narok South",
        "Narok West",
        "Kilgoris",
        "Emurua Dikirr",
    ];
}
function county($v): string
{
    if (!in_array($v, regions(), true)) {
        fail(400, "Select a valid sub-county.");
    }
    return $v;
}
function actor(): array
{
    $token = $_COOKIE["sf_session"] ?? "";
    $s =
        query(
            "SELECT role,user_id FROM sf_sessions WHERE token_hash=? AND expires>?",
            [hash("sha256", $token), time()],
        )[0] ?? null;
    if (!$s) {
        fail(401, "Please sign in to continue.");
    }
    $r = role($s["role"]);
    $a =
        query("SELECT * FROM `" . table($r) . "` WHERE id=?", [
            $s["user_id"],
        ])[0] ?? null;
    if (!$a || ($r === "farmer" && (int) $a["status"] !== 1)) {
        fail(401, "Please sign in to continue.");
    }
    return [
        "id" => (int) $a["id"],
        "role" => $r,
        "name" => html_entity_decode(
            $a["name"] ?? $a["username"],
            ENT_QUOTES,
            "UTF-8",
        ),
        "identifier" => (string) ($a["phone"] ?? $a["username"]),
        "location" => $a["location"] ?? "",
    ];
}
function require_role(array $user, array $roles): void
{
    if (!in_array($user["role"], $roles, true)) {
        fail(403, "You do not have permission for this action.");
    }
}
function transaction(callable $callback)
{
    db()->begin_transaction();
    try {
        $r = $callback();
        db()->commit();
        return $r;
    } catch (Throwable $e) {
        db()->rollback();
        throw $e;
    }
}
function resources(): array
{
    static $r;
    return $r ??= json_decode(
        file_get_contents(__DIR__ . "/config/resources.json"),
        true,
    );
}
function records(array $user, string $key, ?int $after = null): array
{
    $r = resources()[$key] ?? null;
    if (!$r) {
        fail(404, "Section not found.");
    }
    require_role($user, $r["read"]);
    $fields = ["id"];
    foreach ($r["columns"] as $c) {
        if ($c["key"] !== "farmer_name") {
            $fields[] = $c["key"];
        }
    }
    if ($key === "news") {
        $fields = array_merge($fields, ["author_role", "author_id"]);
    }
    $joined = in_array(
        $key,
        ["supplies", "sales", "purchases", "payments"],
        true,
    );
    $sql =
        "SELECT " .
        implode(",", array_map(fn($f) => "r.`" . $f . "`", $fields)) .
        ($joined ? ",f.name AS farmer_name" : "") .
        " FROM `" .
        $r["table"] .
        "` r" .
        ($joined ? " LEFT JOIN farmers f ON f.id=r.farmer" : "");
    $where = [];
    $args = [];
    if ($joined && $user["role"] === "farmer") {
        $where[] = "r.farmer=?";
        $args[] = $user["id"];
    }
    if ($key === "inputs" && $user["role"] === "farmer") {
        $where[] = "r.county=?";
        $args[] = $user["location"];
    }
    if ($key === "demand" && $user["role"] === "farmer") {
        $where[] = "r.status=0";
    }
    if ($after) {
        $where[] = "r.id<?";
        $args[] = $after;
    }
    if ($where) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    return query($sql . " ORDER BY r.id DESC LIMIT 500", $args);
}
function chat_key(array $u): string
{
    return ($u["role"] === "farmer" ? "f" : "a") . "-" . $u["id"];
}
function contacts(array $u): array
{
    require_role($u, ["farmer", "agronomist"]);
    $t = $u["role"] === "farmer" ? "agronomists" : "farmers";
    $prefix = $u["role"] === "farmer" ? "a-" : "f-";
    $self = chat_key($u);
    return query(
        "SELECT p.id,p.name,p.location FROM $t p WHERE (p.location=?" .
            ($t === "farmers" ? " AND p.status=1" : "") .
            ") OR EXISTS(SELECT 1 FROM chats c WHERE (c.sender=? AND c.receiver=CONCAT(?,p.id)) OR (c.receiver=? AND c.sender=CONCAT(?,p.id))) ORDER BY p.name",
        [$u["location"], $self, $prefix, $self, $prefix],
    );
}
function conversation(array $u, int $peer): array
{
    if (!array_filter(contacts($u), fn($p) => (int) $p["id"] === $peer)) {
        fail(403, "Choose an available contact.");
    }
    $self = chat_key($u);
    $other = ($u["role"] === "farmer" ? "a" : "f") . "-" . $peer;
    change("UPDATE chats SET status=1 WHERE sender=? AND receiver=?", [
        $other,
        $self,
    ]);
    return query(
        "SELECT id,sender,receiver,message,type,status,time FROM chats WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY time,id",
        [$self, $other, $other, $self],
    );
}
function image_reference($v): string
{
    if (!is_string($v) || !preg_match('~^/api/files/[a-f0-9-]{36}$~D', $v)) {
        fail(400, "Upload the image first.");
    }
    return $v;
}
function password_match(string $password, string $stored): bool
{
    return (preg_match('/^\$2[aby]\$/', $stored) || password_get_info($stored)["algo"] !== null)
        ? password_verify($password, $stored)
        : hash_equals($stored, $password);
}
