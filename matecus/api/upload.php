<?php
require_once __DIR__ . '/../includes/auth.php';

header('Content-Type: application/json; charset=utf-8');
requerirAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || empty($_FILES['imagen'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió ninguna imagen.']);
    exit;
}

define('TAMANIO_MAXIMO_IMAGEN', 6 * 1024 * 1024); // 6 MB

$tiposPermitidos = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif'
];

$archivo = $_FILES['imagen'];

if ($archivo['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'Error al subir el archivo.']);
    exit;
}

if ($archivo['size'] > TAMANIO_MAXIMO_IMAGEN) {
    http_response_code(400);
    echo json_encode(['error' => 'La imagen supera el tamaño máximo permitido (6 MB).']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $archivo['tmp_name']);
finfo_close($finfo);

if (!isset($tiposPermitidos[$mime])) {
    http_response_code(400);
    echo json_encode(['error' => 'Formato de imagen no permitido. Usá JPG, PNG, WEBP o GIF.']);
    exit;
}

$carpetaDestino = __DIR__ . '/../img/productos/';
if (!is_dir($carpetaDestino)) {
    mkdir($carpetaDestino, 0755, true);
}

$nombreArchivo = uniqid('prod_', true) . '.' . $tiposPermitidos[$mime];
$rutaDestino = $carpetaDestino . $nombreArchivo;

if (!move_uploaded_file($archivo['tmp_name'], $rutaDestino)) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo guardar la imagen en el servidor.']);
    exit;
}

echo json_encode(['ruta' => 'img/productos/' . $nombreArchivo]);
