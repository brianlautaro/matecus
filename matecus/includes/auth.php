<?php
/**
 * Autenticación simple del panel de administración, basada en sesión PHP.
 * No hay usuarios múltiples ni base de datos: es un único administrador
 * con credenciales fijas, pensado para un sitio chico de un solo dueño.
 */

session_start();

define('ADMIN_USER', 'admin');
define('ADMIN_PASS', 'admin123');

function adminLogueado() {
    return !empty($_SESSION['admin_logueado']);
}

function requerirAdmin() {
    if (!adminLogueado()) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'No autorizado. Iniciá sesión como administrador.']);
        exit;
    }
}
