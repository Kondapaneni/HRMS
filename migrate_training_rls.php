<?php
require __DIR__ . '/backend/vendor/autoload.php';
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/backend');
$dotenv->safeLoad();
$db = new App\Config\Database();
$conn = $db->getConnection();
try {
    // 1. Allow SELECT
    $sql = "CREATE POLICY \"Allow public select on training_videos\" ON storage.objects FOR SELECT TO public USING (bucket_id = 'training_videos');";
    $conn->exec($sql);
    echo "SELECT policy created.\n";
} catch (Exception $e) { echo "SELECT policy error: " . $e->getMessage() . "\n"; }

try {
    // 2. Allow INSERT
    $sql = "CREATE POLICY \"Allow public insert to training_videos\" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'training_videos');";
    $conn->exec($sql);
    echo "INSERT policy created.\n";
} catch (Exception $e) { echo "INSERT policy error: " . $e->getMessage() . "\n"; }

try {
    // 3. Allow UPDATE
    $sql = "CREATE POLICY \"Allow public update on training_videos\" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'training_videos');";
    $conn->exec($sql);
    echo "UPDATE policy created.\n";
} catch (Exception $e) { echo "UPDATE policy error: " . $e->getMessage() . "\n"; }

try {
    // 4. Allow DELETE
    $sql = "CREATE POLICY \"Allow public delete on training_videos\" ON storage.objects FOR DELETE TO public USING (bucket_id = 'training_videos');";
    $conn->exec($sql);
    echo "DELETE policy created.\n";
} catch (Exception $e) { echo "DELETE policy error: " . $e->getMessage() . "\n"; }
?>
