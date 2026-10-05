<?php
require_once __DIR__ . '/../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no soportado.']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];
$usuario = trim($body['usuario'] ?? '');
$contrasena = $body['contrasena'] ?? '';

if ($usuario === ADMIN_USER && $contrasena === ADMIN_PASS) {
    $_SESSION['admin_logueado'] = true;
    echo json_encode(['ok' => true]);
} else {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Usuario o contraseña incorrectos.']);
}
