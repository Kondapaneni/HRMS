<?php
require 'vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();
$pdo = new PDO('pgsql:host='.$_ENV['DB_HOST'].';port='.$_ENV['DB_PORT'].';dbname='.$_ENV['DB_DATABASE'], $_ENV['DB_USERNAME'], $_ENV['DB_PASSWORD']);
$stmt = $pdo->prepare('SELECT u.id, CASE WHEN b.face_descriptor IS NOT NULL THEN true ELSE false END as "isFaceRegistered" FROM users u LEFT JOIN user_biometrics b ON u.id = b.user_id WHERE u.email = ?');
$stmt->execute(['kondapanenigowthamchowdary@gmail.com']);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
$user['isFaceRegistered'] = ($user['isFaceRegistered'] === true || $user['isFaceRegistered'] === 'true' || $user['isFaceRegistered'] === 't' || $user['isFaceRegistered'] == 1);
var_dump($user['isFaceRegistered']);
