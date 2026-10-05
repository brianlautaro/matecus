<?php
/**
 * api/destacados.php
 * Calcula los productos destacados del home: los 8 más agregados al
 * carrito en los últimos 3 días. Al vencer ese período, el conteo se
 * reinicia y los destacados vuelven a ser aleatorios hasta que se
 * acumulen nuevos agregados al carrito.
 */
require_once __DIR__ . '/../includes/json_store.php';

header('Content-Type: application/json; charset=utf-8');

$rutaEstado    = __DIR__ . '/../data/destacados_estado.json';
$rutaProductos = __DIR__ . '/../data/productos.json';
$metodo = $_SERVER['REQUEST_METHOD'];

const DURACION_PERIODO_SEGUNDOS = 3 * 24 * 60 * 60;
const CANTIDAD_DESTACADOS = 8;

function elegirAleatorios($productos, $cantidad) {
    $ids = array_column($productos, 'id');
    shuffle($ids);
    return array_slice($ids, 0, $cantidad);
}

function cargarEstado($rutaEstado, $productos) {
    $estado = leerJson($rutaEstado);
    $ahora  = time();
    $vencido = empty($estado)
        || !isset($estado['periodStart'])
        || ($ahora - strtotime($estado['periodStart'])) >= DURACION_PERIODO_SEGUNDOS;

    if ($vencido) {
        $estado = [
            'periodStart' => date('c', $ahora),
            'conteos'     => [],
            'aleatorios'  => elegirAleatorios($productos, CANTIDAD_DESTACADOS)
        ];
        escribirJson($rutaEstado, $estado);
    }

    return $estado;
}

function calcularIdsDestacados($estado, $productos) {
    $idsValidos = array_column($productos, 'id');

    $conteos = $estado['conteos'] ?? [];
    $conteos = array_filter($conteos, function ($id) use ($idsValidos) {
        return in_array((int) $id, $idsValidos, true);
    }, ARRAY_FILTER_USE_KEY);
    arsort($conteos);

    $idsOrdenados = array_map('intval', array_keys($conteos));

    $aleatorios = array_values(array_filter($estado['aleatorios'] ?? [], function ($id) use ($idsValidos) {
        return in_array($id, $idsValidos, true);
    }));

    foreach ($aleatorios as $id) {
        if (count($idsOrdenados) >= CANTIDAD_DESTACADOS) break;
        if (!in_array($id, $idsOrdenados, true)) $idsOrdenados[] = $id;
    }

    foreach ($idsValidos as $id) {
        if (count($idsOrdenados) >= CANTIDAD_DESTACADOS) break;
        if (!in_array($id, $idsOrdenados, true)) $idsOrdenados[] = $id;
    }

    return array_slice($idsOrdenados, 0, CANTIDAD_DESTACADOS);
}

switch ($metodo) {

    case 'GET':
        $productos = leerJson($rutaProductos);
        $estado = cargarEstado($rutaEstado, $productos);
        $idsDestacados = calcularIdsDestacados($estado, $productos);

        $mapaProductos = [];
        foreach ($productos as $p) $mapaProductos[$p['id']] = $p;

        $destacados = array_values(array_filter(array_map(
            fn($id) => $mapaProductos[$id] ?? null,
            $idsDestacados
        )));

        echo json_encode($destacados);
        break;

    case 'POST':
        $body = json_decode(file_get_contents('php://input'), true) ?: [];
        $productoId = (int) ($body['productoId'] ?? 0);

        $productos = leerJson($rutaProductos);
        $existe = false;
        foreach ($productos as $p) {
            if ($p['id'] === $productoId) { $existe = true; break; }
        }

        if (!$existe) {
            http_response_code(400);
            echo json_encode(['error' => 'Producto inválido.']);
            exit;
        }

        $estado = cargarEstado($rutaEstado, $productos);
        if (!isset($estado['conteos'][$productoId])) {
            $estado['conteos'][$productoId] = 0;
        }
        $estado['conteos'][$productoId]++;
        escribirJson($rutaEstado, $estado);

        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Método no soportado.']);
}
