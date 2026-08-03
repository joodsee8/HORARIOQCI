// =================================================================
// 2. INICIO Y CARGA DE DATOS
// =================================================================
window.onload = function() {
    const carreraGuardada = localStorage.getItem('carreraSeleccionada') || 'INQU';
    const selector = document.getElementById('selectorCarrera');
    if(selector) selector.value = carreraGuardada;
    
    cambiarCatalogoCarrera(); 
    sanitizarDatosGuardados(); 
    procesarNormatividadYDependencias(); 
    actualizarVistas();
    
    if(Object.keys(ofertaAcademica).length > 0) {
        document.getElementById('estadoOferta').innerText = "Oferta en memoria lista.";
        cargarDatalistOferta();
    }
    renderizarHorario(); 
};

function sanitizarDatosGuardados() {
    let arreglado = false;
    materias.forEach(m => {
        if (m.prerequisito) {
            let padre = materias.find(p => p.nrc === m.prerequisito);
            if (padre && padre.prerequisito === m.nrc) { m.prerequisito = ''; padre.prerequisito = ''; arreglado = true; }
        }
        if (m.correquisito === undefined) { m.correquisito = ''; arreglado = true; }
    });
    if(arreglado) guardarDatos(); 
}

