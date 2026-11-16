const formatoMoneda = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mensajeArqueo = document.getElementById("mensajeArqueo");
const estadoCaja = document.getElementById("estadoCaja");
const formAbrirCaja = document.getElementById("formAbrirCaja");
const resumenCaja = document.getElementById("resumenCaja");

function monedaArqueo(valor) {
    const numero = Number(valor);
    return `${formatoMoneda.format(Number.isFinite(numero) ? numero : 0)} Bs.`;
}

function mostrarMensajeArqueo(texto, tipo = "danger") {
    mensajeArqueo.className = `alert alert-${tipo} mt-4`;
    mensajeArqueo.textContent = texto;
}

async function respuestaArqueo(url, opciones = {}) {
    const respuesta = await fetch(url, opciones);
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok) {
        throw new Error(datos.mensaje || "No se pudo completar la operación de caja.");
    }
    return datos;
}

function actualizarVistaCaja(arqueo) {
    formAbrirCaja.classList.toggle("d-none", Boolean(arqueo));
    resumenCaja.classList.toggle("d-none", !arqueo);
    if (!arqueo) {
        estadoCaja.textContent = "No hay una caja abierta. Ingresa el efectivo inicial para iniciar un arqueo.";
        return;
    }
    const egresos = Number(arqueo.efectivo_egresos) || 0;
    const esperado = Number(arqueo.efectivo_inicial) + Number(arqueo.efectivo_ventas) - egresos;
    estadoCaja.textContent = `Caja abierta desde ${arqueo.apertura} por ${arqueo.usuario_apertura}.`;
    document.getElementById("cajaInicial").textContent = monedaArqueo(arqueo.efectivo_inicial);
    document.getElementById("cajaVentas").textContent = monedaArqueo(arqueo.efectivo_ventas);
    document.getElementById("cajaEgresos").textContent = monedaArqueo(egresos);
    document.getElementById("cajaEsperado").textContent = monedaArqueo(esperado);
}

async function cargarEstadoCaja() {
    const datos = await respuestaArqueo("api.php?action=arqueo_estado");
    actualizarVistaCaja(datos.arqueo);
}

function rangoReporte(periodo, fechaTexto) {
    let anio;
    let mes;
    let dia;
    if (periodo === "anual") {
        anio = Number(fechaTexto);
        mes = 1;
        dia = 1;
    } else if (periodo === "mensual") {
        [anio, mes] = fechaTexto.split("-").map(Number);
        dia = 1;
    } else {
        [anio, mes, dia] = fechaTexto.split("-").map(Number);
    }
    const referencia = new Date(anio, mes - 1, dia);
    let inicio = referencia;
    let fin = referencia;
    if (periodo === "semanal") {
        inicio = new Date(anio, mes - 1, dia - ((referencia.getDay() + 6) % 7));
        fin = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6);
    } else if (periodo === "mensual") {
        inicio = new Date(anio, mes - 1, 1);
        fin = new Date(anio, mes, 0);
    } else if (periodo === "anual") {
        inicio = new Date(anio, 0, 1);
        fin = new Date(anio, 11, 31);
    }
    const formatoFecha = fecha => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
    return { desde: formatoFecha(inicio), hasta: formatoFecha(fin) };
}

function fechaActualReporte() {
    const ahora = new Date();
    return {
        fecha: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`,
        mes: `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`,
        anio: String(ahora.getFullYear())
    };
}

function actualizarControlPeriodo() {
    const periodo = document.getElementById("periodoReporte").value;
    const campo = document.getElementById("fechaReporte");
    const etiqueta = document.getElementById("etiquetaFechaReporte");
    const valorActual = campo.value;
    const actual = fechaActualReporte();
    let anio = actual.anio;
    let mes = "01";
    let dia = "01";
    if (campo.type === "number" && /^\d{4}$/.test(valorActual)) {
        anio = valorActual;
    } else if (/^\d{4}-\d{2}/.test(valorActual)) {
        [anio, mes] = valorActual.split("-");
        dia = valorActual.split("-")[2] || "01";
    }
    if (periodo === "anual") {
        campo.type = "number";
        campo.min = "2000";
        campo.max = String(Number(actual.anio) + 1);
        campo.step = "1";
        campo.value = anio;
        etiqueta.textContent = "Año del reporte";
        campo.setAttribute("aria-label", "Año del reporte");
    } else if (periodo === "mensual") {
        campo.type = "month";
        campo.removeAttribute("min");
        campo.removeAttribute("max");
        campo.removeAttribute("step");
        campo.value = `${anio}-${mes}`;
        etiqueta.textContent = "Mes del reporte";
        campo.setAttribute("aria-label", "Mes del reporte");
    } else {
        campo.type = "date";
        campo.removeAttribute("min");
        campo.removeAttribute("max");
        campo.removeAttribute("step");
        campo.value = `${anio}-${mes}-${dia}`;
        etiqueta.textContent = periodo === "semanal" ? "Selecciona un día de la semana" : "Día del reporte";
        campo.setAttribute("aria-label", etiqueta.textContent);
    }
}

function crearCelda(valor) {
    const celda = document.createElement("td");
    celda.textContent = valor;
    return celda;
}

function renderizarTablaVacia(tabla, columnas, mensaje) {
    const fila = document.createElement("tr");
    const celda = crearCelda(mensaje);
    celda.colSpan = columnas;
    celda.className = "text-center text-secondary py-3";
    fila.appendChild(celda);
    tabla.replaceChildren(fila);
}

function textoPeriodoReporte(periodo) {
    return {
        diario: "Reporte diario",
        semanal: "Reporte semanal",
        mensual: "Reporte mensual",
        anual: "Reporte anual"
    }[periodo] || "Reporte de arqueo";
}

function actualizarEncabezadoImpresion(periodo, desde, hasta) {
    const formatoCorto = new Intl.DateTimeFormat("es-BO", { dateStyle: "medium" });
    const aFecha = valor => {
        const [anio, mes, dia] = valor.split("-").map(Number);
        return new Date(anio, mes - 1, dia);
    };
    document.getElementById("periodoReporteImpresion").textContent = textoPeriodoReporte(periodo);
    document.getElementById("rangoReporteImpresion").textContent = desde === hasta
        ? `Fecha: ${formatoCorto.format(aFecha(desde))}`
        : `Desde ${formatoCorto.format(aFecha(desde))} hasta ${formatoCorto.format(aFecha(hasta))}`;
    document.getElementById("fechaEmisionImpresion").textContent =
        `Emitido: ${new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`;
}

function agregarPieTabla(tabla, valores) {
    const pie = document.createElement("tfoot");
    const fila = document.createElement("tr");
    fila.className = "table-light fw-bold";
    valores.forEach(valor => fila.appendChild(crearCelda(valor)));
    pie.appendChild(fila);
    tabla.appendChild(pie);
}

function renderizarReporte(datos) {
    const arqueos = datos.arqueos;
    const ingresos = datos.ingresos;
    const egresos = datos.egresos;
    const tabla = document.getElementById("tablaArqueos");
    const totales = arqueos.reduce((suma, arqueo) => {
        suma.inicial += Number(arqueo.efectivo_inicial) || 0;
        suma.ingresos += Number(arqueo.efectivo_ventas) || 0;
        suma.egresos += Number(arqueo.efectivo_egresos) || 0;
        suma.esperado += (Number(arqueo.efectivo_inicial) || 0)
            + (Number(arqueo.efectivo_ventas) || 0)
            - (Number(arqueo.efectivo_egresos) || 0);
        suma.contado += Number(arqueo.efectivo_contado) || 0;
        suma.diferencia += Number(arqueo.diferencia) || 0;
        return suma;
    }, { inicial: 0, ingresos: 0, egresos: 0, esperado: 0, contado: 0, diferencia: 0 });
    const totalIngresos = ingresos.reduce((suma, ingreso) => suma + (Number(ingreso.monto) || 0), 0);
    const totalEgresos = egresos.reduce((suma, egreso) => suma + (Number(egreso.monto) || 0), 0);
    if (!arqueos.length) {
        const fila = document.createElement("tr");
        const celda = crearCelda("No hay arqueos registrados en este periodo.");
        celda.colSpan = 10;
        celda.className = "text-center text-secondary py-4";
        fila.appendChild(celda);
        tabla.replaceChildren(fila);
    } else {
        const filas = arqueos.map(arqueo => {
            const fila = document.createElement("tr");
            const efectivoInicial = Number(arqueo.efectivo_inicial) || 0;
            const ventaEfectivo = Number(arqueo.efectivo_ventas) || 0;
            const egreso = Number(arqueo.efectivo_egresos) || 0;
            const esperado = efectivoInicial + ventaEfectivo - egreso;
            const diferencia = arqueo.diferencia === null ? "Pendiente" : monedaArqueo(arqueo.diferencia);
            fila.append(
                crearCelda(arqueo.apertura),
                crearCelda(arqueo.cierre || "Abierta"),
                crearCelda(arqueo.usuario_apertura),
                crearCelda(arqueo.usuario_cierre || "-"),
                crearCelda(monedaArqueo(efectivoInicial)),
                crearCelda(monedaArqueo(ventaEfectivo)),
                crearCelda(monedaArqueo(egreso)),
                crearCelda(monedaArqueo(esperado)),
                crearCelda(arqueo.efectivo_contado === null ? "Pendiente" : monedaArqueo(arqueo.efectivo_contado)),
                crearCelda(diferencia)
            );
            return fila;
        });
        tabla.replaceChildren(...filas);
    }
    const arqueosPendientes = arqueos.filter(arqueo => arqueo.efectivo_contado === null).length;
    const diferenciaPendiente = arqueos.filter(arqueo => arqueo.diferencia === null).length;
    document.getElementById("totalInicialPeriodo").textContent = monedaArqueo(totales.inicial);
    document.getElementById("totalIngresosEfectivoPeriodo").textContent = monedaArqueo(totales.ingresos);
    document.getElementById("totalEgresosPeriodo").textContent = monedaArqueo(totales.egresos);
    document.getElementById("totalEsperadoPeriodo").textContent = monedaArqueo(totales.esperado);
    document.getElementById("totalContadoPeriodo").textContent = monedaArqueo(totales.contado);
    document.getElementById("totalDiferenciaPeriodo").textContent = monedaArqueo(totales.diferencia);
    document.getElementById("detalleContadoPeriodo").textContent = arqueosPendientes
        ? `${arqueosPendientes} ${arqueosPendientes === 1 ? "caja abierta pendiente de conteo." : "cajas abiertas pendientes de conteo."}`
        : "Suma del efectivo contado al cerrar las cajas.";
    document.getElementById("detalleDiferenciaPeriodo").textContent = diferenciaPendiente
        ? `Acumulado de cajas cerradas; ${diferenciaPendiente} ${diferenciaPendiente === 1 ? "caja abierta pendiente." : "cajas abiertas pendientes."}`
        : "Efectivo contado − efectivo esperado.";

    const tablaIngresos = document.getElementById("tablaIngresos");
    if (!ingresos.length) {
        renderizarTablaVacia(tablaIngresos, 6, "Sin ingresos en este período.");
    } else {
        const filas = ingresos.map(ingreso => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(ingreso.fecha),
                crearCelda(`#${ingreso.pedido_id}`),
                crearCelda(ingreso.cliente),
                crearCelda(ingreso.tipo_entrega),
                crearCelda(ingreso.metodo),
                crearCelda(monedaArqueo(ingreso.monto))
            );
            return fila;
        });
        tablaIngresos.replaceChildren(...filas);
    }
    agregarPieTabla(tablaIngresos, ["Total de ingresos cobrados", "", "", "", "", monedaArqueo(totalIngresos)]);

    const tablaEgresos = document.getElementById("tablaEgresos");
    if (!egresos.length) {
        renderizarTablaVacia(tablaEgresos, 5, "Sin egresos en este período.");
    } else {
        const filas = egresos.map(egreso => {
            const fila = document.createElement("tr");
            fila.append(
                crearCelda(egreso.fecha),
                crearCelda(egreso.categoria),
                crearCelda(egreso.concepto),
                crearCelda(egreso.usuario || "-"),
                crearCelda(monedaArqueo(egreso.monto))
            );
            return fila;
        });
        tablaEgresos.replaceChildren(...filas);
    }
    agregarPieTabla(tablaEgresos, ["Total de egresos registrados", "", "", "", monedaArqueo(totalEgresos)]);
}

let ultimaSolicitudReporte = 0;

async function generarReporte(evento) {
    evento?.preventDefault();
    const campoFecha = document.getElementById("fechaReporte");
    const fecha = campoFecha.value;
    const periodo = document.getElementById("periodoReporte").value;
    if (!fecha || !campoFecha.checkValidity()) {
        mostrarMensajeArqueo("Selecciona el periodo para generar el reporte.");
        return;
    }
    const { desde, hasta } = rangoReporte(periodo, fecha);
    actualizarEncabezadoImpresion(periodo, desde, hasta);
    const solicitud = ++ultimaSolicitudReporte;
    const boton = document.querySelector("#formReporte button[type=submit]");
    boton.disabled = true;
    let resultado;
    try {
        const datos = await respuestaArqueo(`api.php?action=reporte_arqueos&desde=${desde}&hasta=${hasta}`);
        if (solicitud === ultimaSolicitudReporte) {
            renderizarReporte(datos);
            mensajeArqueo.className = "alert d-none mt-4";
            mensajeArqueo.textContent = "";
            resultado = datos;
        }
    } catch (error) {
        if (solicitud === ultimaSolicitudReporte) {
            mostrarMensajeArqueo(error.message);
            throw error;
        }
    } finally {
        if (solicitud === ultimaSolicitudReporte) {
            boton.disabled = false;
        }
    }
    return resultado;
}

formAbrirCaja.addEventListener("submit", async evento => {
    evento.preventDefault();
    const boton = formAbrirCaja.querySelector("button[type=submit]");
    boton.disabled = true;
    try {
        await respuestaArqueo("api.php?action=abrir_arqueo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ efectivo_inicial: document.getElementById("efectivoInicial").value })
        });
        mostrarMensajeArqueo("Caja abierta correctamente.", "success");
        await cargarEstadoCaja();
        await generarReporte();
    } catch (error) {
        mostrarMensajeArqueo(error.message);
    } finally {
        boton.disabled = false;
    }
});

document.getElementById("formCerrarCaja").addEventListener("submit", async evento => {
    evento.preventDefault();
    const boton = evento.currentTarget.querySelector("button[type=submit]");
    boton.disabled = true;
    try {
        const datos = await respuestaArqueo("api.php?action=cerrar_arqueo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ efectivo_contado: document.getElementById("efectivoContado").value })
        });
        mostrarMensajeArqueo(`Caja cerrada. Diferencia: ${monedaArqueo(datos.diferencia)}.`, "success");
        await cargarEstadoCaja();
        await generarReporte();
    } catch (error) {
        mostrarMensajeArqueo(error.message);
    } finally {
        boton.disabled = false;
    }
});

document.getElementById("formReporte").addEventListener("submit", generarReporte);
document.getElementById("btnImprimirReporte").addEventListener("click", async () => {
    const boton = document.getElementById("btnImprimirReporte");
    boton.disabled = true;
    try {
        const datos = await generarReporte();
        if (!datos) {
            return;
        }
        window.print();
    } catch (error) {
        mostrarMensajeArqueo(error.message);
    } finally {
        boton.disabled = false;
    }
});
document.getElementById("periodoReporte").addEventListener("change", () => {
    actualizarControlPeriodo();
    generarReporte();
});
document.getElementById("fechaReporte").addEventListener("change", generarReporte);
document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("fechaReporte").value = fechaActualReporte().fecha;
    actualizarControlPeriodo();
    try {
        await Promise.all([cargarEstadoCaja(), generarReporte()]);
    } catch (error) {
        mostrarMensajeArqueo(error.message);
    }
});

window.setInterval(() => cargarEstadoCaja().catch(error => mostrarMensajeArqueo(error.message)), 30000);

document.getElementById("formEgreso").addEventListener("submit", async evento => {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const boton = formulario.querySelector("button[type=submit]");
    boton.disabled = true;
    try {
        await respuestaArqueo("api.php?action=registrar_egreso_arqueo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                categoria: document.getElementById("categoriaEgreso").value,
                concepto: document.getElementById("conceptoEgreso").value,
                monto: document.getElementById("montoEgreso").value
            })
        });
        formulario.reset();
        mostrarMensajeArqueo("Egreso registrado y descontado del efectivo esperado.", "success");
        await Promise.all([cargarEstadoCaja(), generarReporte()]);
    } catch (error) {
        mostrarMensajeArqueo(error.message);
    } finally {
        boton.disabled = false;
    }
});
