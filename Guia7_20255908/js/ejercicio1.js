const formulario = document.forms["frmRegistro"];
const button = document.forms["frmRegistro"].elements["btnRegistro"];

const txtNombre = document.getElementById("idNombre");
const txtApellidos = document.getElementById("idApellidos");
const txtFechaNac = document.getElementById("idFechaNac");
const txtCorreo = document.getElementById("idCorreo");
const txtPassword = document.getElementById("idPassword");
const txtPasswordRepetir = document.getElementById("idPasswordRepetir");
const cmbPais = document.getElementById("idCmPais");
const fileAvatar = document.getElementById("idArchivo");

const checkIntereses = document.querySelectorAll(
  'form[name="frmRegistro"] input[type="checkbox"]'
);
const radiosCarrera = document.getElementsByName("idRdCarrera");

const contenedorErrores = document.getElementById("idErrores");

const modal = new bootstrap.Modal(document.getElementById("idModal"), {});

const bodyModal = document.getElementById("idBodyModal");

const regexCorreo = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const limpiarNodo = function (nodo) {
  while (nodo.hasChildNodes()) {
    nodo.removeChild(nodo.firstChild);
  }
};

const obtenerTextoLabel = function (control) {
  const label = document.querySelector(`label[for="${control.id}"]`);
  return label ? label.firstChild.nodeValue.trim() : control.id;
};

const obtenerFechaActual = function () {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

const marcarInvalido = function (control) {
  control.classList.add("is-invalid");
};

const limpiarMarcas = function () {
  const elementos = formulario.elements;
  for (let index = 0; index < elementos.length; index++) {
    elementos[index].classList.remove("is-invalid");
  }
};

const mostrarErrores = function (errores) {
  limpiarNodo(contenedorErrores);

  const alerta = document.createElement("div");
  alerta.setAttribute("class", "alert alert-danger");
  alerta.setAttribute("role", "alert");

  const titulo = document.createElement("strong");
  titulo.appendChild(
    document.createTextNode("Por favor corrija lo siguiente:")
  );
  alerta.appendChild(titulo);

  const lista = document.createElement("ul");
  lista.setAttribute("class", "mb-0");
  for (const error of errores) {
    const item = document.createElement("li");
    item.appendChild(document.createTextNode(error));
    lista.appendChild(item);
  }
  alerta.appendChild(lista);

  contenedorErrores.appendChild(alerta);
};

const validarFormulario = function () {
  const errores = [];
  limpiarMarcas();

  const camposTexto = [
    txtNombre,
    txtApellidos,
    txtFechaNac,
    txtCorreo,
    txtPassword,
    txtPasswordRepetir,
  ];
  for (const campo of camposTexto) {
    if (campo.value.trim() == "") {
      errores.push(`El campo "${obtenerTextoLabel(campo)}" es obligatorio.`);
      marcarInvalido(campo);
    }
  }

  if (txtFechaNac.value != "" && txtFechaNac.value > obtenerFechaActual()) {
    errores.push("La fecha de nacimiento no puede ser mayor a la fecha actual.");
    marcarInvalido(txtFechaNac);
  }

  if (txtCorreo.value.trim() != "" && !regexCorreo.test(txtCorreo.value.trim())) {
    errores.push("El correo electrónico no tiene un formato válido (ej. usuario@dominio.com).");
    marcarInvalido(txtCorreo);
  }

  if (
    txtPassword.value != "" &&
    txtPasswordRepetir.value != "" &&
    txtPassword.value !== txtPasswordRepetir.value
  ) {
    errores.push("Las contraseñas no coinciden.");
    marcarInvalido(txtPassword);
    marcarInvalido(txtPasswordRepetir);
  }

  let interesSeleccionado = false;
  for (const check of checkIntereses) {
    if (check.checked) {
      interesSeleccionado = true;
    }
  }
  if (!interesSeleccionado) {
    errores.push("Debe seleccionar al menos un interés.");
    for (const check of checkIntereses) {
      marcarInvalido(check);
    }
  }

  let carreraSeleccionada = false;
  for (const radio of radiosCarrera) {
    if (radio.checked) {
      carreraSeleccionada = true;
    }
  }
  if (!carreraSeleccionada) {
    errores.push("Debe seleccionar una carrera.");
    for (const radio of radiosCarrera) {
      marcarInvalido(radio);
    }
  }

  if (cmbPais.value == "") {
    errores.push("Debe seleccionar un país de origen.");
    marcarInvalido(cmbPais);
  }

  return errores;
};

const crearFila = function (campo, valor) {
  const fila = document.createElement("tr");

  const celdaCampo = document.createElement("th");
  celdaCampo.setAttribute("scope", "row");
  celdaCampo.appendChild(document.createTextNode(campo));

  const celdaValor = document.createElement("td");
  celdaValor.appendChild(document.createTextNode(valor));

  fila.appendChild(celdaCampo);
  fila.appendChild(celdaValor);
  return fila;
};

const obtenerDatos = function () {

  const intereses = [];
  for (const check of checkIntereses) {
    if (check.checked) {
      intereses.push(obtenerTextoLabel(check));
    }
  }

  let carrera = "";
  for (const radio of radiosCarrera) {
    if (radio.checked) {
      carrera = obtenerTextoLabel(radio);
    }
  }

  const pais = cmbPais.options[cmbPais.selectedIndex].text;

  const avatar =
    fileAvatar.files.length > 0 ? fileAvatar.files[0].name : "No seleccionado";

  const passwordOculta = "•".repeat(txtPassword.value.length);

  return [
    ["Nombres", txtNombre.value.trim()],
    ["Apellidos", txtApellidos.value.trim()],
    ["Fecha de nacimiento", txtFechaNac.value],
    ["Correo electrónico", txtCorreo.value.trim()],
    ["Contraseña", passwordOculta],
    ["Intereses", intereses.join(", ")],
    ["Carrera", carrera],
    ["País de origen", pais],
    ["Avatar", avatar],
  ];
};

const mostrarDatosEnModal = function () {

  limpiarNodo(bodyModal);

  const tabla = document.createElement("table");
  tabla.setAttribute("class", "table table-striped table-bordered align-middle mb-0");

  const thead = document.createElement("thead");
  thead.setAttribute("class", "table-dark");
  const filaEncabezado = document.createElement("tr");
  for (const textoEncabezado of ["Campo", "Información"]) {
    const th = document.createElement("th");
    th.setAttribute("scope", "col");
    th.appendChild(document.createTextNode(textoEncabezado));
    filaEncabezado.appendChild(th);
  }
  thead.appendChild(filaEncabezado);
  tabla.appendChild(thead);

  const tbody = document.createElement("tbody");
  const datos = obtenerDatos();
  for (const [campo, valor] of datos) {
    tbody.appendChild(crearFila(campo, valor));
  }
  tabla.appendChild(tbody);

  const divTabla = document.createElement("div");
  divTabla.setAttribute("class", "table-responsive");
  divTabla.appendChild(tabla);

  bodyModal.appendChild(divTabla);

  modal.show();
};

button.onclick = () => {
  const errores = validarFormulario();

  if (errores.length > 0) {
    mostrarErrores(errores);
  } else {
    limpiarNodo(contenedorErrores);
    mostrarDatosEnModal();
  }
};

txtFechaNac.setAttribute("max", obtenerFechaActual());

formulario.addEventListener("input", (event) => {
  event.target.classList.remove("is-invalid");
});
formulario.addEventListener("change", (event) => {
  const objetivo = event.target;
  objetivo.classList.remove("is-invalid");

  if (objetivo.type == "checkbox") {
    for (const check of checkIntereses) check.classList.remove("is-invalid");
  }
  if (objetivo.type == "radio") {
    for (const radio of radiosCarrera) radio.classList.remove("is-invalid");
  }
});
