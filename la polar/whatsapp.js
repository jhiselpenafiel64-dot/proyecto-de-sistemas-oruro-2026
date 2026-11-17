const numeroWhatsApp = "591XXXXXXXXX";
function enviarPedidoWhatsApp(){
    const carrito =
    JSON.parse(
        localStorage.getItem("carrito")
    ) || [];
    if(carrito.length===0){
        alert(
        "El carrito está vacío"
        );
        return;
    }
    let mensaje =
    "Hola Dulce Vita, deseo realizar el siguiente pedido:%0A%0A";
    carrito.forEach(producto=>{
        mensaje +=
        producto.nombre
        +
        " x "
        +
        producto.cantidad
        +
        " - "
        +
        (producto.precio *
        producto.cantidad)
        +
        " Bs.%0A";
    });
    const total =
    carrito.reduce(
        (suma,producto)=>
        suma +
        (producto.precio *
        producto.cantidad),
        0
    );
    mensaje +=
    "%0ATotal: "
    +
    total
    +
    " Bs.%0A%0A";
    mensaje +=
    "Realizaré el pago mediante QR.";
    const url =
    "https://wa.me/"
    +
    numeroWhatsApp
    +
    "?text="
    +
    mensaje;
    window.open(
        url,
        "_blank"
    );
}