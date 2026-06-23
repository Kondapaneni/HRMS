<?php
$content = file_get_contents('backend/public/index.php');
$content = str_replace('/{filename}', '/{filename:.+}', $content);
file_put_contents('backend/public/index.php', $content);
echo "Updated index.php\n";
