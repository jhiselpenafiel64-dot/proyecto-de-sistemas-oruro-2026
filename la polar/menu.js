const parametrosModoTienda = new URLSearchParams(window.location.search);
const modoSolicitado = parametrosModoTienda.get("modo");
if(modoSolicitado==="administrador" || modoSolicitado==="cliente"){
    sessionStorage.setItem("modoTiendaPestana",modoSolicitado);
}else{
    sessionStorage.setItem("modoTiendaPestana","cliente");
}

window.actualizarEnlacesModoTienda=()=>{
    const modo=sessionStorage.getItem("modoTiendaPestana");
    document.querySelectorAll("a[href]").forEach(enlace=>{
        if(enlace.getAttribute("href").startsWith("#")){
            return;
        }
        const destino=new URL(enlace.href,window.location.href);
        if(destino.origin!==window.location.origin
            || !destino.pathname.startsWith(new URL(".",window.location.href).pathname)){
            return;
        }
        destino.searchParams.set("modo",modo);
        enlace.href=destino.href;
    });
};

document.addEventListener(
"DOMContentLoaded",
()=>{
const botonMenu =
document.getElementById("menuBtn");
const menu =
document.getElementById("menu");
window.actualizarEnlacesModoTienda();
if(!botonMenu || !menu){
    return;
}
botonMenu.addEventListener(
"click",
()=>{
    menu.classList.toggle(
    "activo"
    );
});
const enlaces =
menu.querySelectorAll("a");
enlaces.forEach(enlace=>{
    enlace.addEventListener(
    "click",
    ()=>{
        menu.classList.remove(
        "activo"
        );
    });
});
document.addEventListener(
"click",
(evento)=>{
    if(
    !menu.contains(evento.target)
    &&
    !botonMenu.contains(evento.target)
    ){
        menu.classList.remove(
        "activo"
        );
    }
});
});