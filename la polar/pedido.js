const formularioPedidoWeb=document.getElementById("formularioPedidoWeb");
const estadoCuentaPedido=document.getElementById("estadoCuentaPedido");
const mensajePedidoWeb=document.getElementById("mensajePedidoWeb");
const metodoPagoWeb=document.getElementById("metodoPagoWeb");
const tipoEntregaWeb=document.getElementById("tipoEntregaWeb");
const camposDeliveryWeb=document.getElementById("camposDeliveryWeb");
const zonaDeliveryWeb=document.getElementById("zonaDeliveryWeb");
const direccionDeliveryWeb=document.getElementById("direccionDeliveryWeb");
const qrPagoWeb=document.getElementById("qrPagoWeb");
const imagenQrPagoWeb=document.getElementById("imagenQrPagoWeb");
const comprobantePagoQrWeb=document.getElementById("comprobantePagoQrWeb");
const totalPedidoWeb=document.getElementById("totalPedidoWeb");
const facturaNombreWeb=document.getElementById("facturaNombreWeb");
const facturaNitWeb=document.getElementById("facturaNitWeb");
let clientePedidoAutenticado=false;
let zonasDeliveryWeb=[];

function validarNombreFacturaWeb(){
    facturaNombreWeb.value=facturaNombreWeb.value.replace(/[^\p{L}\p{M}\s.'’-]/gu,"").slice(0,120);
    facturaNombreWeb.setCustomValidity(/[\p{L}]/u.test(facturaNombreWeb.value.trim()) ? "" : "Ingresa un nombre con letras.");
}

function validarNitFacturaWeb(){
    facturaNitWeb.value=facturaNitWeb.value.replace(/[^0-9-]/g,"").slice(0,30);
    facturaNitWeb.setCustomValidity(/[0-9]/.test(facturaNitWeb.value) ? "" : "El NIT o CI debe contener números.");
}

facturaNombreWeb.addEventListener("input",validarNombreFacturaWeb);
facturaNitWeb.addEventListener("input",validarNitFacturaWeb);
validarNombreFacturaWeb();
validarNitFacturaWeb();

async function cargarCuentaPedido(){
    try{
        const respuesta=await fetch("../api.php?action=cliente_sesion",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo comprobar tu cuenta.");
        clientePedidoAutenticado=Boolean(datos.cliente);
        if(datos.cliente){
            estadoCuentaPedido.textContent=`Pedido para ${datos.cliente.nombre} (${datos.cliente.telefono||"sin teléfono"})`;
            facturaNombreWeb.value=datos.cliente.nombre;
            validarNombreFacturaWeb();
        }else{
            estadoCuentaPedido.replaceChildren(document.createTextNode("Para confirmar, "));
            const enlace=document.createElement("a");
            enlace.href="cuenta.html";
            enlace.textContent="inicia sesión o crea una cuenta";
            estadoCuentaPedido.append(enlace,document.createTextNode("."));
        }
    }catch(error){
        estadoCuentaPedido.textContent=`No se pudo comprobar tu sesión: ${error.message}`;
    }
}

async function cargarOpcionesPagoEntrega(){
    try{
        const respuesta=await fetch("../api.php?action=configuracion_publica",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo cargar la configuración de pagos.");
        const configuracion=datos.configuracion;
        if(configuracion.qr){
            imagenQrPagoWeb.src=configuracion.qr;
            document.querySelector('#metodoPagoWeb option[value="QR"]').disabled=false;
            document.getElementById("avisoQrWeb").textContent="El pago será validado por la tienda o por el repartidor.";
        }else{
            document.querySelector('#metodoPagoWeb option[value="QR"]').disabled=true;
            document.getElementById("avisoQrWeb").textContent="El pago QR no está disponible todavía: la tienda debe cargar su código desde Configuración.";
        }
        zonasDeliveryWeb=Array.isArray(configuracion.zonas_delivery)?configuracion.zonas_delivery:[];
        zonasDeliveryWeb.forEach(zona=>{
            const opcion=document.createElement("option");
            opcion.value=zona.nombre;
            opcion.textContent=`${zona.nombre} · ${Number(zona.costo).toFixed(2)} Bs.`;
            zonaDeliveryWeb.appendChild(opcion);
        });
        const opcionDelivery=tipoEntregaWeb.querySelector('option[value="Delivery"]');
        if(zonasDeliveryWeb.length===0){
            opcionDelivery.disabled=true;
            document.getElementById("avisoDeliveryWeb").textContent="El delivery estará disponible cuando la tienda configure sus zonas y tarifas.";
        }else{
            document.getElementById("avisoDeliveryWeb").textContent="El costo depende de la zona y se suma al total antes de confirmar.";
        }
    }catch(error){
        document.getElementById("avisoQrWeb").textContent=`No se pudo cargar la información de pagos: ${error.message}`;
        document.querySelector('#metodoPagoWeb option[value="QR"]').disabled=true;
        tipoEntregaWeb.querySelector('option[value="Delivery"]').disabled=true;
        document.getElementById("avisoDeliveryWeb").textContent="No se pudo cargar la configuración de delivery.";
    }
}

function actualizarFormularioPago(){
    const esDelivery=tipoEntregaWeb.value==="Delivery";
    camposDeliveryWeb.hidden=!esDelivery;
    zonaDeliveryWeb.required=esDelivery;
    direccionDeliveryWeb.required=esDelivery;
    const esQr=metodoPagoWeb.value==="QR";
    qrPagoWeb.hidden=!esQr;
    comprobantePagoQrWeb.required=esQr;
    const zona=zonasDeliveryWeb.find(item=>item.nombre===zonaDeliveryWeb.value);
    const costo=esDelivery&&zona ? Number(zona.costo) : 0;
    let productos=[];
    try{
        productos=JSON.parse(localStorage.getItem("carrito")||"[]");
    }catch{
        totalPedidoWeb.textContent="El carrito contiene datos inválidos. Vuelve a agregar los productos.";
        return;
    }
    if(!Array.isArray(productos)){
        totalPedidoWeb.textContent="El carrito no tiene un formato válido. Vuelve a agregar los productos.";
        return;
    }
    const subtotal=productos.reduce((suma,producto)=>suma+Number(producto.precio||0)*Number(producto.cantidad||0),0);
    const total=subtotal+costo;
    document.getElementById("total").textContent=`${total.toFixed(2)} Bs.`;
    totalPedidoWeb.textContent=`Subtotal: ${subtotal.toFixed(2)} Bs. · Delivery: ${costo.toFixed(2)} Bs. · Total: ${total.toFixed(2)} Bs.`;
}

tipoEntregaWeb.addEventListener("change",actualizarFormularioPago);
zonaDeliveryWeb.addEventListener("change",actualizarFormularioPago);
metodoPagoWeb.addEventListener("change",actualizarFormularioPago);

formularioPedidoWeb.addEventListener("submit",async evento=>{
    evento.preventDefault();
    if(!formularioPedidoWeb.reportValidity())return;
    if(!clientePedidoAutenticado){
        mensajePedidoWeb.textContent="Inicia sesión o crea una cuenta antes de confirmar el pedido.";
        return;
    }
    let productos;
    try{
        productos=JSON.parse(localStorage.getItem("carrito")||"[]");
    }catch{
        mensajePedidoWeb.textContent="El carrito no se pudo leer. Vuelve a agregar tus productos.";
        return;
    }
    if(!Array.isArray(productos)||productos.length===0){
        mensajePedidoWeb.textContent="Agrega productos antes de confirmar el pedido.";
        return;
    }
    const boton=formularioPedidoWeb.querySelector("button[type=submit]");
    boton.disabled=true;
    mensajePedidoWeb.textContent="Registrando pedido...";
    try{
        const datosPedido={
            productos:productos.map(producto=>({id:Number(producto.id),cantidad:Number(producto.cantidad)})),
            factura:{
                nombre:facturaNombreWeb.value.trim(),
                nit_ci:facturaNitWeb.value.trim(),
                direccion:document.getElementById("facturaDireccionWeb").value.trim()
            },
            metodo_pago:metodoPagoWeb.value,
            tipo_entrega:tipoEntregaWeb.value,
            direccion_entrega:direccionDeliveryWeb.value.trim(),
            zona_entrega:zonaDeliveryWeb.value
        };
        const formulario=new FormData();
        formulario.append("pedido",JSON.stringify(datosPedido));
        if(metodoPagoWeb.value==="QR" && comprobantePagoQrWeb.files[0]){
            formulario.append("comprobante_qr",comprobantePagoQrWeb.files[0]);
        }
        const respuesta=await fetch("../api.php?action=crear_pedido_web",{
            method:"POST",
            body:formulario
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo registrar el pedido.");
        if(typeof window.limpiarCarrito==="function")window.limpiarCarrito();
        else localStorage.removeItem("carrito");
        if(typeof window.cargarProductosTienda==="function")await window.cargarProductosTienda();
        formularioPedidoWeb.reset();
        actualizarFormularioPago();
        if(datos.metodo_pago==="Efectivo" && datos.tipo_entrega==="Retiro"){
            mensajePedidoWeb.replaceChildren(document.createTextNode(`Pedido #${datos.id} registrado. Imprime este comprobante para recogerlo y pagar en tienda. `));
            const enlace=document.createElement("a");
            enlace.href=`../comprobante.php?id=${Number(datos.id)}&imprimir=1`;
            enlace.target="_blank";
            enlace.rel="noopener";
            enlace.textContent="Imprimir comprobante";
            mensajePedidoWeb.appendChild(enlace);
        }else if(datos.metodo_pago==="QR"){
            mensajePedidoWeb.textContent=`Pedido #${datos.id} registrado. Recibimos tu comprobante QR; el pago quedará pendiente hasta que la tienda verifique la transferencia.`;
        }else{
            mensajePedidoWeb.textContent=`Pedido #${datos.id} registrado. Pago pendiente de validación; revisa el estado en Mi cuenta. La factura electrónica se habilitará después de validar el pago y conectar SIAT.`;
        }
    }catch(error){
        mensajePedidoWeb.textContent=error.message;
    }finally{
        boton.disabled=false;
    }
});

Promise.all([cargarCuentaPedido(),cargarOpcionesPagoEntrega()]).then(actualizarFormularioPago);
