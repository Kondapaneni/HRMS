<?php
$hash = '$2y$10$9TNhpPECxowqrJTQpPP7uuUW96RYOnUXj/vG4L2zDMjlFsmd8akyK';
$passwords = ['password', 'password123', 'admin', 'admin123', '123456', '12345678'];
foreach ($passwords as $p) {
    if (password_verify($p, $hash)) {
        echo "Password is: $p\n";
        exit;
    }
}
echo "Not found\n";
