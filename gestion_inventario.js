const categoriasGestionInventario=["Tortas","Espressos","Frappes","Bubbas","Crepes","Pasteleria","Paninis","Combos","Otros"];
const textoSeguro=valor=>String(valor??"").replace(/[&<>"']/g,caracter=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[caracter]));
const elementoInventario=id=>document.getElementById(id);
let productosGestionInventario=[];
let lotesGestionInventario=[];
let modalBajaInventario;
let modalFechasLoteInventario;

function fechaHoyInventario(){
    const hoy=new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
}

function monedaInventario(valor){
    return `${(Number(valor)||0).toFixed(2)} Bs.`;
}

function mostrarMensajeInventario(mensaje,tipo="success"){
    const alerta=elementoInventario("mensajeInventario");
    alerta.className=`alert alert-${tipo} mt-3`;
    alerta.textContent=mensaje;
    alerta.hidden=false;
    alerta.scrollIntoView({behavior:"smooth",block:"center"});
}

async function solicitarInventario(url,opciones={}){
    const respuesta=await fetch(url,{cache:"no-store",...opciones});
    const datos=await respuesta.json();
    if(!respuesta.ok||!datos.ok){
        throw new Error(datos.mensaje||"No se pudo completar la operación de inventario.");
    }
    return datos;
}

function actualizarSelectorEntrada(){
    const selector=elementoInventario("productoEntradaInventario");
    const productoSeleccionado=selector.value;
    selector.replaceChildren(new Option("Selecciona un producto",""));
    productosGestionInventario.forEach(producto=>{
        selector.add(new Option(`${producto.nombre} — stock vendible: ${producto.stock}`,String(producto.id)));
    });
    if(productosGestionInventario.some(producto=>String(producto.id)===productoSeleccionado)){
        selector.value=productoSeleccionado;
    }
}

function renderizarProductosInventario(){
    const tabla=elementoInventario("tablaProductosInventario");
    if(!productosGestionInventario.length){
        tabla.innerHTML='<tr><td colspan="5" class="text-center text-secondary py-4">Todavía no hay productos registrados.</td></tr>';
        return;
    }
    tabla.innerHTML=productosGestionInventario.map(producto=>`
        <tr>
            <td class="fw-semibold">${textoSeguro(producto.nombre)}${producto.descripcion?`<small class="d-block text-secondary">${textoSeguro(producto.descripcion)}</small>`:""}</td>
            <td>${textoSeguro(producto.categoria||"Otros")}</td>
            <td>${monedaInventario(producto.precio)}</td>
            <td>${Number(producto.stock)||0}</td>
            <td><button type="button" class="btn btn-sm btn-outline-primary" data-editar-producto="${Number(producto.id)}"><i class="bi bi-pencil me-1"></i>Editar</button></td>
        </tr>`).join("");
}

function renderizarLotesInventario(){
    const tabla=elementoInventario("tablaLotesInventario");
    const lotesDisponibles=lotesGestionInventario.filter(lote=>Number(lote.cantidad_disponible)>0);
    if(!lotesDisponibles.length){
        tabla.innerHTML='<tr><td colspan="6" class="text-center text-secondary py-4">No hay lotes disponibles. Registra una entrada de stock.</td></tr>';
        return;
    }
    const colores={Vigente:"success","Por vencer":"warning",Vencido:"danger","Sin vencimiento":"secondary"};
    tabla.innerHTML=lotesDisponibles.map(lote=>{
        const estado=textoSeguro(lote.estado);
        const dias=Number(lote.dias_para_vencer);
        const detalleDias=lote.fecha_vencimiento===null
            ?"Inventario previo sin fecha de vencimiento"
            :dias<0?`Vencido hace ${Math.abs(dias)} días`:dias===0?"Vence hoy":`Vence en ${dias} días`;
        return `<tr>
            <td class="fw-semibold">${textoSeguro(lote.producto)}<small class="d-block text-secondary">Lote #${Number(lote.lote_id)}</small></td>
            <td>${textoSeguro(lote.fecha_ingreso)}</td>
            <td>${textoSeguro(lote.fecha_vencimiento||"No registrada")}<small class="d-block text-secondary">${textoSeguro(detalleDias)}</small></td>
            <td>${Number(lote.cantidad_disponible)} de ${Number(lote.cantidad_inicial)}</td>
            <td><span class="badge text-bg-${colores[lote.estado]||"secondary"}">${estado}</span></td>
            <td class="d-flex flex-wrap gap-1">
                ${lote.origen==="Inicial"&&lote.fecha_vencimiento===null?`<button type="button" class="btn btn-sm btn-outline-secondary" data-completar-fechas="${Number(lote.lote_id)}" data-nombre-lote="${textoSeguro(lote.producto)}" data-fecha-ingreso="${textoSeguro(lote.fecha_ingreso)}"><i class="bi bi-calendar-plus me-1"></i>Completar fechas</button>`:""}
                <button type="button" class="btn btn-sm btn-outline-danger" data-dar-baja="${Number(lote.lote_id)}" data-nombre-lote="${textoSeguro(lote.producto)}" data-cantidad-lote="${Number(lote.cantidad_disponible)}"><i class="bi bi-trash3 me-1"></i>Dar de baja</button>
            </td>
        </tr>`;
    }).join("");
}

function renderizarMovimientosInventario(movimientos){
    const tabla=elementoInventario("tablaMovimientosInventario");
    const recientes=movimientos.slice(0,100);
    if(!recientes.length){
        tabla.innerHTML='<tr><td colspan="6" class="text-center text-secondary py-4">Todavía no hay movimientos de inventario.</td></tr>';
        return;
    }
    const colores={Entrada:"success",Salida:"primary",Baja:"danger",Reintegro:"info",Inicial:"secondary"};
    tabla.innerHTML=recientes.map(movimiento=>`
        <tr>
            <td>${textoSeguro(movimiento.fecha_movimiento)}</td>
            <td><span class="badge text-bg-${colores[movimiento.tipo]||"secondary"}">${textoSeguro(movimiento.tipo)}</span></td>
            <td>${textoSeguro(movimiento.producto)}</td>
            <td>${Number(movimiento.cantidad)}</td>
            <td>${textoSeguro([movimiento.motivo,movimiento.observacion].filter(Boolean).join(" — ")||"-")}</td>
            <td>${textoSeguro(movimiento.usuario||"Sistema")}</td>
        </tr>`).join("");
}

async function cargarInventario(){
    const datos=await solicitarInventario("api.php?action=inventario_estado");
    productosGestionInventario=datos.productos||[];
    lotesGestionInventario=datos.lotes||[];
    elementoInventario("cantidadProductosInventario").textContent=productosGestionInventario.length;
    elementoInventario("unidadesInventario").textContent=productosGestionInventario.reduce((suma,producto)=>suma+(Number(producto.stock)||0),0);
    elementoInventario("lotesAlertaInventario").textContent=lotesGestionInventario.filter(lote=>["Vencido","Por vencer"].includes(lote.estado)).length;
    renderizarProductosInventario();
    renderizarLotesInventario();
    actualizarSelectorEntrada();
    const hoy=fechaHoyInventario();
    const limite=new Date(`${hoy}T12:00:00`);
    limite.setDate(limite.getDate()-30);
    const desde=`${limite.getFullYear()}-${String(limite.getMonth()+1).padStart(2,"0")}-${String(limite.getDate()).padStart(2,"0")}`;
    const movimientos=await solicitarInventario(`api.php?action=reporte_inventario&desde=${desde}&hasta=${hoy}`);
    renderizarMovimientosInventario(movimientos.movimientos||[]);
}

function reiniciarFormularioProducto(){
    elementoInventario("formProductoInventario").reset();
    elementoInventario("productoInventarioId").value="";
    elementoInventario("guardarProductoInventario").innerHTML='<i class="bi bi-check2-circle me-1"></i>Guardar producto';
    elementoInventario("cancelarEdicionProducto").hidden=true;
    elementoInventario("categoriaProductoInventario").value="Tortas";
}

document.addEventListener("DOMContentLoaded",()=>{
    const hoy=fechaHoyInventario();
    elementoInventario("fechaIngresoInventario").value=hoy;
    elementoInventario("fechaIngresoInventario").max=hoy;
    elementoInventario("fechaVencimientoInventario").min=hoy;
    modalBajaInventario=new bootstrap.Modal(elementoInventario("modalBajaInventario"));
    modalFechasLoteInventario=new bootstrap.Modal(elementoInventario("modalFechasLoteInventario"));

    elementoInventario("formProductoInventario").addEventListener("submit",async evento=>{
        evento.preventDefault();
        const boton=elementoInventario("guardarProductoInventario");
        boton.disabled=true;
        const id=elementoInventario("productoInventarioId").value;
        const datos={
            nombre:elementoInventario("nombreProductoInventario").value.trim(),
            descripcion:elementoInventario("descripcionProductoInventario").value.trim(),
            categoria:elementoInventario("categoriaProductoInventario").value,
            precio:Number(elementoInventario("precioProductoInventario").value)
        };
        if(id) datos.id=Number(id);
        try{
            await solicitarInventario(`api.php?action=${id?"editar_producto":"crear_producto"}`,{
                method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)
            });
            reiniciarFormularioProducto();
            await cargarInventario();
            window.dispatchEvent(new Event("inventarioActualizado"));
            mostrarMensajeInventario(id?"Producto actualizado correctamente.":"Producto registrado correctamente.");
        }catch(error){
            mostrarMensajeInventario(error.message,"danger");
        }finally{
            boton.disabled=false;
        }
    });

    elementoInventario("cancelarEdicionProducto").addEventListener("click",reiniciarFormularioProducto);
    elementoInventario("tablaProductosInventario").addEventListener("click",evento=>{
        const boton=evento.target.closest("[data-editar-producto]");
        if(!boton) return;
        const producto=productosGestionInventario.find(item=>Number(item.id)===Number(boton.dataset.editarProducto));
        if(!producto) return;
        elementoInventario("productoInventarioId").value=producto.id;
        elementoInventario("nombreProductoInventario").value=producto.nombre;
        elementoInventario("descripcionProductoInventario").value=producto.descripcion||"";
        elementoInventario("categoriaProductoInventario").value=categoriasGestionInventario.includes(producto.categoria)?producto.categoria:"Otros";
        elementoInventario("precioProductoInventario").value=producto.precio;
        elementoInventario("guardarProductoInventario").innerHTML='<i class="bi bi-check2-circle me-1"></i>Guardar cambios';
        elementoInventario("cancelarEdicionProducto").hidden=false;
        elementoInventario("nombreProductoInventario").focus();
    });

    elementoInventario("formEntradaInventario").addEventListener("submit",async evento=>{
        evento.preventDefault();
        const boton=evento.submitter;
        boton.disabled=true;
        try{
            await solicitarInventario("api.php?action=registrar_entrada_stock",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    producto_id:Number(elementoInventario("productoEntradaInventario").value),
                    cantidad:Number(elementoInventario("cantidadEntradaInventario").value),
                    fecha_ingreso:elementoInventario("fechaIngresoInventario").value,
                    fecha_vencimiento:elementoInventario("fechaVencimientoInventario").value
                })
            });
            elementoInventario("formEntradaInventario").reset();
            elementoInventario("fechaIngresoInventario").value=fechaHoyInventario();
            elementoInventario("fechaVencimientoInventario").min=fechaHoyInventario();
            await cargarInventario();
            window.dispatchEvent(new Event("inventarioActualizado"));
            mostrarMensajeInventario("La entrada del lote quedó registrada correctamente.");
        }catch(error){
            mostrarMensajeInventario(error.message,"danger");
        }finally{
            boton.disabled=false;
        }
    });

    elementoInventario("tablaLotesInventario").addEventListener("click",evento=>{
        const botonFechas=evento.target.closest("[data-completar-fechas]");
        if(botonFechas){
            elementoInventario("loteFechasInventario").value=botonFechas.dataset.completarFechas;
            elementoInventario("detalleFechasLote").textContent=`${botonFechas.dataset.nombreLote}, lote inicial #${botonFechas.dataset.completarFechas}.`;
            elementoInventario("fechaIngresoLoteInventario").value=botonFechas.dataset.fechaIngreso;
            elementoInventario("fechaIngresoLoteInventario").max=fechaHoyInventario();
            elementoInventario("fechaVencimientoLoteInventario").value="";
            elementoInventario("fechaVencimientoLoteInventario").min=botonFechas.dataset.fechaIngreso;
            modalFechasLoteInventario.show();
            return;
        }
        const boton=evento.target.closest("[data-dar-baja]");
        if(!boton) return;
        const lote=lotesGestionInventario.find(item=>Number(item.lote_id)===Number(boton.dataset.darBaja));
        elementoInventario("loteBajaInventario").value=boton.dataset.darBaja;
        elementoInventario("cantidadBajaInventario").value="";
        elementoInventario("cantidadBajaInventario").max=boton.dataset.cantidadLote;
        elementoInventario("detalleLoteBaja").textContent=`${boton.dataset.nombreLote}, lote #${boton.dataset.darBaja}. Disponible: ${boton.dataset.cantidadLote} unidades.`;
        elementoInventario("motivoBajaInventario").value=lote?.estado==="Vencido"
            ?"Vencido":lote?.estado==="Por vencer"?"Próximo a vencer":"Dañado";
        elementoInventario("observacionBajaInventario").value="";
        modalBajaInventario.show();
    });

    elementoInventario("formFechasLoteInventario").addEventListener("submit",async evento=>{
        evento.preventDefault();
        const boton=evento.submitter;
        boton.disabled=true;
        try{
            const resultado=await solicitarInventario("api.php?action=actualizar_fechas_lote",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    lote_id:Number(elementoInventario("loteFechasInventario").value),
                    fecha_ingreso:elementoInventario("fechaIngresoLoteInventario").value,
                    fecha_vencimiento:elementoInventario("fechaVencimientoLoteInventario").value
                })
            });
            modalFechasLoteInventario.hide();
            await cargarInventario();
            mostrarMensajeInventario(resultado.mensaje||"Fechas del lote actualizadas correctamente.");
        }catch(error){
            mostrarMensajeInventario(error.message,"danger");
        }finally{
            boton.disabled=false;
        }
    });

    elementoInventario("formBajaInventario").addEventListener("submit",async evento=>{
        evento.preventDefault();
        const boton=evento.submitter;
        boton.disabled=true;
        try{
            const resultado=await solicitarInventario("api.php?action=dar_baja_stock",{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    lote_id:Number(elementoInventario("loteBajaInventario").value),
                    cantidad:Number(elementoInventario("cantidadBajaInventario").value),
                    motivo:elementoInventario("motivoBajaInventario").value,
                    observacion:elementoInventario("observacionBajaInventario").value.trim()
                })
            });
            modalBajaInventario.hide();
            await cargarInventario();
            window.dispatchEvent(new Event("inventarioActualizado"));
            mostrarMensajeInventario(resultado.mensaje||"Baja registrada correctamente.");
        }catch(error){
            mostrarMensajeInventario(error.message,"danger");
        }finally{
            boton.disabled=false;
        }
    });

    cargarInventario().catch(error=>{
        mostrarMensajeInventario(error.message,"danger");
        elementoInventario("tablaProductosInventario").innerHTML='<tr><td colspan="5" class="text-center text-danger py-4">No se pudo cargar el inventario.</td></tr>';
        elementoInventario("tablaLotesInventario").innerHTML='<tr><td colspan="6" class="text-center text-danger py-4">No se pudieron cargar los lotes.</td></tr>';
        elementoInventario("tablaMovimientosInventario").innerHTML='<tr><td colspan="6" class="text-center text-danger py-4">No se pudieron cargar los movimientos.</td></tr>';
    });
});
