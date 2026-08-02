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
    $sql = "ALTER TABLE global_settings 
            ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS maintenance_message TEXT DEFAULT 'The application is currently undergoing maintenance. Please check back later.'";
    
    $conn->exec($sql);
    echo "Successfully added maintenance columns\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
