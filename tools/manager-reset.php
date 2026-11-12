<?php
// Recovery links may only be issued by an operator with shell/database access.
if (PHP_SAPI !== "cli") {
    http_response_code(404);
    exit();
}
require __DIR__ . "/../dbcon.php";
require __DIR__ . "/../includes/manager-passwords.php";
try {
    $username = trim($argv[1] ?? "");
    if ($username === "--list") {
        foreach (
            $con->query("SELECT username FROM manager ORDER BY username")
            as $manager
        ) {
            echo $manager["username"], PHP_EOL;
        }
        exit(0);
    }
    if ($username === "" || str_starts_with($username, "--")) {
        fwrite(
            STDERR,
            "Usage: php tools/manager-reset.php USERNAME\n       php tools/manager-reset.php --list\n",
        );
        exit(1);
    }
    $token = sf_manager_issue_reset($con, $username);
    echo "Open this path on your app's address (for example http://localhost:8000):\n";
    echo "/manager/reset-password.php?token=" . $token . PHP_EOL;
    echo "This private link expires in 30 minutes and works once. Generating another link replaces it.\n";
} catch (Throwable $error) {
    fwrite(
        STDERR,
        $error instanceof mysqli_sql_exception
            ? "Could not issue a recovery link. Check database connectivity and schema permissions.\n"
            : $error->getMessage() . PHP_EOL,
    );
    exit(1);
}
