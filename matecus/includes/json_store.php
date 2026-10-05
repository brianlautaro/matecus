<?php
/**
 * Lectura/escritura de los archivos JSON que hacen de "base de datos"
 * del catálogo (data/productos.json y data/categorias.json), con
 * bloqueo de archivo para evitar corromper los datos si dos pedidos
 * escriben al mismo tiempo.
 */

function leerJson($ruta) {
    if (!file_exists($ruta)) return [];

    $fp = fopen($ruta, 'r');
    if (!$fp) return [];

    flock($fp, LOCK_SH);
    $contenido = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $datos = json_decode($contenido, true);
    return is_array($datos) ? $datos : [];
}

function escribirJson($ruta, $datos) {
    $fp = fopen($ruta, 'c+');
    if (!$fp) return false;

    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}
