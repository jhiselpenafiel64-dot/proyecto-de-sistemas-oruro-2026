const iconosRedesEmpresa={
    instagram:{dominios:["instagram.com"],svg:'<rect x="3" y="3" width="18" height="18" rx="6"/><circle cx="12" cy="12" r="4"/><circle cx="18" cy="6" r="1"/>' ,trazo:true},
    facebook:{dominios:["facebook.com","fb.com"],svg:'<path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H7.7v3h2.7v8z"/>'},
    tiktok:{dominios:["tiktok.com"],svg:'<path d="M19.6 7.2a6.4 6.4 0 0 1-4-1.4v8.1a5.5 5.5 0 1 1-5.5-5.5c.4 0 .8 0 1.2.1v3a2.6 2.6 0 1 0 1.4 2.3V3h3a3.8 3.8 0 0 0 3.9 3.4z"/>'},
    youtube:{dominios:["youtube.com","youtu.be"],svg:'<path d="M23 7.1a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.9A3 3 0 0 0 3.1 19c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.9 31 31 0 0 0-.5-4.9zM9.8 15.5v-7l6 3.5z"/>'},
    x:{dominios:["x.com","twitter.com"],svg:'<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.6 22H2.4l7.3-8.4L1.9 2h6.5l4.5 6.9zm-1.1 18h1.7L7.4 3.9H5.6z"/>'},
    whatsapp:{dominios:["whatsapp.com","wa.me"],svg:'<path d="M20.5 3.5A11.8 11.8 0 0 0 2 17.7L.5 23.5l6-1.6a11.8 11.8 0 0 0 14-18.4zM12 20.8a9 9 0 0 1-4.6-1.3l-.3-.2-3.4.9.9-3.3-.2-.3A9 9 0 1 1 12 20.8zm5-6.7c-.3-.1-1.6-.8-1.9-.9s-.5-.1-.7.2-.7.9-.9 1.1-.3.2-.6.1a7.3 7.3 0 0 1-2.2-1.4 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.4.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5s-.7-1.6-1-2.2-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.8.4 3.4 3.4 0 0 0-1.1 2.5 5.9 5.9 0 0 0 1.2 3.1 13.4 13.4 0 0 0 5.1 4.5c.7.3 1.2.5 1.7.6a4.1 4.1 0 0 0 1.9.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3z"/>'},
    linkedin:{dominios:["linkedin.com"],svg:'<path d="M5.2 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM3.3 9h3.8v12H3.3zm6.1 0H13v1.6h.1a4.1 4.1 0 0 1 3.7-2c4 0 4.7 2.6 4.7 5.9V21h-3.8v-5.8c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9.4z"/>'},
    pinterest:{dominios:["pinterest.com"],svg:'<path d="M12 2a10 10 0 0 0-3.6 19.3c0-.8 0-1.8.2-2.7l1.3-5.4s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.5-.3 1.1.5 2 1.6 2 1.9 0 3.3-2.5 3.3-5.5 0-2.3-1.6-4.1-4.4-4.1-3.2 0-5.2 2.4-5.2 5.1 0 .9.3 1.9.8 2.4.2.2.3.4.2.7l-.2.9c-.1.3-.3.4-.6.3-1.4-.6-2-2.1-2-3.9 0-2.9 2.5-6.4 7.4-6.4 4 0 6.6 2.9 6.6 6.1 0 4.2-2.3 7.3-5.7 7.3-1.1 0-2.1-.6-2.5-1.3l-.7 2.8c-.2 1-.8 1.9-1.2 2.7A10 10 0 1 0 12 2z"/>'}
};

function renderizarRedesEmpresa(contenedor,valor){
    const enlaces=String(valor||"").split(/\r?\n/).map(linea=>{
        try{
            const url=new URL(linea.trim());
            if(url.protocol!=="https:")return null;
            const dominio=url.hostname.toLowerCase().replace(/^www\./,"");
            const red=Object.entries(iconosRedesEmpresa).find(([,configuracion])=>
                configuracion.dominios.some(host=>dominio===host||dominio.endsWith(`.${host}`))
            );
            return red?{nombre:red[0],url:url.href,configuracion:red[1]}:null;
        }catch{
            return null;
        }
    }).filter(Boolean);
    contenedor.replaceChildren(...enlaces.map(({nombre,url,configuracion})=>{
        const enlace=document.createElement("a");
        enlace.href=url;
        enlace.target="_blank";
        enlace.rel="noopener noreferrer";
        enlace.setAttribute("aria-label",`Visitar ${nombre}`);
        enlace.title=nombre.charAt(0).toUpperCase()+nombre.slice(1);
        const icono=document.createElementNS("http://www.w3.org/2000/svg","svg");
        icono.setAttribute("viewBox","0 0 24 24");
        icono.setAttribute("aria-hidden","true");
        if(configuracion.trazo){
            icono.setAttribute("fill","none");
            icono.setAttribute("stroke","currentColor");
            icono.setAttribute("stroke-width","2");
        }
        icono.innerHTML=configuracion.svg;
        enlace.appendChild(icono);
        return enlace;
    }));
    contenedor.hidden=enlaces.length===0;
}

async function cargarRedesSocialesEmpresa(){
    const contenedores=document.querySelectorAll("[data-empresa-redes]");
    if(!contenedores.length)return;
    contenedores.forEach(contenedor=>{contenedor.hidden=true;});
    const rutaApi=location.pathname.toLowerCase().includes("/la%20polar/")?"../api.php?action=inicio_contenido":"api.php?action=inicio_contenido";
    try{
        const respuesta=await fetch(rutaApi,{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudieron cargar los enlaces de redes sociales.");
        const enlaces=datos.contenido?.footer_redes||"";
        contenedores.forEach(contenedor=>renderizarRedesEmpresa(contenedor,enlaces));
    }catch(error){
        console.error("No se pudieron cargar las redes sociales:",error);
    }
}

async function cargarContactoEmpresa(){
    const rutaTienda=location.pathname.toLowerCase().includes("/la%20polar/");
    try{
        const respuesta=await fetch(`${rutaTienda?"../":""}api.php?action=inicio_contenido`,{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo cargar el contacto de la empresa.");
        return datos.contenido||{};
    }catch(error){
        console.error("No se pudo cargar el contacto del pie de página:",error);
        return {};
    }
}

async function aplicarIdentidadEmpresa(){
    try{
        const rutaTienda=location.pathname.toLowerCase().includes("/la%20polar/");
        const respuesta=await fetch((rutaTienda?"../":"")+"api.php?action=configuracion_publica",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok)throw new Error(datos.mensaje||"No se pudo cargar la identidad de la empresa.");
        const marca=datos.configuracion.marca||{};
        const contenidoInicio=await cargarContactoEmpresa();
        const nombre=String(marca.nombre||"Dulce Vita");
        const lema=String(marca.lema||"");
        const telefono=String(contenidoInicio.footer_telefono||marca.telefono||"").trim();
        const correo=String(marca.correo||"").trim();
        const colorPrincipal=/^#[0-9a-fA-F]{6}$/.test(marca.color_principal||"")?marca.color_principal:"#6B2635";
        const colorSecundario=/^#[0-9a-fA-F]{6}$/.test(marca.color_secundario||"")?marca.color_secundario:"#C9A45C";
        document.documentElement.style.setProperty("--borgona",colorPrincipal);
        document.documentElement.style.setProperty("--borgona-claro",colorPrincipal);
        document.documentElement.style.setProperty("--dorado",colorSecundario);
        document.querySelectorAll(".logo-text").forEach(elemento=>elemento.textContent=nombre);
        document.querySelectorAll('img[alt="Logo Dulce Vita"]').forEach(imagen=>{
            if(marca.logo){
                const rutaTienda=location.pathname.toLowerCase().includes("/la%20polar/");
                imagen.src=rutaTienda?marca.logo:`la%20polar/${marca.logo}`;
            }
            imagen.alt=`Logo ${nombre}`;
            const titulo=imagen.nextElementSibling;
            if(titulo&&titulo.tagName==="H2")titulo.textContent=nombre;
        });
        if(marca.logo){
            const rutaTienda=location.pathname.toLowerCase().includes("/la%20polar/");
            const logoUrl=rutaTienda?marca.logo:`la%20polar/${marca.logo}`;
            document.querySelectorAll('link[rel~="icon"]').forEach(icono=>icono.href=logoUrl);
        }
        document.querySelectorAll("h2,h3").forEach(elemento=>{
            if(elemento.textContent.trim()==="Dulce Vita")elemento.textContent=nombre;
        });
        document.querySelectorAll("[data-empresa-lema]").forEach(elemento=>elemento.textContent=lema);
        document.querySelectorAll("[data-empresa-telefono]").forEach(elemento=>{
            elemento.textContent=telefono;
            elemento.hidden=telefono==="";
        });
        document.querySelectorAll("[data-empresa-correo]").forEach(elemento=>{
            elemento.textContent=correo;
            elemento.hidden=correo==="";
        });
        const tituloPartes=document.title.split("|");
        if(tituloPartes.length>1&&tituloPartes[0].trim()==="Dulce Vita"){
            document.title=`${nombre} |${tituloPartes.slice(1).join("|")}`;
        }
        const estilo=document.createElement("style");
        estilo.textContent=`
            :root{--dv-principal:${colorPrincipal};--dv-secundario:${colorSecundario}}
            [style*="background:#6B2635"],[style*="background: #6B2635"],[style*="background-color:#6B2635"]{background-color:var(--dv-principal)!important}
            [style*="color:#6B2635"],[style*="color: #6B2635"]{color:var(--dv-principal)!important}
            [style*="background:#C9A45C"],[style*="background: #C9A45C"],[style*="background-color:#C9A45C"]{background-color:var(--dv-secundario)!important}
            .logo-text{color:var(--dv-principal)!important}
            .logo-identidad{display:flex;flex-direction:column;align-items:flex-start}
            .logo-lema{color:var(--dv-principal);font-size:11px;line-height:1.2}
            .menu{border-color:var(--dv-principal)}
        `;
        document.head.appendChild(estilo);
    }catch(error){
        console.error("No se pudo aplicar la identidad de la empresa:",error);
    }
}

cargarRedesSocialesEmpresa();
aplicarIdentidadEmpresa();
