window.addEventListener("inventarioActualizado",function(){
    if(typeof actualizarDashboard === "function"){
        actualizarDashboard();
    }
});