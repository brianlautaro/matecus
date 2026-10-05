<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/json_store.php';

header('Content-Type: application/json; charset=utf-8');

$rutaDatos = __DIR__ . '/../data/productos.json';
$metodo = $_SERVER['REQUEST_METHOD'];

switch ($metodo) {

    case 'GET':
        echo json_encode(leerJson($rutaDatos));
        break;

    case 'POST':
        requerirAdmin();
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $nombre = trim($body['nombre'] ?? '');

        if ($nombre === '') {
            http_response_code(400);
            echo json_encode(['error' => 'El nombre es obligatorio.']);
            exit;
        }

        $productos = leerJson($rutaDatos);

        $nuevoId = 1;
        foreach ($productos as $p) {
            if ($p['id'] >= $nuevoId) $nuevoId = $p['id'] + 1;
        }

        $nuevo = [
            'id'             => $nuevoId,
            'nombre'         => $nombre,
            'categoria'      => $body['categoria'] ?? 'todos',
            'precio'         => (float) ($body['precio'] ?? 0),
            'precioAnterior' => null,
            'imagen'         => $body['imagen'] ?? null,
            'icono'          => 'bi-tag',
            'descripcion'    => $body['descripcion'] ?? '',
            'envioGratis'    => false,
            'fechaCreacion'  => date('c'),
            'descuento'      => 0
        ];

        $productos[] = $nuevo;
        escribirJson($rutaDatos, $productos);

        http_response_code(201);
        echo json_encode($nuevo);
        break;

    case 'PUT':
        requerirAdmin();
        $id = (int) ($_GET['id'] ?? 0);
        $body = json_decode(file_get_contents('php://input'), true) ?: [];

        $productos = leerJson($rutaDatos);
        $idx = null;
        foreach ($productos as $i => $p) {
            if ($p['id'] === $id) { $idx = $i; break; }
        }

        if ($idx === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado.']);
            exit;
        }

        foreach (['nombre', 'categoria', 'descripcion', 'imagen'] as $campo) {
            if (array_key_exists($campo, $body)) {
                $productos[$idx][$campo] = $body[$campo];
            }
        }
        if (array_key_exists('precio', $body)) {
            $productos[$idx]['precio'] = (float) $body['precio'];
        }

        escribirJson($rutaDatos, $productos);
        echo json_encode($productos[$idx]);
        break;

    case 'DELETE':
        requerirAdmin();
        $id = (int) ($_GET['id'] ?? 0);

        $productos = leerJson($rutaDatos);
        $filtrados = array_values(array_filter($productos, fn($p) => $p['id'] !== $id));

        if (count($filtrados) === count($productos)) {
            http_response_code(404);
            echo json_encode(['error' => 'Producto no encontrado.']);
            exit;
        }

        escribirJson($rutaDatos, $filtrados);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no soportado.']);
}
