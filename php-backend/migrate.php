<?php
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/core.php";
try {
    foreach (
        explode(";", file_get_contents(__DIR__ . "/config/schema.sql"))
        as $sql
    ) {
        if (trim($sql)) {
            query($sql);
        }
    }
    foreach (["admin", "manager", "farmers", "agronomists"] as $table) {
        query("ALTER TABLE `$table` MODIFY password VARCHAR(255) NOT NULL");
    }
    foreach (
        ["agronomists", "inputs", "products", "sales", "purchases"]
        as $table
    ) {
        query("ALTER TABLE `$table` MODIFY photo VARCHAR(1024) NOT NULL");
    }
    $news = array_column(query("SHOW COLUMNS FROM news"), "Field");
    if (!in_array("author_role", $news, true)) {
        query(
            "ALTER TABLE news ADD COLUMN author_role VARCHAR(16) NULL, ADD COLUMN author_id INT NULL",
        );
    }
    foreach (
        [
            ["farmers", "phone"],
            ["farmers", "idno"],
            ["agronomists", "phone"],
            ["admin", "username"],
            ["manager", "username"],
        ]
        as [$t, $c]
    ) {
        if (
            !query(
                "SHOW INDEX FROM `$t` WHERE Column_name=? AND Non_unique=0",
                [$c],
            )
        ) {
            query("ALTER TABLE `$t` ADD UNIQUE KEY sf_unique_$c (`$c`)");
        }
    }
    foreach (
        [
            ["inputs", "cost"],
            ["products", "cost"],
            ["sales", "cost"],
            ["purchases", "cost"],
            ["payments", "amount"],
            ["demand", "rate"],
            ["demand", "maxsupply"],
        ]
        as [$t, $c]
    ) {
        query(
            "ALTER TABLE `$t` MODIFY `$c` DECIMAL(18," .
                ($c === "maxsupply" ? 3 : 2) .
                ") NOT NULL",
        );
    }
    foreach (
        [
            "admin",
            "manager",
            "farmers",
            "agronomists",
            "chats",
            "demand",
            "inputs",
            "news",
            "payments",
            "products",
            "purchases",
            "sales",
            "stations",
            "supplies",
        ]
        as $t
    ) {
        $state = query(
            "SELECT TABLE_COLLATION AS collation FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
            [$t],
        )[0];
        if (!str_starts_with($state["collation"], "utf8mb4")) {
            query(
                "ALTER TABLE `$t` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
            );
        }
    }
    query(
        "INSERT IGNORE INTO sf_payment_refs(reference,farmer_id,amount,created) SELECT transaction,MIN(farmer),SUM(amount),MIN(time) FROM payments WHERE transaction<>'' GROUP BY transaction",
    );
    echo "PHP backend schema ready. Existing records retained.\n";
} catch (Throwable $e) {
    fwrite(
        STDERR,
        "Migration failed. Check database access, schema permissions, or duplicate identifiers.\n",
    );
    exit(1);
}
