// =================================================================
// 7. RESPALDOS
// =================================================================
function descargarRespaldo() {
    if (materias.length === 0) { alert("No hay datos para respaldar."); return; }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(materias, null, 4));
    const enlaceDescarga = document.createElement('a');
    enlaceDescarga.setAttribute("href", dataStr);
    enlaceDescarga.setAttribute("download", "respaldo_malla_udeg.json");
    document.body.appendChild(enlaceDescarga); enlaceDescarga.click(); enlaceDescarga.remove();
}

function procesarArchivoCargado(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            if (Array.isArray(contenido)) {
                if (confirm("¿Cargar este respaldo? Reemplazará tu malla actual.")) {
                    aplicarMallaCargada(contenido, "Respaldo cargado exitosamente.");
                }
            } else { alert("Formato incorrecto."); }
        } catch (error) { alert("Error al leer el JSON."); }
        event.target.value = ''; 
    };
    lector.readAsText(archivo);
}

/**
 * Reemplaza `materias` por el arreglo dado y refresca todo. La usan tanto
 * "Restaurar desde JSON" (subida manual de archivo) como la carga
 * automática de la malla curricular al elegir carrera -- una sola lógica,
 * dos formas de llegar a ella.
 * @param {Array} arregloMaterias
 * @param {string} mensajeExito
 */
function aplicarMallaCargada(arregloMaterias, mensajeExito) {
    materias = arregloMaterias;
    sanitizarDatosGuardados();
    guardarDatos();
    procesarNormatividadYDependencias();
    actualizarVistas();
    if (document.getElementById('dashboard-page')?.classList.contains('active')) renderizarDashboard();
    if (mensajeExito) alert(mensajeExito);
}