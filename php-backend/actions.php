<?php
require_once __DIR__ . "/core.php";
function mutate(array $u, string $key, array $b): void
{
    $r = resources()[$key] ?? null;
    if (!$r) {
        fail(404, "Section not found.");
    }
    $id = (int) ($b["id"] ?? 0);
    $action = $b["action"] ?? "save";
    if ($action === "toggle") {
        require_role($u, ["admin"]);
        if (!in_array($key, ["farmers", "demand"], true)) {
            fail(403, "Status cannot be changed.");
        }
        $status = (int) number($b["status"] ?? null);
        if (!in_array($status, [0, 1], true)) {
            fail(400, "Invalid status.");
        }
        change("UPDATE `" . $r["table"] . "` SET status=? WHERE id=?", [
            $status,
            $id,
        ]);
        if ($key === "farmers" && !$status) {
            change("DELETE FROM sf_sessions WHERE role=? AND user_id=?", [
                "farmer",
                $id,
            ]);
        }
        return;
    }
    require_role(
        $u,
        $action === "delete" ? $r["remove"] ?? $r["write"] : $r["write"],
    );
    if ($key === "news" && $id && $u["role"] === "agronomist") {
        $article =
            query("SELECT author_role,author_id FROM news WHERE id=?", [
                $id,
            ])[0] ?? [];
        if (
            ($article["author_role"] ?? "") !== "agronomist" ||
            (int) ($article["author_id"] ?? 0) !== $u["id"]
        ) {
            fail(403, "You can only manage your own updates.");
        }
    }
    if ($action === "delete") {
        change("DELETE FROM `" . $r["table"] . "` WHERE id=?", [$id]);
        return;
    }
    $values = [];
    foreach ($r["fields"] as $field) {
        $name = $field["name"];
        $type = $field["type"] ?? "text";
        $v = $b[$name] ?? "";
        if ($type === "password") {
            if (!$id) {
                $values[$name] = password_hash(password($v), PASSWORD_BCRYPT);
            }
            continue;
        }
        if ($type === "number") {
            $v = number($v);
            $scale = $name === "maxsupply" ? 1000 : 100;
            if (abs($v * $scale - round($v * $scale)) > 0.000001) {
                fail(400, "Too many decimal places.");
            }
        } elseif ($type === "select") {
            if (!in_array($v, $field["options"], true)) {
                fail(400, "Choose a valid option.");
            }
        } else {
            $v = text(
                $v,
                $field["required"] ?? false ? 1 : 0,
                $type === "textarea" ? 10000 : 255,
            );
        }
        if ($name === "phone") {
            $v = phone((string) $v);
        }
        if ($name === "idno") {
            $v = (int) number($v, 1);
        }
        if ($name === "photo" && $v) {
            if (str_starts_with($v, "/api/files/")) {
                $file =
                    query("SELECT scope FROM sf_files WHERE id=?", [
                        basename($v),
                    ])[0] ?? null;
                if (!$file || $file["scope"] === "chat") {
                    fail(400, "Choose a catalogue or profile image.");
                }
            } elseif (
                !$id ||
                (query("SELECT photo FROM `" . $r["table"] . "` WHERE id=?", [
                    $id,
                ])[0]["photo"] ??
                    null) !==
                    $v
            ) {
                fail(400, "Upload an image first.");
            }
        }
        $values[$name] = $v;
    }
    if (!$id) {
        if (in_array($key, ["farmers", "products", "inputs", "news"], true)) {
            $values["time"] = time();
        }
        if ($key === "farmers") {
            $values["status"] = 1;
        }
        if ($key === "demand") {
            $values["status"] = 0;
        }
        if ($key === "agronomists" && !$values["photo"]) {
            $values["photo"] = "none";
        }
        if ($key === "news") {
            $values["author_role"] = $u["role"];
            $values["author_id"] = $u["id"];
        }
    }
    $fields = array_keys($values);
    if ($id) {
        change(
            "UPDATE `" .
                $r["table"] .
                "` SET " .
                implode(",", array_map(fn($f) => "`$f`=?", $fields)) .
                " WHERE id=?",
            [...array_values($values), $id],
        );
    } else {
        change(
            "INSERT INTO `" .
                $r["table"] .
                "` (`" .
                implode("`,`", $fields) .
                "`) VALUES (" .
                implode(",", array_fill(0, count($fields), "?")) .
                ")",
            array_values($values),
        );
    }
}
function supply(array $u, array $b): void
{
    transaction(function () use ($u, $b) {
        if (isset($b["action"])) {
            $id = (int) number($b["id"] ?? null, 1);
            $s =
                query("SELECT * FROM supplies WHERE id=? FOR UPDATE", [
                    $id,
                ])[0] ?? null;
            if (!$s) {
                fail(404, "Supply not found.");
            }
            if ($b["action"] === "verify") {
                require_role($u, ["admin"]);
                change("UPDATE supplies SET status=1 WHERE id=?", [$id]);
                return;
            }
            if (
                $b["action"] !== "cancel" ||
                $u["role"] !== "farmer" ||
                (int) $s["farmer"] !== $u["id"] ||
                (int) $s["status"] !== 0 ||
                (int) $s["paid"] !== 0
            ) {
                fail(
                    403,
                    "Only your unverified, unpaid supplies can be cancelled.",
                );
            }
            $link =
                query("SELECT * FROM sf_supply_demands WHERE supply_id=?", [
                    $id,
                ])[0] ?? null;
            if ($link) {
                change("UPDATE demand SET maxsupply=maxsupply+? WHERE id=?", [
                    $link["quantity"],
                    $link["demand_id"],
                ]);
                change("DELETE FROM sf_supply_demands WHERE supply_id=?", [
                    $id,
                ]);
            }
            change("DELETE FROM supplies WHERE id=?", [$id]);
            return;
        }
        require_role($u, ["farmer"]);
        $id = (int) number($b["demandId"] ?? null, 1);
        $qty = number($b["quantity"] ?? null, 0.001);
        if (abs($qty * 1000 - round($qty * 1000)) > 0.000001) {
            fail(400, "Use at most three decimal places.");
        }
        $d =
            query("SELECT * FROM demand WHERE id=? FOR UPDATE", [$id])[0] ??
            null;
        if (!$d || (int) $d["status"] !== 0 || $qty > (float) $d["maxsupply"]) {
            fail(409, "The requested quantity is no longer available.");
        }
        $station =
            query("SELECT station FROM stations WHERE id=? AND county=?", [
                $b["stationId"] ?? 0,
                $u["location"],
            ])[0] ?? null;
        if (!$station) {
            fail(400, "Choose a station in your sub-county.");
        }
        $sid = change(
            "INSERT INTO supplies(farmer,station,produce,quantity,rate,total,status,paid,time) VALUES (?,?,?,?,?,?,0,0,?)",
            [
                $u["id"],
                $station["station"],
                $d["product"],
                "$qty " . $d["measure"],
                $d["rate"],
                number_format($qty * (float) $d["rate"], 2, ".", ""),
                time(),
            ],
        );
        change(
            "INSERT INTO sf_supply_demands(supply_id,demand_id,quantity) VALUES (?,?,?)",
            [$sid, $id, $qty],
        );
        change("UPDATE demand SET maxsupply=maxsupply-? WHERE id=?", [
            $qty,
            $id,
        ]);
    });
}
function order(array $u, array $b): void
{
    require_role($u, ["farmer"]);
    $kind = $b["kind"] ?? "";
    if (
        !in_array($kind, ["inputs", "products"], true) ||
        !is_array($b["ids"] ?? null) ||
        !count($b["ids"]) ||
        count($b["ids"]) > 50
    ) {
        fail(400, "Choose items to order.");
    }
    transaction(function () use ($u, $b, $kind) {
        foreach ($b["ids"] as $id) {
            $item =
                query("SELECT * FROM $kind WHERE id=?", [
                    (int) number($id, 1),
                ])[0] ?? null;
            if (
                !$item ||
                ($kind === "inputs" &&
                    strcasecmp($item["county"], $u["location"]) !== 0)
            ) {
                fail(404, "An item is no longer available.");
            }
            if ($kind === "inputs") {
                change(
                    "INSERT INTO sales(farmer,product,photo,cost,paid,time) VALUES (?,?,?,?,0,?)",
                    [
                        $u["id"],
                        $item["name"],
                        $item["photo"],
                        $item["cost"],
                        time(),
                    ],
                );
            } else {
                change(
                    "INSERT INTO purchases(item,photo,details,cost,farmer,day,paid,time) VALUES (?,?,?,?,?,?,0,?)",
                    [
                        $item["product"],
                        $item["photo"],
                        $item["details"],
                        $item["cost"],
                        $u["id"],
                        date("d/m/Y"),
                        time(),
                    ],
                );
            }
        }
    });
}
function settlement(array $u, array $b, bool $verified = false): void
{
    if (!$verified) {
        require_role($u, ["admin"]);
    }
    $kind = $b["kind"] ?? "";
    $ids = $b["ids"] ?? [];
    if (
        !in_array($kind, ["supplies", "sales", "purchases"], true) ||
        !is_array($ids) ||
        !count($ids) ||
        count($ids) > 500 ||
        count(array_unique($ids)) !== count($ids)
    ) {
        fail(400, "Choose valid unpaid records.");
    }
    $ids = array_map(fn($id) => (int) number($id, 1), $ids);
    $ref = text($b["reference"] ?? "", 5, 100);
    if (!preg_match('/^[A-Za-z0-9_-]+$/D', $ref)) {
        fail(400, "Enter a valid payment reference.");
    }
    $mode = $b["mode"] ?? "MPESA";
    if (!in_array($mode, ["Cash", "Bank", "MPESA"], true)) {
        fail(400, "Choose a payment method.");
    }
    transaction(function () use ($u, $b, $kind, $ids, $ref, $mode, $verified) {
        $r = query(
            "SELECT * FROM $kind WHERE id IN (" .
                implode(",", array_fill(0, count($ids), "?")) .
                ") FOR UPDATE",
            $ids,
        );
        if (count($r) !== count($ids)) {
            fail(409, "Some records are no longer available.");
        }
        $farmer = (int) $r[0]["farmer"];
        $amount = 0;
        foreach ($r as $row) {
            if ((int) $row["farmer"] !== $farmer) {
                fail(400, "Settle one farmer at a time.");
            }
            if (
                (int) $row["paid"] !== 0 ||
                ($kind === "supplies" && (int) $row["status"] !== 1)
            ) {
                fail(409, "Verify deliveries and select unpaid records only.");
            }
            $amount +=
                (float) ($kind === "supplies" ? $row["total"] : $row["cost"]);
        }
        if (
            $verified &&
            ($farmer !== $u["id"] ||
                abs($amount - (float) $b["_verified_amount"]) > 0.005)
        ) {
            fail(409, "The order changed or does not belong to you.");
        }
        change(
            "INSERT INTO sf_payment_refs(reference,farmer_id,amount,created) VALUES (?,?,?,?)",
            [$ref, $farmer, $amount, time()],
        );
        $pid = change(
            "INSERT INTO payments(farmer,description,mode,transaction,amount,time) VALUES (?,?,?,?,?,?)",
            [
                $farmer,
                ($kind === "supplies" ? "Produce payout" : "Purchase payment") .
                ": " .
                $kind .
                " records " .
                implode(", ", $ids),
                $mode,
                $ref,
                $amount,
                time(),
            ],
        );
        foreach ($ids as $id) {
            change(
                "INSERT INTO sf_payment_allocations(payment_id,record_type,record_id) VALUES (?,?,?)",
                [$pid, $kind, $id],
            );
        }
        change(
            "UPDATE $kind SET paid=? WHERE id IN (" .
                implode(",", array_fill(0, count($ids), "?")) .
                ")",
            [time(), ...$ids],
        );
    });
}
function verify_payment(array $u, array $b): void
{
    require_role($u, ["farmer"]);
    $url = getenv("PAYMENT_VERIFY_URL");
    if (!$url) {
        fail(
            503,
            "Online payment verification is not configured. Contact the administrator to record your payment.",
        );
    }
    if (parse_url($url, PHP_URL_SCHEME) !== "https") {
        fail(503, "Payment verification requires HTTPS.");
    }
    $kind = $b["kind"] ?? "";
    if (!in_array($kind, ["sales", "purchases"], true)) {
        fail(400, "Invalid purchase type.");
    }
    $ids = $b["ids"] ?? [];
    if (
        !is_array($ids) ||
        !count($ids) ||
        count($ids) > 50 ||
        count(array_unique($ids)) !== count($ids)
    ) {
        fail(400, "Select purchase records.");
    }
    $ids = array_map(fn($id) => (int) number($id, 1), $ids);
    $ref = text($b["reference"] ?? "", 5, 100);
    $records = query(
        "SELECT cost FROM $kind WHERE farmer=? AND paid=0 AND id IN (" .
            implode(",", array_fill(0, count($ids), "?")) .
            ")",
        [$u["id"], ...$ids],
    );
    if (count($records) !== count($ids)) {
        fail(409, "Some records are no longer unpaid.");
    }
    $amount = array_sum(array_column($records, "cost"));
    $payload = json_encode([
        "reference" => $ref,
        "amount" => $amount,
        "currency" => "KES",
        "phone" => $u["identifier"],
    ]);
    $headers = "Content-Type: application/json\r\n";
    if (getenv("PAYMENT_API_KEY")) {
        $headers .=
            "Authorization: Bearer " . getenv("PAYMENT_API_KEY") . "\r\n";
    }
    $context = stream_context_create([
        "http" => [
            "method" => "POST",
            "header" => $headers,
            "content" => $payload,
            "timeout" => 15,
            "follow_location" => 0,
        ],
        "ssl" => ["verify_peer" => true, "verify_peer_name" => true],
    ]);
    $result = @file_get_contents($url, false, $context);
    $data = $result ? json_decode($result, true) : null;
    if (
        !$data ||
        ($data["verified"] ?? false) !== true ||
        ($data["reference"] ?? null) !== $ref ||
        ($data["currency"] ?? null) !== "KES" ||
        abs((float) ($data["amount"] ?? -1) - $amount) > 0.005
    ) {
        fail(
            400,
            "The payment provider could not verify the matching payment.",
        );
    }
    $b["_verified_amount"] = $amount;
    $b["mode"] = "MPESA";
    settlement($u, $b, true);
}
function account_update(array $u, array $b): array
{
    $person = in_array($u["role"], ["farmer", "agronomist"], true);
    $values = $person
        ? [
            text($b["name"] ?? ""),
            phone($b["identifier"] ?? ""),
            county($b["location"] ?? ""),
        ]
        : [text($b["identifier"] ?? "")];
    $fields = $person ? ["name", "phone", "location"] : ["username"];
    $changed = isset($b["password"]) && $b["password"] !== "";
    if (!empty($b["photo"])) {
        require_role($u, ["agronomist"]);
        $photo = image_reference($b["photo"]);
        $file =
            query("SELECT * FROM sf_files WHERE id=?", [basename($photo)])[0] ??
            [];
        if (
            ($file["scope"] ?? "") !== "profile" ||
            ($file["owner_role"] ?? "") !== $u["role"] ||
            (int) ($file["owner_id"] ?? 0) !== $u["id"]
        ) {
            fail(403, "Choose your own profile image.");
        }
        $fields[] = "photo";
        $values[] = $photo;
    }
    if ($changed) {
        $stored = query(
            "SELECT password FROM `" . table($u["role"]) . "` WHERE id=?",
            [$u["id"]],
        )[0]["password"];
        $current = $b["currentPassword"] ?? "";
        if (!password_match($current, $stored)) {
            fail(400, "Your current password is incorrect.");
        }
        $fields[] = "password";
        $values[] = password_hash(password($b["password"]), PASSWORD_BCRYPT);
    }
    transaction(function () use ($u, $fields, $values, $changed) {
        change(
            "UPDATE `" .
                table($u["role"]) .
                "` SET " .
                implode(",", array_map(fn($f) => "`$f`=?", $fields)) .
                " WHERE id=?",
            [...$values, $u["id"]],
        );
        if ($changed) {
            change("DELETE FROM sf_sessions WHERE role=? AND user_id=?", [
                $u["role"],
                $u["id"],
            ]);
            change("DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?", [
                $u["role"],
                $u["id"],
            ]);
        }
    });
    return ["signedOut" => $changed];
}
