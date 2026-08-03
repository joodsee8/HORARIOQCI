// =================================================================
// 5. GESTIÓN DE MATERIAS Y MALLA
// =================================================================
function obtenerCreditosAprobados() { 
    return materias.filter(m => m.estado === 'aprobada' || m.estado === 'convalidada').reduce((sum, m) => sum + m.creditos, 0); 
}

function encontrarLetraLibre(sem, letraSugerida) {
    let letrasUsadas = materias.filter(m => m.semestre === sem).map(m => m.letra);
    if (!letrasUsadas.includes(letraSugerida)) return letraSugerida;
    for (let i = 65; i <= 90; i++) { let l = String.fromCharCode(i); if (!letrasUsadas.includes(l)) return l; }
    return letraSugerida;
}

function obtenerSiguienteSemestre(semestreActual, apertura) {
    let sem = semestreActual + 1; apertura = apertura || 'ambos';
    if (apertura === 'par' && sem % 2 !== 0) sem++;
    if (apertura === 'impar' && sem % 2 === 0) sem++;
    return sem;
}

function procesarNormatividadYDependencias() {
    let cambios = false;
    for (let i = 0; i < materias.length; i++) {
        let m = materias[i];
        if (!m.nrcOriginal) { m.nrcOriginal = m.nrc; cambios = true; }

        if (m.estado === 'reprobada' && !m.recursamientoGenerado) {
            m.recursamientoGenerado = true; cambios = true;
            let historial = materias.filter(x => (x.nrcOriginal === m.nrcOriginal) && x.estado === 'reprobada').length;
            if (historial >= 2) {
                alert(`ART. 35: Has reprobado "${m.nombre}" por segunda ocasión. Causa BAJA DEFINITIVA.`);
            } else {
                let nrcRecursamiento = m.nrc + '-R';
                let semestreRecursamiento = obtenerSiguienteSemestre(m.semestre, m.apertura);
                
                if (!materias.find(x => x.nrc === nrcRecursamiento)) {
                    let recursamiento = { ...m, nrc: nrcRecursamiento, nrcOriginal: m.nrcOriginal, semestre: semestreRecursamiento, estado: 'pendiente', calificacion: '', recursamientoGenerado: false, esArt34: true };
                    recursamiento.letra = encontrarLetraLibre(semestreRecursamiento, m.letra);
                    materias.push(recursamiento);
                    materias.forEach(d => {
                        if (d.prerequisito === m.nrc) { d.prerequisito = nrcRecursamiento; }
                        if (d.correquisito === m.nrc) { d.correquisito = nrcRecursamiento; }
                    });
                }
            }
        }
    }

    let cascadaActiva = true; let iteraciones = 0;
    while(cascadaActiva && iteraciones < 20) {
        cascadaActiva = false; iteraciones++;
        materias.forEach(hijo => {
            if (hijo.prerequisito) {
                let padre = materias.find(p => p.nrc === hijo.prerequisito);
                if (padre && hijo.semestre <= padre.semestre) {
                    hijo.semestre = obtenerSiguienteSemestre(padre.semestre, hijo.apertura);
                    hijo.letra = encontrarLetraLibre(hijo.semestre, hijo.letra);
                    cambios = true; cascadaActiva = true;
                }
            }
            if (hijo.correquisito) {
                let correq = materias.find(c => c.nrc === hijo.correquisito);
                if (correq && hijo.semestre < correq.semestre) {
                    hijo.semestre = correq.semestre;
                    hijo.letra = encontrarLetraLibre(hijo.semestre, hijo.letra);
                    cambios = true; cascadaActiva = true;
                }
            }
        });
    }
    if (cambios) guardarDatos();
}

function agregarMateria() {
    const nrc = document.getElementById('nrc').value.trim().toUpperCase(); const nombre = document.getElementById('nombre').value; const semestre = parseInt(document.getElementById('semestre').value);
    const letra = document.getElementById('letra').value; const apertura = document.getElementById('apertura').value; const creditos = parseInt(document.getElementById('creditos').value);
    let estado = document.getElementById('estado').value; let calificacion = parseFloat(document.getElementById('calificacion').value) || 0;
    const prerequisito = document.getElementById('prerequisito').value.trim().toUpperCase(); const correquisito = document.getElementById('correquisito').value.trim().toUpperCase(); const color = document.getElementById('colorMateria').value;

    if (!nrc || !nombre || isNaN(semestre) || isNaN(creditos)) { alert("Completa los campos obligatorios."); return; }
    if (estado === 'aprobada' && calificacion < 60) { estado = 'reprobada'; } else if (estado === 'reprobada' && calificacion >= 60) { estado = 'aprobada'; }

    const indexExistente = materias.findIndex(m => m.semestre === semestre && m.letra === letra);

    if (editandoNRC) {
        const indexOriginal = materias.findIndex(m => m.nrc === editandoNRC);
        if (indexExistente !== -1 && indexExistente !== indexOriginal) { if (!confirm(`Ya existe materia en ${semestre}${letra}. ¿Reemplazar?`)) return; materias.splice(indexExistente, 1); }
        const iFinal = materias.findIndex(m => m.nrc === editandoNRC);
        materias[iFinal] = { ...materias[iFinal], nrc, nombre, semestre, letra, apertura, creditos, estado, calificacion, prerequisito, correquisito, color };
        cancelarEdicion();
    } else {
        if (indexExistente !== -1) { if (!confirm(`Ya existe materia en ${semestre}${letra}. ¿Reemplazar?`)) return; materias.splice(indexExistente, 1); }
        materias.push({ nrc, nrcOriginal: nrc, nombre, semestre, letra, apertura, creditos, estado, calificacion, prerequisito, correquisito, color, recursamientoGenerado: false, esArt34: false });
        cancelarEdicion();
    }
    guardarDatos(); procesarNormatividadYDependencias(); actualizarVistas();
}

function editarMateria(nrc) {
    const m = materias.find(x => x.nrc === nrc); if (!m) return;
    document.getElementById('nrc').value = m.nrc; document.getElementById('nombre').value = m.nombre; document.getElementById('semestre').value = m.semestre;
    document.getElementById('letra').value = m.letra; document.getElementById('apertura').value = m.apertura || 'ambos'; document.getElementById('creditos').value = m.creditos;
    document.getElementById('estado').value = m.estado || 'pendiente'; document.getElementById('calificacion').value = m.calificacion || '';
    document.getElementById('prerequisito').value = m.prerequisito || ''; document.getElementById('correquisito').value = m.correquisito || ''; document.getElementById('colorMateria').value = m.color;
    actualizarColorPreview(); gestionarEstado(); editandoNRC = m.nrc;
    document.getElementById('tituloFormulario').innerText = `Editando: ${m.nombre}`;
    const btnGuardar = document.getElementById('btnSubmit'); btnGuardar.innerText = "Actualizar Materia"; btnGuardar.style.background = "rgba(255, 159, 10, 0.4)";
    document.getElementById('btnCancelar').style.display = "block"; document.getElementById('buscadorCatalogo').value = ''; cambiarPagina('form-page');
}

function cancelarEdicion() {
    editandoNRC = null; document.getElementById('tituloFormulario').innerText = "Registrar Nueva Materia";
    const btn = document.getElementById('btnSubmit'); btn.innerText = "Guardar en el Sistema"; btn.style.background = "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))";
    document.getElementById('btnCancelar').style.display = "none";
    document.getElementById('nrc').value = ''; document.getElementById('nombre').value = ''; document.getElementById('calificacion').value = '';
    document.getElementById('estado').value = 'pendiente'; document.getElementById('prerequisito').value = ''; document.getElementById('correquisito').value = ''; document.getElementById('nrc').style.borderColor = "rgba(255,255,255,0.15)"; gestionarEstado();
    actualizarColumnaAutomatica();
}

function eliminarMateria(nrc) {
    if (confirm(`¿Eliminar esta materia?`)) { materias.splice(materias.findIndex(m => m.nrc === nrc), 1); guardarDatos(); actualizarVistas(); }
}

window.cambiarEstadoSemestre = function(semestre, nuevoEstado) {
    if(!nuevoEstado) return;
    if(!confirm(`¿Cambiar TODAS las materias del Semestre ${semestre} a "${nuevoEstado}"?`)) return;

    let cambios = false;
    materias.forEach(m => {
        if(m.semestre === parseInt(semestre)) {
            m.estado = nuevoEstado; cambios = true;
            if(nuevoEstado === 'aprobada' || nuevoEstado === 'reprobada' || nuevoEstado === 'convalidada') {
                let nota = prompt(m.nombre + "\nCalificación final:", m.calificacion || (nuevoEstado === 'reprobada' ? 50 : 60));
                if (nota !== null && !isNaN(nota) && nota !== "") {
                    m.calificacion = parseFloat(nota);
                    if (m.calificacion >= 60 && nuevoEstado === 'reprobada') m.estado = 'aprobada';
                    if (m.calificacion < 60 && nuevoEstado === 'aprobada') m.estado = 'reprobada';
                } else { m.calificacion = m.calificacion || 0; }
            } else { m.calificacion = 0; }
        }
    });
    if(cambios) { guardarDatos(); procesarNormatividadYDependencias(); actualizarVistas(); }
}

