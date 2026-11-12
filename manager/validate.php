<?php
session_start();
require __DIR__ . "/dbcon.php";
require __DIR__ . "/../includes/manager-passwords.php";
if (isset($_POST["usern"], $_POST["password"])) {
    $username = strtolower(trim((string) $_POST["usern"]));
    $password = (string) $_POST["password"];
    $query = $con->prepare(
        "SELECT id, password FROM manager WHERE username = ? LIMIT 1",
    );
    $query->bind_param("s", $username);
    $query->execute();
    $manager = $query->get_result()->fetch_assoc();
    if (
        !$manager ||
        !sf_manager_password_matches($password, $manager["password"])
    ) {
        echo "Incorrect username or password";
        exit();
    }
    session_regenerate_id(true);
    $_SESSION["manager"] = (int) $manager["id"];
    echo "success";
}
