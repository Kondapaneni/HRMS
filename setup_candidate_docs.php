<?php
require 'backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->load();
$db = new App\Config\Database();
$conn = $db->getConnection();

try {
    // Create bucket
    $conn->exec("INSERT INTO storage.buckets (id, name, public) VALUES ('candidate_documents', 'candidate_documents', true) ON CONFLICT (id) DO NOTHING");
    
    // Create table
    $conn->exec("
        CREATE TABLE IF NOT EXISTS candidate_documents (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            candidate_id UUID REFERENCES users(id) ON DELETE CASCADE,
            document_type VARCHAR(100) NOT NULL,
            file_path TEXT NOT NULL,
            file_name TEXT NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
    ");
    echo "Setup complete.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
