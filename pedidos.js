let pedidos =
JSON.parse(
localStorage.getItem("pedidos")
) || [];

let inventario =
JSON.parse(
localStorage.getItem("inventario")
) || [];

let detallePedido = [];


const tablaPedidos =
document.getElementById(
"tablaPedidos"
);
const seccionClientesPedidos=document.getElementById("seccionClientesPedidos");
const tablaClientesPedidos=document.getElementById("tablaClientesPedidos");
const mensajeClientesPedidos=document.getElementById("mensajeClientesPedidos");
const formEditarClientePedidos=document.getElementById("formEditarClientePedidos");
const guardarClientePedidos=document.getElementById("guardarClientePedidos");
let clientesPedidos=[];
const avisoPedidoWeb=document.getElementById("avisoPedidoWeb");
const mensajeAsignacionDelivery=document.getElementById("mensajeAsignacionDelivery");
let repartidoresDelivery=[];
let repartidoresDeliveryCargados=false;
let pedidosCargadosDesdeServidor=false;
let pedidosWebConocidos=new Set(JSON.parse(localStorage.getItem("pedidosWebConocidos") || "[]").map(String));

function escaparHtmlPanel(valor){
    return String(valor ?? "").replace(/[&<>"']/g,caracter=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[caracter]);
}

function configurarValidacionNombre(campo){
    const limpiar=()=>{
        campo.value=campo.value.replace(/[^\p{L}\p{M}\s.'’-]/gu,"").slice(0,Number(campo.maxLength)||120);
        campo.setCustomValidity(/[\p{L}]/u.test(campo.value.trim()) ? "" : "Ingresa un nombre con letras.");
    };
    campo.addEventListener("input",limpiar);
    limpiar();
}

function configurarValidacionTelefono(campo,{requerido=true}={}){
    const validar=()=>{
        campo.value=campo.value.replace(/[^0-9+().\s-]/g,"").trim().slice(0,30);
        const digitos=campo.value.replace(/\D/g,"").length;
        const formatoValido=/^\+?[0-9\s().-]+$/.test(campo.value);
        campo.setCustomValidity(!campo.value.trim()&&!requerido || formatoValido&&digitos>=7&&digitos<=15
            ? ""
            : "El teléfono debe contener entre 7 y 15 dígitos.");
    };
    campo.addEventListener("input",validar);
    validar();
}

configurarValidacionNombre(document.getElementById("clientePedido"));
configurarValidacionNombre(document.getElementById("nombreFiscalPedido"));
configurarValidacionNombre(document.getElementById("nombreClientePedidos"));
configurarValidacionTelefono(document.getElementById("telefonoPedido"));
configurarValidacionTelefono(document.getElementById("telefonoClientePedidos"),{requerido:false});

const campoNitCiPedido=document.getElementById("nitCiPedido");
campoNitCiPedido.addEventListener("input",()=>{
    campoNitCiPedido.value=campoNitCiPedido.value.replace(/[^0-9-]/g,"").slice(0,30);
    campoNitCiPedido.setCustomValidity(/[0-9]/.test(campoNitCiPedido.value) ? "" : "El NIT o CI debe contener números.");
});

async function cargarRepartidoresDelivery(){
    if(localStorage.getItem("usuarioRol")!=="Administrador")return false;
    if(repartidoresDeliveryCargados)return true;
    try{
        const respuesta=await fetch("api.php?action=repartidores_delivery",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudieron cargar los repartidores.");
        repartidoresDelivery=(datos.repartidores||[]).map(repartidor=>({...repartidor,id:Number(repartidor.id)}));
        repartidoresDeliveryCargados=true;
        mensajeAsignacionDelivery.classList.add("d-none");
        return true;
    }catch(error){
        mensajeAsignacionDelivery.textContent=error.message;
        mensajeAsignacionDelivery.className="alert alert-danger";
        return false;
    }
}

function controlesAsignacionDelivery(pedido){
    if(localStorage.getItem("usuarioRol")!=="Administrador"||pedido.tipo_entrega!=="Delivery"||["Entregado","Cancelado"].includes(pedido.estado))return "";
    const asignadoId=pedido.repartidor_id==null?null:Number(pedido.repartidor_id);
    const opciones=repartidoresDelivery.map(repartidor=>`<option value="${repartidor.id}" ${repartidor.id===asignadoId?"selected":""}>${escaparHtmlPanel(repartidor.nombre)}</option>`).join("");
    const repartidorNoDisponible=asignadoId!==null&&!repartidoresDelivery.some(repartidor=>repartidor.id===asignadoId)
        ? `<option value="${asignadoId}" selected>${escaparHtmlPanel(pedido.nombre_repartidor||`Repartidor #${asignadoId}`)} (no disponible)</option>`
        : "";
    const mensaje=repartidoresDelivery.length
        ? `Asignado: ${escaparHtmlPanel(pedido.nombre_repartidor||"Sin asignar")}`
        : "No hay repartidores activos.";
    return `<div class="mt-2 d-flex flex-wrap align-items-center gap-1"><select class="form-select form-select-sm pedido-repartidor-select" aria-label="Asignar repartidor al pedido ${Number(pedido.id)}" data-repartidor-pedido="${Number(pedido.id)}"><option value="">Sin asignar</option>${opciones}${repartidorNoDisponible}</select><button type="button" class="btn btn-outline-primary btn-sm" onclick="asignarRepartidorDelivery(${Number(pedido.id)})">Guardar</button><small class="w-100 text-secondary">${mensaje}</small></div>`;
}

function mostrarOrigenCliente(origen){
    if(origen==="pagina_cliente") return '<span class="badge bg-primary">Registro web cliente</span>';
    if(origen==="empleado") return '<span class="badge bg-success">Registro web administrativo</span>';
    return '<span class="badge bg-secondary">Registro anterior (sin dato)</span>';
}

async function cargarClientesPedidos(){
    tablaClientesPedidos.innerHTML='<tr><td colspan="7" class="text-center text-secondary py-4">Cargando clientes...</td></tr>';
    mensajeClientesPedidos.className="alert d-none";
    try{
        const respuesta=await fetch("api.php?action=clientes");
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudieron cargar los clientes.");
        clientesPedidos=datos.clientes;
        if(!datos.clientes.length){
            tablaClientesPedidos.innerHTML='<tr><td colspan="7" class="text-center text-secondary py-4">Todavía no hay clientes registrados.</td></tr>';
            return true;
        }
        tablaClientesPedidos.innerHTML=datos.clientes.map(cliente=>`
            <tr>
                <td>${Number(cliente.id)}</td>
                <td>${escaparHtmlPanel(cliente.nombre)}</td>
                <td>${escaparHtmlPanel(cliente.correo || "—")}</td>
                <td>${escaparHtmlPanel(cliente.telefono || "—")}</td>
                <td>${mostrarOrigenCliente(cliente.origen_registro)}</td>
                <td>${escaparHtmlPanel(cliente.creado_en || "—")}</td>
                <td><button class="btn btn-sm btn-outline-primary" type="button" data-editar-cliente-pedidos="${Number(cliente.id)}"><i class="bi bi-pencil me-1"></i>Editar</button></td>
            </tr>
        `).join("");
        return true;
    }catch(error){
        tablaClientesPedidos.innerHTML='<tr><td colspan="7" class="text-center text-danger py-4">No se pudieron cargar los clientes.</td></tr>';
        mensajeClientesPedidos.textContent=error.message || "No se pudieron cargar los clientes.";
        mensajeClientesPedidos.className="alert alert-danger";
        return false;
    }
}

function cancelarEdicionClientePedidos(){
    formEditarClientePedidos.reset();
    document.getElementById("idClientePedidos").value="";
    formEditarClientePedidos.hidden=true;
}

tablaClientesPedidos.addEventListener("click",evento=>{
    const boton=evento.target.closest("[data-editar-cliente-pedidos]");
    if(!boton) return;
    const cliente=clientesPedidos.find(item=>Number(item.id)===Number(boton.dataset.editarClientePedidos));
    if(!cliente) return;
    document.getElementById("idClientePedidos").value=cliente.id;
    document.getElementById("nombreClientePedidos").value=cliente.nombre || "";
    document.getElementById("correoClientePedidos").value=cliente.correo || "";
    document.getElementById("telefonoClientePedidos").value=cliente.telefono || "";
    formEditarClientePedidos.hidden=false;
    formEditarClientePedidos.scrollIntoView({behavior:"smooth",block:"center"});
});

formEditarClientePedidos.addEventListener("submit",async evento=>{
    evento.preventDefault();
    guardarClientePedidos.disabled=true;
    mensajeClientesPedidos.className="alert d-none";
    try{
        const respuesta=await fetch("api.php?action=editar_cliente",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                id:Number(document.getElementById("idClientePedidos").value),
                nombre:document.getElementById("nombreClientePedidos").value.trim(),
                correo:document.getElementById("correoClientePedidos").value.trim(),
                telefono:document.getElementById("telefonoClientePedidos").value.trim()
            })
        });
        const resultado=await respuesta.json();
        if(!respuesta.ok || !resultado.ok) throw new Error(resultado.mensaje || "No se pudo actualizar el cliente.");
        cancelarEdicionClientePedidos();
        mensajeClientesPedidos.textContent=resultado.mensaje || "Cliente actualizado correctamente.";
        mensajeClientesPedidos.className="alert alert-success";
        if(!await cargarClientesPedidos()) return;
        mensajeClientesPedidos.textContent=resultado.mensaje || "Cliente actualizado correctamente.";
        mensajeClientesPedidos.className="alert alert-success";
    }catch(error){
        mensajeClientesPedidos.textContent=error.message || "No se pudo actualizar el cliente.";
        mensajeClientesPedidos.className="alert alert-danger";
    }finally{
        guardarClientePedidos.disabled=false;
    }
});

document.getElementById("cancelarEdicionClientePedidos").addEventListener("click",cancelarEdicionClientePedidos);
document.getElementById("actualizarClientesPedidos").addEventListener("click",cargarClientesPedidos);

const productoPedido =
document.getElementById(
"productoPedido"
);

const cantidadPedido =
document.getElementById(
"cantidadPedido"
);

const precioPedido =
document.getElementById(
"precioPedido"
);

const categoriasInventario=["Tortas","Espressos","Frappes","Bubbas","Crepes","Pasteleria","Paninis","Combos","Otros"];

const detalleTabla =
document.getElementById(
"detallePedido"
);

const totalPedido =
document.getElementById(
"totalPedido"
);
function guardarPedidos(){

    localStorage.setItem(

        "pedidos",

        JSON.stringify(pedidos)

    );

}

function cargarProductosPedido(){

    if(!productoPedido){

        return;

    }

    productoPedido.replaceChildren(new Option("Seleccione un producto", ""));
    categoriasInventario.forEach(categoria=>{
        const grupo=document.createElement("optgroup");
        grupo.label=categoria==="Pasteleria" ? "Pastelería" : categoria;
        inventario.filter(producto=>(producto.categoria || "Otros")===categoria).forEach(producto=>{
            const reservado=detallePedido.find(item=>Number(item.id)===Number(producto.id));
            const disponible=Number(producto.stock)-Number(reservado?.cantidad || 0);
            grupo.appendChild(new Option(
                `${producto.nombre} (${disponible} disponibles${disponible<1 ? " — agotado" : ""})`,
                String(producto.id)
            ));
        });
        if(grupo.children.length){
            productoPedido.appendChild(grupo);
        }
    });

}

if(productoPedido){

    productoPedido.addEventListener(
    "change",
    mostrarPrecioProducto
    );

}

function mostrarPrecioProducto(){

    const id =
    Number(
    productoPedido.value
    );

    const producto =
    inventario.find(item=>

        item.id===id

    );

    if(!producto){

        precioPedido.value="";

        return;

    }

    precioPedido.value =
    producto.precio+" Bs.";

}
const botonAgregar =
document.getElementById(
"agregarProductoPedido"
);

if(botonAgregar){

    botonAgregar.addEventListener(
    "click",
    agregarProductoPedido
    );

}

function agregarProductoPedido(){

    const id =
    Number(
    productoPedido.value
    );

    const cantidad =
    Number(
    cantidadPedido.value
    );

    if(!id){

        alert(
        "Seleccione un producto."
        );

        return;

    }

    if(cantidad<=0){

        alert(
        "Ingrese una cantidad válida."
        );

        return;

    }

    const producto =
    inventario.find(item=>

        item.id===id

    );

    if(!producto){

        return;

    }

    if(cantidad>producto.stock){

        alert(
        "No existe suficiente stock."
        );

        return;

    }

    const existe =
    detallePedido.find(item=>

        item.id===id

    );

    if(existe){

        if(

            existe.cantidad
            +
            cantidad

            >

            producto.stock

        ){

            alert(
            "No existe suficiente stock."
            );

            return;

        }

        existe.cantidad +=
        cantidad;

    }

    else{

        detallePedido.push({

            id:producto.id,

            nombre:producto.nombre,

            precio:producto.precio,

            cantidad:cantidad

        });

    }

    actualizarDetallePedido();

    productoPedido.value="";

    cantidadPedido.value=1;

    precioPedido.value="";

}

function actualizarDetallePedido(){

    detalleTabla.innerHTML="";

    let total=0;

    if(detallePedido.length===0){

        detalleTabla.innerHTML=`

        <tr>

        <td
        colspan="5"
        class="text-center text-secondary">

        Todavía no se agregaron productos.

        </td>

        </tr>

        `;

        totalPedido.textContent=
        "0 Bs.";
        cargarProductosPedido();

        return;

    }

    detallePedido.forEach(producto=>{

        const subtotal =

        producto.precio *

        producto.cantidad;

        total += subtotal;

        detalleTabla.innerHTML +=`

<tr>

<td>

${producto.nombre}

</td>

<td>

<input class="form-control form-control-sm cantidad-detalle" type="number" min="1" value="${producto.cantidad}" data-id="${producto.id}" style="max-width:90px;">

</td>

<td>

${producto.precio} Bs.

</td>

<td>

${subtotal} Bs.

</td>

<td>

<button

class="btn btn-danger btn-sm"

onclick="quitarProductoPedido(${producto.id})">

<i class="bi bi-trash me-1"></i>Quitar

</button>

</td>

</tr>

`;

    });

    detalleTabla.querySelectorAll(".cantidad-detalle").forEach(input=>{
        input.addEventListener("change",()=>editarCantidadPedido(Number(input.dataset.id),Number(input.value)));
    });

    totalPedido.textContent=

    total+" Bs.";
    cargarProductosPedido();

}

function editarCantidadPedido(id,cantidad){
    const detalle=detallePedido.find(item=>Number(item.id)===id);
    const producto=inventario.find(item=>Number(item.id)===id);
    if(!detalle || !producto){
        return;
    }
    if(!Number.isInteger(cantidad) || cantidad<1 || cantidad>Number(producto.stock)){
        alert(`La cantidad máxima disponible es ${producto.stock}.`);
        actualizarDetallePedido();
        return;
    }
    detalle.cantidad=cantidad;
    actualizarDetallePedido();
}

function quitarProductoPedido(id){

    detallePedido =

    detallePedido.filter(item=>

        item.id!==id

    );

    actualizarDetallePedido();
    cargarProductosPedido();

}

function sincronizarInventarioPedido(){
    return fetch("api.php?action=productos",{cache:"no-store"})
        .then(async respuesta=>{
            const datos=await respuesta.json();
            if(!respuesta.ok || !datos.productos) throw new Error(datos.mensaje || "No se pudo actualizar el inventario.");
            inventario=datos.productos.map(producto=>({
                ...producto,
                id:Number(producto.id),
                precio:Number(producto.precio),
                stock:Number(producto.stock),
                categoria:categoriasInventario.includes(producto.categoria) ? producto.categoria : "Otros"
            }));
            localStorage.setItem("inventario",JSON.stringify(inventario));
            cargarProductosPedido();
            mostrarPrecioProducto();
        })
        .catch(error=>{
            console.error("No se pudo sincronizar el inventario del servidor:",error);
        });
}

window.addEventListener("inventarioActualizado",sincronizarInventarioPedido);
window.addEventListener("focus",sincronizarInventarioPedido);
document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") sincronizarInventarioPedido();
});
window.addEventListener("storage",event=>{
    if(event.key==="inventario") sincronizarInventarioPedido();
});
window.setInterval(()=>{
    if(document.visibilityState==="visible") sincronizarInventarioPedido();
},15000);

const botonGuardar =
document.getElementById(
"guardarPedido"
);

if(botonGuardar){

    botonGuardar.addEventListener(
    "click",
    guardarPedido
    );

}

async function guardarPedido(){

    const cliente =
    document.getElementById(
    "clientePedido"
    ).value.trim();

    const telefono =
    document.getElementById(
    "telefonoPedido"
    ).value.trim();

    if(cliente===""){

        alert(
        "Ingrese el nombre del cliente."
        );

        return;

    }

    if(telefono===""){

        alert(
        "Ingrese el teléfono."
        );

        return;

    }

    const nombreFiscal=document.getElementById("nombreFiscalPedido").value.trim();
    const nitCi=document.getElementById("nitCiPedido").value.trim();
    const direccionFiscal=document.getElementById("direccionFiscalPedido").value.trim();
    const metodoPago=document.getElementById("metodoPagoPedido").value;
    const camposValidados=[
        document.getElementById("clientePedido"),
        document.getElementById("telefonoPedido"),
        document.getElementById("nombreFiscalPedido"),
        document.getElementById("nitCiPedido")
    ];
    const campoInvalido=camposValidados.find(campo=>!campo.checkValidity());
    if(campoInvalido){
        campoInvalido.reportValidity();
        return;
    }

    if(detallePedido.length===0){

        alert(
        "Debe agregar al menos un producto."
        );

        return;

    }

    let total = 0;

    detallePedido.forEach(producto=>{

        total +=

        producto.precio *

        producto.cantidad;

    });

    const montoPago=Number(document.getElementById("montoPagoPedido").value);
    if(nombreFiscal==="" || nitCi===""){
        alert("Ingrese el nombre y NIT/CI para la factura.");
        return;
    }
    if(!Number.isFinite(montoPago) || montoPago<total){
        alert("El monto pagado debe cubrir el total del pedido.");
        return;
    }

    const pedido={

        id:Date.now(),

        cliente:cliente,

        telefono:telefono,

        productos:[...detallePedido],

        total:total,

        estado:"Pendiente",

        fecha:new Date().toLocaleDateString(),
        factura:{nombre:nombreFiscal,nit_ci:nitCi,direccion:direccionFiscal},
        pago:{metodo:metodoPago,monto:montoPago,estado:"Pagado"}

    };

    try{
        const respuesta=await fetch("api.php?action=crear_pedido",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({cliente,telefono,productos:detallePedido,factura:{nombre:nombreFiscal,nit_ci:nitCi,direccion:direccionFiscal},pago:{metodo:metodoPago,monto:montoPago}})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok){
            throw new Error(datos.mensaje || "No se pudo guardar el pedido.");
        }
        pedido.id=datos.id;
        pedido.factura.id=datos.factura.id;
        pedido.factura.numero=datos.factura.numero;
    }
    catch(error){
        alert(error.message);
        return;
    }

    pedidos.push(pedido);

    detallePedido.forEach(item=>{

        const producto =
        inventario.find(p=>

            p.id===item.id

        );

        if(producto){

            producto.stock -=

            item.cantidad;

            if(producto.stock<0){

                producto.stock=0;

            }

            producto.estado=

            producto.stock>0

            ?

            "Disponible"

            :

            "Agotado";

        }

    });
    guardarPedidos();

    localStorage.setItem(

        "inventario",

        JSON.stringify(inventario)

    );

    await sincronizarInventarioPedido();

    detallePedido=[];

    actualizarDetallePedido();

    document.getElementById(
    "clientePedido"
    ).value="";

    document.getElementById(
    "telefonoPedido"
    ).value="";

    productoPedido.value="";

    cantidadPedido.value=1;

    precioPedido.value="";

    cargarProductosPedido();

    mostrarPedidos();

    modalPedido.hide();

    mostrarFactura(pedido);

    alert(

    "Pedido registrado correctamente."

    );

}

function mostrarFactura(pedido){
    const factura=pedido.factura || {};
    document.getElementById("facturaNumero").textContent=pedido.estado_emision || "Pendiente SIAT";
    document.getElementById("facturaPedido").textContent=`#${Number(pedido.id)}`;
    document.getElementById("facturaFecha").textContent=pedido.fecha || "";
    document.getElementById("facturaCliente").textContent=pedido.cliente || "";
    document.getElementById("facturaTelefono").textContent=pedido.telefono || "—";
    document.getElementById("facturaNombreFiscal").textContent=factura.nombre || "";
    document.getElementById("facturaNitCi").textContent=factura.nit_ci || "";
    document.getElementById("facturaDireccion").textContent=factura.direccion || "-";
    document.getElementById("facturaMetodoPago").textContent=`${pedido.pago?.metodo || ""} - ${pedido.pago?.monto || pedido.total} Bs.`;
    document.getElementById("facturaTotal").textContent=`${Number(pedido.total || 0).toFixed(2)} Bs.`;
    const productos=pedido.productos || [];
    document.getElementById("facturaCantidadItems").textContent=productos.reduce((total,producto)=>total+(Number(producto.cantidad)||0),0);
    document.getElementById("facturaProductos").innerHTML=productos.map(producto=>{
        const cantidad=Number(producto.cantidad)||0;
        const precio=Number(producto.precio)||0;
        return `<tr><td>${escaparHtmlPanel(producto.nombre)}</td><td class="factura-numero">${cantidad}</td><td class="factura-numero">${precio.toFixed(2)} Bs.</td><td class="factura-numero">${(precio*cantidad).toFixed(2)} Bs.</td></tr>`;
    }).join("");
    if(window.modalFactura) window.modalFactura.show();
}

function verFactura(id){
    const pedido=pedidos.find(item=>String(item.id)===String(id));
    if(pedido) mostrarFactura(pedido);
}

async function cargarPedidosServidor(notificarNuevos=false){
    try{
        await cargarRepartidoresDelivery();
        const respuesta=await fetch("api.php?action=pedidos");
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudieron actualizar los pedidos.");
        const nuevos=datos.pedidos.map(pedido=>({...pedido,
            id:Number(pedido.id),
            total:Number(pedido.total),
            origen:pedido.origen || "Panel",
            factura:{numero:pedido.factura_numero,nombre:pedido.nombre_fiscal,nit_ci:pedido.nit_ci,direccion:pedido.direccion_fiscal},
            pago:{metodo:pedido.metodo_pago,monto:Number(pedido.monto_pago||0),estado:pedido.estado_pago},
            tiene_comprobante_qr:Boolean(Number(pedido.tiene_comprobante_qr)),
            repartidor_id:pedido.repartidor_id==null?null:Number(pedido.repartidor_id),
            comprobante_enviado:Boolean(Number(pedido.comprobante_enviado))
        }));
        const idsWebActuales=new Set(nuevos.filter(pedido=>pedido.origen==="Web").map(pedido=>String(pedido.id)));
        if(pedidosCargadosDesdeServidor && notificarNuevos){
            const entrantes=nuevos.filter(pedido=>pedido.origen==="Web" && !pedidosWebConocidos.has(String(pedido.id)));
            if(entrantes.length){
                avisoPedidoWeb.textContent=entrantes.length===1 ? `Nuevo pedido web #${entrantes[0].id} de ${entrantes[0].cliente}. Ya aparece en los pedidos registrados.` : `Hay ${entrantes.length} nuevos pedidos web confirmados. Ya aparecen en los pedidos registrados.`;
                avisoPedidoWeb.classList.remove("d-none");
                if("Notification" in window && Notification.permission==="granted"){
                    new Notification("Dulce Vita: pedido web entrante",{body:entrantes.length===1 ? `Pedido #${entrantes[0].id} de ${entrantes[0].cliente}` : `${entrantes.length} pedidos web nuevos`});
                }
            }
        }
        pedidosWebConocidos=idsWebActuales;
        localStorage.setItem("pedidosWebConocidos",JSON.stringify([...pedidosWebConocidos]));
        pedidosCargadosDesdeServidor=true;
        pedidos=nuevos;
        localStorage.setItem("pedidos",JSON.stringify(pedidos));
        const filtro=filtroEstado?.value || "";
        const busqueda=buscarPedido?.value.trim().toLowerCase() || "";
        const listaVisible=pedidos.filter(pedido=>(!filtro || pedido.estado===filtro) && (!busqueda || pedido.cliente.toLowerCase().includes(busqueda)));
        if(filtro || busqueda){
            mostrarPedidosFiltrados(listaVisible);
        }else{
            mostrarPedidos();
        }
        window.dispatchEvent(new Event("pedidosActualizados"));
    }catch(error){
        console.error(error);
    }
}

function controlesEstadoPedido(pedido){
    if(["Entregado","Cancelado"].includes(pedido.estado)){
        return `<span class="text-secondary">${escaparHtmlPanel(pedido.estado)}</span>`;
    }
    const estados=["Pendiente","Preparando","Entregado","Cancelado"];
    const opciones=estados.map(estado=>{
        const bloqueado=estado==="Entregado" && pedido.origen==="Web" && pedido.pago?.estado!=="Pagado";
        return `<option value="${estado}" ${estado===pedido.estado?"selected":""} ${bloqueado?"disabled":""}>${estado==="Cancelado"?"Cancelar pedido":estado}${bloqueado?" (pago pendiente)":""}</option>`;
    }).join("");
    return `<select class="form-select form-select-sm pedido-estado-select" aria-label="Cambiar estado del pedido ${Number(pedido.id)}" onchange="cambiarEstado(${Number(pedido.id)},this.value)">${opciones}</select>`;
}

function controlPagoEfectivoRetiro(pedido){
    if(pedido.origen!=="Web" || pedido.tipo_entrega!=="Retiro" || pedido.pago?.metodo!=="Efectivo"
        || pedido.pago?.estado!=="Pendiente" || !["Administrador","Vendedor"].includes(localStorage.getItem("usuarioRol"))){
        return "";
    }
    return `<button class="btn btn-success btn-sm" type="button" onclick="registrarPagoEfectivoRetiro(${Number(pedido.id)})" title="Registrar pago en efectivo recibido en tienda"><i class="bi bi-cash-coin"></i></button>`;
}

function accionesPedido(pedido){
    const id=Number(pedido.id);
    const esFinalizado=pedido.estado==="Entregado";
    const esWeb=pedido.origen==="Web";
    const rol=localStorage.getItem("usuarioRol");
    const enviarComprobante=esWeb
        ? `<li><button class="dropdown-item" type="button" onclick="enviarComprobanteCliente(${id})"><i class="bi bi-bell me-2"></i>${pedido.comprobante_enviado?"Reenviar comprobante":"Enviar comprobante"}</button></li>`
        : "";
    const itemsFinalizados=`<li><button class="dropdown-item" type="button" onclick="verFactura(${id})"><i class="bi bi-receipt me-2"></i>Ver factura</button></li>${enviarComprobante}`;
    if(esFinalizado){
        return `<div class="dropdown pedido-acciones">
            <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false"><i class="bi bi-three-dots me-1"></i>Acciones</button>
            <ul class="dropdown-menu dropdown-menu-end">${itemsFinalizados}</ul>
        </div>`;
    }
    if(pedido.estado==="Cancelado"){
        return `<div class="dropdown pedido-acciones">
            <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false"><i class="bi bi-three-dots me-1"></i>Acciones</button>
            <ul class="dropdown-menu dropdown-menu-end">${itemsFinalizados}<li><hr class="dropdown-divider"></li><li><button class="dropdown-item text-danger" type="button" onclick="eliminarPedido(${id})"><i class="bi bi-trash me-2"></i>Eliminar pedido</button></li></ul>
        </div>`;
    }
    const verificarQr=esWeb && pedido.pago?.metodo==="QR" && pedido.pago?.estado==="Pendiente" && rol==="Administrador"
        ? `<li><button class="dropdown-item" type="button" onclick="confirmarPagoPedido(${id})"><i class="bi bi-qr-code-scan me-2"></i>Verificar pago QR</button></li>`
        : "";
    const comprobanteQr=esWeb && pedido.pago?.metodo==="QR" && pedido.tiene_comprobante_qr
        ? `<li><a class="dropdown-item" href="api.php?action=ver_comprobante_qr&amp;pedido_id=${id}" target="_blank" rel="noopener"><i class="bi bi-image me-2"></i>Ver comprobante QR</a></li>`
        : "";
    const asignacion=controlesAsignacionDelivery(pedido);
    const controlEstado=controlesEstadoPedido(pedido);
    return `<div class="dropdown pedido-acciones">
        <button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false"><i class="bi bi-three-dots me-1"></i>Acciones</button>
        <ul class="dropdown-menu dropdown-menu-end">
            <li><button class="dropdown-item" type="button" onclick="verFactura(${id})"><i class="bi bi-receipt me-2"></i>Ver factura</button></li>
            ${verificarQr}
            ${controlPagoEfectivoRetiro(pedido) ? `<li><button class="dropdown-item" type="button" onclick="registrarPagoEfectivoRetiro(${id})"><i class="bi bi-cash-coin me-2"></i>Registrar efectivo</button></li>` : ""}
            ${comprobanteQr}
            ${enviarComprobante}
            ${asignacion ? `<li><div class="pedido-acciones-asignacion">${asignacion}</div></li>` : ""}
            <li><div class="pedido-acciones-estado"><label for="estadoPedido${id}">Estado del pedido</label>${controlEstado.replace('class="form-select form-select-sm pedido-estado-select"','class="form-select form-select-sm pedido-estado-select" id="estadoPedido'+id+'"')}</div></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" type="button" onclick="eliminarPedido(${id})"><i class="bi bi-trash me-2"></i>Eliminar pedido</button></li>
        </ul>
    </div>`;
}

document.addEventListener("show.bs.dropdown",evento=>{
    const contenedor=evento.target.closest(".table-responsive");
    if(contenedor) contenedor.classList.add("pedido-acciones-abierto");
});

document.addEventListener("hidden.bs.dropdown",evento=>{
    const contenedor=evento.target.closest(".table-responsive");
    if(contenedor) contenedor.classList.remove("pedido-acciones-abierto");
});

function mostrarPedidos(){

    if(!tablaPedidos){

        return;

    }

    tablaPedidos.innerHTML="";

    if(pedidos.length===0){

        tablaPedidos.innerHTML=`

        <tr>

        <td colspan="7" class="text-center py-5">

        <i class="bi bi-cart-x"
        style="font-size:60px;color:#C9A45C;"></i>

        <br><br>

        <h5 style="color:#6B2635;">

        No existen pedidos registrados

        </h5>

        </td>

        </tr>

        `;

        return;

    }

    pedidos.forEach(pedido=>{

        let color="secondary";

        if(pedido.estado==="Pendiente") color="warning";

        if(pedido.estado==="Preparando") color="primary";

        if(pedido.estado==="Entregado") color="success";

        if(pedido.estado==="Cancelado") color="danger";

        tablaPedidos.innerHTML +=`

<tr>

<td>${pedido.id}</td>

<td>${escaparHtmlPanel(pedido.cliente)} ${pedido.origen==="Web" ? '<span class="badge bg-info text-dark">Web</span>' : ''}</td>

<td>${escaparHtmlPanel(pedido.telefono)}</td>

<td>${pedido.total} Bs.${pedido.origen==="Web" ? `<br><span class="badge ${pedido.pago?.estado==="Pagado" ? "bg-success" : "bg-warning text-dark"}">Pago ${escaparHtmlPanel(pedido.pago?.estado || "Pendiente")}</span><br><small>${escaparHtmlPanel(pedido.tipo_entrega||"Retiro")}${pedido.tipo_entrega==="Delivery" ? ` · ${escaparHtmlPanel(pedido.zona_entrega||"")}` : ""}</small>` : ''}</td>

<td>

<span class="badge bg-${color}">

${pedido.estado}

</span>

</td>

<td>${pedido.fecha}</td>

<td class="text-center">

${accionesPedido(pedido)}

</td>

</tr>

`;

    });

}

async function enviarComprobanteCliente(id){
    const pedido=pedidos.find(item=>Number(item.id)===Number(id));
    if(!pedido||pedido.origen!=="Web")return;
    try{
        const respuesta=await fetch("api.php?action=enviar_comprobante_cliente",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({pedido_id:Number(id)})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo enviar el comprobante.");
        alert(datos.mensaje);
        await cargarPedidosServidor(false);
    }catch(error){
        alert(error.message);
    }
}

async function asignarRepartidorDelivery(pedidoId){
    if(localStorage.getItem("usuarioRol")!=="Administrador")return;
    const selector=document.querySelector(`[data-repartidor-pedido="${Number(pedidoId)}"]`);
    if(!selector)return;
    try{
        if(!await cargarRepartidoresDelivery())throw new Error("No se pudieron cargar los repartidores; inténtalo nuevamente.");
        const respuesta=await fetch("api.php?action=asignar_repartidor_delivery",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({pedido_id:Number(pedidoId),repartidor_id:selector.value?Number(selector.value):null})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo asignar el pedido.");
        mensajeAsignacionDelivery.textContent=datos.mensaje;
        mensajeAsignacionDelivery.className="alert alert-success";
        await cargarPedidosServidor(false);
    }catch(error){
        mensajeAsignacionDelivery.textContent=error.message;
        mensajeAsignacionDelivery.className="alert alert-danger";
    }
}

function confirmarPagoPedido(id){
    const pedido=pedidos.find(item=>Number(item.id)===Number(id));
    if(!pedido || pedido.pago?.metodo!=="QR" || pedido.pago?.estado==="Pagado"){
        alert("La verificación manual solo está disponible para pagos QR pendientes.");
        return;
    }
    const formulario=document.getElementById("formConfirmarPagoQr");
    formulario.reset();
    formulario.dataset.pedidoId=String(Number(id));
    document.getElementById("pedidoConfirmarPagoQr").textContent=`Pedido #${Number(id)}`;
    document.getElementById("errorConfirmarPagoQr").className="alert alert-danger d-none";
    window.modalConfirmarPagoQr.show();
}

async function registrarPagoEfectivoRetiro(id){
    const pedido=pedidos.find(item=>Number(item.id)===Number(id));
    if(!pedido || pedido.origen!=="Web" || pedido.tipo_entrega!=="Retiro"
        || pedido.pago?.metodo!=="Efectivo" || pedido.pago?.estado!=="Pendiente"){
        alert("Esta acción solo está disponible para pedidos web de retiro con pago en efectivo pendiente.");
        return;
    }
    const montoCobrado=Number(pedido.pago?.monto ?? pedido.total);
    if(!confirm(`¿Confirmas que recibiste ${montoCobrado.toFixed(2)} Bs. en efectivo del cliente para el pedido #${Number(id)}?`)){
        return;
    }
    try{
        const respuesta=await fetch("api.php?action=registrar_pago_efectivo_retiro",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({pedido_id:Number(id)})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo registrar el pago en efectivo.");
        await cargarPedidosServidor(false);
        alert(datos.mensaje);
    }catch(error){
        alert(error.message || "No se pudo registrar el pago en efectivo.");
    }
}

document.getElementById("formConfirmarPagoQr").addEventListener("submit",async evento=>{
    evento.preventDefault();
    const formulario=evento.currentTarget;
    const boton=formulario.querySelector('[type="submit"]');
    const error=document.getElementById("errorConfirmarPagoQr");
    boton.disabled=true;
    error.className="alert alert-danger d-none";
    try{
        const respuesta=await fetch("api.php?action=confirmar_pago_pedido",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                pedido_id:Number(formulario.dataset.pedidoId),
                codigo_transaccion:document.getElementById("codigoTransaccionQr").value.trim()
            })
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo validar el pago QR.");
        window.modalConfirmarPagoQr.hide();
        await cargarPedidosServidor(false);
        alert(datos.mensaje);
    }catch(errorPeticion){
        error.textContent=errorPeticion.message;
        error.className="alert alert-danger";
    }finally{
        boton.disabled=false;
    }
});

async function cambiarEstado(id,nuevoEstado){
    const pedido=pedidos.find(item=>Number(item.id)===Number(id));
    if(!pedido || !["Pendiente","Preparando","Entregado","Cancelado"].includes(nuevoEstado)) return;
    if(nuevoEstado===pedido.estado){
        await cargarPedidosServidor(false);
        return;
    }
    if(nuevoEstado==="Cancelado"){
        const reembolso=pedido.pago?.estado==="Pagado"
            ? " El sistema no procesa reembolsos; si el pedido ya fue pagado, gestiona la devolución por separado."
            : "";
        if(!confirm(`¿Cancelar el pedido #${Number(id)}?${reembolso}`)){
            await cargarPedidosServidor(false);
            return;
        }
    }
    try{
        const respuesta=await fetch("api.php?action=cambiar_estado",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({id:Number(id),estado:nuevoEstado})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo actualizar el estado.");
        await cargarPedidosServidor(false);
        if(nuevoEstado==="Cancelado" && pedido.pago?.estado==="Pagado" && datos.mensaje){
            alert(datos.mensaje);
        }
    }catch(error){
        alert(error.message || "No se pudo actualizar el pedido.");
        await cargarPedidosServidor(false);
    }
}

function eliminarPedido(id){

    if(

        !confirm(

        "¿Desea eliminar este pedido?"

        )

    ){

        return;

    }

    pedidos=

    pedidos.filter(p=>

        p.id!==id

    );

    guardarPedidos();

    mostrarPedidos();

}

const buscarPedido=

document.getElementById(

"buscarPedido"

);

if(buscarPedido){

    buscarPedido.addEventListener(

    "input",

    ()=>{

        const texto=

        buscarPedido.value.toLowerCase();

        const lista=

        pedidos.filter(p=>

            p.cliente

            .toLowerCase()

            .includes(texto)

        );

        mostrarPedidosFiltrados(lista);

    });

}

const filtroEstado=

document.getElementById(

"filtroEstado"

);

if(filtroEstado){

    filtroEstado.addEventListener(

    "change",

    ()=>{

        if(filtroEstado.value===""){

            mostrarPedidos();

            return;

        }

        const lista=

        pedidos.filter(p=>

            p.estado===

            filtroEstado.value

        );

        mostrarPedidosFiltrados(lista);

    });

}

function mostrarPedidosFiltrados(lista){

    tablaPedidos.innerHTML="";

    lista.forEach(pedido=>{

        let color="secondary";

        if(pedido.estado==="Pendiente") color="warning";

        if(pedido.estado==="Preparando") color="primary";

        if(pedido.estado==="Entregado") color="success";

        if(pedido.estado==="Cancelado") color="danger";

        tablaPedidos.innerHTML+=`

<tr>

<td>${pedido.id}</td>

<td>${escaparHtmlPanel(pedido.cliente)} ${pedido.origen==="Web" ? '<span class="badge bg-info text-dark">Web</span>' : ''}</td>

<td>${escaparHtmlPanel(pedido.telefono)}</td>

<td>${pedido.total} Bs.${pedido.origen==="Web" ? `<br><span class="badge ${pedido.pago?.estado==="Pagado" ? "bg-success" : "bg-warning text-dark"}">Pago ${escaparHtmlPanel(pedido.pago?.estado || "Pendiente")}</span>` : ''}</td>

<td>

<span class="badge bg-${color}">

${pedido.estado}

</span>

</td>

<td>${pedido.fecha}</td>

<td class="text-center">

${accionesPedido(pedido)}

</td>

</tr>

`;

    });

}
document.addEventListener(

"DOMContentLoaded",

()=>{

    if(window.esAdministrador?.()){
        seccionClientesPedidos.hidden=false;
        cargarClientesPedidos();
    }
    cargarPedidosServidor(false);
    setInterval(()=>cargarPedidosServidor(true),10000);

    cargarProductosPedido();

    actualizarDetallePedido();

    mostrarPedidos();

});

window.cambiarEstado =
cambiarEstado;

window.asignarRepartidorDelivery=asignarRepartidorDelivery;

window.eliminarPedido =
eliminarPedido;

window.verFactura =
verFactura;