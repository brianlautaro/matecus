<?php
require_once __DIR__ . '/../includes/auth.php';
header('Content-Type: application/json; charset=utf-8');

echo json_encode(['logueado' => adminLogueado()]);
