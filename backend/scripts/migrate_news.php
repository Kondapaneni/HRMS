<?php
$env = file_get_contents(__DIR__ . '/../.env');
$vars = [];
foreach (explode("\n", $env) as $line) {
    if (strpos($line, '=') !== false) {
        list($k, $v) = explode('=', trim($line), 2);
        $vars[$k] = $v;
    }
}
$conn = new PDO('pgsql:host='.$vars['DB_HOST'].';port='.$vars['DB_PORT'].';dbname='.$vars['DB_DATABASE'], $vars['DB_USERNAME'], $vars['DB_PASSWORD']);
$conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try {
    $sql = "ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS news_headlines JSONB DEFAULT '[]'::jsonb";
    $conn->exec($sql);
    echo "Success\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
