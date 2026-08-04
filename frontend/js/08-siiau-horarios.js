// =================================================================
// 8. CONEXIÓN SIIAU Y HORARIOS MANUALES
// =================================================================
async function descargarOfertaAPI() {
    const ciclo = document.getElementById('apiCiclo').value;
    const centro = document.getElementById('apiCentro').value;
    const carrera = document.getElementById('apiCarrera').value.trim().toUpperCase();
    const estado = document.getElementById('estadoOferta');

    if(!carrera) { estado.style.color = "#FF453A"; estado.innerText = "Por favor ingresa la clave de la carrera."; return; }
    estado.style.color = "#FF9F0A"; estado.innerText = "Conectando al servidor y extrayendo datos del SIIAU... ⏳";

    try {
        const respuesta = await fetch('https://horarioqci.onrender.com/api/extraer-oferta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciclo, centro, carrera })
        });
        if (!respuesta.ok) throw new Error("Error en el servidor");
        const datos = await respuesta.json();
        const cantidadMaterias = Object.keys(datos).length;
        if (cantidadMaterias === 0) { estado.style.color = "#FF453A"; estado.innerText = "No se encontraron materias."; return; }

        ofertaAcademica = datos; localStorage.setItem('oferta_udeg', JSON.stringify(ofertaAcademica));
        estado.style.color = "#30D158"; estado.innerText = `¡Éxito! Se sincronizaron ${cantidadMaterias} materias en tiempo real.`;
        cargarDatalistOferta(); renderizarHorario();
    } catch (error) {
        estado.style.color = "#FF453A"; estado.innerText = "Error de conexión. Asegúrate de que el servidor (server.ts) esté corriendo.";
    }
}

function cargarDatalistOferta() {
    const dataList = document.getElementById('listaOferta'); 
    if(!dataList) return; // Por si el HTML no tiene el datalist aún
    
    dataList.innerHTML = ''; // Limpiamos la lista anterior
    
    // Si la oferta está vacía, no hacemos nada
    if (Object.keys(ofertaAcademica).length === 0) return;

    // Recorremos todas las materias de la oferta y las metemos al datalist
    for (let nrc in ofertaAcademica) {
        let curso = ofertaAcademica[nrc];
        let option = document.createElement('option');
        // Esto mostrará "INQU123 - Matemáticas" en la lista desplegable
        option.value = `${curso.clave} - ${curso.materia}`; 
        dataList.appendChild(option);
    }
}

function convertirHoraAMinutos(horaStr) {
    if(!horaStr.includes(':')) {
        if(horaStr.length === 4) { horaStr = horaStr.substring(0,2) + ':' + horaStr.substring(2); } 
        else if(horaStr.length === 3) { horaStr = '0' + horaStr.substring(0,1) + ':' + horaStr.substring(1); }
    }
    let partes = horaStr.split(':'); return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function verificarConflictoHorario(nrcNuevo) {
    if(Object.keys(ofertaAcademica).length === 0) return [];
    let cursoNuevo = ofertaAcademica[nrcNuevo]; if(!cursoNuevo) return []; 
    let conflictosDetectados = [];
    horarioActual.forEach(nrcGuardado => {
        let cursoGuardado = ofertaAcademica[nrcGuardado];
        if(cursoGuardado) {
            cursoNuevo.horarios.forEach(hn => {
                cursoGuardado.horarios.forEach(hg => {
                    if(hn.dia === hg.dia) {
                        let startN = convertirHoraAMinutos(hn.inicio); let endN = convertirHoraAMinutos(hn.fin);
                        let startG = convertirHoraAMinutos(hg.inicio); let endG = convertirHoraAMinutos(hg.fin);
                        if(startN < endG && endN > startG) { if(!conflictosDetectados.includes(nrcGuardado)) conflictosDetectados.push(nrcGuardado); }
                    }
                });
            });
        }
    });
    return conflictosDetectados;
}

function reubicarMateriaInteligente(claveOriginal, nrcIgnorar) {
    if(Object.keys(ofertaAcademica).length === 0) return null;
    let candidatos = Object.keys(ofertaAcademica).filter(k => ofertaAcademica[k].clave === claveOriginal && k !== nrcIgnorar);
    for(let i = 0; i < candidatos.length; i++) {
        let candidatoNrc = candidatos[i]; let choca = false; let cursoCandidato = ofertaAcademica[candidatoNrc];
        horarioActual.forEach(hgNrc => {
            let cursoG = ofertaAcademica[hgNrc];
            if(cursoG) {
                cursoCandidato.horarios.forEach(hc => {
                    cursoG.horarios.forEach(hg => {
                        if(hc.dia === hg.dia) {
                            let sC = convertirHoraAMinutos(hc.inicio); let eC = convertirHoraAMinutos(hc.fin);
                            let sG = convertirHoraAMinutos(hg.inicio); let eG = convertirHoraAMinutos(hg.fin);
                            if(sC < eG && eC > sG) { choca = true; }
                        }
                    });
                });
            }
        });
        if(!choca) return candidatoNrc; 
    }
    return null; 
}

// --- NUEVO: consulta de cupos en vivo (misma página de búsqueda de oferta) ---
// Recibe un arreglo de NRCs (strings) y regresa un objeto:
// { "42298": { cupos: 40, disponibles: 39 }, "42295": { cupos: 20, disponibles: 20 }, ... }
async function consultarCuposEnVivo(nrcs) {
    const ciclo = document.getElementById('apiCiclo') ? document.getElementById('apiCiclo').value : '';
    const centro = document.getElementById('apiCentro') ? document.getElementById('apiCentro').value : '';
    let carrera = document.getElementById('apiCarrera') ? document.getElementById('apiCarrera').value.trim().toUpperCase() : '';

    // Si falta la carrera (el campo apiCarrera está vacío), en vez de tronar el
    // request directo, pedimos la carrera con una ventana flotante y seguimos
    // con la consulta en cuanto el usuario elige una.
    if (!carrera) {
        carrera = await pedirCarrera();
        const campo = document.getElementById('apiCarrera');
        if (campo) campo.value = carrera; // se queda guardado para las próximas consultas
    }

    const respuesta = await fetch('https://horarioqci.onrender.com/api/consultar-cupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrcs, ciclo, centro, carrera })
    });
    if (!respuesta.ok) throw new Error("Error consultando cupos en el backend");
    return await respuesta.json();
}

// Ventana flotante para elegir la carrera cuando falta. Se resuelve con el
// id de la carrera elegida (ej. "INQU"); si el usuario la cierra sin elegir,
// rechaza la promesa (quien llamó a consultarCuposEnVivo debe manejar ese error).
const CARRERAS_DISPONIBLES = [
    { id: 'INQU', nombre: 'Ingeniería Química' },
    { id: 'INDU', nombre: 'Ingeniería Industrial' }
];

function pedirCarrera() {
    return new Promise((resolve, reject) => {
        cerrarModalCarrera();

        const overlay = document.createElement('div');
        overlay.id = 'modalCarreraOverlay';
        overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;';
        overlay.onclick = (e) => {
            if (e.target !== overlay) return;
            cerrarModalCarrera();
            reject(new Error('Selección de carrera cancelada'));
        };

        overlay.innerHTML = `
            <div style="width:100%; max-width:380px; background:#1c1c1e; border-radius:20px; overflow:hidden; box-shadow:0 10px 40px rgba(0,0,0,0.5); max-height:85vh; display:flex; flex-direction:column;">
                <div style="padding:18px 20px 6px; flex-shrink:0;">
                    <h3 style="margin:0 0 4px; font-size:16px; color:#fff;">🎓 Falta tu carrera</h3>
                    <p style="margin:0; font-size:12px; color:var(--text-muted); line-height:1.4;">Necesitamos saber tu carrera para consultar los cupos en el SIIAU.</p>
                </div>
                <div id="listaCarrerasModal" style="padding:12px 14px calc(16px + env(safe-area-inset-bottom, 0px)); overflow-y:auto;"></div>
            </div>`;
        document.body.appendChild(overlay);

        const lista = overlay.querySelector('#listaCarrerasModal');
        CARRERAS_DISPONIBLES.forEach(c => {
            const fila = document.createElement('div');
            fila.style.cssText = 'padding:14px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; gap:10px;';
            fila.innerHTML = `
                <div style="min-width:0;">
                    <strong style="font-size:13px; color:#fff;">${c.nombre}</strong>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Clave: ${c.id}</div>
                </div>
                <span style="color:#0A84FF; font-size:20px; flex-shrink:0;">›</span>`;
            fila.onmouseenter = () => { fila.style.background = 'rgba(10,132,255,0.15)'; fila.style.borderColor = 'rgba(10,132,255,0.4)'; };
            fila.onmouseleave = () => { fila.style.background = 'rgba(255,255,255,0.04)'; fila.style.borderColor = 'rgba(255,255,255,0.08)'; };
            fila.onclick = () => { cerrarModalCarrera(); resolve(c.id); };
            lista.appendChild(fila);
        });
    });
}

function cerrarModalCarrera() {
    const overlay = document.getElementById('modalCarreraOverlay');
    if (overlay) overlay.remove();
}

function agregarAlHorario() {
    let nrc = document.getElementById('nrcHorario').value.trim(); if(!nrc) return;
    if(Object.keys(ofertaAcademica).length === 0) { alert("Sube el JSON de Oferta Académica del semestre."); return; }
    if(!ofertaAcademica[nrc]) { alert("Ese NRC no existe en la base de datos cargada."); return; }
    if(horarioActual.includes(nrc)) { alert("Esta materia ya está en tu horario."); return; }

    let conflictos = verificarConflictoHorario(nrc);
    if(conflictos.length > 0) {
        let confNombres = conflictos.map(c => ofertaAcademica[c].materia).join(", ");
        if(confirm(`Colisión detectada con: ${confNombres}.\n\n¿Reemplazar e intentar reubicar automáticamente?`)) {
            horarioActual = horarioActual.filter(x => !conflictos.includes(x)); horarioActual.push(nrc);
            conflictos.forEach(confNrc => {
                let vieja = ofertaAcademica[confNrc]; let nrcSalvador = reubicarMateriaInteligente(vieja.clave, confNrc);
                if(nrcSalvador) { horarioActual.push(nrcSalvador); alert(`Reubicación Exitosa: Se movió "${vieja.materia}" al NRC ${nrcSalvador}`); } 
                else { alert(`Error: No se encontró horario libre para "${vieja.materia}". Fue removida.`); }
            });
        }
    } else { horarioActual.push(nrc); }

    document.getElementById('nrcHorario').value = ''; guardarHorario(); renderizarHorario();
}

function limpiarHorario() { if(confirm("¿Estás seguro de vaciar el calendario de horarios?")) { horarioActual = []; guardarHorario(); renderizarHorario(); } }

function renderizarHorario() {
    const grid = document.getElementById('gridCalendario'); if(!grid) return;
    grid.innerHTML = ''; 
    grid.innerHTML += `<div class="cal-header" style="grid-row:1; grid-column:1;"></div>`; 
    DIAS_NOMBRE.forEach((d, idx) => grid.innerHTML += `<div class="cal-header" style="grid-row:1; grid-column:${idx+2};">${d}</div>`);
    for(let i = 7; i <= 21; i++) { 
        let row = i - 5;
        grid.innerHTML += `<div class="cal-hora" style="grid-row:${row}; grid-column:1;">${i}:00</div>`; 
        for(let j=0; j<6; j++) { grid.innerHTML += `<div class="cal-celda" style="grid-row:${row}; grid-column:${j+2};"></div>`; } 
    }

    if(Object.keys(ofertaAcademica).length === 0) return;
    
    const paletaColores = ['#FF2D55', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F'];
    let colorMap = {}; let colorIndex = 0;

    horarioActual.forEach(nrc => {
        let curso = ofertaAcademica[nrc];
        if(curso) {
            if(!colorMap[curso.clave]) { colorMap[curso.clave] = paletaColores[colorIndex % paletaColores.length]; colorIndex++; }
            let colorClase = colorMap[curso.clave];

            curso.horarios.forEach(h => {
                if(h.inicio === "00:00" || h.inicio === "0:00") return; 
                let diaIndex = DIAS_LETRA.indexOf(h.dia);
                if(diaIndex !== -1) {
                    let startMin = convertirHoraAMinutos(h.inicio) - 420; let endMin = convertirHoraAMinutos(h.fin) - 420; let duracion = endMin - startMin;
                    let topOffset = (startMin % 60) * (60 / 60); let altura = duracion * (60 / 60); let gridRowStart = Math.floor(startMin / 60) + 2; let gridCol = diaIndex + 2;
                    let rgbaBg = hexToRgba(colorClase, 0.20);
                    let edificioAula = (h.edificio && h.aula) ? `(${h.edificio}-${h.aula})` : `(Sin Aula)`;
                    let profesor = curso.profesor || 'Por definir';

                    let div = document.createElement('div'); div.className = 'bloque-clase'; div.style.gridColumn = gridCol; div.style.gridRow = `${gridRowStart} / span ${Math.ceil(duracion/60)}`;
                    div.style.background = rgbaBg; div.style.borderLeft = `4px solid ${colorClase}`; div.style.marginTop = `${topOffset}px`; div.style.height = `${altura - 4}px`; div.style.zIndex = 10;
                    div.innerHTML = `<strong style="font-size:11px; display:block; margin-bottom:2px; word-wrap:break-word;">${curso.materia}</strong><span style="font-size:9px; color:rgba(255,255,255,0.85); display:block; word-wrap:break-word;">${nrc} | ${profesor}</span><span style="font-size:9px; color:#64D2FF; font-weight:600; display:block; margin-top:2px; word-wrap:break-word;">${edificioAula}</span>`;
                    grid.appendChild(div);
                }
            });
        }
    });
}