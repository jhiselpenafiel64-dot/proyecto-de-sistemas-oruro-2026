const formularioConfiguracion=document.getElementById("formConfiguracion");
const mensajeConfiguracion=document.getElementById("mensajeConfiguracion");
let configuracionActual=null;
let zonasDelivery=[];

function mostrarMensajeConfiguracion(texto,exito=false){
    mensajeConfiguracion.textContent=texto;
    mensajeConfiguracion.className=`alert ${exito ? "alert-success" : "alert-danger"}`;
}

function mostrarVistaImagen(entrada,imagen){
    const archivo=entrada.files?.[0];
    if(archivo) imagen.src=URL.createObjectURL(archivo);
}

document.querySelectorAll("[data-config-tab]").forEach(boton=>boton.addEventListener("click",()=>{
    document.querySelectorAll("[data-config-tab]").forEach(item=>item.classList.toggle("active",item===boton));
    document.querySelectorAll("[data-config-panel]").forEach(panel=>panel.classList.toggle("d-none",panel.dataset.configPanel!==boton.dataset.configTab));
}));

function renderizarZonas(){
    const lista=document.getElementById("listaZonas");
    lista.replaceChildren();
    if(!zonasDelivery.length){
        lista.innerHTML='<p class="text-secondary mb-0">No hay zonas configuradas. El delivery no se ofrecerá hasta agregar al menos una.</p>';
        return;
    }
    zonasDelivery.forEach((zona,indice)=>{
        const fila=document.createElement("div");
        fila.className="zona-fila border rounded-3 p-2";
        fila.innerHTML=`<label class="form-label mb-0">Zona<input class="form-control" maxlength="100" data-zona-nombre="${indice}" required></label><label class="form-label mb-0">Costo (Bs.)<input class="form-control" type="number" min="0" max="10000" step="0.01" data-zona-costo="${indice}" required></label><div class="d-flex align-items-center gap-2"><label class="form-check mb-0"><input class="form-check-input" type="checkbox" data-zona-activa="${indice}"><span class="form-check-label">Activa</span></label><button class="btn btn-outline-danger" type="button" data-quitar-zona="${indice}" aria-label="Quitar zona"><i class="bi bi-trash"></i></button></div>`;
        fila.querySelector(`[data-zona-nombre="${indice}"]`).value=zona.nombre||"";
        fila.querySelector(`[data-zona-costo="${indice}"]`).value=Number(zona.costo||0);
        fila.querySelector(`[data-zona-activa="${indice}"]`).checked=zona.activa!==false;
        lista.appendChild(fila);
    });
}

async function cargarConfiguracion(){
    try{
        const respuesta=await fetch("api.php?action=empresa_configuracion",{cache:"no-store"});
        const datos=await respuesta.json();
        if(!respuesta.ok||!datos.ok) throw new Error(datos.mensaje||"No se pudo cargar la configuración.");
        configuracionActual=datos.configuracion;
        const {marca,empresa}=configuracionActual;
        document.getElementById("nombreMarca").value=marca.nombre||"";
        document.getElementById("lemaMarca").value=marca.lema||"";
        document.getElementById("telefonoMarca").value=marca.telefono||"";
        document.getElementById("correoMarca").value=marca.correo||"";
        document.getElementById("colorPrincipal").value=marca.color_principal||"#6B2635";
        document.getElementById("colorSecundario").value=marca.color_secundario||"#C9A45C";
        document.getElementById("vistaLogoMarca").src=marca.logo ? `la%20polar/${marca.logo}` : "logo.png";
        document.getElementById("razonSocial").value=empresa.razon_social||"";
        document.getElementById("nitEmpresa").value=empresa.nit||"";
        document.getElementById("direccionEmpresa").value=empresa.direccion||"";
        document.getElementById("municipioEmpresa").value=empresa.municipio||"";
        document.getElementById("telefonoFiscal").value=empresa.telefono||"";
        document.getElementById("correoFiscal").value=empresa.correo||"";
        document.getElementById("vistaQrTienda").src=configuracionActual.qr ? `la%20polar/${configuracionActual.qr}` : "";
        document.getElementById("vistaQrTienda").hidden=!configuracionActual.qr;
        zonasDelivery=Array.isArray(configuracionActual.zonas_delivery) ? configuracionActual.zonas_delivery : [];
        renderizarZonas();
    }catch(error){
        mostrarMensajeConfiguracion(error.message);
    }
}

document.getElementById("logoMarca").addEventListener("change",()=>mostrarVistaImagen(document.getElementById("logoMarca"),document.getElementById("vistaLogoMarca")));
document.getElementById("qrTienda").addEventListener("change",()=>mostrarVistaImagen(document.getElementById("qrTienda"),document.getElementById("vistaQrTienda")));
document.getElementById("agregarZona").addEventListener("click",()=>{
    if(zonasDelivery.length>=30){mostrarMensajeConfiguracion("Puedes configurar hasta 30 zonas.");return;}
    zonasDelivery.push({nombre:"",costo:0,activa:true});
    renderizarZonas();
});
document.getElementById("listaZonas").addEventListener("click",evento=>{
    const boton=evento.target.closest("[data-quitar-zona]");
    if(!boton)return;
    zonasDelivery.splice(Number(boton.dataset.quitarZona),1);
    renderizarZonas();
});

formularioConfiguracion.addEventListener("submit",async evento=>{
    evento.preventDefault();
    const boton=document.getElementById("guardarConfiguracion");
    boton.disabled=true;
    try{
        const zonas=[...document.querySelectorAll("[data-zona-nombre]")].map((campo,indice)=>({
            nombre:campo.value.trim(),
            costo:document.querySelector(`[data-zona-costo="${indice}"]`).value,
            activa:document.querySelector(`[data-zona-activa="${indice}"]`).checked
        }));
        const marca={
            nombre:document.getElementById("nombreMarca").value.trim(),
            lema:document.getElementById("lemaMarca").value.trim(),
            telefono:document.getElementById("telefonoMarca").value.trim(),
            correo:document.getElementById("correoMarca").value.trim(),
            color_principal:document.getElementById("colorPrincipal").value,
            color_secundario:document.getElementById("colorSecundario").value
        };
        const empresa={
            razon_social:document.getElementById("razonSocial").value.trim(),
            nit:document.getElementById("nitEmpresa").value.trim(),
            direccion:document.getElementById("direccionEmpresa").value.trim(),
            municipio:document.getElementById("municipioEmpresa").value.trim(),
            telefono:document.getElementById("telefonoFiscal").value.trim(),
            correo:document.getElementById("correoFiscal").value.trim()
        };
        const datosFormulario=new FormData();
        datosFormulario.append("configuracion",JSON.stringify({marca,empresa,zonas_delivery:zonas}));
        if(document.getElementById("logoMarca").files[0])datosFormulario.append("logo",document.getElementById("logoMarca").files[0]);
        if(document.getElementById("qrTienda").files[0])datosFormulario.append("qr",document.getElementById("qrTienda").files[0]);
        const respuesta=await fetch("api.php?action=guardar_empresa_configuracion",{method:"POST",body:datosFormulario});
        const resultado=await respuesta.json();
        if(!respuesta.ok||!resultado.ok)throw new Error(resultado.mensaje||"No se pudo guardar la configuración.");
        configuracionActual=resultado.configuracion;
        mostrarMensajeConfiguracion("Configuración guardada.",true);
        document.getElementById("logoMarca").value="";
        document.getElementById("qrTienda").value="";
    }catch(error){
        mostrarMensajeConfiguracion(error.message);
    }finally{
        boton.disabled=false;
    }
});

cargarConfiguracion();
