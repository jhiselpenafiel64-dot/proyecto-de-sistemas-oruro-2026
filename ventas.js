let pedidos =
JSON.parse(
localStorage.getItem("pedidos")
) || [];

let ventas = [];

const tablaVentas =
document.getElementById(
"tablaVentas"
);

const totalVentas =
document.getElementById(
"totalVentas"
);

const cantidadVentas =
document.getElementById(
"cantidadVentas"
);

const ventasHoy =
document.getElementById(
"ventasHoy"
);

const productoTop =
document.getElementById(
"productoTop"
);
function obtenerVentas(){
    ventas = pedidos.filter(pedido=>

        pedido.estado==="Entregado" || pedido.pago?.estado==="Pagado"

    );

}

function calcularEstadisticas(){

    let total = 0;

    let hoy = 0;

    const fechaActual =
    new Date().toLocaleDateString();

    let productosVendidos = {};

    ventas.forEach(venta=>{

        total += Number(venta.total) || 0;

        const fechaVenta = new Date(venta.fecha).toLocaleDateString();
        if(venta.fecha===fechaActual || fechaVenta===fechaActual){

            hoy += Number(venta.total) || 0;

        }

        (venta.productos || []).forEach(producto=>{

            if(!productosVendidos[producto.nombre]){

                productosVendidos[producto.nombre]=0;

            }

            productosVendidos[producto.nombre]+= Number(producto.cantidad) || 0;

        });

    });

    totalVentas.textContent =
    total+" Bs.";

    cantidadVentas.textContent =
    ventas.length;

    ventasHoy.textContent =
    hoy+" Bs.";

    let mayor = 0;

    let nombre = "-";

    for(let producto in productosVendidos){

        if(productosVendidos[producto]>mayor){

            mayor = productosVendidos[producto];

            nombre = producto;

        }

    }

    productoTop.textContent = nombre;

}
function cargarVentas(){

    obtenerVentas();

    calcularEstadisticas();

    mostrarVentas();

}

function mostrarVentas(){

    if(!tablaVentas){

        return;

    }

    tablaVentas.innerHTML="";

    if(ventas.length===0){

        tablaVentas.innerHTML=

        `<tr>

        <td
        colspan="7"
        class="text-center py-5">

        <i
        class="bi bi-receipt-cutoff"

        style="font-size:60px;color:#C9A45C;"></i>

        <br><br>

        <h5
        style="color:#6B2635;">

        No existen ventas registradas

        </h5>

        <p class="text-secondary">

        Las ventas aparecerán cuando un pedido sea entregado.

        </p>

        </td>

        </tr>`;

        return;

    }

    ventas.forEach(venta=>{

        let productos="";

        (venta.productos || []).forEach(producto=>{

            productos+=

            producto.nombre+

            " ("+

            producto.cantidad+

            "), ";

        });

        productos=

        productos.substring(

        0,

        productos.length-2

        );

        tablaVentas.innerHTML+=

    `<tr>

<td>

${venta.id}

</td>

<td>

${venta.cliente}

</td>

<td>

${productos}

</td>

<td>

${venta.total} Bs.

</td>

<td>

${venta.fecha}

</td>

<td>

<span
class="badge bg-success">

Entregado

</span>

</td>

<td class="text-center">

<button

class="btn btn-primary btn-sm"

onclick="verVenta(${venta.id})">

<i class="bi bi-eye"></i>

</button>

</td>

</tr>`;

    });

}

function verVenta(id){

    const venta=

    ventas.find(v=>

        v.id===id

    );

    if(!venta){

        return;

    }

    document.getElementById(
    "detalleCliente"
    ).value=

    venta.cliente;

    document.getElementById(
    "detalleTelefono"
    ).value=

    venta.telefono;

    document.getElementById(
    "detalleFecha"
    ).value=

    venta.fecha;

    document.getElementById(
    "detalleEstado"
    ).value=

    venta.estado;

    const tablaDetalle=

    document.getElementById(

    "detalleProductosVenta"

    );

    tablaDetalle.innerHTML="";

    venta.productos.forEach(producto=>{

        const subtotal=

        producto.precio*

        producto.cantidad;

        tablaDetalle.innerHTML+=

    `<tr>

<td>

${producto.nombre}

</td>

<td>

${producto.cantidad}

</td>

<td>

${producto.precio} Bs.

</td>

<td>

${subtotal} Bs.

</td>

</tr>`;

    });

    document.getElementById(

    "detalleTotal"

    ).textContent=

    venta.total+" Bs.";

    modalVenta.show();

}
const buscarVenta = document.getElementById("buscarVenta") || {};
const fechaVenta = document.getElementById("fechaVenta") || {};
const filtroVenta = document.getElementById("filtroVenta") || {};

if (buscarVenta.addEventListener) buscarVenta.addEventListener("input", filtrarVentas);
if (fechaVenta.addEventListener) fechaVenta.addEventListener("change", filtrarVentas);
if (filtroVenta.addEventListener) filtroVenta.addEventListener("change", filtrarVentas);

function filtrarVentas(){

    let lista = [...ventas];


    if(buscarVenta.value.trim()!==""){

        const texto =
        buscarVenta.value
        .toLowerCase();

        lista = lista.filter(venta=>

            venta.cliente
            .toLowerCase()
            .includes(texto)

        );

    }

    if(fechaVenta.value!==""){

        const fecha =

        new Date(fechaVenta.value)
        .toLocaleDateString();

        lista = lista.filter(venta=>{
            const fechaRegistro=new Date(venta.fecha).toLocaleDateString();
            return venta.fecha===fecha || fechaRegistro===fecha;
        });

    }

    if(filtroVenta.value!==""){
        lista=lista.filter(venta=>venta.estado===filtroVenta.value);
    }

    mostrarVentasFiltradas(lista);

}


function mostrarVentasFiltradas(lista){

    tablaVentas.innerHTML="";

    if(lista.length===0){

        tablaVentas.innerHTML=

        `<tr>

        <td colspan="7"

        class="text-center py-5">

        <i class="bi bi-search"

        style="font-size:55px;color:#C9A45C;"></i>

        <br><br>

        <h5
        style="color:#6B2635;">

        No se encontraron resultados

        </h5>

        </td>

        </tr>`;

        return;

    }

    lista.forEach(venta=>{

        let productos="";

        (venta.productos || []).forEach(producto=>{

            productos+=

            producto.nombre+

            " ("+

            producto.cantidad+

            "), ";

        });

        productos=

        productos.substring(

            0,

            productos.length-2

        );

        tablaVentas.innerHTML+=

    `<tr>

<td>${venta.id}</td>

<td>${venta.cliente}</td>

<td>${productos}</td>

<td>${venta.total} Bs.</td>

<td>${venta.fecha}</td>

<td>

<span
class="badge bg-success">

Entregado

</span>

</td>

<td class="text-center">

<button

class="btn btn-primary btn-sm"

onclick="verVenta(${venta.id})">

<i class="bi bi-eye"></i>

</button>

</td>

</tr>`;

    });

}

function actualizarModuloVentas(listaPedidos=null){

    pedidos = Array.isArray(listaPedidos)
        ? listaPedidos
        : JSON.parse(localStorage.getItem("pedidos")) || [];

    obtenerVentas();

    calcularEstadisticas();

    mostrarVentas();

}

function cargarPedidosVentas(){
    fetch("api.php?action=pedidos")
        .then(async respuesta=>{
            const datos=await respuesta.json();
            if(!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar las ventas.");
            return datos;
        })
        .then(datos=>{
            if(!datos.ok || !Array.isArray(datos.pedidos)) return;
            pedidos=datos.pedidos.map(pedido=>({...pedido,
                factura:{numero:pedido.factura_numero,nombre:pedido.nombre_fiscal,nit_ci:pedido.nit_ci,direccion:pedido.direccion_fiscal},
                pago:{metodo:pedido.metodo_pago,monto:Number(pedido.monto_pago||0),estado:pedido.estado_pago}
            }));
            localStorage.setItem("pedidos",JSON.stringify(pedidos));
            actualizarModuloVentas(pedidos);
        })
        .catch(()=>actualizarModuloVentas());
}

window.addEventListener(

"focus",

()=>{

    actualizarModuloVentas();

});

window.addEventListener("pedidosActualizados",actualizarModuloVentas);

setInterval(()=>{

    actualizarModuloVentas();

},5000);

function exportarVentas(){

    const datos = JSON.stringify(

        ventas,

        null,

        2

    );

    const archivo = new Blob(

        [datos],

        {

            type:"application/json"

        }

    );

    const url =

    URL.createObjectURL(

        archivo

    );

    const enlace =

    document.createElement("a");

    enlace.href = url;

    enlace.download =

    "ventas.json";

    enlace.click();

    URL.revokeObjectURL(url);

}



// ==========================================
// INICIAR MÓDULO
// ==========================================

document.addEventListener(

"DOMContentLoaded",

()=>{

    cargarPedidosVentas();

});

window.verVenta =
verVenta;

window.cargarVentas =
cargarVentas;

window.actualizarModuloVentas =
actualizarModuloVentas;

window.exportarVentas =
exportarVentas;

window.imprimirDetalleVenta =
()=>window.print();