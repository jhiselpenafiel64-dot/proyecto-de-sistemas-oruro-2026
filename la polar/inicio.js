const camposInicio = [
    {clave:"hero_titulo", etiqueta:"Título principal", seccion:"portada"},
    {clave:"hero_subtitulo", etiqueta:"Subtítulo", seccion:"portada"},
    {clave:"hero_descripcion", etiqueta:"Descripción", multilinea:true, seccion:"portada"},
    {clave:"hero_boton", etiqueta:"Texto del botón", seccion:"portada"},
    {clave:"promociones_titulo", etiqueta:"Título de la sección", seccion:"promociones"},
    {clave:"destacados_titulo", etiqueta:"Título de la sección", seccion:"destacados"},
    {clave:"contacto_titulo", etiqueta:"Título", seccion:"contacto"},
    {clave:"contacto_direccion", etiqueta:"Dirección", seccion:"contacto"},
    {clave:"contacto_dias", etiqueta:"Días de atención", seccion:"contacto"},
    {clave:"contacto_horario", etiqueta:"Horario", seccion:"contacto"},
    {clave:"contacto_boton", etiqueta:"Texto del botón", seccion:"contacto"},
    {clave:"footer_descripcion", etiqueta:"Pie: descripción", multilinea:true, seccion:"contacto"},
    {clave:"footer_horario", etiqueta:"Pie: horario", seccion:"contacto"},
    {clave:"footer_direccion", etiqueta:"Pie: dirección", seccion:"contacto"},
    {clave:"footer_sucursal", etiqueta:"Pie: sucursal", seccion:"contacto"},
    {clave:"footer_telefono", etiqueta:"Pie: teléfono", seccion:"contacto"},
    {clave:"footer_redes", etiqueta:"Redes sociales", tipo:"redes", opcional:true, ayuda:"Selecciona el icono de cada red y pega el enlace seguro (HTTPS) de su perfil. En la página se mostrarán solo los iconos enlazados.", seccion:"contacto"},
    {clave:"footer_copyright", etiqueta:"Pie: texto legal", seccion:"contacto"}
];

const editorInicio = document.getElementById("editorInicio");
const formularioEditorInicio = document.getElementById("formularioEditorInicio");
const camposEditorInicio = document.getElementById("camposEditorInicio");
const mensajeEditorInicio = document.getElementById("mensajeEditorInicio");
const botonAbrirEditorInicio = document.getElementById("abrirEditorInicio");
const botonVolverPanel = document.getElementById("volverPanelAdmin");
let contenidoInicio = {};
let diapositivasInicio = [];
let destacadosInicio = [];
let promocionesInicio = [];
let imagenContactoArchivo = null;
let imagenContactoPreview = "";
let redesSocialesInicio = [];

function obtenerContenidoPredeterminado(){
    const contenido={};
    document.querySelectorAll("[data-inicio-campo]").forEach(elemento=>contenido[elemento.dataset.inicioCampo]=elemento.textContent.trim());
    document.querySelectorAll("[data-inicio-imagen]").forEach(elemento=>contenido[elemento.dataset.inicioImagen]=elemento.getAttribute("src"));
    document.querySelectorAll("#slidesInicio .slide img").forEach((elemento,indice)=>contenido[`hero_imagen_${indice+1}`]=elemento.getAttribute("src"));
    return contenido;
}

function migrarColecciones(){
    if(!Array.isArray(contenidoInicio.hero_slides) || !contenidoInicio.hero_slides.length){
        contenidoInicio.hero_slides=Array.from({length:4},(_,indice)=>({imagen:contenidoInicio[`hero_imagen_${indice+1}`]}));
    }
    if(!Array.isArray(contenidoInicio.destacados) || !contenidoInicio.destacados.length){
        contenidoInicio.destacados=Array.from({length:4},(_,indice)=>({
            titulo:contenidoInicio[`destacado_${indice+1}_titulo`] || "",
            descripcion:contenidoInicio[`destacado_${indice+1}_descripcion`] || "",
            imagen:contenidoInicio[`destacado_${indice+1}_imagen`] || ""
        }));
    }
    if(!Array.isArray(contenidoInicio.promociones) || !contenidoInicio.promociones.length){
        contenidoInicio.promociones=[{
            titulo:"Promoción especial",
            descripcion:"Descubre nuestras ofertas y combos especiales. Consulta en tienda por las promociones vigentes.",
            imagen:contenidoInicio.historia_imagen || "historia2.jpg"
        }];
    }
    diapositivasInicio=contenidoInicio.hero_slides.map(item=>({imagen:item.imagen || ""}));
    destacadosInicio=contenidoInicio.destacados.map(item=>({...item}));
    promocionesInicio=contenidoInicio.promociones.map(item=>({...item}));
}

const iconosRedesSociales={
    instagram:{
        dominios:["instagram.com"],
        svg:'<rect x="3" y="3" width="18" height="18" rx="6"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1" class="icono-red-social-relleno"/>',
        trazo:true
    },
    facebook:{
        dominios:["facebook.com","fb.com"],
        svg:'<path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H7.7v3h2.7v8z"/>'
    },
    tiktok:{
        dominios:["tiktok.com"],
        svg:'<path d="M19.6 7.2a6.4 6.4 0 0 1-4-1.4v8.1a5.5 5.5 0 1 1-5.5-5.5c.4 0 .8 0 1.2.1v3a2.6 2.6 0 1 0 1.4 2.3V3h3a3.8 3.8 0 0 0 3.9 3.4z"/>'
    },
    youtube:{
        dominios:["youtube.com","youtu.be"],
        svg:'<path d="M23 7.1a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9A3 3 0 0 0 3.1 19c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9zM9.8 15.5v-7l6 3.5z"/>'
    },
    x:{
        dominios:["x.com","twitter.com"],
        svg:'<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.6 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.9zm-1.1 18h1.7L7.4 3.9H5.6z"/>'
    },
    whatsapp:{
        dominios:["whatsapp.com","wa.me"],
        svg:'<path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6a11.8 11.8 0 0 0 14-18.4zM12 20.8a9 9 0 0 1-4.6-1.3l-.3-.2-3.4.9.9-3.3-.2-.3A9 9 0 1 1 12 20.8zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.5-.1-.7.2-.7.9-.9 1.1-.3.2-.6.1a7.3 7.3 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5s-.7-1.6-1-2.2-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5c.7.3 1.2.5 1.7.6a4.1 4.1 0 0 0 1.9.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/>'
    },
    linkedin:{
        dominios:["linkedin.com"],
        svg:'<path d="M5.2 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM3.3 9h3.8v12H3.3zm6.1 0H13v1.6h.1a4.1 4.1 0 0 1 3.7-2c4 0 4.7 2.6 4.7 5.9V21h-3.8v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9.4z"/>'
    },
    pinterest:{
        dominios:["pinterest.com"],
        svg:'<path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.8.2-2.7l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.3 1.1.5 2 1.6 2 1.9 0 3.3-2.5 3.3-5.5 0-2.3-1.6-4.1-4.4-4.1-3.2 0-5.2 2.4-5.2 5.1 0 .9.3 1.9.8 2.4.2.3.3.4.2.7l-.2.9c-.1.3-.3.4-.6.3-1.4-.6-2-2.1-2-3.9 0-2.9 2.5-6.4 7.4-6.4 4 0 6.6 2.9 6.6 6.1 0 4.2-2.3 7.3-5.7 7.3-1.1 0-2.1-.6-2.5-1.3l-.7 2.8c-.2 1-.8 1.9-1.2 2.7A10 10 0 1 0 12 2z"/>'
    }
};

function identificarRedSocial(valor){
    try{
        const url=new URL(valor);
        if(url.protocol!=="https:") return null;
        const host=url.hostname.toLowerCase().replace(/^www\./,"");
        const red=Object.entries(iconosRedesSociales).find(([,configuracion])=>
            configuracion.dominios.some(dominio=>host===dominio || host.endsWith(`.${dominio}`))
        );
        return red ? {nombre:red[0],url:url.href,configuracion:red[1]} : null;
    }catch{
        return null;
    }
}

function crearIconoRedSocial(configuracion){
    const icono=document.createElementNS("http://www.w3.org/2000/svg","svg");
    icono.setAttribute("viewBox","0 0 24 24");
    icono.setAttribute("aria-hidden","true");
    if(configuracion.trazo){
        icono.setAttribute("fill","none");
        icono.setAttribute("stroke","currentColor");
        icono.setAttribute("stroke-width","2");
    }
    icono.innerHTML=configuracion.svg;
    return icono;
}

function cargarRedesSocialesEditor(valor){
    const nombresUsados=new Set();
    redesSocialesInicio=String(valor || "").split(/\r?\n/)
        .map(linea=>identificarRedSocial(linea.trim()))
        .filter(red=>{
            if(!red || nombresUsados.has(red.nombre)) return false;
            nombresUsados.add(red.nombre);
            return true;
        })
        .map(red=>({nombre:red.nombre,url:red.url}));
}

function actualizarValorRedesSociales(){
    contenidoInicio.footer_redes=redesSocialesInicio.map(red=>red.url.trim()).filter(Boolean).join("\n");
    document.querySelectorAll('[data-inicio-campo="footer_redes"]').forEach(contenedor=>
        renderizarRedesSociales(contenedor,contenidoInicio.footer_redes)
    );
}

function crearEditorRedesSociales(){
    const editor=document.createElement("div");
    editor.className="editor-inicio-redes";
    const lista=document.createElement("div");
    lista.className="editor-inicio-redes-lista";
    redesSocialesInicio.forEach((red,indice)=>{
        const configuracion=iconosRedesSociales[red.nombre];
        if(!configuracion) return;
        const fila=document.createElement("div");
        fila.className="editor-inicio-red-social";
        const icono=document.createElement("span");
        icono.className="editor-inicio-red-social-icono";
        icono.title=red.nombre;
        icono.appendChild(crearIconoRedSocial(configuracion));
        const enlace=document.createElement("input");
        enlace.type="url";
        enlace.value=red.url;
        enlace.placeholder=`https://www.${configuracion.dominios[0]}/tu_perfil`;
        enlace.maxLength=300;
        enlace.required=true;
        enlace.setAttribute("aria-label",`Enlace de ${red.nombre}`);
        const validarEnlace=()=>{
            const reconocida=identificarRedSocial(enlace.value);
            enlace.setCustomValidity(enlace.value && (!reconocida || reconocida.nombre!==red.nombre)
                ? `Ingresa un enlace HTTPS válido de ${red.nombre}.`
                : "");
        };
        enlace.addEventListener("input",()=>{
            red.url=enlace.value.trim();
            validarEnlace();
            actualizarValorRedesSociales();
        });
        validarEnlace();
        const quitar=document.createElement("button");
        quitar.type="button";
        quitar.className="editor-inicio-red-social-quitar";
        quitar.textContent="Quitar";
        quitar.setAttribute("aria-label",`Quitar ${red.nombre}`);
        quitar.addEventListener("click",()=>{
            redesSocialesInicio.splice(indice,1);
            renderizarEditorInicio("contacto");
            actualizarValorRedesSociales();
        });
        fila.append(icono,enlace,quitar);
        lista.appendChild(fila);
    });
    const agregar=document.createElement("div");
    agregar.className="editor-inicio-redes-agregar";
    Object.entries(iconosRedesSociales).forEach(([nombre,configuracion])=>{
        const boton=document.createElement("button");
        boton.type="button";
        boton.className="editor-inicio-red-social-agregar";
        boton.title=`Agregar ${nombre}`;
        boton.setAttribute("aria-label",`Agregar ${nombre}`);
        boton.appendChild(crearIconoRedSocial(configuracion));
        boton.disabled=redesSocialesInicio.some(red=>red.nombre===nombre);
        boton.addEventListener("click",()=>{
            if(boton.disabled) return;
            redesSocialesInicio.push({nombre,url:""});
            renderizarEditorInicio("contacto");
            actualizarValorRedesSociales();
            const entradas=camposEditorInicio.querySelectorAll(".editor-inicio-red-social input");
            entradas[entradas.length-1]?.focus();
        });
        agregar.appendChild(boton);
    });
    editor.append(lista,agregar);
    return editor;
}

function renderizarRedesSociales(contenedor,valor){
    const enlaces=String(valor || "").split(/\r?\n/)
        .map(linea=>identificarRedSocial(linea.trim()))
        .filter(Boolean);
    contenedor.replaceChildren(...enlaces.map(({nombre,url,configuracion})=>{
        const enlace=document.createElement("a");
        enlace.href=url;
        enlace.target="_blank";
        enlace.rel="noopener noreferrer";
        enlace.setAttribute("aria-label",`Visitar ${nombre}`);
        enlace.title=nombre.charAt(0).toUpperCase()+nombre.slice(1);
        enlace.appendChild(crearIconoRedSocial(configuracion));
        return enlace;
    }));
    contenedor.hidden=enlaces.length===0;
}

function aplicarContenidoInicio(contenido){
    document.querySelectorAll("[data-inicio-campo]").forEach(elemento=>{
        const valor=contenido[elemento.dataset.inicioCampo];
        if(typeof valor==="string"){
            if(elemento.dataset.inicioCampo==="footer_redes"){
                renderizarRedesSociales(elemento,valor);
                return;
            }
            elemento.textContent=valor.replace(/La Polar/gi,"Dulce Vita");
            if(elemento.hasAttribute("data-inicio-ocultar-vacio")) elemento.hidden=valor.trim()==="";
        }
    });
    document.querySelectorAll("[data-inicio-imagen]").forEach(elemento=>{
        const valor=contenido[elemento.dataset.inicioImagen];
        if(typeof valor==="string") elemento.src=valor;
    });
    const contenedorSlides=document.getElementById("slidesInicio");
    contenedorSlides.replaceChildren(...diapositivasInicio.map((slide,indice)=>{
        const wrapper=document.createElement("div");
        wrapper.className=`slide${indice===0?" active":""}`;
        const imagen=document.createElement("img");
        imagen.src=slide.imagen;
        imagen.alt=`Imagen ${indice+1} de Dulce Vita`;
        wrapper.appendChild(imagen);
        return wrapper;
    }));
    document.getElementById("destacadosInicio").replaceChildren(...destacadosInicio.map((producto,indice)=>{
        const tarjeta=document.createElement("div");
        tarjeta.className="card";
        const imagen=document.createElement("img");
        imagen.src=producto.imagen;
        imagen.alt=producto.titulo || `Producto destacado ${indice+1}`;
        const titulo=document.createElement("h3");
        titulo.textContent=producto.titulo;
        const descripcion=document.createElement("p");
        descripcion.textContent=producto.descripcion;
        tarjeta.append(imagen,titulo,descripcion);
        return tarjeta;
    }));
    document.getElementById("promocionesInicio").replaceChildren(...promocionesInicio.map((promocion,indice)=>{
        const tarjeta=document.createElement("article");
        tarjeta.className="promocion-card";
        const contenedorImagen=document.createElement("div");
        contenedorImagen.className="promocion-imagen-contenedor";
        const imagen=document.createElement("img");
        imagen.src=promocion.imagen;
        imagen.alt=promocion.titulo || `Promoción ${indice+1}`;
        const etiqueta=document.createElement("span");
        etiqueta.className="promocion-etiqueta";
        etiqueta.textContent="Promoción";
        contenedorImagen.append(imagen,etiqueta);
        const contenido=document.createElement("div");
        contenido.className="promocion-contenido";
        const titulo=document.createElement("h3");
        titulo.textContent=promocion.titulo;
        const descripcion=document.createElement("p");
        descripcion.textContent=promocion.descripcion;
        contenido.append(titulo,descripcion);
        tarjeta.append(contenedorImagen,contenido);
        return tarjeta;
    }));
    document.dispatchEvent(new Event("inicio:colecciones-actualizadas"));
}

function crearCampoTexto(campo){
    const label=document.createElement("label");
    label.className="editor-inicio-campo";
    label.append(document.createTextNode(campo.etiqueta));
    if(campo.tipo==="redes"){
        label.appendChild(crearEditorRedesSociales());
        if(campo.ayuda){
            const ayuda=document.createElement("small");
            ayuda.textContent=campo.ayuda;
            label.appendChild(ayuda);
        }
        return label;
    }
    const control=campo.multilinea ? document.createElement("textarea") : document.createElement("input");
    control.name=campo.clave;
    control.value=contenidoInicio[campo.clave] || "";
    control.required=!campo.opcional;
    control.maxLength=campo.multilinea ? 1000 : 300;
    control.addEventListener("input",()=>{contenidoInicio[campo.clave]=control.value;});
    label.appendChild(control);
    if(campo.ayuda){
        const ayuda=document.createElement("small");
        ayuda.textContent=campo.ayuda;
        label.appendChild(ayuda);
    }
    return label;
}

function crearTarjetaImagen(tipo,indice,item){
    const tarjeta=document.createElement("article");
    tarjeta.className="editor-inicio-imagen";
    const cabecera=document.createElement("div");
    cabecera.className="editor-inicio-imagen-cabecera";
    const titulo=document.createElement("strong");
    const esPortada=tipo==="portada";
    const esPromocion=tipo==="promocion";
    titulo.textContent=esPortada ? `Imagen de portada ${indice+1}` : `${esPromocion?"Promoción":"Destacado"} ${indice+1}`;
    const quitar=document.createElement("button");
    quitar.type="button";
    quitar.className="editor-inicio-quitar";
    quitar.textContent="Quitar";
    quitar.setAttribute("aria-label",`Quitar ${titulo.textContent.toLowerCase()}`);
    quitar.addEventListener("click",()=>{
        const lista=esPortada?diapositivasInicio:(esPromocion?promocionesInicio:destacadosInicio);
        lista.splice(indice,1);
        const seccion=esPortada?"portada":(esPromocion?"promociones":"destacados");
        renderizarEditorInicio(seccion);
        if(!lista.length) agregarImagen(tipo);
    });
    cabecera.append(titulo,quitar);
    const imagen=document.createElement("img");
    imagen.className="editor-inicio-miniatura";
    imagen.src=item.imagenPreview || item.imagen || "";
    imagen.alt=`Vista previa de ${titulo.textContent.toLowerCase()}`;
    const archivo=document.createElement("input");
    archivo.type="file";
    archivo.accept="image/jpeg,image/png,image/webp";
    archivo.dataset.tipoImagen=tipo;
    archivo.dataset.indice=indice;
    archivo.setAttribute("aria-label",`Seleccionar imagen para ${titulo.textContent.toLowerCase()}`);
    archivo.addEventListener("change",()=>{
        const file=archivo.files[0];
        if(!file) return;
        if(file.size>5*1024*1024){
            archivo.value="";
            mensajeEditorInicio.textContent="La imagen debe pesar como máximo 5 MB.";
            mensajeEditorInicio.className="editor-inicio-mensaje error";
            return;
        }
        item.imagenArchivo=file;
        item.imagenPreview=URL.createObjectURL(file);
        imagen.src=item.imagenPreview;
    });
    const ayuda=document.createElement("small");
    ayuda.textContent="Imagen publicada. Elige otra para reemplazarla (JPG, PNG o WebP, máximo 5 MB).";
    tarjeta.append(cabecera,imagen,archivo,ayuda);
    if(tipo==="destacado" || tipo==="promocion"){
        ["titulo","descripcion"].forEach(propiedad=>{
            const label=document.createElement("label");
            label.className="editor-inicio-campo";
            label.append(document.createTextNode(propiedad==="titulo"?(esPromocion?"Nombre de la promoción":"Nombre del producto"):"Descripción"));
            const campo=propiedad==="descripcion" ? document.createElement("textarea") : document.createElement("input");
            campo.value=item[propiedad] || "";
            campo.required=true;
            campo.maxLength=propiedad==="descripcion"?1000:200;
            campo.dataset.propiedad=propiedad;
            campo.addEventListener("input",()=>{item[propiedad]=campo.value;});
            label.appendChild(campo);
            tarjeta.appendChild(label);
        });
    }
    return tarjeta;
}

function agregarImagen(tipo){
    const lista=tipo==="portada"?diapositivasInicio:(tipo==="promocion"?promocionesInicio:destacadosInicio);
    const limite=tipo==="portada"?8:12;
    if(lista.length>=limite){
        mensajeEditorInicio.textContent=`Puedes agregar hasta ${limite} ${tipo==="portada"?"imágenes de portada":(tipo==="promocion"?"promociones":"productos destacados")}.`;
        mensajeEditorInicio.className="editor-inicio-mensaje error";
        return;
    }
    lista.push(tipo==="portada"?{imagen:""}:{imagen:"",titulo:"",descripcion:""});
    renderizarEditorInicio(tipo==="portada"?"portada":(tipo==="promocion"?"promociones":"destacados"));
    const ultima=camposEditorInicio.querySelectorAll(`.editor-inicio-imagen input[type="file"]`);
    ultima[ultima.length-1]?.click();
}

function renderizarEditorInicio(seccionActiva="portada"){
    camposEditorInicio.replaceChildren();
    document.querySelectorAll("[data-editor-seccion]").forEach(boton=>boton.classList.toggle("activa",boton.dataset.editorSeccion===seccionActiva));
    camposInicio.filter(campo=>campo.seccion===seccionActiva).forEach(campo=>camposEditorInicio.appendChild(crearCampoTexto(campo)));
    if(seccionActiva==="contacto"){
        const fieldset=document.createElement("fieldset");
        const legend=document.createElement("legend");
        legend.textContent="Imagen del espacio Contáctanos";
        const ayuda=document.createElement("p");
        ayuda.className="editor-inicio-ayuda";
        ayuda.textContent="Esta fotografía aparece junto a la dirección y los horarios de atención.";
        const tarjeta=document.createElement("article");
        tarjeta.className="editor-inicio-imagen editor-inicio-contacto-imagen";
        const imagen=document.createElement("img");
        imagen.className="editor-inicio-miniatura";
        imagen.src=imagenContactoPreview || contenidoInicio.contacto_imagen || "";
        imagen.alt="Vista previa de la imagen del espacio Contáctanos";
        const archivo=document.createElement("input");
        archivo.type="file";
        archivo.name="imagen_contacto_imagen";
        archivo.accept="image/jpeg,image/png,image/webp";
        archivo.setAttribute("aria-label","Seleccionar imagen para el espacio Contáctanos");
        archivo.addEventListener("change",()=>{
            const file=archivo.files[0];
            if(!file) return;
            if(file.size>5*1024*1024){
                archivo.value="";
                mensajeEditorInicio.textContent="La imagen debe pesar como máximo 5 MB.";
                mensajeEditorInicio.className="editor-inicio-mensaje error";
                return;
            }
            imagenContactoArchivo=file;
            imagenContactoPreview=URL.createObjectURL(file);
            imagen.src=imagenContactoPreview;
        });
        const nota=document.createElement("small");
        nota.textContent="Selecciona otra imagen para reemplazarla (JPG, PNG o WebP, máximo 5 MB).";
        tarjeta.append(imagen,archivo,nota);
        fieldset.append(legend,ayuda,tarjeta);
        camposEditorInicio.appendChild(fieldset);
    }
    if(seccionActiva==="portada" || seccionActiva==="destacados" || seccionActiva==="promociones"){
        const tipo=seccionActiva==="portada"?"portada":(seccionActiva==="promociones"?"promocion":"destacado");
        const lista=tipo==="portada"?diapositivasInicio:(tipo==="promocion"?promocionesInicio:destacadosInicio);
        const fieldset=document.createElement("fieldset");
        const legend=document.createElement("legend");
        legend.textContent=tipo==="portada"?"Imágenes de portada":(tipo==="promocion"?"Promociones publicadas":"Productos destacados");
        const ayuda=document.createElement("p");
        ayuda.className="editor-inicio-ayuda";
        ayuda.textContent=tipo==="portada"
            ?"Reemplaza, quita o agrega imágenes al carrusel."
            :(tipo==="promocion"
                ?"Cambia la imagen, el nombre y la descripción de cada promoción, o agrega más."
                :"Edita las tarjetas: cambia su foto, nombre y descripción, o agrega nuevas.");
        const tarjetas=document.createElement("div");
        tarjetas.className="editor-inicio-galeria";
        lista.forEach((item,indice)=>tarjetas.appendChild(crearTarjetaImagen(tipo,indice,item)));
        const agregar=document.createElement("button");
        agregar.type="button";
        agregar.className="editor-inicio-agregar";
        agregar.textContent=tipo==="portada"?"+ Agregar imagen de portada":(tipo==="promocion"?"+ Agregar promoción":"+ Agregar producto destacado");
        agregar.addEventListener("click",()=>agregarImagen(tipo));
        fieldset.append(legend,ayuda,tarjetas,agregar);
        camposEditorInicio.appendChild(fieldset);
    }
}

async function consultarJson(url,opciones){
    const respuesta=await fetch(url,opciones);
    const datos=await respuesta.json();
    if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo completar la solicitud.");
    return datos;
}

async function iniciarEditorInicio(){
    contenidoInicio=obtenerContenidoPredeterminado();
    const cargaContenido=consultarJson("../api.php?action=inicio_contenido")
        .then(resultado=>{
            if(resultado.contenido) contenidoInicio={...contenidoInicio,...resultado.contenido};
            Object.keys(contenidoInicio).forEach(clave=>{
                if(typeof contenidoInicio[clave]==="string") contenidoInicio[clave]=contenidoInicio[clave].replace(/La Polar/gi,"Dulce Vita");
            });
            cargarRedesSocialesEditor(contenidoInicio.footer_redes);
            migrarColecciones();
            aplicarContenidoInicio(contenidoInicio);
        })
        .catch(error=>{
            console.error("No se pudo cargar el contenido guardado de la página de inicio:",error);
            mensajeEditorInicio.textContent=`No se pudo cargar el contenido guardado. Verifica la base de datos: ${error.message}`;
            mensajeEditorInicio.className="editor-inicio-mensaje error";
            migrarColecciones();
            aplicarContenidoInicio(contenidoInicio);
        });
    try{
        const sesion=await consultarJson("../api.php?action=sesion_catalogo_admin");
        if(sesion.autenticado && sessionStorage.getItem("modoTiendaPestana")==="administrador"){
            botonAbrirEditorInicio.hidden=false;
            botonVolverPanel.hidden=false;
            renderizarEditorInicio();
        }
    }catch(error){
        console.error("No se pudo verificar la sesión administrativa para el editor:",error);
    }
    await cargaContenido;
    if(!editorInicio.hidden) renderizarEditorInicio();
}

document.querySelectorAll("[data-editor-seccion]").forEach(boton=>boton.addEventListener("click",()=>renderizarEditorInicio(boton.dataset.editorSeccion)));
botonAbrirEditorInicio.addEventListener("click",()=>{
    editorInicio.hidden=false;
    editorInicio.scrollIntoView({behavior:"smooth",block:"start"});
});
document.getElementById("cerrarEditorInicio").addEventListener("click",()=>{editorInicio.hidden=true;});
document.getElementById("vistaPreviaInicio").addEventListener("click",()=>{
    diapositivasInicio.forEach((item,indice)=>{
        if(item.imagenPreview) item.imagen=item.imagenPreview;
    });
    destacadosInicio.forEach((item,indice)=>{
        if(item.imagenPreview) item.imagen=item.imagenPreview;
    });
    promocionesInicio.forEach(item=>{
        if(item.imagenPreview) item.imagen=item.imagenPreview;
    });
    if(imagenContactoPreview){
        document.querySelector('[data-inicio-imagen="contacto_imagen"]').src=imagenContactoPreview;
    }
    aplicarContenidoInicio(contenidoInicio);
    document.querySelector(".hero").scrollIntoView({behavior:"smooth",block:"start"});
});

formularioEditorInicio.addEventListener("submit",async evento=>{
    evento.preventDefault();
    const boton=document.getElementById("guardarInicio");
    boton.disabled=true;
    mensajeEditorInicio.textContent="Publicando cambios...";
    mensajeEditorInicio.className="editor-inicio-mensaje";
    const datosFormulario=new FormData(formularioEditorInicio);
    const siguienteContenido={...contenidoInicio};
    camposInicio.forEach(campo=>{siguienteContenido[campo.clave]=String(contenidoInicio[campo.clave] || "").trim();});
    siguienteContenido.footer_redes=redesSocialesInicio.map(red=>red.url.trim()).filter(Boolean).join("\n");
    const formulario=new FormData();
    if(imagenContactoArchivo) formulario.append("imagen_contacto_imagen",imagenContactoArchivo);
    const slidesPayload=diapositivasInicio.map((slide,indice)=>{
        if(slide.imagenArchivo) formulario.append(`imagen_hero_slides_${indice}`,slide.imagenArchivo);
        return {imagen:slide.imagenPreview ? (contenidoInicio.hero_slides?.[indice]?.imagen || "") : (slide.imagen || contenidoInicio.hero_slides?.[indice]?.imagen || "")};
    });
    const destacadosPayload=destacadosInicio.map((item,indice)=>{
        if(item.imagenArchivo) formulario.append(`imagen_destacados_${indice}`,item.imagenArchivo);
        return {titulo:item.titulo.trim(),descripcion:item.descripcion.trim(),imagen:item.imagenPreview ? (contenidoInicio.destacados?.[indice]?.imagen || "") : (item.imagen || contenidoInicio.destacados?.[indice]?.imagen || "")};
    });
    const promocionesPayload=promocionesInicio.map((item,indice)=>{
        if(item.imagenArchivo) formulario.append(`imagen_promociones_${indice}`,item.imagenArchivo);
        return {titulo:item.titulo.trim(),descripcion:item.descripcion.trim(),imagen:item.imagenPreview ? (contenidoInicio.promociones?.[indice]?.imagen || "") : (item.imagen || contenidoInicio.promociones?.[indice]?.imagen || "")};
    });
    siguienteContenido.hero_slides=slidesPayload;
    siguienteContenido.destacados=destacadosPayload;
    siguienteContenido.promociones=promocionesPayload;
    for(let indice=0;indice<4;indice++){
        const slide=diapositivasInicio[indice] || contenidoInicio.hero_slides?.[indice];
        if(slide?.imagen) siguienteContenido[`hero_imagen_${indice+1}`]=slide.imagen;
        const producto=destacadosInicio[indice] || contenidoInicio.destacados?.[indice];
        if(producto){
            siguienteContenido[`destacado_${indice+1}_titulo`]=producto.titulo;
            siguienteContenido[`destacado_${indice+1}_descripcion`]=producto.descripcion;
            if(producto.imagen) siguienteContenido[`destacado_${indice+1}_imagen`]=producto.imagen;
        }
    }
    formulario.append("contenido",JSON.stringify(siguienteContenido));
    datosFormulario.forEach((valor,clave)=>{
        if(clave.startsWith("imagen_") && clave!=="imagen_contacto_imagen" && valor instanceof File && valor.size) formulario.append(clave,valor);
    });
    try{
        const resultado=await consultarJson("../api.php?action=guardar_inicio_contenido",{method:"POST",body:formulario});
        contenidoInicio=resultado.contenido;
        cargarRedesSocialesEditor(contenidoInicio.footer_redes);
        imagenContactoArchivo=null;
        imagenContactoPreview="";
        migrarColecciones();
        aplicarContenidoInicio(contenidoInicio);
        renderizarEditorInicio(document.querySelector("[data-editor-seccion].activa")?.dataset.editorSeccion || "portada");
        mensajeEditorInicio.textContent="Cambios publicados correctamente.";
        mensajeEditorInicio.className="editor-inicio-mensaje exito";
    }catch(error){
        mensajeEditorInicio.textContent=error.message;
        mensajeEditorInicio.className="editor-inicio-mensaje error";
    }finally{
        boton.disabled=false;
    }
});
document.addEventListener("DOMContentLoaded",iniciarEditorInicio);
