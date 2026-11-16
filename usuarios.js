const tablaUsuarios=document.getElementById("tablaUsuarios");
const formUsuario=document.getElementById("formUsuario");
const mensajeUsuarios=document.getElementById("mensajeUsuarios");
const idUsuario=document.getElementById("idUsuario");
const tituloFormularioUsuario=document.getElementById("tituloFormularioUsuario");
const passwordUsuario=document.getElementById("passwordUsuario");
const guardarUsuario=document.getElementById("guardarUsuario");
const cancelarEdicion=document.getElementById("cancelarEdicion");
const tablaClientes=document.getElementById("tablaClientes");
const mensajeClientes=document.getElementById("mensajeClientes");
const formEditarCliente=document.getElementById("formEditarCliente");
const guardarCliente=document.getElementById("guardarCliente");

function escaparHtml(valor){
    return String(valor ?? "").replace(/[&<>"']/g,caracter=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[caracter]);
}

function mostrarOrigenCliente(origen){
    if(origen==="pagina_cliente") return '<span class="badge bg-primary">Registro web cliente</span>';
    if(origen==="empleado") return '<span class="badge bg-success">Registro web administrativo</span>';
    return '<span class="badge bg-secondary">Registro anterior (sin dato)</span>';
}

function mostrarMensaje(texto,tipo="danger"){
    mensajeUsuarios.textContent=texto;
    mensajeUsuarios.className=`alert alert-${tipo}`;
}

function cargarUsuarios(){
    fetch("api.php?action=usuarios")
        .then(async respuesta=>{
            const datos=await respuesta.json();
            if(!respuesta.ok){throw new Error(datos.mensaje);}
            return datos.usuarios;
        })
        .then(usuarios=>{
            window.usuariosRegistrados=usuarios;
            tablaUsuarios.innerHTML=usuarios.map(usuario=>`
                <tr><td>${usuario.nombre}</td><td>${usuario.usuario}</td><td>${usuario.rol}</td>
                <td><span class="badge ${Number(usuario.activo) ? "bg-success" : "bg-secondary"}">${Number(usuario.activo) ? "Activo" : "Inactivo"}</span></td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-outline-primary me-1" type="button" data-accion="editar" data-id="${usuario.id}"><i class="bi bi-pencil"></i> Editar</button>
                    <button class="btn btn-sm ${Number(usuario.activo) ? "btn-outline-danger" : "btn-outline-success"}" type="button" data-accion="estado" data-id="${usuario.id}" data-activo="${Number(usuario.activo)}">${Number(usuario.activo) ? "Desactivar" : "Activar"}</button>
                </td></tr>
            `).join("");
            tablaUsuarios.querySelectorAll("button").forEach(boton=>boton.addEventListener("click",()=>accionUsuario(boton.dataset)));
        })
        .catch(error=>mostrarMensaje(error.message || "No se pudieron cargar los usuarios."));
}

function mostrarMensajeCliente(texto,tipo="danger"){
    mensajeClientes.textContent=texto;
    mensajeClientes.className=`alert alert-${tipo}`;
}

function cargarClientes(){
    tablaClientes.innerHTML='<tr><td colspan="6" class="text-center text-secondary">Cargando clientes...</td></tr>';
    fetch("api.php?action=clientes")
        .then(async respuesta=>{
            const datos=await respuesta.json();
            if(!respuesta.ok) throw new Error(datos.mensaje || "No se pudieron cargar los clientes.");
            return datos.clientes;
        })
        .then(clientes=>{
            window.clientesRegistrados=clientes;
            if(!clientes.length){
                tablaClientes.innerHTML='<tr><td colspan="6" class="text-center text-secondary">Todavía no hay clientes registrados.</td></tr>';
                return;
            }
            tablaClientes.innerHTML=clientes.map(cliente=>`
                <tr>
                    <td>${escaparHtml(cliente.nombre)}</td>
                    <td>${escaparHtml(cliente.correo || "—")}</td>
                    <td>${escaparHtml(cliente.telefono || "—")}</td>
                    <td>${mostrarOrigenCliente(cliente.origen_registro)}</td>
                    <td>${escaparHtml(cliente.creado_en || "—")}</td>
                    <td><button class="btn btn-sm btn-outline-primary" type="button" data-editar-cliente="${Number(cliente.id)}"><i class="bi bi-pencil me-1"></i>Editar</button></td>
                </tr>
            `).join("");
        })
        .catch(error=>{
            tablaClientes.innerHTML='<tr><td colspan="6" class="text-center text-danger">No se pudieron cargar los clientes.</td></tr>';
            mostrarMensajeCliente(error.message || "No se pudieron cargar los clientes.");
        });
}

function restablecerEdicionCliente(){
    formEditarCliente.reset();
    document.getElementById("idCliente").value="";
    formEditarCliente.hidden=true;
}

tablaClientes.addEventListener("click",evento=>{
    const boton=evento.target.closest("[data-editar-cliente]");
    if(!boton) return;
    const cliente=window.clientesRegistrados.find(item=>Number(item.id)===Number(boton.dataset.editarCliente));
    if(!cliente) return;
    document.getElementById("idCliente").value=cliente.id;
    document.getElementById("nombreCliente").value=cliente.nombre || "";
    document.getElementById("correoCliente").value=cliente.correo || "";
    document.getElementById("telefonoCliente").value=cliente.telefono || "";
    formEditarCliente.hidden=false;
    formEditarCliente.scrollIntoView({behavior:"smooth",block:"center"});
});

formEditarCliente.addEventListener("submit",async evento=>{
    evento.preventDefault();
    guardarCliente.disabled=true;
    try{
        const respuesta=await fetch("api.php?action=editar_cliente",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                id:Number(document.getElementById("idCliente").value),
                nombre:document.getElementById("nombreCliente").value.trim(),
                correo:document.getElementById("correoCliente").value.trim(),
                telefono:document.getElementById("telefonoCliente").value.trim()
            })
        });
        const resultado=await respuesta.json();
        if(!respuesta.ok) throw new Error(resultado.mensaje || "No se pudo actualizar el cliente.");
        restablecerEdicionCliente();
        mostrarMensajeCliente(resultado.mensaje,"success");
        cargarClientes();
    }catch(error){
        mostrarMensajeCliente(error.message || "No se pudo actualizar el cliente.");
    }finally{
        guardarCliente.disabled=false;
    }
});

document.getElementById("cancelarEdicionCliente").addEventListener("click",restablecerEdicionCliente);
document.getElementById("actualizarClientes").addEventListener("click",cargarClientes);

function restablecerFormulario(){
    formUsuario.reset();
    idUsuario.value="";
    tituloFormularioUsuario.textContent="Crear usuario";
    passwordUsuario.required=true;
    passwordUsuario.placeholder="Contraseña (mínimo 6 caracteres)";
    guardarUsuario.innerHTML='<i class="bi bi-person-plus me-2"></i>Guardar usuario';
    cancelarEdicion.classList.add("d-none");
}

function editarUsuario(usuario){
    idUsuario.value=usuario.id;
    document.getElementById("nombreUsuario").value=usuario.nombre;
    document.getElementById("nuevoUsuario").value=usuario.usuario;
    document.getElementById("rolUsuario").value=usuario.rol;
    passwordUsuario.value="";
    passwordUsuario.required=false;
    passwordUsuario.placeholder="Nueva contraseña (opcional, mínimo 6 caracteres)";
    tituloFormularioUsuario.textContent="Editar usuario";
    guardarUsuario.innerHTML='<i class="bi bi-check2 me-2"></i>Actualizar usuario';
    cancelarEdicion.classList.remove("d-none");
    formUsuario.scrollIntoView({behavior:"smooth",block:"start"});
}

function accionUsuario(datos){
    const usuario=window.usuariosRegistrados.find(item=>String(item.id)===String(datos.id));
    if(datos.accion==="editar" && usuario){editarUsuario(usuario);return;}
    if(datos.accion!=="estado")return;
    const activo=Number(datos.activo)===1;
    if(!confirm(`${activo ? "¿Desactivar" : "¿Activar"} este usuario?`))return;
    fetch("api.php?action=estado_usuario",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:Number(datos.id),activo:!activo})})
        .then(async respuesta=>{const resultado=await respuesta.json();if(!respuesta.ok)throw new Error(resultado.mensaje);return resultado;})
        .then(()=>{mostrarMensaje(`Usuario ${activo ? "desactivado" : "activado"} correctamente.`,"success");cargarUsuarios();})
        .catch(error=>mostrarMensaje(error.message || "No se pudo actualizar el estado del usuario."));
}

formUsuario.addEventListener("submit",function(event){
    event.preventDefault();
    const datos={
        nombre:document.getElementById("nombreUsuario").value.trim(),
        usuario:document.getElementById("nuevoUsuario").value.trim(),
        password:passwordUsuario.value,
        rol:document.getElementById("rolUsuario").value
    };
    const accion=idUsuario.value ? "editar_usuario" : "crear_usuario";
    if(idUsuario.value)datos.id=Number(idUsuario.value);
    fetch(`api.php?action=${accion}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(datos)})
        .then(async respuesta=>{
            const resultado=await respuesta.json();
            if(!respuesta.ok){throw new Error(resultado.mensaje);}
            return resultado;
        })
        .then(()=>{
            restablecerFormulario();
            mostrarMensaje(accion==="crear_usuario" ? "Usuario creado correctamente." : "Usuario actualizado correctamente.","success");
            cargarUsuarios();
        })
        .catch(error=>mostrarMensaje(error.message || "No se pudo crear el usuario."));
});

cancelarEdicion.addEventListener("click",restablecerFormulario);

window.usuariosRegistrados=[];
window.clientesRegistrados=[];

document.addEventListener("DOMContentLoaded",()=>{
    cargarUsuarios();
    cargarClientes();
});