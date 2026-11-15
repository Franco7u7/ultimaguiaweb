const frmFiltros = document.getElementById("idFrmFiltros");
const cmbPlataforma = document.getElementById("idCmbPlataforma");
const cmbCategoria = document.getElementById("idCmbCategoria");
const cmbOrden = document.getElementById("idCmbOrden");
const btnBuscar = document.getElementById("idBtnBuscar");
const txtFiltro = document.getElementById("idTxtFiltro");

const contenedorEstado = document.getElementById("idEstado");
const contenedorListado = document.getElementById("idListado");
const resumen = document.getElementById("idResumen");

const tituloDetalle = document.getElementById("idTituloDetalle");
const bodyDetalle = document.getElementById("idBodyDetalle");
const modalDetalle = new bootstrap.Modal(
  document.getElementById("idModalDetalle"),
  {}
);

const TIEMPO_ESPERA = 15000;

let juegosCargados = [];

let controladorDetalle = null;

const limpiarNodo = (nodo) => {
  while (nodo.firstChild) {
    nodo.removeChild(nodo.firstChild);
  }
};

const crear = (etiqueta, clases = "", texto = "") => {
  const elemento = document.createElement(etiqueta);
  if (clases) elemento.className = clases;
  if (texto !== "") elemento.appendChild(document.createTextNode(texto));
  return elemento;
};

const crearIcono = (nombre) => {
  const i = document.createElement("i");
  i.className = `bi ${nombre} me-1`;
  return i;
};

const aTextoPlano = (texto) => {
  if (!texto) return "";
  const documento = new DOMParser().parseFromString(texto, "text/html");
  return documento.body.textContent || "";
};

const formatearFecha = (fecha) => {
  if (!fecha) return "No disponible";
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-SV", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const crearCargando = (mensaje) => {
  const div = crear("div", "d-flex align-items-center justify-content-center gap-3 py-5");
  const spinner = crear("div", "spinner-border text-primary");
  spinner.setAttribute("role", "status");
  spinner.appendChild(crear("span", "visually-hidden", "Cargando..."));
  div.appendChild(spinner);
  div.appendChild(crear("span", "fs-5", mensaje));
  return div;
};

const crearAlerta = (tipo, titulo, mensaje, accion = null) => {
  const iconos = {
    danger: "bi-exclamation-octagon",
    warning: "bi-exclamation-triangle",
    info: "bi-info-circle",
  };
  const alerta = crear("div", `alert alert-${tipo}`);
  alerta.setAttribute("role", "alert");
  const encabezado = crear("h2", "h5 alert-heading");
  encabezado.appendChild(crearIcono(iconos[tipo] || "bi-info-circle"));
  encabezado.appendChild(document.createTextNode(titulo));
  alerta.appendChild(encabezado);
  alerta.appendChild(crear("p", "mb-0", mensaje));
  if (accion) {
    const boton = crear("button", "btn btn-outline-dark btn-sm mt-3", accion.texto);
    boton.type = "button";
    boton.addEventListener("click", accion.funcion);
    alerta.appendChild(boton);
  }
  return alerta;
};

const mostrarEstado = (nodo) => {
  limpiarNodo(contenedorEstado);
  if (nodo) contenedorEstado.appendChild(nodo);
};

class ErrorApi extends Error {
  constructor(mensaje, estado = 0) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
  }
}

const mensajePorEstado = (estado) => {
  switch (estado) {
    case 401:
    case 403:
      return "La clave de RapidAPI no es válida o no está suscrito al plan gratuito de esta API. Revise el archivo js/config.js.";
    case 404:
      return "No se encontró el recurso solicitado.";
    case 429:
      return "Se superó el límite de solicitudes del plan gratuito. Espere un momento e intente de nuevo.";
    default:
      if (estado >= 500) return "El servidor de la API presentó un problema. Intente más tarde.";
      return `La API respondió con un error (código ${estado}).`;
  }
};

const consultarApi = async (ruta, parametros = {}, señal = null) => {
  if (!API_CONFIG.key || API_CONFIG.key.startsWith("PEGUE_AQUI")) {
    throw new ErrorApi(
      "Aún no se ha configurado la clave de RapidAPI. Abra js/config.js y pegue su X-RapidAPI-Key."
    );
  }

  const url = new URL(`${API_CONFIG.baseUrl}${ruta}`);
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor !== "" && valor !== null && valor !== undefined) {
      url.searchParams.append(clave, valor);
    }
  }

  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort("timeout"), TIEMPO_ESPERA);
  if (señal) {
    señal.addEventListener("abort", () => controlador.abort("cancelado"));
  }

  try {
    const respuesta = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": API_CONFIG.key,
        "X-RapidAPI-Host": API_CONFIG.host,
      },
      signal: controlador.signal,
    });

    if (!respuesta.ok) {
      throw new ErrorApi(mensajePorEstado(respuesta.status), respuesta.status);
    }

    const datos = await respuesta.json();

    if (datos && !Array.isArray(datos) && datos.status === 0) {
      throw new ErrorApi(datos.status_message || "No se encontraron resultados.", 404);
    }
    return datos;
  } catch (error) {
    if (error.name === "AbortError" || controlador.signal.aborted) {
      if (controlador.signal.reason === "cancelado") {
        throw new ErrorApi("cancelado", -1);
      }
      throw new ErrorApi("La solicitud tardó demasiado. Verifique su conexión e intente de nuevo.");
    }
    if (error instanceof ErrorApi) throw error;
    if (error instanceof SyntaxError) {
      throw new ErrorApi("La respuesta de la API no tiene un formato válido.");
    }

    throw new ErrorApi("No fue posible conectarse con la API. Verifique su conexión a internet.");
  } finally {
    clearTimeout(temporizador);
  }
};

const obtenerJuegos = (plataforma, categoria, orden) =>
  consultarApi("/games", {
    platform: plataforma,
    category: categoria,
    "sort-by": orden,
  });

const obtenerDetalleJuego = (id, señal) => consultarApi("/game", { id }, señal);

const crearTarjeta = (juego) => {
  const columna = crear("div", "col");

  const tarjeta = crear("article", "card h-100 card-juego");

  const imagen = document.createElement("img");
  imagen.className = "card-img-top";
  imagen.src = juego.thumbnail;
  imagen.alt = `Portada de ${juego.title}`;
  imagen.loading = "lazy";
  tarjeta.appendChild(imagen);

  const cuerpo = crear("div", "card-body d-flex flex-column");
  cuerpo.appendChild(crear("h2", "card-title h6 fw-bold", juego.title));

  const etiquetas = crear("div", "mb-2");
  etiquetas.appendChild(crear("span", "badge text-bg-primary me-1", juego.genre));
  etiquetas.appendChild(crear("span", "badge text-bg-secondary", juego.platform));
  cuerpo.appendChild(etiquetas);

  cuerpo.appendChild(crear("p", "card-text small text-body-secondary flex-grow-1", juego.short_description));

  const boton = crear("button", "btn btn-outline-primary btn-sm mt-2");
  boton.type = "button";
  boton.appendChild(crearIcono("bi-eye"));
  boton.appendChild(document.createTextNode("Ver detalles"));
  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    mostrarDetalle(juego.id, juego.title);
  });
  cuerpo.appendChild(boton);

  tarjeta.appendChild(cuerpo);

  tarjeta.addEventListener("click", () => mostrarDetalle(juego.id, juego.title));

  columna.appendChild(tarjeta);
  return columna;
};

const renderizarListado = () => {
  limpiarNodo(contenedorListado);
  const texto = txtFiltro.value.trim().toLowerCase();
  const juegos = texto
    ? juegosCargados.filter((juego) => juego.title.toLowerCase().includes(texto))
    : juegosCargados;

  resumen.textContent =
    juegosCargados.length > 0
      ? `Mostrando ${juegos.length} de ${juegosCargados.length} juegos.`
      : "";

  if (juegosCargados.length > 0 && juegos.length === 0) {
    mostrarEstado(
      crearAlerta("info", "Sin coincidencias", `Ningún juego coincide con "${txtFiltro.value.trim()}".`)
    );
    return;
  }
  mostrarEstado(null);

  const fragmento = document.createDocumentFragment();
  for (const juego of juegos) {
    fragmento.appendChild(crearTarjeta(juego));
  }
  contenedorListado.appendChild(fragmento);
};

const cargarJuegos = async () => {
  btnBuscar.disabled = true;
  juegosCargados = [];
  limpiarNodo(contenedorListado);
  resumen.textContent = "";
  mostrarEstado(crearCargando("Cargando listado de juegos..."));

  try {
    const juegos = await obtenerJuegos(cmbPlataforma.value, cmbCategoria.value, cmbOrden.value);
    juegosCargados = Array.isArray(juegos) ? juegos : [];

    if (juegosCargados.length === 0) {
      mostrarEstado(crearAlerta("info", "Sin resultados", "No se encontraron juegos con los filtros seleccionados."));
      return;
    }
    renderizarListado();
  } catch (error) {
    console.error(error);
    mostrarEstado(
      crearAlerta("danger", "No se pudo cargar el listado", error.message, {
        texto: "Reintentar",
        funcion: cargarJuegos,
      })
    );
  } finally {
    btnBuscar.disabled = false;
  }
};

const crearDato = (titulo, valor) => {
  const fila = crear("div", "row py-1 border-bottom");
  fila.appendChild(crear("dt", "col-sm-5", titulo));
  fila.appendChild(crear("dd", "col-sm-7 mb-0", valor || "No disponible"));
  return fila;
};

const renderizarDetalle = (juego) => {
  limpiarNodo(bodyDetalle);
  tituloDetalle.textContent = juego.title;

  const fila = crear("div", "row g-4");

  const izquierda = crear("div", "col-lg-4");
  const imagen = document.createElement("img");
  imagen.src = juego.thumbnail;
  imagen.alt = `Portada de ${juego.title}`;
  imagen.className = "img-fluid rounded mb-3 w-100";
  izquierda.appendChild(imagen);

  const ficha = crear("dl", "small mb-3");
  ficha.appendChild(crearDato("Estado", juego.status));
  ficha.appendChild(crearDato("Género", juego.genre));
  ficha.appendChild(crearDato("Plataforma", juego.platform));
  ficha.appendChild(crearDato("Desarrollador", juego.developer));
  ficha.appendChild(crearDato("Distribuidor", juego.publisher));
  ficha.appendChild(crearDato("Lanzamiento", formatearFecha(juego.release_date)));
  izquierda.appendChild(ficha);

  if (juego.game_url) {
    const enlace = crear("a", "btn btn-success w-100 mb-2");
    enlace.href = juego.game_url;
    enlace.target = "_blank";
    enlace.rel = "noopener noreferrer";
    enlace.appendChild(crearIcono("bi-play-circle"));
    enlace.appendChild(document.createTextNode("Jugar / sitio oficial"));
    izquierda.appendChild(enlace);
  }
  fila.appendChild(izquierda);

  const derecha = crear("div", "col-lg-8");
  derecha.appendChild(crear("h2", "h5 fw-bold", "Descripción"));
  derecha.appendChild(
    crear("p", "descripcion-juego", aTextoPlano(juego.description) || juego.short_description)
  );

  const requisitos = juego.minimum_system_requirements;
  if (requisitos) {
    derecha.appendChild(crear("h2", "h5 fw-bold mt-4", "Requisitos mínimos"));
    const tabla = crear("table", "table table-sm table-striped");
    const tbody = document.createElement("tbody");
    const filas = [
      ["Sistema operativo", requisitos.os],
      ["Procesador", requisitos.processor],
      ["Memoria", requisitos.memory],
      ["Gráficos", requisitos.graphics],
      ["Almacenamiento", requisitos.storage],
    ];
    for (const [nombre, valor] of filas) {
      const tr = document.createElement("tr");
      tr.appendChild(crear("th", "w-25", nombre));
      tr.appendChild(crear("td", "", valor || "No especificado"));
      tbody.appendChild(tr);
    }
    tabla.appendChild(tbody);
    derecha.appendChild(tabla);
  }

  if (Array.isArray(juego.screenshots) && juego.screenshots.length > 0) {
    derecha.appendChild(crear("h2", "h5 fw-bold mt-4", "Capturas"));
    const galeria = crear("div", "row g-2");
    for (const captura of juego.screenshots) {
      const col = crear("div", "col-6 col-md-4");
      const img = document.createElement("img");
      img.src = captura.image;
      img.alt = `Captura de ${juego.title}`;
      img.loading = "lazy";
      img.className = "captura-juego";
      col.appendChild(img);
      galeria.appendChild(col);
    }
    derecha.appendChild(galeria);
  }

  fila.appendChild(derecha);
  bodyDetalle.appendChild(fila);
};

const mostrarDetalle = async (id, titulo) => {

  if (controladorDetalle) controladorDetalle.abort();
  controladorDetalle = new AbortController();
  const señal = controladorDetalle.signal;

  tituloDetalle.textContent = titulo;
  limpiarNodo(bodyDetalle);
  bodyDetalle.appendChild(crearCargando("Cargando detalle del juego..."));
  modalDetalle.show();

  try {
    const juego = await obtenerDetalleJuego(id, señal);
    renderizarDetalle(juego);
  } catch (error) {
    if (error.estado === -1) return;
    console.error(error);
    limpiarNodo(bodyDetalle);
    bodyDetalle.appendChild(
      crearAlerta("danger", "No se pudo cargar el detalle", error.message, {
        texto: "Reintentar",
        funcion: () => mostrarDetalle(id, titulo),
      })
    );
  }
};

frmFiltros.addEventListener("submit", (evento) => {
  evento.preventDefault();
  cargarJuegos();
});

txtFiltro.addEventListener("input", () => {
  if (juegosCargados.length > 0) renderizarListado();
});

cargarJuegos();
