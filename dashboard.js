const indicadores = {
    ingresos: document.getElementById("dashboardIngresos"),
    pedidosPendientes: document.getElementById("dashboardPedidos"),
    productos: document.getElementById("dashboardProductos"),
    ventasHoy: document.getElementById("ventasHoy"),
    productosAgotados: document.getElementById("productosAgotados"),
    ventasMes: document.getElementById("ventasMesDashboard"),
    operaciones: document.getElementById("operacionesDashboard"),
    ultimasVentas: document.getElementById("tablaUltimasVentas"),
    ultimosPedidos: document.getElementById("tablaUltimosPedidos"),
    productosTop: document.getElementById("tablaProductosTop"),
    notificaciones: document.getElementById("panelNotificaciones")
};

function monto(valor) {
    const numero = Number(valor);
    return `${(Number.isFinite(numero) ? numero : 0).toFixed(2)} Bs.`;
}

function crearCelda(valor) {
    const celda = document.createElement("td");
    celda.textContent = valor ?? "";
    return celda;
}

function mostrarMensaje(tabla, columnas, mensaje) {
    const fila = document.createElement("tr");
    const celda = document.createElement("td");
    celda.colSpan = columnas;
    celda.className = "text-center py-4";
    celda.textContent = mensaje;
    fila.appendChild(celda);
    tabla.replaceChildren(fila);
}

function renderizarPedidos(tabla, lista) {
    if (!lista.length) {
        mostrarMensaje(tabla, 3, "No hay operaciones registradas.");
        return;
    }

    const filas = lista.map(pedido => {
        const fila = document.createElement("tr");
        fila.append(
            crearCelda(pedido.cliente || "Cliente"),
            crearCelda(monto(pedido.total))
        );
        const estado = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = "badge";
        etiqueta.classList.add(
            pedido.estado === "Entregado" ? "bg-success"
                : pedido.estado === "Cancelado" ? "bg-danger"
                    : "bg-warning"
        );
        etiqueta.textContent = pedido.estado || "Pendiente";
        estado.appendChild(etiqueta);
        fila.appendChild(estado);
        return fila;
    });
    tabla.replaceChildren(...filas);
}

function renderizarProductosTop(ventas) {
    const cantidades = new Map();
    ventas.forEach(venta => {
        (Array.isArray(venta.productos) ? venta.productos : []).forEach(producto => {
            const nombre = producto.nombre || "Producto";
            const actual = cantidades.get(nombre) || { cantidad: 0, total: 0 };
            const cantidad = Number(producto.cantidad) || 0;
            actual.cantidad += cantidad;
            actual.total += cantidad * (Number(producto.precio) || 0);
            cantidades.set(nombre, actual);
        });
    });

    const lista = [...cantidades.entries()]
        .sort((a, b) => b[1].cantidad - a[1].cantidad)
        .slice(0, 5);
    if (!lista.length) {
        mostrarMensaje(indicadores.productosTop, 3, "No existen registros.");
        return;
    }

    const filas = lista.map(([nombre, datos]) => {
        const fila = document.createElement("tr");
        fila.append(
            crearCelda(nombre),
            crearCelda(String(datos.cantidad)),
            crearCelda(monto(datos.total))
        );
        return fila;
    });
    indicadores.productosTop.replaceChildren(...filas);
}

function fechaLocal(fecha) {
    return typeof fecha === "string" ? fecha.slice(0, 10) : "";
}

async function obtenerDatosDashboard(recurso) {
    const respuesta = await fetch(`api.php?action=${recurso}`, {
        cache: "no-store",
        credentials: "same-origin"
    });
    const datos = await respuesta.json();
    if (!respuesta.ok || !datos.ok) {
        throw new Error(datos.mensaje || `No se pudieron cargar ${recurso}.`);
    }
    return datos;
}

async function actualizarDashboard() {
    const [resultadoPedidos, resultadoProductos] = await Promise.allSettled([
        obtenerDatosDashboard("pedidos"),
        obtenerDatosDashboard("productos")
    ]);
    const errores = [];

    if (resultadoPedidos.status === "fulfilled" && Array.isArray(resultadoPedidos.value.pedidos)) {
        const pedidos = resultadoPedidos.value.pedidos;
        const operacionesValidas = pedidos.filter(
            pedido => pedido.estado !== "Cancelado"
        );
        const ahora = new Date();
        const hoy = [
            ahora.getFullYear(),
            String(ahora.getMonth() + 1).padStart(2, "0"),
            String(ahora.getDate()).padStart(2, "0")
        ].join("-");
        const ventasHoy = operacionesValidas
            .filter(venta => fechaLocal(venta.fecha) === hoy)
            .reduce((suma, venta) => suma + (Number(venta.total) || 0), 0);
        const ventasMes = operacionesValidas
            .filter(venta => {
                const fecha = fechaLocal(venta.fecha);
                return fecha.startsWith(`${hoy.slice(0, 7)}-`);
            })
            .reduce((suma, venta) => suma + (Number(venta.total) || 0), 0);
        const montoOperaciones = operacionesValidas.reduce(
            (suma, venta) => suma + (Number(venta.total) || 0),
            0
        );

        indicadores.ingresos.textContent = monto(montoOperaciones);
        indicadores.pedidosPendientes.textContent = pedidos.filter(
            pedido => pedido.estado === "Pendiente"
        ).length;
        indicadores.ventasHoy.textContent = monto(ventasHoy);
        indicadores.ventasMes.textContent = monto(ventasMes);
        indicadores.operaciones.textContent = pedidos.length;

        const ordenarPorReciente = lista => [...lista]
            .sort((a, b) => Number(b.id) - Number(a.id))
            .slice(0, 5);
        renderizarPedidos(indicadores.ultimasVentas, ordenarPorReciente(pedidos));
        renderizarPedidos(indicadores.ultimosPedidos, ordenarPorReciente(pedidos));
        renderizarProductosTop(operacionesValidas);
    } else {
        const error = resultadoPedidos.status === "rejected"
            ? resultadoPedidos.reason
            : new Error("La respuesta de pedidos no contiene una lista válida.");
        console.error("No se pudo cargar el resumen de transacciones:", error);
        [indicadores.ingresos, indicadores.pedidosPendientes, indicadores.ventasHoy,
            indicadores.ventasMes, indicadores.operaciones].forEach(indicador => {
            indicador.textContent = "—";
        });
        mostrarMensaje(indicadores.ultimasVentas, 3, `No se pudo cargar el resumen: ${error.message}`);
        mostrarMensaje(indicadores.ultimosPedidos, 3, `No se pudo cargar el resumen: ${error.message}`);
        mostrarMensaje(indicadores.productosTop, 3, "No disponible sin los datos de las transacciones.");
        errores.push(`Transacciones: ${error.message}`);
    }

    if (resultadoProductos.status === "fulfilled" && Array.isArray(resultadoProductos.value.productos)) {
        const productos = resultadoProductos.value.productos;
        indicadores.productos.textContent = productos.length;
        indicadores.productosAgotados.textContent = productos.filter(
            producto => Number(producto.stock) === 0
        ).length;
    } else {
        const error = resultadoProductos.status === "rejected"
            ? resultadoProductos.reason
            : new Error("La respuesta de productos no contiene una lista válida.");
        console.error("No se pudo cargar el resumen de productos:", error);
        indicadores.productos.textContent = "—";
        indicadores.productosAgotados.textContent = "—";
        errores.push(`Productos: ${error.message}`);
    }

    indicadores.notificaciones.replaceChildren();
    const aviso = document.createElement("div");
    aviso.className = `alert ${errores.length ? "alert-danger" : "alert-success"} mb-0`;
    aviso.textContent = errores.length
        ? `No se pudo completar el resumen. ${errores.join(" | ")}`
        : "Resumen actualizado con las operaciones registradas.";
    indicadores.notificaciones.appendChild(aviso);
}

document.addEventListener("DOMContentLoaded", actualizarDashboard);
window.setInterval(actualizarDashboard, 30000);
window.actualizarDashboard = actualizarDashboard;
