const formularioLogin = document.getElementById("formularioLogin");
const formularioRegistro = document.getElementById("formularioRegistro");
const cuentaActiva = document.getElementById("cuentaActiva");
const contenedorCuenta = document.querySelector(".cuenta-contenedor");

const loginForm = document.getElementById("loginForm");
const registroForm = document.getElementById("registroForm");

const mostrarRegistro = document.getElementById("mostrarRegistro");
const mostrarLogin = document.getElementById("mostrarLogin");
const cerrarSesion = document.getElementById("cerrarSesion");

const mensaje = document.getElementById("mensaje");

const nombreUsuario = document.getElementById("nombreUsuario");
const correoUsuario = document.getElementById("correoUsuario");
const telefonoUsuario = document.getElementById("telefonoUsuario");
const descripcionCuenta = document.getElementById("descripcionCuenta");
const listaPedidosCliente = document.getElementById("listaPedidosCliente");
const resumenCompras = document.getElementById("resumenCompras");
const resumenPedidosActivos = document.getElementById("resumenPedidosActivos");
const resumenTotalCompras = document.getElementById("resumenTotalCompras");
const botonNotificacionesCliente=document.getElementById("botonNotificacionesCliente");
const contadorNotificacionesCliente=document.getElementById("contadorNotificacionesCliente");
const panelNotificacionesCliente=document.getElementById("panelNotificacionesCliente");
const listaNotificacionesCliente=document.getElementById("listaNotificacionesCliente");
const avisoPedidosCliente = document.getElementById("avisoPedidosCliente");
const activarNotificaciones = document.getElementById("activarNotificaciones");
const googleSigninButton = document.getElementById("googleSigninButton");
const googleRegistroAlternativo = document.getElementById("googleRegistroAlternativo");
const googleEstado = document.getElementById("googleEstado");
const personalLoginForm = document.getElementById("personalLoginForm");
const mostrarAccesoPersonal = document.getElementById("mostrarAccesoPersonal");
const cancelarAccesoPersonal = document.getElementById("cancelarAccesoPersonal");
let clienteActual = null;
let intervaloPedidosCliente = null;
let intervaloTemporizadoresCancelacion = null;
const limitesCancelacionPedidos = new Map();
let estadosPedidosCliente = null;
let notificacionesCliente = [];
let googleInicializado = false;
let googleCargando = false;
let googleError = "Google no está configurado. Define GOOGLE_CLIENT_ID en las variables de entorno de Render.";

function configurarValidacionNombreCuenta(campo){
    const validar=()=>{
        campo.value=campo.value.replace(/[^\p{L}\p{M}\s.'’-]/gu,"").slice(0,120);
        campo.setCustomValidity(/[\p{L}]/u.test(campo.value.trim()) ? "" : "Ingresa un nombre con letras.");
    };
    campo.addEventListener("input",validar);
    validar();
}

function configurarValidacionTelefonoCuenta(campo){
    const validar=()=>{
        campo.value=campo.value.replace(/[^0-9+().\s-]/g,"").trim().slice(0,30);
        const digitos=campo.value.replace(/\D/g,"").length;
        const formatoValido=/^\+?[0-9\s().-]+$/.test(campo.value);
        campo.setCustomValidity(formatoValido&&digitos>=7&&digitos<=15 ? "" : "El teléfono debe contener entre 7 y 15 dígitos.");
    };
    campo.addEventListener("input",validar);
    validar();
}

configurarValidacionNombreCuenta(document.getElementById("registroNombre"));
configurarValidacionTelefonoCuenta(document.getElementById("registroTelefono"));

function mostrarMensaje(texto, tipo){
    mensaje.textContent = texto;
    mensaje.className = "mensaje " + tipo;

    setTimeout(()=>{
        mensaje.className = "mensaje";
        mensaje.textContent = "";
    },3000);
}

function mostrarRegistroFormulario(){
    formularioLogin.classList.add("oculto");
    formularioRegistro.classList.remove("oculto");
    cuentaActiva.classList.add("oculto");
    iniciarRegistroGoogle();
}

function mostrarLoginFormulario(){
    formularioRegistro.classList.add("oculto");
    formularioLogin.classList.remove("oculto");
    cuentaActiva.classList.add("oculto");
}

function comprobarSesion(usuario){
    if(usuario){
    clienteActual = usuario;
        contenedorCuenta.classList.add("cuenta-contenedor-activa");

        formularioLogin.classList.add("oculto");
        formularioRegistro.classList.add("oculto");
        cuentaActiva.classList.remove("oculto");

        nombreUsuario.textContent = usuario.nombre;
        correoUsuario.textContent = usuario.correo;
        telefonoUsuario.textContent = usuario.telefono || "No registrado";
        descripcionCuenta.textContent = "Tu espacio personal para consultar pedidos y comprobantes.";
        cargarNotificacionesCliente();
        iniciarMonitoreoPedidos();

    }else{
        contenedorCuenta.classList.remove("cuenta-contenedor-activa");
        clienteActual = null;
        estadosPedidosCliente = null;
        clearInterval(intervaloPedidosCliente);
        clearInterval(intervaloTemporizadoresCancelacion);
        limitesCancelacionPedidos.clear();
        listaPedidosCliente.innerHTML = "<p>Inicia sesión para consultar tus pedidos.</p>";
        notificacionesCliente=[];
        actualizarNotificacionesCliente();
        listaNotificacionesCliente.innerHTML="<p>Inicia sesión para consultar tus notificaciones.</p>";
        panelNotificacionesCliente.hidden=true;
        botonNotificacionesCliente.setAttribute("aria-expanded","false");
        avisoPedidosCliente.textContent = "";
        correoUsuario.textContent = "";
        telefonoUsuario.textContent = "";
        resumenCompras.textContent = "—";
        resumenPedidosActivos.textContent = "—";
        resumenTotalCompras.textContent = "—";
        descripcionCuenta.textContent = "Inicia sesión o crea una cuenta para realizar tus pedidos.";

        formularioLogin.classList.remove("oculto");
        formularioRegistro.classList.add("oculto");
        cuentaActiva.classList.add("oculto");

    }
}

function escaparHtml(valor){
    return String(valor ?? "").replace(/[&<>"']/g,caracter=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[caracter]);
}

function iniciarMonitoreoPedidos(){
    clearInterval(intervaloPedidosCliente);
    clearInterval(intervaloTemporizadoresCancelacion);
    estadosPedidosCliente = null;
    cargarPedidosCliente();
    intervaloPedidosCliente = setInterval(()=>{
        cargarPedidosCliente();
        cargarNotificacionesCliente();
    },10000);
    intervaloTemporizadoresCancelacion=setInterval(actualizarTemporizadoresCancelacion,1000);
}

function formatearTiempoCancelacion(segundos){
    const minutos=Math.floor(segundos/60);
    const restantes=segundos%60;
    return `${String(minutos).padStart(2,"0")}:${String(restantes).padStart(2,"0")}`;
}

function obtenerSegundosCancelacion(pedido){
    const segundosServidor=Number(pedido.segundos_cancelacion);
    if(Number.isFinite(segundosServidor) && segundosServidor>0){
        return Math.ceil(segundosServidor);
    }
    const fechaLimite=String(pedido.fecha_limite_cancelacion||"").replace(" ","T");
    const marcaTiempoLimite=Date.parse(fechaLimite);
    if(Number.isFinite(marcaTiempoLimite)){
        return Math.max(0,Math.ceil((marcaTiempoLimite-Date.now())/1000));
    }
    return 0;
}

function actualizarTemporizadoresCancelacion(){
    document.querySelectorAll("[data-cancelacion-pedido]").forEach(boton=>{
        const limite=limitesCancelacionPedidos.get(boton.dataset.cancelacionPedido);
        const restantes=limite ? Math.max(0,Math.ceil((limite-Date.now())/1000)) : 0;
        if(!restantes){
            boton.hidden=true;
            return;
        }
        boton.textContent=`Cancelar pedido · ${formatearTiempoCancelacion(restantes)}`;
    });
}

function actualizarNotificacionesCliente(){
    const noLeidas=notificacionesCliente.filter(notificacion=>!notificacion.leida_en).length;
    contadorNotificacionesCliente.textContent=String(noLeidas);
    contadorNotificacionesCliente.hidden=noLeidas===0;
}

async function cargarNotificacionesCliente(){
    if(!clienteActual)return;
    try{
        const respuesta=await fetch("../api.php?action=notificaciones_cliente",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudieron consultar las notificaciones.");
        notificacionesCliente=Array.isArray(datos.notificaciones)?datos.notificaciones:[];
        actualizarNotificacionesCliente();
        if(!notificacionesCliente.length){
            listaNotificacionesCliente.innerHTML="<p>No tienes notificaciones nuevas.</p>";
            return;
        }
        listaNotificacionesCliente.innerHTML=notificacionesCliente.map(notificacion=>`
            <button type="button" class="notificacion-cliente ${notificacion.leida_en?"":"notificacion-cliente-no-leida"}" data-abrir-comprobante="${Number(notificacion.id)}" data-pedido="${Number(notificacion.pedido_id)}">
                <strong>Comprobante disponible · Pedido #${Number(notificacion.pedido_id)}</strong>
                <small>${notificacion.leida_en?"":"Nuevo · "}${escaparHtml(notificacion.creada_en)} · ${Number(notificacion.total).toFixed(2)} Bs.</small>
            </button>
        `).join("");
    }catch(error){
        listaNotificacionesCliente.innerHTML=`<p role="alert">${escaparHtml(error.message)}</p>`;
    }
}

async function cargarPedidosCliente(){
    if(!clienteActual) return;
    try{
        const respuesta=await fetch("../api.php?action=pedidos_cliente",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron consultar tus pedidos.");
        const pedidos=datos.pedidos || [];
        const estadosActuales={};
        let pedidosListos=0;
        pedidos.forEach(pedido=>{
            estadosActuales[pedido.id]=pedido.estado;
            const segundosCancelacion=obtenerSegundosCancelacion(pedido);
            if(segundosCancelacion>0 && pedido.estado==="Pendiente" && pedido.estado_pago==="Pendiente"
                && pedido.metodo_pago==="Efectivo" && pedido.tipo_entrega==="Retiro"){
                limitesCancelacionPedidos.set(String(pedido.id),Date.now()+segundosCancelacion*1000);
            }else{
                limitesCancelacionPedidos.delete(String(pedido.id));
            }
            if(pedido.estado==="Preparando"){
                pedidosListos++;
                if(estadosPedidosCliente && estadosPedidosCliente[pedido.id]!=="Preparando" && "Notification" in window && Notification.permission==="granted"){
                    new Notification("Dulce Vita: pedido listo",{body:`Tu pedido #${pedido.id} está listo. Pasa a recogerlo.`});
                }
            }
        });
        const pedidosContables=pedidos.filter(pedido=>pedido.estado!=="Cancelado");
        const pedidosActivos=pedidos.filter(pedido=>["Pendiente","Preparando"].includes(pedido.estado));
        resumenCompras.textContent=String(pedidosContables.length);
        resumenPedidosActivos.textContent=String(pedidosActivos.length);
        resumenTotalCompras.textContent=`${pedidosContables.reduce((suma,pedido)=>suma+Number(pedido.total||0),0).toFixed(2)} Bs.`;
        estadosPedidosCliente=estadosActuales;
        avisoPedidosCliente.textContent=pedidosListos ? `Tu pedido${pedidosListos>1 ? "s están" : " está"} listo${pedidosListos>1 ? "s" : ""}. Pasa a recogerlo en Dulce Vita.` : "";
        if(!pedidos.length){
            listaPedidosCliente.innerHTML='<div class="pedidos-vacio"><span class="pedidos-vacio-icono" aria-hidden="true">♡</span><h3>Aún no tienes compras</h3><p>Cuando realices un pedido, podrás seguir aquí su estado y consultar tus comprobantes.</p><a href="catalogo.html" class="btn cuenta-btn">Descubrir el catálogo</a></div>';
            return;
        }
        listaPedidosCliente.innerHTML=pedidos.map(pedido=>{
            const estadoPago=pedido.estado_pago || "Pendiente";
            const estadoPedido=pedido.estado || "Pendiente";
            const entrega=pedido.tipo_entrega==="Delivery"
                ? `<div class="pedido-dato"><span>Entrega</span><strong>Delivery · ${escaparHtml(pedido.zona_entrega||"")}</strong><small>${escaparHtml(pedido.direccion_entrega||"")}</small></div><div class="pedido-dato"><span>Estado de entrega</span><strong>${escaparHtml(pedido.estado_entrega||"Pendiente")}</strong></div>`
                : '<div class="pedido-dato"><span>Entrega</span><strong>Retiro en tienda</strong></div>';
            const avisoListo=pedido.estado==="Preparando" && pedido.tipo_entrega!=="Delivery" ? '<p class="pedido-listo">Tu pedido está listo. Pasa a recogerlo.</p>' : "";
            const comprobante=pedido.metodo_pago==="Efectivo" && pedido.tipo_entrega==="Retiro" && estadoPago==="Pendiente"
                ? `<a class="pedido-accion" target="_blank" rel="noopener" href="../comprobante.php?id=${Number(pedido.id)}&amp;imprimir=1">Ver comprobante <span aria-hidden="true">↗</span></a>`
                : "";
            const comprobanteQr=pedido.metodo_pago==="QR"
                ? `<div class="pedido-dato"><span>Comprobante QR</span><strong>${Number(pedido.tiene_comprobante_qr)===1 ? "Recibido" : "Pendiente de adjuntar"}</strong></div>`
                : "";
            const claseEstadoPago=estadoPago==="Pagado"?"estado-pago-verificado":"estado-pago-pendiente";
            const estadoFactura=pedido.estado_factura==="Emitida"
                ? `<div class="pedido-factura pedido-factura-ok"><span>Factura electrónica</span><strong>Emitida</strong>${pedido.factura_cuf?`<small>CUF: ${escaparHtml(pedido.factura_cuf)}</small>`:""}</div>`
                : `<div class="pedido-factura"><span>Factura electrónica</span><strong>${escaparHtml(pedido.estado_factura||"Pendiente SIAT")}</strong><small>Se mostrará como emitida tras la autorización del SIAT.</small></div>`;
            const claseEstadoPedido=estadoPedido==="Entregado"?"estado-pedido-entregado":estadoPedido==="Cancelado"?"estado-pedido-cancelado":"estado-pedido-activo";
            const fecha=String(pedido.fecha||"").replace("T"," ").replace(/:\\d{2}(?:\\.\\d+)?$/,"");
            const limiteCancelacion=limitesCancelacionPedidos.get(String(pedido.id));
            const segundosRestantes=limiteCancelacion ? Math.max(0,Math.ceil((limiteCancelacion-Date.now())/1000)) : 0;
            const esCancelacionPermitida=pedido.metodo_pago==="Efectivo" && pedido.tipo_entrega==="Retiro";
            const botonCancelar=esCancelacionPermitida && segundosRestantes>0 && estadoPedido==="Pendiente" && estadoPago==="Pendiente"
                ? `<button type="button" class="pedido-cancelar-cliente" data-cancelacion-pedido="${Number(pedido.id)}" onclick="cancelarPedidoCliente(${Number(pedido.id)})">Cancelar pedido · ${formatearTiempoCancelacion(segundosRestantes)}</button>`
                : "";
            return `<article class="pedido-cliente">
                <div class="pedido-cabecera"><div><span class="cuenta-etiqueta">COMPRA</span><h3>Pedido #${Number(pedido.id)}</h3><time>${escaparHtml(fecha)}</time></div><span class="pedido-estado ${claseEstadoPedido}">${escaparHtml(estadoPedido)}</span></div>
                <div class="pedido-resumen"><div><span class="resumen-etiqueta">Total del pedido</span><strong>${Number(pedido.total||0).toFixed(2)} Bs.</strong></div><div><span class="resumen-etiqueta">Pago · ${escaparHtml(pedido.metodo_pago||"Sin especificar")}</span><strong class="estado-pago ${claseEstadoPago}">${escaparHtml(estadoPago)}</strong></div></div>
                <div class="pedido-detalles">${entrega}${comprobanteQr}</div>
                ${avisoListo}
                <div class="pedido-pie">${estadoFactura}${comprobante}</div>
                ${botonCancelar}
            </article>`;
        }).join("");
        actualizarTemporizadoresCancelacion();
    }catch(error){
        listaPedidosCliente.innerHTML=`<p role="alert">${escaparHtml(error.message)}</p>`;
    }
}

async function cancelarPedidoCliente(pedidoId){
    if(!Number.isInteger(Number(pedidoId)) || Number(pedidoId)<1) return;
    if(!confirm("¿Quieres cancelar este pedido? Esta acción no se puede deshacer.")) return;
    const boton=document.querySelector(`[data-cancelacion-pedido="${Number(pedidoId)}"]`);
    if(boton) boton.disabled=true;
    try{
        const resultado=await enviarCuenta("cancelar_pedido_cliente",{pedido_id:Number(pedidoId)});
        limitesCancelacionPedidos.delete(String(pedidoId));
        await cargarPedidosCliente();
        mostrarMensaje(resultado.mensaje || "Pedido cancelado correctamente.","exito");
    }catch(error){
        if(boton) boton.disabled=false;
        mostrarMensaje(error.message || "No se pudo cancelar el pedido.","error");
        await cargarPedidosCliente();
    }
}

botonNotificacionesCliente.addEventListener("click",()=>{
    panelNotificacionesCliente.hidden=!panelNotificacionesCliente.hidden;
    botonNotificacionesCliente.setAttribute("aria-expanded",String(!panelNotificacionesCliente.hidden));
    if(!panelNotificacionesCliente.hidden)cargarNotificacionesCliente();
});

listaNotificacionesCliente.addEventListener("click",async evento=>{
    const notificacion=evento.target.closest("[data-abrir-comprobante]");
    if(!notificacion)return;
    notificacion.disabled=true;
    try{
        const respuesta=await fetch("../api.php?action=marcar_notificacion_cliente_leida",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({notificacion_id:Number(notificacion.dataset.abrirComprobante)})
        });
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo abrir el comprobante.");
        window.location.href=`../comprobante_cliente.php?id=${Number(notificacion.dataset.pedido)}`;
    }catch(error){
        notificacion.disabled=false;
        mostrarMensaje(error.message,"error");
    }
});

activarNotificaciones.addEventListener("click",async ()=>{
    if(!("Notification" in window)){
        mostrarMensaje("Este navegador no permite notificaciones del sistema.","error");
        return;
    }
    const permiso=await Notification.requestPermission();
    mostrarMensaje(permiso==="granted" ? "Notificaciones activadas para avisarte cuando tu pedido esté listo." : "No se activaron las notificaciones del navegador. Los avisos seguirán apareciendo en Mi cuenta.",permiso==="granted" ? "exito" : "error");
});

async function enviarCuenta(accion, datos){
    const respuesta=await fetch(`../api.php?action=${accion}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(datos)
    });
    const resultado=await respuesta.json();
    if(!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo completar la solicitud.");
    return resultado;
}

async function iniciarRegistroGoogle(){
    if(googleInicializado || googleCargando) return;
    googleCargando=true;
    try{
        const respuestaConfiguracion=await fetch("../api.php?action=google_config");
        const configuracion=await respuestaConfiguracion.json();
        if(!respuestaConfiguracion.ok) throw new Error(configuracion.mensaje || "No se pudo cargar la configuración de Google.");
        if(!configuracion.client_id) throw new Error("Google no está configurado. Define GOOGLE_CLIENT_ID en las variables de entorno de Render.");
        if(!window.google?.accounts?.id){
            await new Promise((resolver,rechazar)=>{
                const script=document.createElement("script");
                script.src="https://accounts.google.com/gsi/client";
                script.onload=resolver;
                script.onerror=()=>rechazar(new Error("No se pudo cargar el acceso de Google."));
                document.head.appendChild(script);
            });
        }
        google.accounts.id.initialize({
            client_id:configuracion.client_id,
            callback:async respuesta=>{
                try{
                    const {cliente,creada}=await enviarCuenta("registro_google_cliente",{credential:respuesta.credential});
                    comprobarSesion(cliente);
                    mostrarMensaje(creada ? "Cuenta creada correctamente con Google." : "Inicio de sesión con Google correcto.","exito");
                }catch(error){
                    mostrarMensaje(error.message,"error");
                }
            }
        });
        googleRegistroAlternativo.hidden=true;
        googleSigninButton.hidden=false;
        googleEstado.hidden=true;
        google.accounts.id.renderButton(googleSigninButton,{type:"standard",theme:"outline",size:"large",text:"signup_with",shape:"rect",width:Math.min(320,googleSigninButton.clientWidth)});
        googleInicializado=true;
    }catch(error){
        googleError=error.message;
        googleEstado.textContent=googleError;
        googleEstado.hidden=false;
    }finally{
        googleCargando=false;
    }
}

googleRegistroAlternativo.addEventListener("click",()=>mostrarMensaje(googleError,"error"));

registroForm.addEventListener("submit",async (evento)=>{
    evento.preventDefault();

    if(!registroForm.reportValidity()) return;
    const nombre = document.getElementById("registroNombre").value.trim();
    const correo = document.getElementById("registroCorreo").value.trim().toLowerCase();
    const telefono = document.getElementById("registroTelefono").value.trim();
    const password = document.getElementById("registroPassword").value;
    const confirmar = document.getElementById("registroPasswordConfirmar").value;

    if(password !== confirmar){
        mostrarMensaje("Las contraseñas no coinciden.","error");
        return;
    }

    try{
        const {cliente}=await enviarCuenta("registro_cliente",{nombre,correo,telefono,password});
        comprobarSesion(cliente);
        registroForm.reset();
        mostrarMensaje("Cuenta creada correctamente.","exito");
    }catch(error){
        mostrarMensaje(error.message,"error");
    }
});

loginForm.addEventListener("submit",async (evento)=>{
    evento.preventDefault();

    const correo = document.getElementById("loginCorreo").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value;

    try{
        const {cliente}=await enviarCuenta("login_cliente",{correo,password});
        comprobarSesion(cliente);
        loginForm.reset();
        mostrarMensaje("Inicio de sesión correcto.","exito");
    }catch(error){
        mostrarMensaje(error.message,"error");
    }
});

cerrarSesion.addEventListener("click",async ()=>{
    try{
        await enviarCuenta("logout_cliente",{});
        comprobarSesion(null);
        mostrarMensaje("Sesión cerrada correctamente.","exito");
    }catch(error){
        mostrarMensaje(error.message,"error");
    }
});

mostrarRegistro.addEventListener("click",()=>{
    mostrarRegistroFormulario();
});

mostrarLogin.addEventListener("click",()=>{
    mostrarLoginFormulario();
});

mostrarAccesoPersonal.addEventListener("click",()=>{
    personalLoginForm.classList.remove("oculto");
    mostrarAccesoPersonal.hidden=true;
    document.getElementById("personalUsuarioCuenta").focus();
});

cancelarAccesoPersonal.addEventListener("click",()=>{
    personalLoginForm.reset();
    personalLoginForm.classList.add("oculto");
    mostrarAccesoPersonal.hidden=false;
});

personalLoginForm.addEventListener("submit",async evento=>{
    evento.preventDefault();
    const boton=personalLoginForm.querySelector('[type="submit"]');
    boton.disabled=true;
    try{
        const {usuario}=await enviarCuenta("login_personal",{
            usuario:document.getElementById("personalUsuarioCuenta").value.trim(),
            password:document.getElementById("personalPasswordCuenta").value
        });
        localStorage.setItem("sesionActiva","true");
        localStorage.setItem("usuarioAdmin",usuario.usuario);
        localStorage.setItem("usuarioNombre",usuario.nombre);
        localStorage.setItem("usuarioRol",usuario.rol);
        localStorage.setItem("ultimoAcceso",new Date().toLocaleString("es-BO"));
        sessionStorage.setItem("modoTiendaPestana","administrador");
        window.location.href=usuario.rol==="Repartidor" ? "../repartidor.html" : "../dashboard.html";
    }catch(error){
        mostrarMensaje(error.message,"error");
        boton.disabled=false;
    }
});

document.addEventListener("DOMContentLoaded",()=>{
    fetch("../api.php?action=cliente_sesion")
        .then(respuesta=>respuesta.json())
        .then(datos=>comprobarSesion(datos.cliente))
        .catch(error=>mostrarMensaje(error.message || "No se pudo comprobar la sesión.","error"));
});