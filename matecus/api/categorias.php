<?php
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/json_store.php';

header('Content-Type: application/json; charset=utf-8');

$rutaDatos = __DIR__ . '/../data/categorias.json';
$metodo = $_SERVER['REQUEST_METHOD'];

function slugifyCategoria($texto) {
    $texto = mb_strtolower(trim($texto), 'UTF-8');
    $transliterado = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto);
    if ($transliterado !== false) $texto = $transliterado;
    $texto = preg_replace('/[^a-z0-9]+/', '-', $texto);
    return trim($texto, '-');
}

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

        $categorias = leerJson($rutaDatos);
        $idsExistentes = array_column($categorias, 'id');

        $idBase = slugifyCategoria($nombre) ?: ('categoria-' . time());
        $id = $idBase;
        $sufijo = 1;
        while ($id === 'todos' || in_array($id, $idsExistentes, true)) {
            $sufijo++;
            $id = $idBase . '-' . $sufijo;
        }

        $nueva = ['id' => $id, 'nombre' => $nombre, 'icono' => 'bi-tag'];
        $categorias[] = $nueva;
        escribirJson($rutaDatos, $categorias);

        http_response_code(201);
        echo json_encode($nueva);
        break;

    case 'PUT':
        requerirAdmin();
        $id = $_GET['id'] ?? '';

        if ($id === 'todos') {
            http_response_code(400);
            echo json_encode(['error' => 'No se puede modificar la categoría "Todos".']);
            exit;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $nombre = trim($body['nombre'] ?? '');

        if ($nombre === '') {
            http_response_code(400);
            echo json_encode(['error' => 'El nombre es obligatorio.']);
            exit;
        }

        $categorias = leerJson($rutaDatos);
        $idx = null;
        foreach ($categorias as $i => $c) {
            if ($c['id'] === $id) { $idx = $i; break; }
        }

        if ($idx === null) {
            http_response_code(404);
            echo json_encode(['error' => 'Categoría no encontrada.']);
            exit;
        }

        $categorias[$idx]['nombre'] = $nombre;
        escribirJson($rutaDatos, $categorias);
        echo json_encode($categorias[$idx]);
        break;

    case 'DELETE':
        requerirAdmin();
        $id = $_GET['id'] ?? '';

        if ($id === 'todos') {
            http_response_code(400);
            echo json_encode(['error' => 'No se puede eliminar la categoría "Todos".']);
            exit;
        }

        $categorias = leerJson($rutaDatos);
        $filtradas = array_values(array_filter($categorias, fn($c) => $c['id'] !== $id));

        if (count($filtradas) === count($categorias)) {
            http_response_code(404);
            echo json_encode(['error' => 'Categoría no encontrada.']);
            exit;
        }

        escribirJson($rutaDatos, $filtradas);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no soportado.']);
}
