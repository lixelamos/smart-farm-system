<?php
function sf_escape($value)
{
    return htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8");
}
function sf_asset($path, $base = "")
{
    $file = __DIR__ . "/../" . $path;
    return sf_escape($base . $path) . "?v=" . (string) filemtime($file);
}
function sf_brand($base = "")
{
    echo '<a class="brand" href="' .
        $base .
        'index.php" aria-label="Smart Farm home"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="23" cy="8" r="3"/><path d="M3 18 12 9l8 9h9M3 23h26M3 28h26M8 23l-3 5M17 23l-3 5M26 23l-3 5"/></svg></span><span>Smart <span class="brand-light">Farm</span><small>NAROK COUNTY</small></span></a>';
}
function sf_sidebar($role, $name, $base = "")
{
    $menus = [
        "admin" => [
            "Dashboard" => "home",
            "Farmers" => "farmers",
            "Pickup stations" => "pickups",
            "Sales" => "sales",
            "Farm inputs" => "inputs",
            "Payments" => "payments",
            "County news" => "news",
            "Produce" => "produce",
            "Demand" => "demand",
            "Products" => "addprod",
            "My account" => "account",
        ],
        "manager" => [
            "Dashboard" => "home",
            "Farmers" => "farmers",
            "Sales" => "sales",
            "Farm inputs" => "inputs",
            "Payments" => "payments",
            "County news" => "news",
            "Produce" => "produce",
            "Agronomists" => "agronomist",
            "My account" => "account",
        ],
        "farmer" => [
            "Overview" => "home",
            "Farm produce" => "produce",
            "Farm inputs" => "inputs",
            "Products" => "products",
            "Payments" => "payments",
            "Messages" => "chats",
            "My account" => "myacc",
        ],
        "agronomist" => [
            "Overview" => "home",
            "Messages" => "agronchats",
            "County news" => "news",
            "My account" => "agacc",
        ],
    ];
    $icons = [
        "home" => "dashboard",
        "farmers" => "users",
        "pickups" => "map-marker",
        "sales" => "bar-chart",
        "inputs" => "balance-scale",
        "payments" => "credit-card",
        "news" => "newspaper-o",
        "produce" => "leaf",
        "demand" => "exchange",
        "addprod" => "shopping-basket",
        "agronomist" => "user-md",
        "account" => "user-o",
        "myacc" => "user-o",
        "chats" => "comments-o",
        "agronchats" => "comments-o",
        "agacc" => "user-o",
        "products" => "shopping-basket",
    ];
    echo '<aside class="app-sidebar" id="workspace-menu" aria-label="Workspace navigation">';
    sf_brand($base);
    echo '<div class="workspace-label">' .
        sf_escape($role) .
        ' workspace</div><ul class="workspace-links">';
    foreach ($menus[$role] as $label => $route) {
        $action =
            $route === "home"
                ? "window.location.reload()"
                : ($route === "account"
                    ? "loadacc()"
                    : "loadpage('$route')");
        echo '<li><button type="button" class="workspace-link' .
            ($route === "home" ? " is-active" : "") .
            '" data-page="' .
            sf_escape($route) .
            '" onclick="' .
            $action .
            '"><i class="fa fa-' .
            $icons[$route] .
            '" aria-hidden="true"></i><span>' .
            sf_escape($label) .
            "</span>" .
            (in_array($route, ["chats", "agronchats"])
                ? '<span id="notar"></span>'
                : "") .
            "</button></li>";
    }
    $logout =
        $role === "farmer"
            ? "logout.php?sess=farmer"
            : ($role === "agronomist"
                ? "logout.php?sess=agron"
                : "logout.php");
    echo '</ul><div class="sidebar-bottom"><div class="user-avatar">' .
        sf_escape(strtoupper(substr($name, 0, 1))) .
        "</div><div><strong>" .
        sf_escape(ucwords($name)) .
        "</strong><small>" .
        sf_escape(ucfirst($role)) .
        ' account</small></div><a href="' .
        $logout .
        '" aria-label="Sign out" title="Sign out"><i class="fa fa-sign-out" aria-hidden="true"></i></a></div></aside>';
}
function sf_app_header($role)
{
    echo '<header class="app-header"><button class="menu-toggle" type="button" aria-controls="workspace-menu" aria-expanded="false" aria-label="Open navigation"><i class="fa fa-bars" aria-hidden="true"></i></button><div><span class="breadcrumb">Workspace <span>/</span></span> <strong id="page-name">Overview</strong></div><span class="header-context"><span class="status-dot"></span>' .
        sf_escape(ucfirst($role)) .
        ' portal</span></header><div class="menu-scrim" hidden></div>';
}
function sf_overview($con, $role, $name)
{
    $definitions =
        $role === "admin" || $role === "manager"
            ? [
                [
                    "Registered farmers",
                    "farmers",
                    "SELECT COUNT(*) FROM farmers",
                    "users",
                ],
                [
                    "Open produce demands",
                    "demand",
                    "SELECT COUNT(*) FROM demand WHERE status=0",
                    "leaf",
                ],
                [
                    "Pickup stations",
                    "pickups",
                    "SELECT COUNT(*) FROM stations",
                    "map-marker",
                ],
            ]
            : ($role === "farmer"
                ? [
                    [
                        "Open produce demands",
                        "produce",
                        "SELECT COUNT(*) FROM demand WHERE status=0",
                        "leaf",
                    ],
                    [
                        "Available farm inputs",
                        "inputs",
                        "SELECT COUNT(*) FROM inputs",
                        "balance-scale",
                    ],
                    [
                        "Products to explore",
                        "products",
                        "SELECT COUNT(*) FROM products",
                        "shopping-basket",
                    ],
                ]
                : [
                    [
                        "Registered farmers",
                        "agronchats",
                        "SELECT COUNT(*) FROM farmers",
                        "users",
                    ],
                    [
                        "County updates",
                        "news",
                        "SELECT COUNT(*) FROM news",
                        "newspaper-o",
                    ],
                    [
                        "Pickup stations",
                        "news",
                        "SELECT COUNT(*) FROM stations",
                        "map-marker",
                    ],
                ]);
    echo '<div class="overview-intro"><div><p class="eyebrow">NAROK COUNTY · YOUR WORKSPACE</p><h1>Welcome back, ' .
        sf_escape(ucwords($name)) .
        ".</h1><p>" .
        ($role === "farmer"
            ? "A clear view of your produce, purchases, and farming community."
            : ($role === "agronomist"
                ? "Keep farmers informed and the conversation growing."
                : "The people, produce, and activity behind your operation.")) .
        '</p></div><span class="date-label">' .
        date("D, j M Y") .
        '</span></div><div class="metric-strip">';
    foreach ($definitions as [$label, $route, $query, $icon]) {
        $result = mysqli_query($con, $query);
        $count = mysqli_fetch_row($result)[0];
        echo '<div class="metric"><span class="metric-label">' .
            sf_escape($label) .
            "</span><strong>" .
            sf_escape($count) .
            '</strong><i class="fa fa-' .
            $icon .
            '" aria-hidden="true"></i></div>';
    }
    echo '</div><div class="activity-heading"><h2>' .
        ($role === "admin"
            ? "Operations at a glance"
            : ($role === "manager"
                ? "Inputs & purchasing"
                : ($role === "farmer"
                    ? "Market & community"
                    : "Your conversations"))) .
        "</h2><span>Keep things moving</span></div>";
}
