function toggleAdminUI(logueado) {
  const loginBox = document.getElementById("login-box");
  const panel = document.getElementById("panel-admin");
  if (!loginBox || !panel) return;
  loginBox.classList.toggle("d-none", logueado);
  panel.classList.toggle("d-none", !logueado);
}

function escapeHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function verificarSesion() {
  try {
    const respuesta = await fetch("api/session.php");
    const datos = await respuesta.json();
    return !!datos.logueado;
  } catch {
    return false;
  }
}

// =============================================
// SUBIDA DE IMÁGENES (con límite de tamaño)
// =============================================
const TAMANIO_MAX_IMAGEN = 6 * 1024 * 1024; // 6 MB

async function subirImagen(archivo) {
  if (archivo.size > TAMANIO_MAX_IMAGEN) {
    throw new Error("La imagen supera el tamaño máximo permitido (6 MB). Elegí una imagen más liviana.");
  }

  const formData = new FormData();
  formData.append("imagen", archivo);

  const respuesta = await fetch("api/upload.php", { method: "POST", body: formData });
  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(datos?.error || "No se pudo subir la imagen.");
  }
  return datos.ruta;
}

// =============================================
// ESTADO DE FILTROS DEL ADMIN (en memoria)
// =============================================
let adminFiltroCategoria = "todos";
let adminBusqueda = "";

// Rutas de imagen ya subidas, pendientes de guardar (id -> ruta en el servidor)
const imagenesPendientes = {};

// =============================================
// CATEGORÍAS
// =============================================
function renderAdminCategorias() {
  const contenedor = document.getElementById("admin-categorias");
  const selectFiltro = document.getElementById("admin-filtro-categoria");
  if (!contenedor || typeof obtenerCategoriasAdmin !== "function") return;

  const categorias = obtenerCategoriasAdmin();

  contenedor.innerHTML = categorias.map(c => `
    <div class="admin-categoria-item" data-cat-id="${c.id}">
      <input class="form-control form-control-sm" data-cat-nombre="${c.id}" value="${escapeHtml(c.nombre)}">
      <span class="admin-categoria-count">${contarProductosPorCategoria(c.id)} producto(s)</span>
      <button class="btn btn-outline-success btn-sm" data-cat-save="${c.id}" title="Guardar nombre" aria-label="Guardar nombre">
        <i class="bi bi-check-lg"></i>
      </button>
      <button class="btn btn-outline-danger btn-sm" data-cat-delete="${c.id}" title="Eliminar categoría" aria-label="Eliminar categoría">
        <i class="bi bi-trash3"></i>
      </button>
    </div>
  `).join("") || `<p class="text-muted small mb-0">No hay categorías creadas.</p>`;

  contenedor.querySelectorAll("[data-cat-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.catSave;
      const input = contenedor.querySelector(`[data-cat-nombre="${id}"]`);
      const nombre = input?.value?.trim() || "";

      if (!nombre) {
        alert("El nombre de la categoría no puede estar vacío.");
        return;
      }

      try {
        await editarCategoria(id, nombre);
        renderAdminCategorias();
        renderAdminProductos();
      } catch (err) {
        alert(err.message || "No se pudo actualizar la categoría.");
      }
    });
  });

  contenedor.querySelectorAll("[data-cat-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.catDelete;
      const cantidad = contarProductosPorCategoria(id);
      const nombreCat = categorias.find(c => c.id === id)?.nombre || id;

      const mensaje = cantidad > 0
        ? `La categoría "${nombreCat}" tiene ${cantidad} producto(s) asignado(s). Si la eliminás, esos productos quedarán sin una categoría válida hasta que les asignes otra. ¿Eliminar de todas formas?`
        : `¿Eliminar la categoría "${nombreCat}"?`;

      if (!confirm(mensaje)) return;

      try {
        await eliminarCategoria(id);
        if (adminFiltroCategoria === id) adminFiltroCategoria = "todos";
        renderAdminCategorias();
        renderAdminProductos();
      } catch (err) {
        alert(err.message || "No se pudo eliminar la categoría.");
      }
    });
  });

  // Poblar el select de filtro, preservando la selección actual si sigue existiendo
  if (selectFiltro) {
    const opciones = [`<option value="todos">Todas las categorías</option>`]
      .concat(categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`));
    selectFiltro.innerHTML = opciones.join("");
    const existe = categorias.some(c => c.id === adminFiltroCategoria);
    selectFiltro.value = existe ? adminFiltroCategoria : "todos";
    adminFiltroCategoria = selectFiltro.value;
  }

  // Poblar el select de categoría del formulario de alta de producto
  const selectNuevoProducto = document.getElementById("nuevo-producto-categoria");
  if (selectNuevoProducto) {
    const valorPrevio = selectNuevoProducto.value;
    selectNuevoProducto.innerHTML = categorias.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");
    if (categorias.some(c => c.id === valorPrevio)) {
      selectNuevoProducto.value = valorPrevio;
    }
  }
}

function opcionesCategoriaParaProducto(categoriaActual) {
  const categorias = obtenerCategoriasAdmin();
  let opciones = categorias.map(c =>
    `<option value="${c.id}" ${c.id === categoriaActual ? "selected" : ""}>${escapeHtml(c.nombre)}</option>`
  ).join("");

  const existe = categorias.some(c => c.id === categoriaActual);
  if (!existe && categoriaActual) {
    opciones += `<option value="${categoriaActual}" selected>${escapeHtml(categoriaActual)} (eliminada)</option>`;
  }

  return opciones;
}

// =============================================
// PRODUCTOS (lista editable con filtros)
// =============================================
function filtrarProductosAdmin() {
  const lista = obtenerProductosAdmin();
  return lista.filter(p => {
    const coincideCategoria = adminFiltroCategoria === "todos" || p.categoria === adminFiltroCategoria;
    const coincideBusqueda = p.nombre.toLowerCase().includes(adminBusqueda.toLowerCase());
    return coincideCategoria && coincideBusqueda;
  });
}

function renderAdminProductos() {
  const contenedor = document.getElementById("admin-productos");
  const contador = document.getElementById("admin-contador");
  if (!contenedor || typeof obtenerProductosAdmin !== "function") return;

  const lista = filtrarProductosAdmin();

  if (contador) {
    contador.textContent = `Mostrando ${lista.length} producto${lista.length !== 1 ? "s" : ""}`;
  }

  if (lista.length === 0) {
    contenedor.innerHTML = `<p class="text-muted small">No se encontraron productos con esos filtros.</p>`;
    return;
  }

  contenedor.innerHTML = lista.map(p => {
    const imagenPreview = imagenesPendientes[p.id] || p.imagen;
    const imagenHTML = imagenPreview
      ? `<img src="${imagenPreview}" alt="${escapeHtml(p.nombre)}">`
      : `<i class="bi ${p.icono || "bi-cup-hot"}"></i>`;

    return `
    <div class="admin-producto-item" data-id="${p.id}">
      <div class="admin-producto-imagen">
        <div class="admin-producto-imagen-preview" data-preview="${p.id}">${imagenHTML}</div>
        <input type="file" accept="image/*" class="form-control form-control-sm mt-2" data-img-file="${p.id}">
        <div class="form-text">Máx. 6 MB</div>
      </div>
      <div class="admin-producto-campos">
        <div class="row g-2">
          <div class="col-12 col-md-5">
            <label class="form-label">Nombre</label>
            <input class="form-control" data-field="nombre" data-id="${p.id}" value="${escapeHtml(p.nombre)}">
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label">Precio</label>
            <input type="number" min="0" class="form-control" data-field="precio" data-id="${p.id}" value="${p.precio}">
          </div>
          <div class="col-6 col-md-5">
            <label class="form-label">Categoría</label>
            <select class="form-select" data-field="categoria" data-id="${p.id}">
              ${opcionesCategoriaParaProducto(p.categoria)}
            </select>
          </div>
          <div class="col-12">
            <label class="form-label">Descripción</label>
            <textarea class="form-control" rows="2" data-field="descripcion" data-id="${p.id}">${escapeHtml(p.descripcion || "")}</textarea>
          </div>
        </div>
        <div class="mt-2 d-flex justify-content-end gap-2">
          <button class="btn btn-outline-danger btn-sm" data-delete="${p.id}">
            <i class="bi bi-trash3"></i> Eliminar
          </button>
          <button class="btn btn-success btn-sm" data-save="${p.id}">Guardar cambios</button>
        </div>
      </div>
    </div>`;
  }).join("");

  // Subir la imagen apenas se elige un archivo y mostrar la vista previa
  contenedor.querySelectorAll("[data-img-file]").forEach(input => {
    input.addEventListener("change", async () => {
      const id = Number(input.dataset.imgFile);
      const archivo = input.files?.[0];
      if (!archivo) return;

      try {
        const ruta = await subirImagen(archivo);
        imagenesPendientes[id] = ruta;
        const preview = contenedor.querySelector(`[data-preview="${id}"]`);
        if (preview) preview.innerHTML = `<img src="${ruta}" alt="">`;
      } catch (err) {
        alert(err.message || "No se pudo subir la imagen.");
      }
      input.value = "";
    });
  });

  contenedor.querySelectorAll("[data-delete]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.delete);
      const producto = obtenerProductosAdmin().find(p => p.id === id);
      if (!confirm(`¿Eliminar el producto "${producto?.nombre || id}"? Esta acción no se puede deshacer.`)) return;

      try {
        await eliminarProductoAdmin(id);
        delete imagenesPendientes[id];
        renderAdminCategorias();
        renderAdminProductos();
      } catch (err) {
        alert(err.message || "No se pudo eliminar el producto.");
      }
    });
  });

  contenedor.querySelectorAll("[data-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = Number(btn.dataset.save);
      const nombre = contenedor.querySelector(`[data-field='nombre'][data-id='${id}']`)?.value?.trim() || "";
      const descripcion = contenedor.querySelector(`[data-field='descripcion'][data-id='${id}']`)?.value?.trim() || "";
      const precio = Number(contenedor.querySelector(`[data-field='precio'][data-id='${id}']`)?.value || 0);
      const categoria = contenedor.querySelector(`[data-field='categoria'][data-id='${id}']`)?.value || "";

      if (!nombre || precio < 0 || !categoria) {
        alert("Revisá nombre, precio y categoría antes de guardar.");
        return;
      }

      const cambios = { nombre, descripcion, precio, categoria };
      if (imagenesPendientes[id] !== undefined) {
        cambios.imagen = imagenesPendientes[id];
      }

      try {
        await actualizarProductoAdmin(id, cambios);
        delete imagenesPendientes[id];
        alert("Producto actualizado.");
        renderAdminCategorias();
        renderAdminProductos();
      } catch (err) {
        alert(err.message || "No se pudo actualizar el producto.");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("form-admin-login");
  const btnLogout = document.getElementById("btn-admin-logout");
  const formCategoria = document.getElementById("form-nueva-categoria");
  const formNuevoProducto = document.getElementById("form-nuevo-producto");
  const buscador = document.getElementById("admin-buscador");
  const selectFiltro = document.getElementById("admin-filtro-categoria");

  const iniciarPanel = async () => {
    await cargarDatosIniciales();
    renderAdminCategorias();
    renderAdminProductos();
  };

  const logueado = await verificarSesion();
  toggleAdminUI(logueado);
  if (logueado) {
    try {
      await iniciarPanel();
    } catch (err) {
      alert("No se pudo cargar el catálogo. Intentá recargar la página.");
    }
  }

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();
      const usuario = document.getElementById("admin-user")?.value?.trim() || "";
      const contrasena = document.getElementById("admin-pass")?.value || "";

      try {
        const respuesta = await fetch("api/login.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario, contrasena })
        });
        const datos = await respuesta.json();

        if (respuesta.ok && datos.ok) {
          toggleAdminUI(true);
          await iniciarPanel();
        } else {
          alert(datos.error || "Usuario o contraseña incorrectos.");
        }
      } catch {
        alert("No se pudo conectar con el servidor.");
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await fetch("api/logout.php", { method: "POST" });
      window.location.reload();
    });
  }

  if (formCategoria) {
    formCategoria.addEventListener("submit", async e => {
      e.preventDefault();
      const input = document.getElementById("nueva-categoria-nombre");
      const nombre = input?.value?.trim() || "";

      if (!nombre) return;

      try {
        await agregarCategoria(nombre);
        input.value = "";
        renderAdminCategorias();
      } catch (err) {
        alert(err.message || "No se pudo agregar la categoría.");
      }
    });
  }

  if (formNuevoProducto) {
    formNuevoProducto.addEventListener("submit", async e => {
      e.preventDefault();

      const nombre = document.getElementById("nuevo-producto-nombre")?.value?.trim() || "";
      const precio = Number(document.getElementById("nuevo-producto-precio")?.value || 0);
      const categoria = document.getElementById("nuevo-producto-categoria")?.value || "";
      const descripcion = document.getElementById("nuevo-producto-descripcion")?.value?.trim() || "";
      const inputImagen = document.getElementById("nuevo-producto-imagen");
      const archivo = inputImagen?.files?.[0];

      if (!nombre || precio < 0 || !categoria) {
        alert("Completá nombre, precio y categoría antes de agregar el producto.");
        return;
      }

      try {
        let imagen = null;
        if (archivo) {
          imagen = await subirImagen(archivo);
        }

        await agregarProductoAdmin({ nombre, precio, categoria, descripcion, imagen });
        formNuevoProducto.reset();
        renderAdminCategorias();
        renderAdminProductos();
      } catch (err) {
        alert(err.message || "No se pudo agregar el producto.");
      }
    });
  }

  if (buscador) {
    buscador.addEventListener("input", e => {
      adminBusqueda = e.target.value.trim();
      renderAdminProductos();
    });
  }

  if (selectFiltro) {
    selectFiltro.addEventListener("change", e => {
      adminFiltroCategoria = e.target.value;
      renderAdminProductos();
    });
  }
});
