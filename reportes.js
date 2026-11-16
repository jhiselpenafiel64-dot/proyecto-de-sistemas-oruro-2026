let ventasReporte=[];
let pedidosReporte=[];
let inventarioReporte=[];
let movimientosInventarioReporte=[];
let graficoVentas=null;
let graficoProductos=null;

const elemento=id=>document.getElementById(id);
const fechaLocal=fecha=>`${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,"0")}-${String(fecha.getDate()).padStart(2,"0")}`;
const fechaVenta=valor=>String(valor||"").match(/^\d{4}-\d{2}-\d{2}/)?.[0]||"";
const dinero=valor=>`${(Number(valor)||0).toFixed(2)} Bs.`;
const escaparHtml=valor=>String(valor??"").replace(/[&<>"']/g,caracter=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[caracter]));
const sumar=(items,selector)=>items.reduce((total,item)=>total+(Number(selector(item))||0),0);

function actualizarContadores(){
    const ingresos=sumar(ventasReporte,venta=>venta.total);
    const unidades=sumar(ventasReporte,venta=>(venta.productos||[]).reduce((total,producto)=>total+(Number(producto.cantidad)||0),0));
    const clientes=new Set(ventasReporte.map(venta=>venta.cliente).filter(Boolean));
    const vendidos={};
    ventasReporte.forEach(venta=>(venta.productos||[]).forEach(producto=>{
        vendidos[producto.nombre]=(vendidos[producto.nombre]||0)+(Number(producto.cantidad)||0);
    }));
    const productoEstrella=Object.entries(vendidos).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-";
    const hoy=fechaLocal(new Date());
    const mesActual=hoy.slice(0,7);
    const anioActual=hoy.slice(0,4);
    elemento("reporteIngresos").textContent=dinero(ingresos);
    elemento("reporteVentas").textContent=ventasReporte.length;
    elemento("reporteProductos").textContent=unidades;
    elemento("reporteClientes").textContent=clientes.size;
    elemento("promedioVenta").textContent=dinero(ventasReporte.length?ingresos/ventasReporte.length:0);
    elemento("productoEstrella").textContent=productoEstrella;
    elemento("ventasDia").textContent=dinero(sumar(ventasReporte.filter(venta=>fechaVenta(venta.fecha)===hoy),venta=>venta.total));
    elemento("ventasMes").textContent=dinero(sumar(ventasReporte.filter(venta=>fechaVenta(venta.fecha).startsWith(mesActual)),venta=>venta.total));
    elemento("ventasAnio").textContent=dinero(sumar(ventasReporte.filter(venta=>fechaVenta(venta.fecha).startsWith(anioActual)),venta=>venta.total));
    elemento("inventarioDisponible").textContent=sumar(inventarioReporte,producto=>producto.stock);
}

function generarGraficos(){
    if(typeof Chart!=="function") return;
    const porMes={};
    const porProducto={};
    ventasReporte.forEach(venta=>{
        const mes=fechaVenta(venta.fecha).slice(0,7)||"Sin fecha";
        porMes[mes]=(porMes[mes]||0)+(Number(venta.total)||0);
        (venta.productos||[]).forEach(producto=>{
            porProducto[producto.nombre]=(porProducto[producto.nombre]||0)+(Number(producto.cantidad)||0);
        });
    });
    if(graficoVentas) graficoVentas.destroy();
    if(graficoProductos) graficoProductos.destroy();
    graficoVentas=new Chart(elemento("graficoVentas"),{
        type:"bar",
        data:{labels:Object.keys(porMes),datasets:[{label:"Ventas (Bs.)",data:Object.values(porMes),backgroundColor:"#6B2635"}]},
        options:{responsive:true,maintainAspectRatio:false}
    });
    graficoProductos=new Chart(elemento("graficoProductos"),{
        type:"doughnut",
        data:{labels:Object.keys(porProducto),datasets:[{data:Object.values(porProducto),backgroundColor:["#6B2635","#874657","#B9865E","#C9A45C","#EBD8BA"]}]},
        options:{responsive:true,maintainAspectRatio:false}
    });
}

function obtenerPeriodo(tipo){
    const inicio=elemento("fechaInicio").value;
    const fin=elemento("fechaFin").value;
    if(inicio&&fin&&inicio>fin) throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
    if(inicio||fin){
        const finAplicado=fin||fechaLocal(new Date());
        if(inicio&&inicio>finAplicado) throw new Error("La fecha inicial no puede ser posterior a la fecha final.");
        return {
            inicio:inicio||"",
            fin:finAplicado,
            etiqueta:`${inicio||"Inicio"} al ${finAplicado}`
        };
    }
    const hoy=fechaLocal(new Date());
    if(tipo==="ventas_dia") return {inicio:hoy,fin:hoy,etiqueta:hoy};
    if(tipo==="ventas_mes"){
        const inicioMes=`${hoy.slice(0,7)}-01`;
        const fecha=new Date(`${hoy.slice(0,7)}-01T12:00:00`);
        fecha.setMonth(fecha.getMonth()+1,0);
        return {inicio:inicioMes,fin:fechaLocal(fecha),etiqueta:hoy.slice(0,7)};
    }
    if(tipo==="ventas_anio") return {inicio:`${hoy.slice(0,4)}-01-01`,fin:`${hoy.slice(0,4)}-12-31`,etiqueta:hoy.slice(0,4)};
    return {inicio:"",fin:"",etiqueta:"Todos los períodos"};
}

function dentroDelPeriodo(venta,periodo){
    const fecha=fechaVenta(venta.fecha);
    return Boolean(fecha)&&(!periodo.inicio||fecha>=periodo.inicio)&&(!periodo.fin||fecha<=periodo.fin);
}

function agrupar(items,clave){
    const grupos=new Map();
    items.forEach(item=>{
        const nombre=clave(item)||"Sin especificar";
        if(!grupos.has(nombre)) grupos.set(nombre,[]);
        grupos.get(nombre).push(item);
    });
    return [...grupos.entries()].map(([nombre,elementos])=>({nombre,elementos}));
}

function establecerTabla(encabezados,filas,totalTexto){
    elemento("encabezadoReporte").innerHTML=encabezados.map(titulo=>`<th>${escaparHtml(titulo)}</th>`).join("");
    const tabla=elemento("tablaReportes");
    if(!filas.length){
        tabla.innerHTML='<tr><td colspan="'+encabezados.length+'" class="text-center py-5">No existen datos para mostrar en este período.</td></tr>';
    }else{
        tabla.innerHTML=filas.map(fila=>`<tr>${fila.map(celda=>`<td>${celda}</td>`).join("")}</tr>`).join("");
    }
    elemento("totalesReporte").textContent=totalTexto;
}

function renderizarReporte(){
    const tipo=elemento("tipoReporte").value;
    const periodo=obtenerPeriodo(tipo);
    const ventas=ventasReporte.filter(venta=>dentroDelPeriodo(venta,periodo));
    const pedidosDelivery=pedidosReporte.filter(pedido=>pedido.tipo_entrega==="Delivery"&&dentroDelPeriodo(pedido,periodo));
    let encabezados=[];
    let filas=[];
    let titulo="";
    let totalTexto="";
    elemento("periodoReporte").textContent=periodo.etiqueta;

    if(tipo==="inventario"){
        titulo="Productos en stock";
        encabezados=["Clasificación","Producto","Categoría","Stock disponible","Precio unitario","Valor del stock"];
        const productos=[...inventarioReporte].sort((a,b)=>(Number(b.stock)||0)-(Number(a.stock)||0)||String(a.nombre).localeCompare(String(b.nombre),"es"));
        filas=productos.map((producto,indice)=>{
            const valor=(Number(producto.stock)||0)*(Number(producto.precio)||0);
            return [`#${indice+1}`,escaparHtml(producto.nombre),escaparHtml(producto.categoria||"Sin categoría"),Number(producto.stock)||0,dinero(producto.precio),dinero(valor)];
        });
        totalTexto=`Productos: ${productos.length} | Unidades disponibles: ${sumar(productos,producto=>producto.stock)} | Valor estimado: ${dinero(sumar(productos,producto=>(Number(producto.stock)||0)*(Number(producto.precio)||0)))}`;
    }else if(tipo==="movimientos_stock"){
        titulo="Entradas, salidas y bajas de inventario";
        encabezados=["Fecha","Movimiento","Producto","Cantidad","Lote","Vencimiento","Motivo / observación","Registrado por"];
        const movimientos=movimientosInventarioReporte.filter(movimiento=>{
            const fecha=String(movimiento.fecha_movimiento||"");
            return (!periodo.inicio||fecha>=periodo.inicio)&&(!periodo.fin||fecha<=periodo.fin);
        });
        filas=movimientos.map(movimiento=>[
            escaparHtml(movimiento.fecha_movimiento),
            escaparHtml(movimiento.tipo==="Inicial"?"Stock inicial":movimiento.tipo),
            escaparHtml(movimiento.producto),
            Number(movimiento.cantidad)||0,
            movimiento.lote_id?`#${Number(movimiento.lote_id)}`:"-",
            escaparHtml(movimiento.fecha_vencimiento||"Sin fecha"),
            escaparHtml([movimiento.motivo,movimiento.observacion].filter(Boolean).join(" — ")||"-"),
            escaparHtml(movimiento.usuario||"Sistema")
        ]);
        const entradas=sumar(movimientos.filter(movimiento=>movimiento.tipo==="Entrada"),movimiento=>movimiento.cantidad);
        const salidas=sumar(movimientos.filter(movimiento=>movimiento.tipo==="Salida"),movimiento=>movimiento.cantidad);
        const bajas=sumar(movimientos.filter(movimiento=>movimiento.tipo==="Baja"),movimiento=>movimiento.cantidad);
        const reintegros=sumar(movimientos.filter(movimiento=>movimiento.tipo==="Reintegro"),movimiento=>movimiento.cantidad);
        const inicial=sumar(movimientos.filter(movimiento=>movimiento.tipo==="Inicial"),movimiento=>movimiento.cantidad);
        totalTexto=`Movimientos: ${movimientos.length} | Entradas: ${entradas} unid. | Salidas por pedidos: ${salidas} unid. | Bajas: ${bajas} unid. | Reintegros por cancelación: ${reintegros} unid. | Stock inicial migrado: ${inicial} unid.`;
    }else if(tipo==="ventas_usuario"){
        titulo="Ventas por usuario — del mejor al menor total";
        encabezados=["Clasificación","Usuario","Ventas","Productos vendidos","Total vendido"];
        const grupos=agrupar(ventas,venta=>venta.vendedor).map(grupo=>({
            ...grupo,
            total:sumar(grupo.elementos,venta=>venta.total),
            unidades:sumar(grupo.elementos,venta=>(venta.productos||[]).reduce((total,producto)=>total+(Number(producto.cantidad)||0),0))
        })).sort((a,b)=>b.total-a.total||a.nombre.localeCompare(b.nombre,"es"));
        filas=grupos.map((grupo,indice)=>[`#${indice+1}`,escaparHtml(grupo.nombre),grupo.elementos.length,grupo.unidades,dinero(grupo.total)]);
        totalTexto=`Usuarios: ${grupos.length} | Ventas: ${ventas.length} | Total: ${dinero(sumar(ventas,venta=>venta.total))}`;
    }else if(tipo==="delivery"){
        titulo="Entregas por delivery — del mejor al menor número de entregas";
        encabezados=["Clasificación","Repartidor","Entregas completadas","Pendientes","Total vendido"];
        const grupos=agrupar(pedidosDelivery,pedido=>pedido.repartidor).map(grupo=>{
            const completadas=grupo.elementos.filter(pedido=>pedido.estado_entrega==="Entregado"||pedido.estado==="Entregado").length;
            return {...grupo,completadas,pendientes:grupo.elementos.length-completadas,total:sumar(grupo.elementos.filter(pedido=>Number(pedido.venta_valida)),pedido=>pedido.total)};
        }).sort((a,b)=>b.completadas-a.completadas||b.total-a.total||a.nombre.localeCompare(b.nombre,"es"));
        filas=grupos.map((grupo,indice)=>[`#${indice+1}`,escaparHtml(grupo.nombre),grupo.completadas,grupo.pendientes,dinero(grupo.total)]);
        totalTexto=`Repartidores: ${grupos.length} | Entregas: ${pedidosDelivery.length} | Completadas: ${sumar(grupos,grupo=>grupo.completadas)} | Total vendido: ${dinero(sumar(grupos,grupo=>grupo.total))}`;
    }else if(tipo==="zonas"){
        titulo="Ventas por lugar — del mejor al menor total";
        encabezados=["Clasificación","Lugar / zona","Pedidos","Total vendido"];
        const grupos=agrupar(ventas,venta=>venta.tipo_entrega==="Delivery"?(venta.zona_entrega||"Zona no especificada"):"Tienda (Retiro)")
            .map(grupo=>({...grupo,total:sumar(grupo.elementos,venta=>venta.total)}))
            .sort((a,b)=>b.total-a.total||a.nombre.localeCompare(b.nombre,"es"));
        filas=grupos.map((grupo,indice)=>[`#${indice+1}`,escaparHtml(grupo.nombre),grupo.elementos.length,dinero(grupo.total)]);
        totalTexto=`Lugares: ${grupos.length} | Pedidos: ${ventas.length} | Total vendido: ${dinero(sumar(ventas,venta=>venta.total))}`;
    }else{
        titulo=tipo==="ventas_dia"?"Ventas del día":tipo==="ventas_mes"?"Ventas del mes":tipo==="ventas_anio"?"Ventas del año":"Resumen de ventas";
        encabezados=["Fecha","Usuario","Cliente","Productos","Lugar","Total"];
        filas=ventas.map(venta=>{
            const productos=(venta.productos||[]).map(producto=>`${escaparHtml(producto.nombre)} (${Number(producto.cantidad)||0})`).join(", ");
            const lugar=venta.tipo_entrega==="Delivery"?(venta.zona_entrega||"Delivery sin zona"):"Tienda (Retiro)";
            return [escaparHtml(venta.fecha),escaparHtml(venta.vendedor),escaparHtml(venta.cliente),productos||"-",escaparHtml(lugar),dinero(venta.total)];
        });
        totalTexto=`Ventas: ${ventas.length} | Total vendido: ${dinero(sumar(ventas,venta=>venta.total))}`;
    }
    elemento("tituloReporte").textContent=titulo;
    establecerTabla(encabezados,filas,totalTexto);
}

async function actualizarReportes(){
    const alerta=elemento("reportesError");
    alerta.hidden=true;
    try{
        const respuesta=await fetch("api.php?action=reportes_admin",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok) throw new Error(datos.mensaje||"No se pudieron cargar los reportes.");
        pedidosReporte=datos.pedidos||[];
        ventasReporte=pedidosReporte.filter(pedido=>Number(pedido.venta_valida)===1);
        inventarioReporte=datos.productos||[];
        actualizarContadores();
        generarGraficos();
        renderizarReporte();
    }catch(error){
        console.error("No se pudieron cargar los reportes",error);
        alerta.textContent=error.message||"No se pudieron cargar los reportes.";
        alerta.hidden=false;
    }
}

async function filtrarReportes(){
    const alerta=elemento("reportesError");
    try{
        alerta.hidden=true;
        if(elemento("tipoReporte").value==="movimientos_stock"){
            const parametros=new URLSearchParams();
            if(elemento("fechaInicio").value) parametros.set("desde",elemento("fechaInicio").value);
            if(elemento("fechaFin").value) parametros.set("hasta",elemento("fechaFin").value);
            const respuesta=await fetch(`api.php?action=reporte_inventario&${parametros.toString()}`,{cache:"no-store"});
            const datos=await respuesta.json();
            if(!respuesta.ok||!datos.ok) throw new Error(datos.mensaje||"No se pudo cargar el historial de inventario.");
            movimientosInventarioReporte=datos.movimientos||[];
        }
        renderizarReporte();
    }catch(error){
        alerta.textContent=error.message;
        alerta.hidden=false;
    }
}

document.addEventListener("DOMContentLoaded",()=>{
    elemento("filtrarReporte")?.addEventListener("click",filtrarReportes);
    elemento("tipoReporte")?.addEventListener("change",filtrarReportes);
    elemento("imprimirReporte")?.addEventListener("click",()=>window.print());
    actualizarReportes();
});

window.actualizarReportes=actualizarReportes;
window.filtrarReportes=filtrarReportes;
