/**
 * main.js
 * Lógica general de la interfaz: navbar scroll, formulario de contacto,
 * inicialización de páginas.
 */

document.addEventListener("DOMContentLoaded", () => {

  // =============================================
  // NAVBAR: efecto al hacer scroll
  // =============================================
  const navbar = document.querySelector(".navbar-matecus");
  if (navbar) {
    const handleScroll = () => {
      navbar.style.boxShadow = window.scrollY > 50
        ? "0 4px 20px rgba(0,0,0,0.35)"
        : "0 2px 12px rgba(0,0,0,0.25)";
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  // =============================================
  // MARCAR ENLACE ACTIVO EN NAVBAR
  // =============================================
  const paginaActual = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navbar-matecus .nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (href === paginaActual || (paginaActual === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });

  // =============================================
  // SCROLL SUAVE A SECCIONES
  // =============================================
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // =============================================
  // ANIMACIÓN AL APARECER (Intersection Observer)
  // =============================================
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity    = "1";
        entry.target.style.transform  = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(".beneficio-card, .categoria-card").forEach(el => {
    el.style.opacity    = "0";
    el.style.transform  = "translateY(20px)";
    el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
    observer.observe(el);
  });

  // =============================================
  // AVISO SI FALLÓ LA CARGA DE DATOS DEL SERVIDOR
  // =============================================
  document.addEventListener("matecus:datos-error", () => {
    ["grid-home", "grid-productos"].forEach(idContenedor => {
      const contenedor = document.getElementById(idContenedor);
      if (contenedor) {
        contenedor.innerHTML = `
          <div class="col-12 text-center py-5 text-muted">
            No se pudo cargar el catálogo. Recargá la página o intentá más tarde.
          </div>`;
      }
    });
  });

  // =============================================
  // A partir de acá, todo depende de PRODUCTOS / CATEGORIAS,
  // que se cargan de forma asíncrona desde productos.js
  // =============================================
  document.addEventListener("matecus:datos-listos", () => {

    // ---------------------------------------------
    // PÁGINA: INDEX — Categorías rápidas (creadas por el admin)
    // ---------------------------------------------
    const gridCategoriasRapidas = document.getElementById("categorias-rapidas-grid");
    if (gridCategoriasRapidas) {
      const categoriasVisibles = CATEGORIAS.filter(c => c.id !== "todos");

      if (categoriasVisibles.length === 0) {
        gridCategoriasRapidas.innerHTML = `
          <div class="col-12 text-center text-muted">No hay categorías cargadas todavía.</div>`;
      } else {
        gridCategoriasRapidas.innerHTML = categoriasVisibles.map(cat => `
          <div class="col-6 col-sm-4 col-md-2">
            <a href="productos.html?cat=${encodeURIComponent(cat.id)}" class="categoria-card">
              <i class="bi ${cat.icono || "bi-tag"} categoria-icono"></i>
              <span class="categoria-nombre">${cat.nombre}</span>
            </a>
          </div>`).join("");
      }
    }

    // ---------------------------------------------
    // PÁGINA: INDEX — Productos destacados en el home
    // ---------------------------------------------
    const gridHome = document.getElementById("grid-home");
    if (gridHome) {
      const destacados = DESTACADOS_HOME;
      const desktopQuery = window.matchMedia("(min-width: 992px)");

      const renderizarDestacadosHome = () => {
        if (desktopQuery.matches || typeof renderizarDestacadosCarrusel !== "function") {
          renderizarProductos(gridHome, destacados);
        } else {
          renderizarDestacadosCarrusel(gridHome, destacados);
        }
      };

      renderizarDestacadosHome();

      // Mantiene la vista correcta si se cambia entre móvil y escritorio sin recargar.
      if (typeof desktopQuery.addEventListener === "function") {
        desktopQuery.addEventListener("change", renderizarDestacadosHome);
      } else if (typeof desktopQuery.addListener === "function") {
        desktopQuery.addListener(renderizarDestacadosHome);
      }
    }

    // ---------------------------------------------
    // PÁGINA: PRODUCTOS — Todos los productos + filtros + búsqueda
    // ---------------------------------------------
    const gridProductos = document.getElementById("grid-productos");
    if (gridProductos) {

      const ordenarLista = (lista, criterio) => {
        const salida = [...lista];
        if (criterio === "precio-asc")  salida.sort((a, b) => a.precio - b.precio);
        if (criterio === "precio-desc") salida.sort((a, b) => b.precio - a.precio);
        if (criterio === "nuevos")      salida.sort((a, b) => (esProductoNuevo(b) ? 1 : 0) - (esProductoNuevo(a) ? 1 : 0));
        return salida;
      };

      const selectOrden = document.getElementById("orden-productos");

      const renderSegunEstado = () => {
        const criterio = selectOrden ? selectOrden.value : "default";
        const lista = ordenarLista(filtrarYBuscar(), criterio);
        renderizarProductos(gridProductos, lista);
        if (typeof guardarEstadoFiltros === "function") {
          guardarEstadoFiltros({
            filtro: filtroActual,
            busqueda: busquedaActual,
            orden: criterio
          });
        }
      };

      renderizarProductos(gridProductos, PRODUCTOS);

      // Renderizar botones de filtro
      const contFiltros = document.getElementById("filtros-categorias");
      if (contFiltros) {
        contFiltros.innerHTML = "";
        CATEGORIAS.forEach(cat => {
          const btn = document.createElement("button");
          btn.className = "btn-filtro" + (cat.id === "todos" ? " activo" : "");
          btn.dataset.cat = cat.id;
          btn.textContent = cat.nombre;
          btn.addEventListener("click", () => {
            filtroActual = cat.id;
            document.querySelectorAll(".btn-filtro").forEach(b => b.classList.remove("activo"));
            btn.classList.add("activo");
            renderSegunEstado();
          });
          contFiltros.appendChild(btn);
        });
      }

      // Buscador
      const buscador = document.getElementById("buscador-productos");
      if (buscador) {
        buscador.addEventListener("input", e => {
          busquedaActual = e.target.value.trim();
          renderSegunEstado();
        });
      }

      // Ordenar
      if (selectOrden) {
        selectOrden.addEventListener("change", () => {
          renderSegunEstado();
        });
      }

      // Filtro por categoría en la URL (?cat=) o guardado en la sesión
      // La URL manda: si viene un ?cat= (p.ej. desde las categorías rápidas del home),
      // se antepone al filtro que hubiera quedado guardado de una visita anterior.
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get("cat");
      const estadoGuardado = typeof obtenerEstadoFiltros === "function" ? obtenerEstadoFiltros() : null;

      if (catParam && catParam !== "todos") {
        filtroActual = catParam;
        if (selectOrden) selectOrden.value = "default";
      } else if (estadoGuardado) {
        filtroActual   = estadoGuardado.filtro || "todos";
        busquedaActual = estadoGuardado.busqueda || "";
        if (buscador) buscador.value = busquedaActual;
        if (selectOrden) selectOrden.value = estadoGuardado.orden || "default";
      }

      document.querySelectorAll(".btn-filtro").forEach(b => {
        b.classList.toggle("activo", b.dataset.cat === filtroActual);
      });

      if (estadoGuardado || (catParam && catParam !== "todos")) {
        renderSegunEstado();
      }

      // Contador de resultados
      const contador = document.getElementById("contador-productos");
      if (contador) {
        const observerContador = new MutationObserver(() => {
          const items = gridProductos.querySelectorAll(".producto-item").length;
          contador.textContent = items > 0 ? `Mostrando ${items} producto${items !== 1 ? "s" : ""}` : "";
        });
        observerContador.observe(gridProductos, { childList: true });
      }
    }
  });

});
