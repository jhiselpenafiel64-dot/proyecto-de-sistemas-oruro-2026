const contenedorProductos = document.getElementById("productos");
const buscador = document.getElementById("buscador");
const sesionAdminCatalogo = document.getElementById("sesionAdminCatalogo");
const formularioCrearProducto = document.getElementById("formCrearProducto");
const mensajeAdminCatalogo = document.getElementById("mensajeAdminCatalogo");
const categorias = ["Tortas", "Espressos", "Frappes", "Bubbas", "Crepes", "Pasteleria", "Paninis", "Combos", "Otros"];
window.catalogoEsAdministrador = false;

function escaparHtml(valor){
    return String(valor).replace(/[&<>"']/g,caracter=>({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        "\"":"&quot;",
        "'":"&#39;"
    })[caracter]);
}

function mostrarMensajeAdmin(texto, tipo=""){
    mensajeAdminCatalogo.textContent=texto;
    mensajeAdminCatalogo.className=`admin-mensaje-catalogo ${tipo}`;
}

function activarModoAdministrador(usuario){
    window.catalogoEsAdministrador=true;
    sesionAdminCatalogo.hidden=false;
    document.getElementById("estadoSesionAdminCatalogo").textContent=`Modo administrador: ${usuario.nombre}`;
    document.getElementById("modoClienteCatalogo").hidden=false;
    formularioCrearProducto.hidden=false;
    mostrarMensajeAdmin("");
    window.dispatchEvent(new Event("productosActualizados"));
}

function mostrarModoCliente(mensaje=""){
    window.catalogoEsAdministrador=false;
    sesionAdminCatalogo.hidden=true;
    formularioCrearProducto.hidden=true;
    contenedorProductos.querySelectorAll(".producto-admin").forEach(herramientas=>herramientas.remove());
    if(mensaje) mostrarMensajeAdmin(mensaje,"exito");
}

async function verificarSesionAdministradorCatalogo(){
    try{
        const respuesta=await fetch("../api.php?action=sesion_catalogo_admin");
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok){
            throw new Error(datos.mensaje || "No se pudo verificar la sesión.");
        }
        if(datos.autenticado && sessionStorage.getItem("modoTiendaPestana")==="administrador"){
            activarModoAdministrador(datos.usuario);
            return;
        }
        mostrarModoCliente();
    }catch(error){
        mostrarModoCliente();
        mostrarMensajeAdmin(`No se pudo verificar la sesión. ${error.message}`,"error");
    }
}

document.getElementById("modoClienteCatalogo").addEventListener("click",async ()=>{
    sessionStorage.setItem("modoTiendaPestana","cliente");
    window.actualizarEnlacesModoTienda();
    mostrarModoCliente("Modo cliente activo en esta pestaña.");
});

document.getElementById("cerrarSesionAdminCatalogo").addEventListener("click",async ()=>{
    try{
        const respuesta=await fetch("../api.php?action=logout_admin",{method:"POST"});
        const datos=await respuesta.json();
        if(!respuesta.ok || !datos.ok) throw new Error(datos.mensaje || "No se pudo cerrar la sesión.");
        ["sesionActiva","usuarioAdmin","usuarioNombre","usuarioRol","ultimoAcceso"].forEach(clave=>localStorage.removeItem(clave));
        sessionStorage.setItem("modoTiendaPestana","cliente");
        window.actualizarEnlacesModoTienda();
        mostrarModoCliente("Sesión cerrada correctamente. Ahora estás viendo el catálogo como cliente.");
    }catch(error){
        mostrarMensajeAdmin(error.message,"error");
    }
});

function opcionesCategoria(categoriaActual){
    return categorias.map(categoria=>
        `<option value="${categoria}" ${categoria===categoriaActual ? "selected" : ""}>${categoria==="Pasteleria" ? "Pastelería" : categoria}</option>`
    ).join("");
}

formularioCrearProducto.addEventListener("submit",async evento=>{
    evento.preventDefault();
    const boton=formularioCrearProducto.querySelector('[type="submit"]');
    boton.disabled=true;
    try{
        const respuesta=await fetch("../api.php?action=crear_producto",{
            method:"POST",
            body:new FormData(formularioCrearProducto)
        });
        const datos=await respuesta.json();
        if(!respuesta.ok) throw new Error(datos.mensaje || "No se pudo agregar el producto.");
        formularioCrearProducto.reset();
        formularioCrearProducto.elements.stock.value="0";
        await cargarProductosTienda();
        if(window.errorCatalogo) throw new Error(window.errorCatalogo);
        mostrarMensajeAdmin("Producto agregado correctamente.","exito");
    }catch(error){
        mostrarMensajeAdmin(error.message,"error");
    }finally{
        boton.disabled=false;
    }
});

function mostrarProductos(lista){
    if(!contenedorProductos){
        return;
    }
    contenedorProductos.innerHTML = "";
    if(lista.length === 0){
        contenedorProductos.innerHTML = `
            <div class="producto">
                <div class="producto-contenido">
                    <h3>No se encontraron productos</h3>
                    <p>Prueba con otra búsqueda.</p>
                </div>
            </div>
        `;
        return;
    }
    lista.forEach(producto=>{
        const tarjeta = document.createElement("div");
        tarjeta.className = "producto";
        const herramientasAdmin=window.catalogoEsAdministrador ? `
            <div class="producto-admin">
                <button type="button" class="btn producto-admin-toggle" data-abrir-editor="${Number(producto.id)}">Editar producto</button>
                <form class="producto-admin-form" data-editor-producto="${Number(producto.id)}" hidden>
                    <input name="id" type="hidden" value="${Number(producto.id)}">
                    <label>Nombre<input name="nombre" value="${escaparHtml(producto.nombre)}" maxlength="120" required></label>
                    <label>Descripción<textarea name="descripcion" maxlength="255">${escaparHtml(producto.descripcion || "")}</textarea></label>
                    <label>Foto del producto (JPG, PNG o WebP; máximo 5 MB)<input name="imagen" type="file" accept="image/jpeg,image/png,image/webp"></label>
                    <label>Categoría<select name="categoria" required>${opcionesCategoria(producto.categoria)}</select></label>
                    <label>Precio (Bs.)<input name="precio" type="number" min="0" step="0.01" value="${Number(producto.precio).toFixed(2)}" required></label>
                    <label>Stock<input name="stock" type="number" min="0" step="1" value="${Number(producto.stock)}" required></label>
                    <div class="producto-admin-acciones">
                        <button type="submit" class="btn">Guardar cambios</button>
                        <button type="button" class="producto-admin-cancelar" data-cancelar-editor>Cancelar</button>
                    </div>
                </form>
            </div>` : "";
        tarjeta.innerHTML = `
            <img 
            src="${escaparHtml(producto.imagen)}"
            alt="${escaparHtml(producto.nombre)}"
            loading="lazy"
            onerror="this.onerror=null;this.src='../logo.png';">
            <div class="producto-contenido">
                <h3>
                    ${escaparHtml(producto.nombre)}
                </h3>
                <p class="categoria">
                    ${escaparHtml(producto.categoria)}
                </p>
                <p class="precio">
                    ${producto.precio} Bs.
                </p>
                <p class="stock-disponible">
                    Disponibles: ${Number(producto.stock)}
                </p>
                <button
                class="btn"
                ${producto.stock < 1 ? "disabled" : ""}
                onclick="agregarCarrito(${producto.id})">
                    ${producto.stock < 1 ? "Agotado" : "Agregar al carrito"}
                </button>
                ${herramientasAdmin}
            </div>
        `;
        contenedorProductos.appendChild(tarjeta);
    });
}

contenedorProductos.addEventListener("click",evento=>{
    const botonEditar=evento.target.closest("[data-abrir-editor]");
    if(botonEditar){
        const editor=[...contenedorProductos.querySelectorAll("[data-editor-producto]")].find(form=>form.dataset.editorProducto===botonEditar.dataset.abrirEditor);
        if(editor) editor.hidden=!editor.hidden;
        return;
    }
    const botonCancelar=evento.target.closest("[data-cancelar-editor]");
    if(botonCancelar){
        const editor=botonCancelar.closest("form");
        editor.reset();
        editor.hidden=true;
    }
});

contenedorProductos.addEventListener("submit",async evento=>{
    const formulario=evento.target.closest("[data-editor-producto]");
    if(!formulario) return;
    evento.preventDefault();
    const boton=formulario.querySelector('[type="submit"]');
    boton.disabled=true;
    try{
        const respuesta=await fetch("../api.php?action=editar_producto",{
            method:"POST",
            body:new FormData(formulario)
        });
        const datos=await respuesta.json();
        if(!respuesta.ok) throw new Error(datos.mensaje || "No se pudo actualizar el producto.");
        await cargarProductosTienda();
        if(window.errorCatalogo) throw new Error(window.errorCatalogo);
        mostrarMensajeAdmin("Producto actualizado correctamente.","exito");
    }catch(error){
        mostrarMensajeAdmin(error.message,"error");
        boton.disabled=false;
    }
});
function filtrarCategoria(categoria){
    document.querySelectorAll(".categorias [data-categoria]").forEach(boton=>{
        boton.classList.toggle("categoria-activa",boton.dataset.categoria===categoria);
    });
    if(categoria === "Todos"){
        mostrarProductos(productos);
        return;
    }
    const resultado = productos.filter(producto=>
        producto.categoria === categoria
    );
    mostrarProductos(resultado);
}
function buscarProducto(){
    const texto = buscador.value.toLowerCase();
    const resultado = productos.filter(producto=>
        producto.nombre
        .toLowerCase()
        .includes(texto)
    );
    mostrarProductos(resultado);
}
function ordenarProductos(tipo){
    let lista = [...productos];
    if(tipo === "menor"){
        lista.sort((a,b)=>
            a.precio-b.precio
        );
    }
    if(tipo === "mayor"){
        lista.sort((a,b)=>
            b.precio-a.precio
        );
    }
    if(tipo === "az"){
        lista.sort((a,b)=>
            a.nombre.localeCompare(
                b.nombre
            )
        );
    }
    mostrarProductos(lista);
}
if(buscador){
    buscador.addEventListener(
        "input",
        buscarProducto
    );
}
document.addEventListener(
"DOMContentLoaded",
()=>{
    verificarSesionAdministradorCatalogo();
    if(productos.length){
        mostrarProductos(productos);
    }
});

window.addEventListener("productosActualizados",()=>{
    if(window.errorCatalogo){
        contenedorProductos.innerHTML=`<p role="alert">${window.errorCatalogo}</p>`;
        return;
    }
    mostrarProductos(productos);
});
