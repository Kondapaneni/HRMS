<?php
$host = 'db.jtgqkkhqyzfbupiqwkgf.supabase.co';
$port = 5432;
$dbname = 'postgres';
$user = 'postgres';
$pass = 'TXm3X5V2DLJatKzM';
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
$conn = new PDO($dsn, $user, $pass);
$stmt = $conn->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'candidate_profiles'");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
