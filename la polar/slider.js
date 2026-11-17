const contenedorSlidesInicio=document.getElementById("slidesInicio");
const indicadoresInicio=document.getElementById("indicadoresInicio");
const botonAnteriorInicio=document.querySelector(".prev");
const botonSiguienteInicio=document.querySelector(".next");
let indiceSlideInicio=0;
let intervaloSlideInicio;

function mostrarSlideInicio(numero){
    const slides=contenedorSlidesInicio?.querySelectorAll(".slide") || [];
    if(!slides.length) return;
    indiceSlideInicio=(numero+slides.length)%slides.length;
    slides.forEach((slide,indice)=>slide.classList.toggle("active",indice===indiceSlideInicio));
    indicadoresInicio?.querySelectorAll(".dot").forEach((dot,indice)=>dot.classList.toggle("active",indice===indiceSlideInicio));
}

function actualizarCarruselInicio(){
    const slides=contenedorSlidesInicio?.querySelectorAll(".slide") || [];
    if(!indicadoresInicio) return;
    indicadoresInicio.replaceChildren(...Array.from(slides,(_,indice)=>{
        const dot=document.createElement("button");
        dot.type="button";
        dot.className=`dot${indice===0?" active":""}`;
        dot.setAttribute("aria-label",`Ver imagen ${indice+1}`);
        dot.addEventListener("click",()=>{mostrarSlideInicio(indice);reiniciarCarruselInicio();});
        return dot;
    }));
    indiceSlideInicio=0;
    mostrarSlideInicio(0);
    reiniciarCarruselInicio();
}

function reiniciarCarruselInicio(){
    clearInterval(intervaloSlideInicio);
    intervaloSlideInicio=setInterval(()=>mostrarSlideInicio(indiceSlideInicio+1),3000);
}

botonSiguienteInicio?.addEventListener("click",()=>{mostrarSlideInicio(indiceSlideInicio+1);reiniciarCarruselInicio();});
botonAnteriorInicio?.addEventListener("click",()=>{
    const cantidad=contenedorSlidesInicio?.querySelectorAll(".slide").length || 1;
    mostrarSlideInicio(indiceSlideInicio+cantidad-1);
    reiniciarCarruselInicio();
});
document.addEventListener("inicio:colecciones-actualizadas",actualizarCarruselInicio);
document.addEventListener("DOMContentLoaded",actualizarCarruselInicio);
