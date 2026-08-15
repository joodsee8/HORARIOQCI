// =================================================================
// 4. CATÁLOGOS Y FORMULARIOS
// =================================================================
async function cambiarCatalogoCarrera() {
    const carrera = document.getElementById('selectorCarrera').value;
    const txtArea = document.getElementById('jsonCatalogo');
    
    if(carrera === 'CUSTOM') {
        txtArea.value = '{\n  "CLAVE": {"nombre": "MATERIA NUEVA", "creditos": 8, "prereq": "", "correq": "", "color": "#a8a8a8"}\n}';
        txtArea.disabled = false;
        cargarDatalist();
    } else {
        try {
            const respuesta = await fetch(`${API_BASE_URL}/api/catalogo/${carrera}`);
            if (!respuesta.ok) throw new Error("Catálogo no encontrado");
            const datosJson = await respuesta.json();
            txtArea.value = JSON.stringify(datosJson, null, 2);
            txtArea.disabled = true; 
            cargarDatalist();
        } catch (error) {
            txtArea.value = `Error: Falta crear el archivo ${carrera}.json en la carpeta "catalogos".`;
            document.getElementById('listaMaterias').innerHTML = ''; 
        }

        // Si el alumno todavía no tiene malla propia, se la cargamos sola en
        // cuanto elige su carrera -- sin botón, sin subir nada a mano.
        if (materias.length === 0) {
            await cargarMallaDeCarrera(carrera, { preguntar: false });
        }
    }
    localStorage.setItem('carreraSeleccionada', carrera);
}

/**
 * Trae la malla curricular YA ARMADA (semestre por semestre, lista para
 * mostrarse tal cual) desde `${API_BASE_URL}/api/malla/:carrera` -- un JSON
 * separado del catálogo de "todas las materias" (ese ya existe y no se
 * toca). Es exactamente el mismo formato que ya usa "Restaurar desde JSON"
 * (un arreglo de materias), así que reutiliza esa misma función para
 * aplicarlo: no hay lógica duplicada entre subir el archivo a mano y
 * cargarlo solo al elegir la carrera.
 * @param {string} carrera
 * @param {{preguntar?: boolean}} opciones  preguntar=true pide confirmación aunque ya haya materias (usado por el botón manual "Restaurar Malla Oficial").
 */
async function cargarMallaDeCarrera(carrera, { preguntar = true } = {}) {
    if (!carrera || carrera === 'CUSTOM') {
        alert('Selecciona una carrera (no "Personalizado") para cargar su malla curricular.');
        return;
    }

    if (preguntar && materias.length > 0) {
        if (!confirm('Esto va a REEMPLAZAR tu malla actual por la malla oficial de esta carrera. ¿Continuar?')) return;
    }

    let plantilla;
    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/malla/${carrera}`);
        if (respuesta.status === 404) {
            if (preguntar) alert(`Todavía no hay una malla curricular cargada para ${carrera} en el servidor.`);
            return;
        }
        if (!respuesta.ok) throw new Error();
        plantilla = await respuesta.json();
        if (!Array.isArray(plantilla)) throw new Error();
    } catch (e) {
        if (preguntar) alert('No se pudo cargar la malla curricular de esa carrera desde el servidor.');
        return;
    }

    aplicarMallaCargada(plantilla, `Se cargó la malla curricular de ${carrera} (${plantilla.length} materias).`);
}

function generarCatalogoDesdeOferta() {
    if(Object.keys(ofertaAcademica).length === 0) { alert("⚠️ Primero extrae la oferta del SIIAU."); return; }
    const nuevoCatalogo = {};
    const paleta = ["#58db33", "#b61bee", "#f5950f", "#0ff5f1", "#ff75d3", "#0A84FF"];
    let colorIdx = 0;

    for(let nrc in ofertaAcademica) {
        let curso = ofertaAcademica[nrc];
        if(!nuevoCatalogo[curso.clave]) {
            nuevoCatalogo[curso.clave] = {
                nombre: curso.materia,
                creditos: parseInt(curso.creditos) || 8, 
                prereq: "", correq: "",
                color: paleta[colorIdx % paleta.length]
            };
            colorIdx++;
        }
    }
    document.getElementById('selectorCarrera').value = 'CUSTOM';
    document.getElementById('jsonCatalogo').value = JSON.stringify(nuevoCatalogo, null, 2);
    document.getElementById('jsonCatalogo').disabled = false;
    cargarDatalist();
    alert(`¡PUM! 💥 Catálogo auto-generado con ${Object.keys(nuevoCatalogo).length} materias únicas.`);
}

function cargarDatalist() {
    try {
        const catalogo = JSON.parse(document.getElementById('jsonCatalogo').value);
        const dl = document.getElementById('listaMaterias');
        dl.innerHTML = '';
        for(let key in catalogo) {
            let option = document.createElement('option');
            option.value = `${key} - ${catalogo[key].nombre}`;
            dl.appendChild(option);
        }
    } catch(e){}
}

function seleccionarDelCatalogo(val) {
    if(editandoNRC || !val) return;
    let nrc = val.split(' - ')[0].trim().toUpperCase();
    autocompletarFormulario(nrc);
}

document.getElementById('nrc').addEventListener('input', function() {
    if(editandoNRC) return;
    autocompletarFormulario(this.value.trim().toUpperCase());
});

function autocompletarFormulario(nrc) {
    if (nrc.startsWith("1") && nrc.length === 5) { nrc = "I" + nrc.substring(1); }
    try {
        const catalogo = JSON.parse(document.getElementById('jsonCatalogo').value);
        if (catalogo[nrc]) {
            document.getElementById('nrc').value = nrc;
            document.getElementById('nombre').value = catalogo[nrc].nombre;
            document.getElementById('creditos').value = catalogo[nrc].creditos;
            document.getElementById('prerequisito').value = catalogo[nrc].prereq || '';
            document.getElementById('correquisito').value = catalogo[nrc].correq || '';
            if(catalogo[nrc].color) {
                document.getElementById('colorMateria').value = catalogo[nrc].color;
                actualizarColorPreview();
            }
            document.getElementById('nrc').style.borderColor = "var(--accent-blue)"; 
        } else {
            document.getElementById('nrc').value = nrc;
            document.getElementById('nrc').style.borderColor = "rgba(255,255,255,0.15)"; 
        }
    } catch(e) {}
}

function gestionarEstado() {
    const est = document.getElementById('estado').value;
    const calInput = document.getElementById('calificacion');
    if (est === 'aprobada' || est === 'reprobada' || est === 'convalidada') { calInput.disabled = false; } else { calInput.disabled = true; calInput.value = ''; }
}