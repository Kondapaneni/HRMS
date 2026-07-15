<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
$pdo = new PDO('pgsql:host='.$_ENV['DB_HOST'].';port='.$_ENV['DB_PORT'].';dbname='.$_ENV['DB_DATABASE'], $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD']);
$stmt = $pdo->prepare('SELECT role FROM users WHERE email = ?');
$stmt->execute(['kondapanenigowthamchowdary@gmail.com']);
print_r($stmt->fetch(PDO::FETCH_ASSOC));
