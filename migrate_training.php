<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
try {
    // Create the training_videos table
    $sql = "
    CREATE TABLE IF NOT EXISTS training_videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        video_url TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL
    );
    ";
    $conn->exec($sql);
    echo "Table 'training_videos' created successfully.\n";

    // Create the storage bucket
    $sqlBucket = "
    INSERT INTO storage.buckets (id, name, public) 
    VALUES ('training_videos', 'training_videos', true)
    ON CONFLICT (id) DO NOTHING;
    ";
    $conn->exec($sqlBucket);
    echo "Bucket 'training_videos' created successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
