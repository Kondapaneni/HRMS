<?php
$file = 'backend/public/index.php';
$content = file_get_contents($file);

$search = <<<EOD
    ]);
    
    \$fileContent = @file_get_contents(\$supabaseUrl, false, \$context);
    
    if (\$fileContent === false) {
        \$response->getBody()->write("Offer letter not found.");
        return \$response->withStatus(404);
    }
    
    \$response->getBody()->write(\$fileContent);
    return \$response
        ->withHeader('Content-Type', 'application/pdf')
        ->withHeader('Content-Disposition', 'attachment; filename="' . \$filename . '"');
});
EOD;

$replace = <<<EOD
// Offer Letter proxy route for clean URLs
\$app->get('/Offer-Letter/{filename}', function (Request \$request, Response \$response, \$args) {
    \$filename = \$args['filename'];
    \$supabaseUrl = "https://jtgqkkhqyzfbupiqwkgf.supabase.co/storage/v1/object/public/offer_letters/" . rawurlencode(\$filename);
    
    \$context = stream_context_create([
        "http" => [
            "method" => "GET",
            "header" => "User-Agent: PHP\r\n"
        ]
    ]);
    
    \$fileContent = @file_get_contents(\$supabaseUrl, false, \$context);
    
    if (\$fileContent === false) {
        \$response->getBody()->write("Offer letter not found.");
        return \$response->withStatus(404);
    }
    
    \$response->getBody()->write(\$fileContent);
    return \$response
        ->withHeader('Content-Type', 'application/pdf')
        ->withHeader('Content-Disposition', 'attachment; filename="' . \$filename . '"');
});
EOD;

$newContent = str_replace($search, $replace, $content);
file_put_contents($file, $newContent);
echo "Fixed";
