<?php
$apiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0Z3Fra2hxeXpmYnVwaXF3a2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDg0MzM3ODksImV4cCI6MjAyNDAxOTM4OX0.YOUR_ANON_KEY';
// Wait, I can just use the service role key or connect to pg_catalog or storage schema to see buckets!
$host = 'db.jtgqkkhqyzfbupiqwkgf.supabase.co';
$port = 5432;
$dbname = 'postgres';
$user = 'postgres';
$pass = 'TXm3X5V2DLJatKzM';
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
$conn = new PDO($dsn, $user, $pass);
$stmt = $conn->query("SELECT name FROM storage.buckets");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC), JSON_PRETTY_PRINT);
