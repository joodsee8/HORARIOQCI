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
    }
    localStorage.setItem('carreraSeleccionada', carrera);
}

/**
 * Importa TODAS las materias del catálogo de la carrera seleccionada a la
 * malla del propio alumno (el arreglo `materias`, editable y respaldable).
 * No borra nada existente: si una clave ya está en la malla, se salta. Las
 * claves de optativa comodín (OAINQU, etc.) se agregan como UN espacio
 * placeholder; el alumno puede duplicarlas manualmente si su plan requiere
 * varias, y agregarMateria() las auto-numera para no chocar entre sí.
 */
async function cargarMallaCompleta() {
    const carrera = document.getElementById('selectorCarrera').value;
    if (!carrera || carrera === 'CUSTOM') {
        alert('Selecciona una carrera del catálogo (no "Personalizado") para cargar su malla completa.');
        return;
    }

    if (materias.length > 0) {
        if (!confirm('Ya tienes materias registradas. Cargar la malla de esta carrera AGREGARÁ las que te falten (no borra ni toca lo que ya tienes). ¿Continuar?')) return;
    }

    let catalogo;
    try {
        const respuesta = await fetch(`${API_BASE_URL}/api/catalogo/${carrera}`);
        if (!respuesta.ok) throw new Error();
        catalogo = await respuesta.json();
    } catch (e) {
        alert('No se pudo cargar el catálogo de esa carrera desde el servidor.');
        return;
    }

    let agregadas = 0;
    let sinSemestre = 0;

    for (const clave in catalogo) {
        const c = catalogo[clave];

        if (typeof c.semestre !== 'number') { sinSemestre++; continue; } // catálogo viejo sin esa info: no se auto-carga
        if (materias.some(m => m.nrc === clave)) continue; // ya la tiene

        const letra = encontrarLetraLibre(c.semestre, c.letra || 'A');
        materias.push({
            nrc: clave, nrcOriginal: clave, nombre: c.nombre, semestre: c.semestre, letra,
            apertura: c.apertura || 'ambos', creditos: c.creditos || 0, estado: 'pendiente', calificacion: 0,
            prerequisito: c.prereq || '', correquisito: c.correq || '', color: c.color || '#8E8E93',
            recursamientoGenerado: false, esArt34: false, esOptativa: !!c.esOptativa
        });
        agregadas++;
    }

    if (agregadas === 0) {
        alert(sinSemestre > 0
            ? 'Ese catálogo no trae información de semestre por materia, así que no se puede auto-cargar (revísalo o pégalo manualmente).'
            : 'No había materias nuevas por agregar; ya tienes toda la malla de esta carrera.');
        return;
    }

    guardarDatos();
    procesarNormatividadYDependencias();
    actualizarVistas();
    alert(`✅ Se agregaron ${agregadas} materia(s) de la malla de ${carrera} a tu malla.`);
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