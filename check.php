<?php
$env = file_get_contents('backend/.env');
$vars = [];
foreach (explode("\n", $env) as $line) {
    if (strpos($line, '=') !== false) {
        list($k, $v) = explode('=', trim($line), 2);
        $vars[$k] = $v;
    }
}
$pdo = new PDO('pgsql:host='.$vars['DB_HOST'].';port='.$vars['DB_PORT'].';dbname='.$vars['DB_DATABASE'], $vars['DB_USERNAME'], $vars['DB_PASSWORD']);
$stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'global_settings'");
print_r($stmt->fetchAll(PDO::FETCH_COLUMN));
