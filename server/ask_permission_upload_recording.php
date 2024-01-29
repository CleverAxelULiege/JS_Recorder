<?php

header('Content-Type: application/json');

//50 megabytes
define("MAX_FILE_SIZE_BYTES", 1000 * 1000 * 50);
$fileSize = $_POST["file_size"] ?? null;

if($fileSize === null){
    http_response_code(401);
    echo json_encode([
        "msg" => "No file size received"
    ]);
    exit;
}

if($fileSize > MAX_FILE_SIZE_BYTES){
    http_response_code(401);
    echo json_encode([
        "msg" => "File too big"
    ]);
    exit;
}

$uuid = bin2hex(random_bytes(4)) . "-" . bin2hex(random_bytes(2)) . "-" . bin2hex(random_bytes(2)) . "-" . bin2hex(random_bytes(2)) . "-" . bin2hex(random_bytes(6));

mkdir(__DIR__ . "/temp/" . $uuid);

setcookie("upload_session", $uuid, [
    'expires' => 0, 
    'path' => '/', 
    'secure' => true, 
    'httponly' => true, 
    'samesite' => 'Strict'
]);

echo json_encode([
    "msg" => "success",
    "mycookie" => $_COOKIE["my_cookie"] ?? "default"
]);