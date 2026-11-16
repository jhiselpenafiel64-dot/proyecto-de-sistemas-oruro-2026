const listaPedidosDelivery=document.getElementById("listaPedidosDelivery");
const mensajeDelivery=document.getElementById("mensajeDelivery");
let intervaloDelivery=null;

function mostrarMensajeDelivery(texto,exito=false){
    mensajeDelivery.textContent=texto;
    mensajeDelivery.className=`alert ${exito?"alert-success":"alert-danger"}`;
}

function escaparDelivery(valor){
    return String(valor??"").replace(/[&<>"']/g,caracter=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[caracter]);
}

async function cargarPedidosDelivery(){
    try{
        const respuesta=await fetch("api.php?action=repartidor_pedidos",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudieron cargar los pedidos de delivery.");
        const pedidos=datos.pedidos||[];
        if(!pedidos.length){
            listaPedidosDelivery.innerHTML='<div class="alert alert-info">No tienes pedidos delivery activos asignados a tu cuenta. El administrador debe asignarte los pedidos desde el panel de Pedidos.</div>';
            return;
        }
        listaPedidosDelivery.innerHTML=pedidos.map(pedido=>{
            const productos=(pedido.productos||[]).map(producto=>`<li>${Number(producto.cantidad)} × ${escaparDelivery(producto.nombre)} — ${(Number(producto.cantidad)*Number(producto.precio)).toFixed(2)} Bs.</li>`).join("");
            const pagoPendiente=pedido.estado_pago!=="Pagado";
            const botonesPago=pagoPendiente&&pedido.metodo_pago==="QR"?`<button class="btn btn-success" type="button" data-confirmar-pago="${Number(pedido.id)}">Verificar pago QR</button>`:pagoPendiente&&pedido.metodo_pago==="Efectivo"?`<button class="btn btn-success" type="button" data-cobrar-efectivo="${Number(pedido.id)}">Registrar cobro en efectivo</button>`:pagoPendiente?'<span class="badge text-bg-warning">Pago pendiente</span>':'<span class="badge text-bg-success">Pago confirmado</span>';
            const siguienteEstado=pedido.estado_entrega==="En camino"?"Entregado":"En camino";
            const botonEntrega=!pagoPendiente?`<button class="btn btn-outline-primary" type="button" data-estado-entrega="${Number(pedido.id)}" data-siguiente-estado="${siguienteEstado}">${siguienteEstado==="Entregado"?"Confirmar entrega":"Marcar en camino"}</button>`:"";
            const comprobante=pedido.metodo_pago==="QR"&&Number(pedido.tiene_comprobante_qr)===1?`<a class="btn btn-outline-dark" href="api.php?action=ver_comprobante_qr&amp;pedido_id=${Number(pedido.id)}" target="_blank" rel="noopener">Ver comprobante QR</a>`:"";
            const claseEstadoPago=pedido.estado_pago==="Pagado"?"text-bg-success":"text-bg-warning";
            return `<article class="card shadow-sm pedido-delivery"><div class="card-body"><div class="d-flex flex-wrap justify-content-between gap-2"><h2 class="h5 marca">Pedido #${Number(pedido.id)} · ${escaparDelivery(pedido.cliente)}</h2><span class="badge ${claseEstadoPago}">${escaparDelivery(pedido.estado_pago)} · ${escaparDelivery(pedido.metodo_pago)}</span></div><p class="mb-1">${escaparDelivery(pedido.telefono||"Sin teléfono")} · ${escaparDelivery(pedido.fecha)}</p><p class="mb-1"><strong>Zona:</strong> ${escaparDelivery(pedido.zona_entrega||"")} · delivery ${Number(pedido.costo_delivery||0).toFixed(2)} Bs.</p><p><strong>Dirección:</strong> ${escaparDelivery(pedido.direccion_entrega||"")}</p><ul>${productos}</ul><p><strong>Total:</strong> ${Number(pedido.total).toFixed(2)} Bs.</p><p><strong>Factura electrónica:</strong> ${escaparDelivery(pedido.estado_emision||"Pendiente SIAT")} (se habilitará después de conectar y recibir autorización SIAT).</p><div class="d-flex flex-wrap gap-2">${botonesPago}${comprobante}${botonEntrega}</div></div></article>`;
        }).join("");
    }catch(error){
        listaPedidosDelivery.innerHTML="";
        mostrarMensajeDelivery(error.message);
    }
}

listaPedidosDelivery.addEventListener("click",async evento=>{
    const botonPago=evento.target.closest("[data-confirmar-pago]");
    const botonCobro=evento.target.closest("[data-cobrar-efectivo]");
    const botonEntrega=evento.target.closest("[data-estado-entrega]");
    if(!botonPago&&!botonCobro&&!botonEntrega)return;
    const boton=botonPago||botonCobro||botonEntrega;
    const codigoTransaccion=botonPago?window.prompt("Ingresa el código de transacción del depósito QR:"):null;
    if(botonPago && codigoTransaccion===null)return;
    if(botonPago && !codigoTransaccion.trim()){
        mostrarMensajeDelivery("Ingresa el código de transacción del pago QR.");
        return;
    }
    boton.disabled=true;
    try{
        const accion=botonPago?"confirmar_pago_delivery":botonCobro?"cobrar_efectivo_delivery":"actualizar_entrega_delivery";
        const cuerpo=botonPago
            ? {pedido_id:Number(boton.dataset.confirmarPago),codigo_transaccion:codigoTransaccion.trim()}
            : botonCobro
                ? {pedido_id:Number(boton.dataset.cobrarEfectivo)}
                : {pedido_id:Number(boton.dataset.estadoEntrega),estado_entrega:boton.dataset.siguienteEstado};
        const respuesta=await fetch(`api.php?action=${accion}`,{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(cuerpo)
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo actualizar el pedido.");
        mostrarMensajeDelivery(datos.mensaje||"Pedido actualizado.",true);
        await cargarPedidosDelivery();
    }catch(error){
        mostrarMensajeDelivery(error.message);
        boton.disabled=false;
    }
});

document.getElementById("cerrarSesionRepartidor").addEventListener("click",async()=>{
    try{
        const respuesta=await fetch("api.php?action=logout_admin",{method:"POST"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo cerrar sesión.");
        ["sesionActiva","usuarioAdmin","usuarioNombre","usuarioRol","ultimoAcceso"].forEach(clave=>localStorage.removeItem(clave));
        window.location.href="la%20polar/cuenta.html";
    }catch(error){
        mostrarMensajeDelivery(error.message);
    }
});

document.addEventListener("DOMContentLoaded",()=>{
    document.getElementById("nombreRepartidor").textContent=localStorage.getItem("usuarioNombre")||"Delivery";
    cargarPedidosDelivery();
    intervaloDelivery=setInterval(cargarPedidosDelivery,15000);
});
