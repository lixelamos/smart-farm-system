<?php
function report(array $u, string $key, string $format): never
{
    $resource = resources()[$key] ?? null;
    if (!$resource) {
        fail(404, "Report not found.");
    }
    $data = [];
    $cursor = null;
    do {
        $batch = records($u, $key, $cursor);
        $data = array_merge($data, $batch);
        $cursor = $batch ? (int) end($batch)["id"] : null;
    } while (count($batch) === 500);
    $fields = array_values(
        array_filter(
            $resource["columns"],
            fn($c) => ($c["kind"] ?? "") !== "image",
        ),
    );
    if ($format === "csv") {
        header("Content-Type: text/csv; charset=utf-8");
        header(
            'Content-Disposition: attachment; filename="narok-' .
                $key .
                '.csv"',
        );
        $out = fopen("php://output", "wb");
        fwrite($out, "\xEF\xBB\xBF");
        $escape = fn($v) => preg_match('/^[=+@\-\t\r]/', (string) $v)
            ? "'" . $v
            : (string) $v;
        fputcsv($out, array_column($fields, "label"), ",", '"', "");
        foreach ($data as $row) {
            fputcsv(
                $out,
                array_map(fn($c) => $escape($row[$c["key"]] ?? ""), $fields),
                ",",
                '"',
                "",
            );
        }
        fclose($out);
        exit();
    }
    if ($format !== "pdf") {
        fail(400, "Choose CSV or PDF.");
    }
    $lines = [
        "Smart Farm | Narok County - " . $resource["title"],
        "Generated " . date("d M Y H:i T"),
        implode(" | ", array_column($fields, "label")),
    ];
    foreach ($data as $row) {
        $lines[] = implode(
            " | ",
            array_map(
                fn($c) => mb_substr((string) ($row[$c["key"]] ?? ""), 0, 45),
                $fields,
            ),
        );
    }
    $pages = array_chunk($lines, 40);
    $objects = [];
    $objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    $objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    $kids = [];
    foreach ($pages as $i => $page) {
        $p = 4 + $i * 2;
        $stream = $p + 1;
        $kids[] = "$p 0 R";
        $content = "BT /F1 9 Tf 30 560 Td 13 TL\n";
        foreach ($page as $line) {
            $line = preg_replace('/[^\x20-\x7e]/', "?", $line);
            $line = str_replace(
                ["\\", "(", ")"],
                ["\\\\", "\\(", "\\)"],
                $line,
            );
            $content .= "(" . $line . ") Tj T*\n";
        }
        $content .= "ET";
        $objects[
            $p
        ] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents $stream 0 R >>";
        $objects[$stream] =
            "<< /Length " .
            strlen($content) .
            ">>\nstream\n" .
            $content .
            "\nendstream";
    }
    $objects[2] =
        "<< /Type /Pages /Kids [" .
        implode(" ", $kids) .
        "] /Count " .
        count($kids) .
        " >>";
    ksort($objects);
    $pdf = "%PDF-1.4\n";
    $offset = [0];
    foreach ($objects as $n => $object) {
        $offset[$n] = strlen($pdf);
        $pdf .= "$n 0 obj\n$object\nendobj\n";
    }
    $xref = strlen($pdf);
    $pdf .= "xref" . "\n0 " . (count($objects) + 1) . "\n0000000000 65535 f \n";
    for ($n = 1; $n <= count($objects); $n++) {
        $pdf .= sprintf("%010d 00000 n \n", $offset[$n]);
    }
    $pdf .=
        "trailer << /Size " .
        (count($objects) + 1) .
        " /Root 1 0 R >>\nstartxref\n$xref\n%%EOF";
    header("Content-Type: application/pdf");
    header(
        'Content-Disposition: attachment; filename="narok-' . $key . '.pdf"',
    );
    echo $pdf;
    exit();
}
