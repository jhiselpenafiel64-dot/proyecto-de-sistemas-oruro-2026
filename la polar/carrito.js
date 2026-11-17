let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
function guardarCarrito(){
    localStorage.setItem(
        "carrito",
        JSON.stringify(carrito)
    );
}
function agregarCarrito(id){
    const producto = productos.find(
        producto => producto.id === id
    );
    if(!producto){
        return;
    }
    const existe = carrito.find(
        item => item.id === id
    );
    if((existe?.cantidad || 0) >= producto.stock){
        alert("No hay más unidades disponibles de este producto.");
        return;
    }
    if(existe){
        existe.cantidad++;
    }else{
        carrito.push({
            id:producto.id,
            nombre:producto.nombre,
            precio:producto.precio,
            imagen:producto.imagen,
            cantidad:1
        });
    }
    guardarCarrito();
    mostrarMensajeCarrito();
}
function aumentarCantidad(id){
    const producto = carrito.find(
        item => item.id === id
    );
    const disponible = productos.find(item=>item.id===id)?.stock || 0;
    if(producto && producto.cantidad < disponible){
        producto.cantidad++;
    }else{
        alert("No hay más unidades disponibles de este producto.");
    }
    guardarCarrito();
    cargarCarrito();
}
function disminuirCantidad(id){
    const producto = carrito.find(
        item => item.id === id
    );
    if(producto && producto.cantidad > 1){
        producto.cantidad--;
    }
    guardarCarrito();
    cargarCarrito();
}
function eliminarProducto(id){
    carrito = carrito.filter(
        item => item.id !== id
    );
    guardarCarrito();
    cargarCarrito();
}
function obtenerTotal(){
    return carrito.reduce(
        (total,item)=>
        total +
        (item.precio * item.cantidad),
        0
    );
}
function cargarCarrito(){
    const contenedor =
    document.getElementById("carrito");
    const total =
    document.getElementById("total");
    if(!contenedor){
        return;
    }
    contenedor.innerHTML="";
    if(carrito.length===0){
        contenedor.innerHTML=`
        <div class="item-carrito">
            <h3>
            Tu carrito está vacío
            </h3>
        </div>
        `;
        if(total){
            total.textContent="0 Bs.";
        }
        return;
    }
    carrito.forEach(producto=>{
        const item =
        document.createElement("div");
        item.className="item-carrito";
        item.innerHTML=`
        <img 
        src="${producto.imagen}"
        onerror="this.onerror=null;this.src='../logo.png';"
        >
        <div class="item-info">
            <h3>
            ${producto.nombre}
            </h3>
            <p>
            ${producto.precio} Bs.
            </p>
        </div>
        <div class="cantidad">
            <button onclick="disminuirCantidad(${producto.id})">
            -
            </button>
            <span>
            ${producto.cantidad}
            </span>
            <button onclick="aumentarCantidad(${producto.id})">
            +
            </button>
        </div>
        <button 
        class="btn eliminar"
        onclick="eliminarProducto(${producto.id})">
        Eliminar
        </button>
        `;
        contenedor.appendChild(item);
    });
    if(total){
        total.textContent =
        obtenerTotal()+" Bs.";
    }
}
function mostrarMensajeCarrito(texto="Producto agregado al carrito"){
    const mensaje =
    document.createElement("div");
    mensaje.textContent = texto;
    mensaje.style.position="fixed";
    mensaje.style.bottom="30px";
    mensaje.style.left="50%";
    mensaje.style.transform=
    "translateX(-50%)";
    mensaje.style.background=
    "#6B2635";
    mensaje.style.color=
    "white";
    mensaje.style.padding=
    "15px 25px";
    mensaje.style.borderRadius=
    "30px";
    mensaje.style.zIndex="2000";
    document.body.appendChild(mensaje);
    setTimeout(()=>{
        mensaje.remove();
    },2000);
}
document.addEventListener(
"DOMContentLoaded",
()=>{
    cargarCarrito();
});

function limpiarCarrito(){
    carrito=[];
    guardarCarrito();
    cargarCarrito();
}

window.addEventListener("productosActualizados",()=>{
    const cantidadAnterior=carrito.length;
    carrito=carrito.flatMap(item=>{
        const producto=productos.find(actual=>actual.id===Number(item.id));
        if(!producto || (item.nombre && item.nombre!==producto.nombre)) return [];
        return [{...item,nombre:producto.nombre,precio:producto.precio,imagen:producto.imagen}];
    });
    guardarCarrito();
    cargarCarrito();
    if(carrito.length<cantidadAnterior){
        mostrarMensajeCarrito("El catálogo cambió; revisa los productos de tu carrito.");
    }
});