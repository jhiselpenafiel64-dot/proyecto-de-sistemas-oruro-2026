(function(){
    const productosIniciales=[
        {id:1,nombre:"Café Americano",precio:12,stock:50,estado:"Disponible"},
        {id:2,nombre:"Capuchino",precio:18,stock:40,estado:"Disponible"},
        {id:3,nombre:"Torta de chocolate",precio:22,stock:25,estado:"Disponible"}
    ];

    if(!localStorage.getItem("inventario")){
        localStorage.setItem("inventario",JSON.stringify(productosIniciales));
    }

    fetch("api.php?action=productos",{cache:"no-store"})
        .then(respuesta=>respuesta.ok ? respuesta.json() : null)
        .then(datos=>{
            if(datos && datos.productos){
                localStorage.setItem("inventario",JSON.stringify(datos.productos));
                window.dispatchEvent(new Event("inventarioActualizado"));
            }
        })
        .catch(error=>{
            console.error("No se pudo sincronizar el inventario del administrador:",error);
        });
})();