const metadatosProductos = [
    {
        id:1,
        nombre:"Torta Pistachon",
        categoria:"Tortas",
        precio:29,
        imagen:"tortapiostachon.jpg"
    },
    {
        id:2,
        nombre:"Torta Cocolemon",
        categoria:"Tortas",
        precio:189,
        imagen:"torta2.jpg"
    },
    {
        id:3,
        nombre:"Torta Brownie",
        categoria:"Tortas",
        precio:229,
        imagen:"tortabrawnie.jpg"
    },
    {
        id:4,
        nombre:"Torta Selva Negra",
        categoria:"Tortas",
        precio:220,
        imagen:"tortaselvanegra.jpg"
    },
    {
        id:5,
        nombre:"Torta Tres Leches",
        categoria:"Tortas",
        precio:200,
        imagen:"tortatresleches.jpg"
    },
    {
        id:6,
        nombre:"Espresso",
        categoria:"Espressos",
        precio:12,
        imagen:"spresso.jpg"
    },
    {
        id:7,
        nombre:"Americano",
        categoria:"Espressos",
        precio:15,
        imagen:"americano.jpg"
    },
    {
        id:8,
        nombre:"Espresso Cortado",
        categoria:"Espressos",
        precio:18,
        imagen:"espressocortado.jpg"
    },
    {
        id:9,
        nombre:"Espresso Panna",
        categoria:"Espressos",
        precio:22,
        imagen:"espressopanna.jpg"
    },
    {
        id:10,
        nombre:"Espresso Affogato",
        categoria:"Espressos",
        precio:25,
        imagen:"espressoaffogato.jpg"
    },
    {
        id:11,
        nombre:"Frappé Latte",
        categoria:"Frappes",
        precio:35,
        imagen:"frappelatte.jpg"
    },
    {
        id:12,
        nombre:"Frappé Oreo",
        categoria:"Frappes",
        precio:38,
        imagen:"frappeoreo.jpg"
    },
    {
        id:13,
        nombre:"Frappé Chocolate",
        categoria:"Frappes",
        precio:35,
        imagen:"frappechocolate.jpg"
    },
    {
        id:14,
        nombre:"Bubba Blueberry",
        categoria:"Bubbas",
        precio:30,
        imagen:"bubba blueberry.jpg"
    },
    {
        id:15,
        nombre:"Bubba Latte",
        categoria:"Bubbas",
        precio:32,
        imagen:"bubbalatte.jpg"
    },
    {
        id:16,
        nombre:"Bubba Matcha",
        categoria:"Bubbas",
        precio:35,
        imagen:"bubbamatcha.jpg"
    },
    {
        id:17,
        nombre:"Crepe Chocolate",
        categoria:"Crepes",
        precio:35,
        imagen:"crepechocolate.jpg"
    },
    {
        id:18,
        nombre:"Crepe Frutilla",
        categoria:"Crepes",
        precio:38,
        imagen:"crepefrutilla.jpg"
    },
    {
        id:19,
        nombre:"Crepe Especial",
        categoria:"Crepes",
        precio:45,
        imagen:"crepeespecial.jpg"
    },
    {
        id:20,
        nombre:"Brownie",
        categoria:"Pasteleria",
        precio:20,
        imagen:"brawnie.jpg"
    },
    {
        id:21,
        nombre:"Galleta Artesanal",
        categoria:"Pasteleria",
        precio:12,
        imagen:"galletaastesanal.jpg"
    },
    {
        id:22,
        nombre:"Cheesecake",
        categoria:"Pasteleria",
        precio:35,
        imagen:"chessecake.jpg"
    },
    {
        id:23,
        nombre:"Panini Clasico",
        categoria:"Paninis",
        precio:35,
        imagen:"paniniclasico.jpg"
    },
    {
        id:24,
        nombre:"Panini Especial",
        categoria:"Paninis",
        precio:45,
        imagen:"paniniespecial.jpg"
    },
    {
        id:25,
        nombre:"Combo Dulce Vita",
        categoria:"Combos",
        precio:55,
        imagen:"combo.jpg"
    },
    {
        nombre:"Café Americano",
        categoria:"Espressos",
        imagen:"americano.jpg"
    },
    {
        nombre:"Capuchino",
        categoria:"Espressos",
        imagen:"spresso.jpg"
    }
];

let productos = [];
let solicitudProductosEnCurso = false;

async function cargarProductosTienda(){
    if(solicitudProductosEnCurso) return;
    solicitudProductosEnCurso=true;
    try{
        const respuesta = await fetch("../api.php?action=productos_web",{cache:"no-store"});
        const datos = await respuesta.json();
        if(!respuesta.ok || !datos.ok){
            throw new Error(datos.mensaje || "No se pudo cargar el catálogo.");
        }
        productos = datos.productos.map(producto=>{
            const metadatos = metadatosProductos.find(item=>item.nombre===producto.nombre);
            return {
                ...producto,
                id:Number(producto.id),
                precio:Number(producto.precio),
                stock:Number(producto.stock),
                categoria:producto.categoria || metadatos?.categoria || "Otros",
                imagen:producto.imagen || metadatos?.imagen || "../logo.png"
            };
        });
        window.errorCatalogo=null;
        window.dispatchEvent(new Event("productosActualizados"));
    }catch(error){
        window.errorCatalogo = error.message;
        window.dispatchEvent(new Event("productosActualizados"));
    }finally{
        solicitudProductosEnCurso=false;
    }
}

window.cargarProductosTienda=cargarProductosTienda;
window.addEventListener("focus",cargarProductosTienda);
document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible") cargarProductosTienda();
});
window.setInterval(()=>{
    if(document.visibilityState==="visible") cargarProductosTienda();
},15000);

cargarProductosTienda();