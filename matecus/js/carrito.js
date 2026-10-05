/**
 * carrito.js
 * Lógica del carrito de compras con persistencia de sesión.
 */

// =============================================
// ESTADO DEL CARRITO
// =============================================
const STORAGE_KEY = "matecus_carrito";
const CARRITO_STORAGE = (() => {
  try {
    const testKey = "__matecus_cart_test__";
    sessionStorage.setItem(testKey, "1");
    sessionStorage.removeItem(testKey);
    return sessionStorage;
  } catch {
    return localStorage;
  }
})();

function getCarrito() {
  return JSON.parse(CARRITO_STORAGE.getItem(STORAGE_KEY) || "[]");
}

function guardarCarrito(carrito) {
  CARRITO_STORAGE.setItem(STORAGE_KEY, JSON.stringify(carrito));
  actualizarBadgeCarrito();
}

// =============================================
// OPERACIONES DEL CARRITO
// =============================================
function agregarAlCarrito(idProducto) {
  const producto = PRODUCTOS.find(p => p.id === idProducto);
  if (!producto) return;

  const carrito = getCarrito();
  const idx     = carrito.findIndex(i => i.id === idProducto);

  if (idx !== -1) {
    carrito[idx].cantidad++;
  } else {
    carrito.push({
      id:       producto.id,
      nombre:   producto.nombre,
      precio:   producto.precio,
      imagen:   producto.imagen,
      icono:    producto.icono,
      cantidad: 1
    });
  }

  guardarCarrito(carrito);
  mostrarToast(`<i class="bi bi-check-circle-fill"></i> ${producto.nombre} agregado al carrito`);
  registrarAgregadoDestacados(idProducto);
}

// Avisa al servidor que se agregó este producto al carrito, para el
// cálculo de "Productos destacados" del home (no bloquea la UI).
function registrarAgregadoDestacados(idProducto) {
  fetch("api/destacados.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productoId: idProducto })
  }).catch(() => {});
}

function quitarDelCarrito(idProducto) {
  const carrito = getCarrito().filter(i => i.id !== idProducto);
  guardarCarrito(carrito);
  renderizarCarrito();
}

function cambiarCantidad(idProducto, delta) {
  const carrito = getCarrito();
  const idx     = carrito.findIndex(i => i.id === idProducto);
  if (idx === -1) return;

  carrito[idx].cantidad += delta;

  if (carrito[idx].cantidad <= 0) {
    carrito.splice(idx, 1);
  }

  guardarCarrito(carrito);
  renderizarCarrito();
}

function vaciarCarrito() {
  guardarCarrito([]);
  renderizarCarrito();
}

// =============================================
// TOTAL
// =============================================
function calcularTotal(carrito) {
  return carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
}

// =============================================
// BADGE DEL NAVBAR
// =============================================
function actualizarBadgeCarrito() {
  const carrito = getCarrito();
  const total   = carrito.reduce((sum, i) => sum + i.cantidad, 0);
  const badges  = document.querySelectorAll(".carrito-badge");
  badges.forEach(b => {
    b.textContent = total;
    b.style.display = total > 0 ? "inline-flex" : "none";
  });
}

// =============================================
// RENDERIZADO DEL OFFCANVAS
// =============================================
function renderizarCarrito() {
  const contenedor = document.getElementById("carrito-items");
  const totalEl    = document.getElementById("carrito-total");
  if (!contenedor) return;

  const carrito = getCarrito();

  if (carrito.length === 0) {
    contenedor.innerHTML = `
      <div class="carrito-vacio">
        <div class="icono"><i class="bi bi-cup-hot"></i></div>
        <p>Tu carrito está vacío.</p>
        <small class="text-muted">¡Agregá productos y empezá tu pedido!</small>
      </div>`;
    if (totalEl) totalEl.textContent = formatPrecio(0);
    return;
  }

  contenedor.innerHTML = carrito.map(item => {
    const imgHTML = item.imagen
      ? `<img src="${item.imagen}" alt="${item.nombre}" style="width:100%;height:100%;object-fit:cover;">`
      : `<i class="bi ${item.icono || "bi-cup-hot"}"></i>`;
    const labelUnidad = item.cantidad === 1 ? "unidad" : "unidades";

    return `
      <div class="item-carrito">
        <div class="item-carrito-img">${imgHTML}</div>
        <div class="item-carrito-info">
          <div class="item-carrito-nombre">${item.nombre}</div>
          <div class="item-carrito-precio">${formatPrecio(item.precio)} x${item.cantidad} ${labelUnidad}</div>
          <div class="item-cantidad mt-1">
            <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, -1)">−</button>
            <span style="font-weight:700;min-width:20px;text-align:center">${item.cantidad}</span>
            <button class="btn-cantidad" onclick="cambiarCantidad(${item.id}, 1)">+</button>
          </div>
        </div>
        <button class="btn-eliminar-item" onclick="quitarDelCarrito(${item.id})" title="Eliminar" aria-label="Eliminar producto">
          <i class="bi bi-trash3"></i>
        </button>
      </div>`;
  }).join("");

  if (totalEl) totalEl.textContent = formatPrecio(calcularTotal(carrito));
}

// =============================================
// FINALIZAR PEDIDO POR WHATSAPP
// =============================================
function finalizarPedido() {
  const carrito = getCarrito();
  if (carrito.length === 0) {
    mostrarToast('<i class="bi bi-exclamation-triangle-fill"></i> Tu carrito está vacío.', "warning");
    return;
  }

  let mensaje = "¡Hola! Quiero hacer el siguiente pedido:%0A%0A";
  carrito.forEach(item => {
    mensaje += `• ${item.nombre} — ${formatPrecio(item.precio)} x${item.cantidad}%0A`;
  });
  mensaje += `%0A*TOTAL: ${formatPrecio(calcularTotal(carrito))}*`;
  mensaje += "%0A%0AEstos son los productos que me interesan. ¿Hay disponibilidad? ¡Quiero información!";

  const telefono = "5491159361297";
  const url      = `https://wa.me/${telefono}?text=${mensaje}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// =============================================
// TOAST DE NOTIFICACIÓN
// =============================================
function mostrarToast(mensaje, tipo = "success") {
  const contenedor = document.querySelector(".toast-container");
  if (!contenedor) return;

  const id = `toast-${Date.now()}`;
  const color = tipo === "success" ? "var(--verde-mate)" : "#c9971c";

  contenedor.insertAdjacentHTML("beforeend", `
    <div id="${id}" style="
      background:white;
      border-left: 4px solid ${color};
      border-radius: 8px;
      padding: 0.75rem 1rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size:0.88rem;
      font-weight:600;
      animation: fadeInUp 0.3s ease;
      max-width: 280px;
    ">${mensaje}</div>`);

  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.remove();
  }, 2800);
}

// Animación del toast
const toastStyle = document.createElement("style");
toastStyle.textContent = `
  @keyframes fadeInUp {
    from { opacity:0; transform: translateY(10px); }
    to   { opacity:1; transform: translateY(0); }
  }`;
document.head.appendChild(toastStyle);

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  actualizarBadgeCarrito();

  // Abrir offcanvas del carrito
  document.querySelectorAll("[data-open-carrito]").forEach(btn => {
    btn.addEventListener("click", () => {
      renderizarCarrito();
      const offcanvas = document.getElementById("offcanvasCarrito");
      if (offcanvas) {
        new bootstrap.Offcanvas(offcanvas).show();
      }
    });
  });

  const offcanvas = document.getElementById("offcanvasCarrito");
  const whatsappFloat = document.querySelector(".btn-whatsapp-float");
  if (offcanvas && whatsappFloat) {
    offcanvas.addEventListener("show.bs.offcanvas", () => {
      whatsappFloat.style.display = "none";
    });
    offcanvas.addEventListener("hidden.bs.offcanvas", () => {
      whatsappFloat.style.display = "flex";
    });
  }

  // Botones "Agregar al carrito" en productos
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn-agregar");
    if (btn) {
      const id = parseInt(btn.dataset.id);
      agregarAlCarrito(id);
    }
  });
});
