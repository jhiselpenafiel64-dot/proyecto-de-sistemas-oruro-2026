function verificarAutenticacion(){

    const sesion = localStorage.getItem("sesionActiva");
    const pagina = window.location.pathname.toLowerCase();
    const esPaginaDelivery = pagina.endsWith("repartidor.html");

    if(sesion!=="true"){

        window.location.href="la%20polar/cuenta.html";

        return;

    }
    if(obtenerRolActual()==="Repartidor" && !esPaginaDelivery){
        window.location.href="repartidor.html";
        return;
    }
    if(obtenerRolActual()!=="Repartidor" && esPaginaDelivery){
        window.location.href="dashboard.html";
    }

}
function obtenerUsuarioActual(){

    return localStorage.getItem("usuarioAdmin") || "Administrador";

}

function obtenerRolActual(){
    return localStorage.getItem("usuarioRol") || "Vendedor";
}

function esAdministrador(){
    return obtenerRolActual()==="Administrador";
}
function cargarAdministrador(){

    const nombre=document.getElementById("nombreAdministrador");

    if(nombre){

        nombre.textContent=obtenerUsuarioActual();

    }

}
function cerrarSesion(){

    const confirmar = confirm(

        "¿Está seguro de cerrar sesión?"

    );

    if(!confirmar){

        return;

    }

    fetch("api.php?action=logout_admin",{method:"POST"})
        .then(async respuesta=>{
            const datos=await respuesta.json();
            if(!respuesta.ok || !datos.ok){
                throw new Error(datos.mensaje || "No se pudo cerrar la sesión administrativa.");
            }
            ["sesionActiva","usuarioAdmin","usuarioNombre","usuarioRol","ultimoAcceso"]
                .forEach(clave=>localStorage.removeItem(clave));
            window.location.href="la%20polar/cuenta.html";
        })
        .catch(error=>alert(error.message));

}

function aplicarPermisos(){
    const enlacesConfiguracion=document.querySelectorAll('a[href="configuracion.html"]');
    if(localStorage.getItem("sesionActiva")!=="true"){
        enlacesConfiguracion.forEach(enlace=>enlace.hidden=true);
        return;
    }
    const vendedor=!esAdministrador();
    document.querySelectorAll('a[href="usuarios.html"],a[href="reportes.html"],a[href="inventario.html"]').forEach(enlace=>{
        if(vendedor) enlace.remove();
    });
    enlacesConfiguracion.forEach(enlace=>{
        if(vendedor){
            enlace.remove();
        }else{
            enlace.hidden=false;
        }
    });
    const pagina=window.location.pathname.toLowerCase();
    if(vendedor && (pagina.endsWith("usuarios.html") || pagina.endsWith("reportes.html") || pagina.endsWith("inventario.html") || pagina.endsWith("configuracion.html"))){
        window.location.href="dashboard.html";
    }
    if(obtenerRolActual()==="Repartidor" && !pagina.endsWith("repartidor.html")){
        window.location.href="repartidor.html";
    }
}

function agregarBotonCerrarSesion(){
    if(document.getElementById("btnCerrarSesion")) return;
    const boton=document.createElement("button");
    boton.id="btnCerrarSesion";
    boton.type="button";
    boton.className="btn btn-outline-danger btn-sm ms-auto";
    boton.innerHTML='<i class="bi bi-box-arrow-right me-2"></i>Cerrar sesión';
    boton.addEventListener("click",cerrarSesion);
    const barra=document.querySelector("nav");
    const cabecera=document.querySelector("main > .d-flex.justify-content-between");
    (barra || cabecera || document.body).appendChild(boton);
}


function cargarUltimoAcceso(){

    const ultimoAcceso =

    localStorage.getItem(

        "ultimoAcceso"

    );

    const elemento =

    document.getElementById(

        "ultimoAcceso"

    );

    if(elemento){

        if(ultimoAcceso){

            elemento.textContent=

            ultimoAcceso;

        }

        else{

            elemento.textContent=

            "Primer acceso";

        }

    }

}

document.addEventListener(

"DOMContentLoaded",

()=>{

    verificarAutenticacion();

    cargarAdministrador();

    cargarUltimoAcceso();

    aplicarPermisos();

    if(!window.location.pathname.toLowerCase().endsWith("repartidor.html")){
        agregarBotonCerrarSesion();
    }

});


const btnCerrarSesion =

document.getElementById(

"btnCerrarSesion"

);

if(btnCerrarSesion){

    btnCerrarSesion.addEventListener(

    "click",

    cerrarSesion

    );

}


window.cerrarSesion =
cerrarSesion;

window.verificarAutenticacion =
verificarAutenticacion;

window.cargarAdministrador =
cargarAdministrador;

window.cargarUltimoAcceso =
cargarUltimoAcceso;

window.obtenerUsuarioActual =
obtenerUsuarioActual;

window.obtenerRolActual = obtenerRolActual;

window.esAdministrador = esAdministrador;

function actualizarHeader(){

    const nombreAdministrador =

    document.getElementById(

    "nombreAdministrador"

    );

    const ultimoAcceso =

    document.getElementById(

    "ultimoAcceso"

    );

    if(nombreAdministrador){

        nombreAdministrador.textContent =

        obtenerUsuarioActual();

    }

    if(ultimoAcceso){

        ultimoAcceso.textContent =

        localStorage.getItem(

        "ultimoAcceso"

        ) || "Primer acceso";

    }

}


window.addEventListener(

"storage",

function(event){

    if(

        event.key==="sesionActiva" &&

        event.newValue!=="true"

    ){

        window.location.href="la%20polar/cuenta.html";

    }

});


window.history.pushState(

null,

null,

window.location.href

);

window.onpopstate=function(){

    window.history.pushState(

        null,

        null,

        window.location.href

    );

};


window.addEventListener(

"DOMContentLoaded",

()=>{

    verificarAutenticacion();

    actualizarHeader();

});


window.actualizarHeader =
actualizarHeader;

window.obtenerUsuarioActual =
obtenerUsuarioActual;

window.verificarAutenticacion =
verificarAutenticacion;

window.cerrarSesion =
cerrarSesion;