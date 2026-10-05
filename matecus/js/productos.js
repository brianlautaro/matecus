/**
 * productos.js
 * Consumo de la API del servidor (api/productos.php y api/categorias.php)
 * y lógica de renderizado de productos.
 */

const FILTROS_STORAGE_KEY = "matecus_filtros_productos";

let PRODUCTOS = [];
let CATEGORIAS = [];
let DESTACADOS_HOME = [];

const DIAS_VIGENCIA_NUEVO = 7;

// =============================================
// CARGA INICIAL DE DATOS DESDE EL SERVIDOR
// =============================================
async function cargarDatosIniciales() {
  const [resProductos, resCategorias, resDestacados] = await Promise.all([
    fetch("api/productos.php"),
    fetch("api/categorias.php"),
    fetch("api/destacados.php")
  ]);

  if (!resProductos.ok || !resCategorias.ok || !resDestacados.ok) {
    throw new Error("No se pudieron cargar los datos del catálogo.");
  }

  PRODUCTOS = await resProductos.json();
  CATEGORIAS = await resCategorias.json();
  DESTACADOS_HOME = await resDestacados.json();
}

// =============================================
// "NUEVO": vigente hasta DIAS_VIGENCIA_NUEVO días desde la creación
// =============================================
function esProductoNuevo(producto) {
  if (!producto.fechaCreacion) return false;
  const creado = new Date(producto.fechaCreacion).getTime();
  if (Number.isNaN(creado)) return false;
  const diasTranscurridos = (Date.now() - creado) / (1000 * 60 * 60 * 24);
  return diasTranscurridos >= 0 && diasTranscurridos <= DIAS_VIGENCIA_NUEVO;
}

async function peticionJSON(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: { "Content-Type": "application/json", ...(opciones.headers || {}) }
  });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(datos?.error || "Ocurrió un error inesperado.");
  }
  return datos;
}

// =============================================
// CATEGORÍAS (vía API)
// =============================================
async function agregarCategoria(nombre) {
  const nueva = await peticionJSON("api/categorias.php", {
    method: "POST",
    body: JSON.stringify({ nombre })
  });
  CATEGORIAS.push(nueva);
  return nueva;
}

async function editarCategoria(id, nuevoNombre) {
  const actualizada = await peticionJSON(`api/categorias.php?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ nombre: nuevoNombre })
  });
  const idx = CATEGORIAS.findIndex(c => c.id === id);
  if (idx !== -1) CATEGORIAS[idx] = actualizada;
  return actualizada;
}

async function eliminarCategoria(id) {
  await peticionJSON(`api/categorias.php?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  CATEGORIAS = CATEGORIAS.filter(c => c.id !== id);
  return true;
}

function contarProductosPorCategoria(id) {
  return PRODUCTOS.filter(p => p.categoria === id).length;
}

function obtenerCategoriasAdmin() {
  return CATEGORIAS.filter(c => c.id !== "todos").map(c => ({ ...c }));
}

// =============================================
// UTILIDADES
// =============================================
function formatPrecio(num) {
  return "$" + num.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// =============================================
// PRODUCTOS (vía API)
// =============================================
function obtenerProductosAdmin() {
  return PRODUCTOS.map(p => ({ ...p }));
}

async function actualizarProductoAdmin(id, cambios) {
  const actualizado = await peticionJSON(`api/productos.php?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(cambios)
  });
  const idx = PRODUCTOS.findIndex(p => p.id === id);
  if (idx !== -1) PRODUCTOS[idx] = actualizado;
  return actualizado;
}

async function agregarProductoAdmin(datos) {
  const nuevo = await peticionJSON("api/productos.php", {
    method: "POST",
    body: JSON.stringify(datos)
  });
  PRODUCTOS.push(nuevo);
  return nuevo.id;
}

async function eliminarProductoAdmin(id) {
  await peticionJSON(`api/productos.php?id=${id}`, { method: "DELETE" });
  PRODUCTOS = PRODUCTOS.filter(p => p.id !== id);
  return true;
}

function getStorageSesion() {
  try {
    const testKey = "__matecus_filters_test__";
    sessionStorage.setItem(testKey, "1");
    sessionStorage.removeItem(testKey);
    return sessionStorage;
  } catch {
    return null;
  }
}

function guardarEstadoFiltros(estado) {
  const storage = getStorageSesion();
  if (!storage) return;
  storage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(estado));
}

function obtenerEstadoFiltros() {
  const storage = getStorageSesion();
  if (!storage) return null;
  try {
    const data = storage.getItem(FILTROS_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function limpiarEstadoFiltros() {
  const storage = getStorageSesion();
  if (!storage) return;
  storage.removeItem(FILTROS_STORAGE_KEY);
}

// =============================================
// RENDERIZADO DE TARJETAS
// =============================================
function crearTarjetaProducto(producto) {
  const nuevo = esProductoNuevo(producto) ? `<span class="badge-nuevo">NUEVO</span>` : "";

  const imagenHTML = producto.imagen
    ? `<img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">`
    : `<div class="producto-img-placeholder"><i class="bi ${producto.icono || "bi-cup-hot"}"></i></div>`;

  return `
    <div class="col-6 col-md-4 col-lg-3 mb-4 producto-item" data-categoria="${producto.categoria}" data-nombre="${producto.nombre.toLowerCase()}">
      <div class="producto-card">
        <div class="producto-img-wrapper">
          ${imagenHTML}
          <div class="producto-badges">
            ${nuevo}
          </div>
        </div>
        <div class="producto-body">
          <div class="producto-categoria">${CATEGORIAS.find(c => c.id === producto.categoria)?.nombre || producto.categoria}</div>
          <div class="producto-nombre">${producto.nombre}</div>
          <div class="text-muted small mb-2">${producto.descripcion || ""}</div>
          <div class="producto-precios">
            <div class="precio-actual">${formatPrecio(producto.precio)}</div>
          </div>
          <div class="producto-footer">
            <button class="btn-agregar" data-id="${producto.id}">
              <i class="bi bi-bag-plus"></i> Agregar
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

function crearSlideDestacado(producto, activa = false) {
  const nuevo = esProductoNuevo(producto) ? `<span class="badge-nuevo">NUEVO</span>` : "";

  const imagenHTML = producto.imagen
    ? `<img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">`
    : `<div class="producto-img-placeholder"><i class="bi ${producto.icono || "bi-cup-hot"}"></i></div>`;

  return `
    <div class="carousel-item${activa ? " active" : ""}">
      <div class="row justify-content-center">
        <div class="col-11 col-sm-8 col-md-6 col-lg-4 producto-item" data-categoria="${producto.categoria}" data-nombre="${producto.nombre.toLowerCase()}">
          <div class="producto-card producto-card-destacado">
            <div class="producto-img-wrapper">
              ${imagenHTML}
              <div class="producto-badges">
                ${nuevo}
              </div>
            </div>
            <div class="producto-body">
              <div class="producto-categoria">${CATEGORIAS.find(c => c.id === producto.categoria)?.nombre || producto.categoria}</div>
              <div class="producto-nombre">${producto.nombre}</div>
              <div class="text-muted small mb-2">${producto.descripcion || ""}</div>
              <div class="producto-precios">
                <div class="precio-actual">${formatPrecio(producto.precio)}</div>
              </div>
              <div class="producto-footer">
                <button class="btn-agregar" data-id="${producto.id}">
                  <i class="bi bi-bag-plus"></i> Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// =============================================
// RENDERIZAR LISTA DE PRODUCTOS EN UN CONTENEDOR
// =============================================
function renderizarProductos(contenedor, lista) {
  if (!contenedor) return;

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div id="sin-resultados" class="col-12">
        <div style="font-size:3rem"><i class="bi bi-emoji-frown"></i></div>
        <p>No encontramos productos con esos criterios.</p>
        <button class="btn-filtro" onclick="resetFiltros()">Ver todos</button>
      </div>`;
    return;
  }

  contenedor.innerHTML = lista.map(crearTarjetaProducto).join("");
}

function renderizarDestacadosCarrusel(contenedor, lista) {
  if (!contenedor) return;

  if (lista.length === 0) {
    contenedor.innerHTML = `
      <div id="sin-resultados" class="col-12">
        <div style="font-size:3rem"><i class="bi bi-emoji-frown"></i></div>
        <p>No encontramos productos destacados por el momento.</p>
      </div>`;
    return;
  }

  const slides = lista.map((producto, idx) => crearSlideDestacado(producto, idx === 0)).join("");

  contenedor.innerHTML = `
    <div id="carousel-destacados" class="carousel slide destacados-carousel" data-bs-ride="carousel" data-bs-interval="4500">
      <div class="carousel-indicators">
        ${lista.map((_, idx) => `
          <button type="button" data-bs-target="#carousel-destacados" data-bs-slide-to="${idx}" ${idx === 0 ? 'class="active" aria-current="true"' : ""} aria-label="Producto ${idx + 1}"></button>
        `).join("")}
      </div>
      <div class="carousel-inner">
        ${slides}
      </div>
      <button class="carousel-control-prev" type="button" data-bs-target="#carousel-destacados" data-bs-slide="prev">
        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Anterior</span>
      </button>
      <button class="carousel-control-next" type="button" data-bs-target="#carousel-destacados" data-bs-slide="next">
        <span class="carousel-control-next-icon" aria-hidden="true"></span>
        <span class="visually-hidden">Siguiente</span>
      </button>
    </div>`;
}

// =============================================
// FILTROS Y BÚSQUEDA (para productos.html)
// =============================================
let filtroActual  = "todos";
let busquedaActual = "";

function filtrarYBuscar() {
  return PRODUCTOS.filter(p => {
    const coincideCategoria = filtroActual === "todos" || p.categoria === filtroActual;
    const coincideBusqueda  = p.nombre.toLowerCase().includes(busquedaActual.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });
}

function resetFiltros() {
  filtroActual   = "todos";
  busquedaActual = "";
  const buscador = document.getElementById("buscador-productos");
  if (buscador) buscador.value = "";
  const selectOrden = document.getElementById("orden-productos");
  if (selectOrden) selectOrden.value = "default";
  document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("activo"));
  const todosBtn = document.querySelector('.btn-filtro[data-cat="todos"]');
  if (todosBtn) todosBtn.classList.add("activo");
  const contenedor = document.getElementById("grid-productos");
  if (contenedor) renderizarProductos(contenedor, PRODUCTOS);
  limpiarEstadoFiltros();
}

// =============================================
// ARRANQUE: carga los datos y avisa al resto de scripts
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  cargarDatosIniciales()
    .then(() => {
      document.dispatchEvent(new CustomEvent("matecus:datos-listos"));
    })
    .catch(err => {
      console.error("Error cargando el catálogo:", err);
      document.dispatchEvent(new CustomEvent("matecus:datos-error", { detail: err }));
    });
});

window.cargarDatosIniciales = cargarDatosIniciales;
window.actualizarProductoAdmin = actualizarProductoAdmin;
window.obtenerProductosAdmin = obtenerProductosAdmin;
window.agregarProductoAdmin = agregarProductoAdmin;
window.eliminarProductoAdmin = eliminarProductoAdmin;
window.renderizarDestacadosCarrusel = renderizarDestacadosCarrusel;
window.guardarEstadoFiltros = guardarEstadoFiltros;
window.obtenerEstadoFiltros = obtenerEstadoFiltros;
window.limpiarEstadoFiltros = limpiarEstadoFiltros;
window.agregarCategoria = agregarCategoria;
window.editarCategoria = editarCategoria;
window.eliminarCategoria = eliminarCategoria;
window.obtenerCategoriasAdmin = obtenerCategoriasAdmin;
window.contarProductosPorCategoria = contarProductosPorCategoria;
