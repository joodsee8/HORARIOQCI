// =================================================================
// 9. CEREBRO DEL GENERADOR DE HORARIOS (Dual Intelligence)
// =================================================================
function toggleGeneradorUI() {
    const chk = document.getElementById('chkTurnoUnico').checked;
    document.getElementById('turnoFijoContainer').style.display = chk ? 'block' : 'none';
    document.getElementById('turnoDiasContainer').style.display = chk ? 'none' : 'block';
    
    const panel = document.getElementById('panelDiasAvanzado');
    if(panel && panel.innerHTML.trim() === '') {
        let horas = '';
        for(let i=7; i<=21; i++) { let h = i<10?`0${i}`:i; horas+=`<option value="${h}:00">${h}:00</option>`; }
        ['L', 'M', 'I', 'J', 'V', 'S'].forEach(letra => {
            panel.innerHTML += `
            <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; display:flex; gap:10px; align-items:center;">
                <strong style="width:15px; font-size:13px; color:var(--accent-blue);">${letra}:</strong>
                <label style="display:flex; align-items:center; gap:5px; margin:0; cursor:pointer;">
                    <input type="checkbox" id="desc-${letra}" title="Descanso" onchange="document.getElementById('ini-${letra}').disabled=this.checked; document.getElementById('fin-${letra}').disabled=this.checked;"> 
                    <span style="font-size:11px; color:#86868B;">Descanso</span>
                </label>
                <select id="ini-${letra}" style="padding:6px; font-size:11px; flex:1;">${horas}</select>
                <span style="font-size:11px; color:var(--text-muted);">a</span>
                <select id="fin-${letra}" style="padding:6px; font-size:11px; flex:1;"><option value="21:55">21:55</option>${horas}</select>
            </div>`;
        });
    }
}

function cargarSemestreGenerador() {
    const sem = parseInt(document.getElementById('selSemestreGenerador').value);
    if(isNaN(sem)) return alert("Selecciona un semestre válido de la lista.");
    if(Object.keys(ofertaAcademica).length === 0) return alert("Sube el JSON de Oferta Académica en la pestaña Horarios primero.");
    const matSemestre = materias.filter(m => m.semestre === sem && m.estado !== 'aprobada' && m.estado !== 'convalidada' && m.nrc !== 'SSINQU' && m.nrc !== 'IA896');
    if(matSemestre.length === 0) return alert(`No hay materias pendientes por cursar en el semestre ${sem}.`);
    
    let agregadas = 0; let noEncontradas = [];
    matSemestre.forEach(m => {
        let existeEnOferta = Object.values(ofertaAcademica).some(o => o.clave === (m.nrcOriginal || m.nrc));
        if(existeEnOferta) {
            if(!cursosGenerador.find(c => c.clave === (m.nrcOriginal || m.nrc))) { cursosGenerador.push({ clave: (m.nrcOriginal || m.nrc), nombre: m.nombre }); agregadas++; }
        } else { noEncontradas.push(m.nombre); }
    });

    renderizarListaGenerador(); actualizarListaMaestros();
    if(noEncontradas.length > 0) alert(`Se agregaron ${agregadas} materias.\n\nIgnoradas (No se ofertaron):\n- ${noEncontradas.join('\n- ')}`);
}

function agregarCursoGenerador(val) {
    if(!val) return;
    let clave = val.split(' - ')[0].trim().toUpperCase(); let nombreMateria = "";
    for(let nrc in ofertaAcademica) { if(ofertaAcademica[nrc].clave === clave) { nombreMateria = ofertaAcademica[nrc].materia; break; } }
    if(!nombreMateria) return alert("La materia no se encuentra en el JSON de oferta actual.");
    if(cursosGenerador.find(c => c.clave === clave)) return alert("Ya agregaste esta materia.");
    cursosGenerador.push({ clave: clave, nombre: nombreMateria });
    document.getElementById('buscadorGenerador').value = ''; renderizarListaGenerador(); actualizarListaMaestros();
}

function eliminarCursoGenerador(clave) {
    cursosGenerador = cursosGenerador.filter(c => c.clave !== clave);
    renderizarListaGenerador(); actualizarListaMaestros();
}

function renderizarListaGenerador() {
    const ul = document.getElementById('listaCursosGenerador'); ul.innerHTML = '';
    if(cursosGenerador.length === 0) { ul.innerHTML = '<span style="color:var(--text-muted); font-size:12px;">No hay materias seleccionadas.</span>'; }
    cursosGenerador.forEach(c => { ul.innerHTML += `<li><span><strong style="color:var(--accent-blue);">${c.clave}</strong> - ${c.nombre}</span> <button class="btn-eliminar" style="background:rgba(255, 69, 58, 0.2); color:#FF453A; border:1px solid rgba(255, 69, 58, 0.3);" onclick="eliminarCursoGenerador('${c.clave}')">X</button></li>`; });
}

function actualizarListaMaestros() {
    const contenedor = document.getElementById('listaMaestrosVeto');
    if(!contenedor) return;
    if(cursosGenerador.length === 0) { contenedor.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">Agrega materias primero para ver a los profesores...</span>'; return; }

    contenedor.innerHTML = ''; let hayProfesoresEnTotal = false;

    cursosGenerador.forEach(c => {
        let nrcs = Object.keys(ofertaAcademica).filter(k => ofertaAcademica[k].clave === c.clave);
        let profesDeLaMateria = new Set();
        nrcs.forEach(nrc => { let prof = ofertaAcademica[nrc].profesor; if(prof && prof.trim() !== '' && prof.toLowerCase() !== 'por definir') { profesDeLaMateria.add(prof.trim()); hayProfesoresEnTotal = true; } });

        if(profesDeLaMateria.size > 0) {
            let arrProfes = Array.from(profesDeLaMateria).sort();
            let htmlProfes = '';
            arrProfes.forEach(p => {
                htmlProfes += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin: 6px 0 0 10px; font-size:11px; color:#fff; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                    <span style="flex:1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p}">${p}</span>
                    <div style="display:flex; gap: 12px;">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:4px; color:#FF453A;" title="Vetar"><input type="checkbox" class="chk-veto" value="${p}">🚫</label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:4px; color:#FFD60A;" title="Favorito"><input type="checkbox" class="chk-fav" value="${p}">⭐</label>
                    </div>
                </div>`;
            });

            contenedor.innerHTML += `
            <details style="margin-bottom: 6px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px; padding: 6px;">
                <summary style="font-size:11.5px; color:var(--accent-blue); cursor:pointer; font-weight:600; outline:none; line-height: 1.3;">
                    ${c.nombre} <span style="color:var(--text-muted); font-size:9.5px; font-weight:normal;">(${arrProfes.length} profes)</span>
                </summary>
                <div style="margin-top: 5px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 5px;">${htmlProfes}</div>
            </details>`;
        }
    });

    if(!hayProfesoresEnTotal) contenedor.innerHTML = '<span style="font-size:11px; color:var(--text-muted);">No hay profesores definidos.</span>';
}

function obtenerPreferencias() {
    let isGlobal = document.getElementById('chkTurnoUnico').checked;
    let vetados = []; let favoritos = [];
    document.querySelectorAll('.chk-veto:checked').forEach(chk => vetados.push(chk.value));
    document.querySelectorAll('.chk-fav:checked').forEach(chk => favoritos.push(chk.value));
    let prefs = { type: isGlobal ? 'global' : 'daily', limites: {}, vetados: vetados, favoritos: favoritos };

    if(isGlobal) { prefs.turno = document.getElementById('selTurnoGlobal').value; } 
    else {
        ['L', 'M', 'I', 'J', 'V', 'S'].forEach(letra => {
            let isDescanso = document.getElementById(`desc-${letra}`).checked;
            if(isDescanso) { prefs.limites[letra] = 'descanso'; } 
            else { prefs.limites[letra] = { min: convertirHoraAMinutos(document.getElementById(`ini-${letra}`).value), max: convertirHoraAMinutos(document.getElementById(`fin-${letra}`).value) }; }
        });
    }
    return prefs;
}

function respetaRestricciones(curso, prefs) {
    if(prefs.vetados && prefs.vetados.length > 0 && curso.profesor) { if(prefs.vetados.includes(curso.profesor.trim())) return false; }
    for(let h of curso.horarios) {
        let ini = convertirHoraAMinutos(h.inicio); let fin = convertirHoraAMinutos(h.fin);
        if(prefs.type === 'global') {
            if(prefs.turno === 'matutino' && fin > 895) return false;
            if(prefs.turno === 'vespertino' && ini < 750) return false;
        } else {
            let restDia = prefs.limites[h.dia];
            if(!restDia || restDia === 'descanso') return false; 
            if(ini < restDia.min || fin > restDia.max) return false;
        }
    }
    return true;
}

function tieneMasDe7HorasSeguidas(nrcs) {
    let horarioPorDia = { 'L': [], 'M': [], 'I': [], 'J': [], 'V': [], 'S': [] };
    nrcs.forEach(nrc => { ofertaAcademica[nrc].horarios.forEach(h => { if(h.inicio !== "00:00" && h.inicio !== "0:00") horarioPorDia[h.dia].push({ ini: convertirHoraAMinutos(h.inicio), fin: convertirHoraAMinutos(h.fin) }); }); });

    for(let dia in horarioPorDia) {
        let clases = horarioPorDia[dia].sort((a,b) => a.ini - b.ini);
        if(clases.length === 0) continue;
        let bloqueInicio = clases[0].ini; let bloqueFin = clases[0].fin;
        for(let i = 1; i < clases.length; i++) {
            let c = clases[i];
            if(c.ini - bloqueFin <= 30) { bloqueFin = Math.max(bloqueFin, c.fin); } 
            else {
                if(bloqueFin - bloqueInicio > 420) return true; 
                bloqueInicio = c.ini; bloqueFin = c.fin;
            }
        }
        if(bloqueFin - bloqueInicio > 420) return true;
    }
    return false;
}

function calcularPuntajeFavoritos(nrcs, favoritos) {
    let count = 0; nrcs.forEach(nrc => { let prof = ofertaAcademica[nrc].profesor; if(prof && favoritos.includes(prof.trim())) count++; });
    return count;
}

function choca(cursoNuevo, listaNrcsActual) {
    for(let hN of cursoNuevo.horarios) {
        if(hN.inicio === "00:00" || hN.inicio === "0:00") continue; 
        let sN = convertirHoraAMinutos(hN.inicio); let eN = convertirHoraAMinutos(hN.fin);
        for(let nrcG of listaNrcsActual) {
            let cursoG = ofertaAcademica[nrcG];
            for(let hG of cursoG.horarios) {
                if(hG.inicio === "00:00" || hG.inicio === "0:00") continue;
                if(hN.dia === hG.dia) { let sG = convertirHoraAMinutos(hG.inicio); let eG = convertirHoraAMinutos(hG.fin); if(sN < eG && eN > sG) return true; }
            }
        }
    }
    return false;
}

async function ejecutarGenerador() {
    if(Object.keys(ofertaAcademica).length === 0) { alert("Sube primero el JSON de oferta en la pestaña Horarios."); return; }
    if(cursosGenerador.length === 0) { alert("Agrega al menos una materia."); return; }

    const btn = document.getElementById('btnEjecutarGen');
    if(btn) { btn.innerHTML = 'Filtrando maestros y horarios...'; btn.disabled = true; }

    let prefs = obtenerPreferencias(); let gruposMaterias = []; let errorFaltaOferta = false;
    
    cursosGenerador.forEach(c => {
        let nrcsDisponibles = Object.keys(ofertaAcademica).filter(k => ofertaAcademica[k].clave === c.clave);
        let nrcsFiltrados = nrcsDisponibles.filter(nrc => respetaRestricciones(ofertaAcademica[nrc], prefs));
        if(nrcsFiltrados.length === 0) { errorFaltaOferta = c.nombre; }
        gruposMaterias.push(nrcsFiltrados);
    });

    if(errorFaltaOferta) {
        if(btn) { btn.innerHTML = 'Generar Opciones'; btn.disabled = false; }
        return alert(`Imposible agendar:\n"${errorFaltaOferta}"\nTodos sus profes están vetados o no encajan en tus horas.`);
    }

const chkCupos = document.getElementById('chkCuposEnVivo');

if (chkCupos && chkCupos.checked) {

    // Tomamos primero la carrera del calendario
    let carrera = document
        .getElementById('apiCarrera')
        ?.value
        .trim()
        .toUpperCase() || '';

    // Si el calendario no tiene carrera,
    // usamos la carrera elegida en el nuevo select
    if (!carrera) {
        carrera = document
            .getElementById('carreraCupos')
            ?.value
            .trim()
            .toUpperCase() || '';
    }

    // Si no hay carrera en ninguno de los dos,
    // detenemos el proceso antes de consultar SIIAU
    if (!carrera) {
        if (btn) {
            btn.innerHTML = 'Generar Opciones';
            btn.disabled = false;
        }

        return alert(
            '🎓 Selecciona una carrera para consultar los cupos en vivo.'
        );
    }

    // Guardamos la carrera seleccionada en apiCarrera
    // para que consultarCuposEnVivo() la pueda usar
    const apiCarrera =
        document.getElementById('apiCarrera');

    if (apiCarrera) {
        apiCarrera.value = carrera;
    }

    // Ahora sí consultamos SIIAU
    if (btn) {
        btn.innerHTML =
            'Consultando SIIAU en vivo... ⏳';
    }

    const minCupos =
        parseInt(
            document
                .getElementById('minCuposVal')
                ?.value
        ) || 1;

    const nrcsAProbar =
        gruposMaterias.flat();

    try {

        const dictCupos =
            await consultarCuposEnVivo(
                nrcsAProbar
            );

        for (
            let i = 0;
            i < gruposMaterias.length;
            i++
        ) {

            gruposMaterias[i] =
                gruposMaterias[i].filter(
                    nrc =>
                        (
                            dictCupos[nrc]
                                ?.disponibles || 0
                        ) >= minCupos
                );

            if (
                gruposMaterias[i].length === 0
            ) {

                if (btn) {
                    btn.innerHTML =
                        'Generar Opciones';

                    btn.disabled = false;
                }

                return alert(
                    `Sold Out 💀:\n` +
                    `"${cursosGenerador[i].nombre}"\n` +
                    `Ningún grupo disponible tiene ` +
                    `${minCupos} cupo(s) ` +
                    `en este momento.`
                );
            }
        }

    } catch (error) {

        console.error(
            '❌ Error consultando cupos:',
            error
        );

        if (btn) {
            btn.innerHTML =
                'Generar Opciones';

            btn.disabled = false;
        }

        return alert(
            '⚠️ Error al conectar con el backend ' +
            'para checar cupos.'
        );
    }
}

    if(btn) btn.innerHTML = 'Armando combinaciones masivas...';

    setTimeout(() => {
        todosLosResultados = [];
        
        function backtrack(index, horarioTemp) {
            if(todosLosResultados.length >= 1500) return; 
            if(index === gruposMaterias.length) { 
                let masDe7h = tieneMasDe7HorasSeguidas(horarioTemp);
                let esMixto = (prefs.type === 'global' && prefs.turno === 'mixto');
                if (masDe7h && !esMixto) return;
                todosLosResultados.push({ nrcs: [...horarioTemp], masDe7h: masDe7h }); 
                return; 
            }
            for(let nrc of gruposMaterias[index]) {
                if(!choca(ofertaAcademica[nrc], horarioTemp)) { horarioTemp.push(nrc); backtrack(index + 1, horarioTemp); horarioTemp.pop(); }
            }
        }
        
        backtrack(0, []);
        window.prefsGeneradorGlobal = prefs;
        let poolEfi = []; let poolFav = [];

        todosLosResultados.forEach(res => {
            if (!res.masDe7h) { poolEfi.push(res.nrcs); }
            poolFav.push(res.nrcs);
        });

        window.resultadosEfi = poolEfi.sort((a, b) => calcularPuntajeHorario(b) - calcularPuntajeHorario(a));

        if (prefs.favoritos.length > 0) {
            window.resultadosFav = poolFav.sort((a, b) => {
                let fA = calcularPuntajeFavoritos(a, prefs.favoritos); let fB = calcularPuntajeFavoritos(b, prefs.favoritos);
                if(fB !== fA) return fB - fA; return calcularPuntajeHorario(b) - calcularPuntajeHorario(a);
            });
            let topFavStrings = window.resultadosFav.slice(0, 30).map(arr => arr.join(','));
            window.resultadosEfi = window.resultadosEfi.filter(arr => !topFavStrings.includes(arr.join(',')));
        } else { window.resultadosFav = []; }

        resultadosMostrados = 0;
        window.cardState = {};
        document.getElementById('resultadosGenerador').innerHTML = '';
        mostrarMasResultados();

        if(btn) { btn.innerHTML = 'Generar Opciones'; btn.disabled = false; }
    }, 50);
}

function calcularPuntajeHorario(nrcs) {
    let score = 0; let diasOcupados = new Set(); let gapsTotales = 0;
    let horarioPorDia = { 'L': [], 'M': [], 'I': [], 'J': [], 'V': [], 'S': [] };
    nrcs.forEach(nrc => { ofertaAcademica[nrc].horarios.forEach(h => { if(h.inicio !== "00:00" && h.inicio !== "0:00") { diasOcupados.add(h.dia); horarioPorDia[h.dia].push({ ini: convertirHoraAMinutos(h.inicio), fin: convertirHoraAMinutos(h.fin) }); } }); });

    score += (6 - diasOcupados.size) * 100;
    if(!diasOcupados.has('S')) score += 200;

    for(let dia in horarioPorDia) {
        let clases = horarioPorDia[dia].sort((x, y) => x.ini - y.ini);
        for(let i = 0; i < clases.length - 1; i++) { let gap = clases[i+1].ini - clases[i].fin; if(gap > 0) gapsTotales += gap; }
    }
    score -= (gapsTotales / 30) * 10; 
    return score;
}

function armarTarjetaHorario(res, index, tag) {
    const uid = `${tag}-${index}`;
    window.cardState[uid] = { nrcs: [...res], index, tag };
    return `<div class="gen-opcion" id="card-${uid}" style="margin-bottom:0;">${cuerpoTarjeta(uid)}</div>`;
}

// Construye el contenido interno de una tarjeta a partir de su estado actual.
// Separado de armarTarjetaHorario para poder volver a dibujar SOLO esta tarjeta
// (sin tocar el resto de las opciones) cuando el usuario cambia un maestro.
function cuerpoTarjeta(uid) {
    const state = window.cardState[uid];
    const res = state.nrcs; const index = state.index; const tag = state.tag;

    let scoreEfi = Math.round(calcularPuntajeHorario(res));
    let scoreFav = calcularPuntajeFavoritos(res, window.prefsGeneradorGlobal.favoritos);

    let htmlList = '<ul style="list-style:none; padding:0; margin-top:15px;">';
    res.forEach((nrc, posicion) => {
        let m = ofertaAcademica[nrc]; let hrs = m.horarios.map(h => `${h.dia} ${h.inicio}-${h.fin}`).join(' | ');
        let esFav = window.prefsGeneradorGlobal.favoritos.includes(m.profesor?.trim()) ? '⭐ ' : '';
        htmlList += `<li style="font-size:12px; margin-bottom:8px; color:var(--text-muted);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
                <div style="flex:1; min-width:0;">
                    <strong style="color:#fff;">${m.materia}</strong><br>
                    <span style="color:var(--accent-blue);">NRC: ${nrc}</span> | Prof: <span style="color:#fff">${esFav}${m.profesor || 'Por definir'}</span><br>
                    <i>${hrs}</i>
                </div>
                <button type="button" style="flex-shrink:0; background:rgba(10,132,255,0.15); color:#0A84FF; border:1px solid rgba(10,132,255,0.4); border-radius:8px; padding:5px 8px; font-size:11px; cursor:pointer; white-space:nowrap;" onclick="abrirSelectorMaestro('${uid}', ${posicion}, '${m.clave}')">🔄 Cambiar</button>
            </div>
        </li>`;
    });
    htmlList += '</ul>';

    let jsonArr = JSON.stringify(res);
    return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h4 style="margin:0; border:none; font-size:14px;">Opción #${index + 1} <span style="font-size:10px; opacity:0.6;">(${tag})</span></h4>
            <button class="btn-submit" style="background:rgba(48, 209, 88, 0.2) !important; color:#30D158 !important; border:1px solid rgba(48, 209, 88, 0.4); padding:6px 12px; font-size:12px;" onclick='aplicarHorarioGenerado(${jsonArr})'>Aplicar</button>
        </div>
        <div style="font-size:11px; margin-bottom:10px;"><span style="color:#FFD60A; margin-right:10px; font-weight:bold;">⭐ Favoritos: ${scoreFav}</span><span style="color:#64D2FF; font-weight:bold;">⚡ Eficiencia: ${scoreEfi}</span></div>
        <div class="mini-cal">${dibujarMiniCalendario(res)}</div>${htmlList}`;
}

// Vuelve a dibujar SOLO la tarjeta indicada, tomando su estado actualizado.
function renderizarTarjeta(uid) {
    const el = document.getElementById(`card-${uid}`);
    if (el) el.innerHTML = cuerpoTarjeta(uid);
}

function mostrarMasResultados() {
    const container = document.getElementById('resultadosGenerador');
    const cargarMasBtn = document.getElementById('contenedorCargarMas');
    
    if(window.resultadosFav.length === 0 && window.resultadosEfi.length === 0) {
        container.innerHTML = `<div class="locked-screen"><h3>Sin combinaciones</h3><p>Las materias chocan entre sí, no hay cupos o rompieron la regla de las 7 horas seguidas.</p></div>`;
        cargarMasBtn.style.display = 'none'; return;
    }

    if(resultadosMostrados === 0) {
        let htmlBase = '';
        if(window.resultadosFav.length > 0) { htmlBase += `<details class="semestre-block" id="detallesFav" open><summary class="semestre-summary" style="color: #FFD60A !important;">⭐ Listado por Favoritos (Prioridad Alta)</summary><div id="gridFav" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:25px; padding: 15px;"></div></details>`; }
        if(window.resultadosEfi.length > 0) { htmlBase += `<details class="semestre-block" id="detallesEfi" style="margin-top:20px;" open><summary class="semestre-summary" style="color: #64D2FF !important;">⚡ Listado por Eficiencia (Anti-Huecos)</summary><div id="gridEfi" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap:25px; padding: 15px;"></div></details>`; }
        container.innerHTML = htmlBase;
    }

    let limite = resultadosMostrados + 6; 
    const gridFav = document.getElementById('gridFav'); const gridEfi = document.getElementById('gridEfi');

    for(let i = resultadosMostrados; i < limite; i++) {
        if(gridFav && i < window.resultadosFav.length) { gridFav.innerHTML += armarTarjetaHorario(window.resultadosFav[i], i, 'FAV'); }
        if(gridEfi && i < window.resultadosEfi.length) { gridEfi.innerHTML += armarTarjetaHorario(window.resultadosEfi[i], i, 'EFI'); }
    }

    resultadosMostrados = limite;
    cargarMasBtn.style.display = (resultadosMostrados >= window.resultadosFav.length && resultadosMostrados >= window.resultadosEfi.length) ? 'none' : 'block';
}

function dibujarMiniCalendario(arregloNrcs) {
    const dias = ['L', 'M', 'I', 'J', 'V', 'S']; let html = `<div></div>`; 
    dias.forEach((d, idx) => html += `<div class="mini-header" style="grid-row:1; grid-column:${idx+2};">${d}</div>`);
    for(let i = 7; i <= 21; i++) {
        let row = i - 5; html += `<div class="mini-hora" style="grid-row:${row}; grid-column:1;">${i}</div>`;
        for(let j=0; j<6; j++) { html += `<div class="mini-celda" style="grid-row:${row}; grid-column:${j+2};"></div>`; }
    }
    
    const paletaColores = ['#FF2D55', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F'];
    let colorMap = {}; let colorIndex = 0;

    arregloNrcs.forEach(nrc => {
        let curso = ofertaAcademica[nrc];
        if(!colorMap[curso.clave]) { colorMap[curso.clave] = paletaColores[colorIndex % paletaColores.length]; colorIndex++; }
        let colorClase = colorMap[curso.clave];

        curso.horarios.forEach(h => {
            if(h.inicio === "00:00" || h.inicio === "0:00") return; 
            let diaIndex = dias.indexOf(h.dia);
            let startMin = convertirHoraAMinutos(h.inicio) - 420; let endMin = convertirHoraAMinutos(h.fin) - 420; let duracion = endMin - startMin;
            let topOffset = (startMin % 60) * (20 / 60); let altura = duracion * (20 / 60); let gridRowStart = Math.floor(startMin / 60) + 2; let gridCol = diaIndex + 2;
            let rgbaBg = hexToRgba(colorClase, 0.3); let borderLeft = `3px solid ${colorClase}`;
            let palabras = curso.materia.trim().split(/\s+/); let nombreMini = palabras[0];
            
            if (palabras.length > 1) {
                let conectores = ['DE', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'EN', 'A', 'PARA', 'I', 'II', 'III']; let idx = 1;
                while (idx < palabras.length && conectores.includes(palabras[idx].toUpperCase())) idx++;
                let palabraClave = (idx < palabras.length) ? palabras[idx] : palabras[1];
                nombreMini = palabras[0].charAt(0) + '. ' + palabraClave;
            }

            html += `<div class="mini-bloque" style="grid-column:${gridCol}; grid-row:${gridRowStart} / span ${Math.ceil(duracion/60)}; background:${rgbaBg}; border-left:${borderLeft}; margin-top:${topOffset}px; height:${altura-2}px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
                <span style="display:block; font-weight:bold; font-size:6px; text-align:center; word-wrap:break-word; line-height:1.1;">${nombreMini}</span>
            </div>`;
        });
    });
    return html;
}

window.aplicarHorarioGenerado = function(arrNrcs) { if(confirm("¿Reemplazar tu horario actual con esta opción?")) { horarioActual = arrNrcs; guardarHorario(); cambiarPagina('horario-page'); } }

// =================================================================
// 9b. CAMBIAR MAESTRO/HORARIO DENTRO DE UNA OPCIÓN GENERADA
// =================================================================

function formatearHorariosMaestro(horarios) {
    const validos = horarios.filter(h => h.inicio !== "00:00" && h.inicio !== "0:00");
    if (validos.length === 0) return "Sin horario definido";
    return validos.map(h => `${h.dia}: ${h.inicio} - ${h.fin}`).join(' | ');
}

// Abre la ventana flotante con todos los grupos/maestros disponibles para
// la materia en esa posición de la opción generada (uid = tarjeta, posicion = índice dentro del arreglo de esa opción).
async function abrirSelectorMaestro(uid, posicion, claveMateria) {
    const state = window.cardState[uid];
    if (!state) return;
    const nrcActual = state.nrcs[posicion];
    let candidatos = Object.keys(ofertaAcademica).filter(k => ofertaAcademica[k].clave === claveMateria);

    cerrarModalMaestro();
    const overlay = document.createElement('div');
    overlay.id = 'modalCambiarMaestroOverlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:flex-end; justify-content:center;';
    overlay.onclick = (e) => { if (e.target === overlay) cerrarModalMaestro(); };

    overlay.innerHTML = `
        <div style="width:100%; max-width:480px; max-height:85vh; background:#1c1c1e; border-radius:20px 20px 0 0; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 -4px 30px rgba(0,0,0,0.5);">
            <div style="padding:16px 18px; border-bottom:1px solid rgba(255,255,255,0.1); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
                <h3 style="margin:0; font-size:15px; color:#fff;">Elegir Maestro / Horario</h3>
                <button type="button" onclick="cerrarModalMaestro()" style="background:rgba(255,255,255,0.1); border:none; color:#fff; width:28px; height:28px; border-radius:50%; font-size:16px; cursor:pointer; flex-shrink:0;">✕</button>
            </div>
            <div id="listaMaestrosModal" style="overflow-y:auto; -webkit-overflow-scrolling:touch; padding:12px 14px calc(14px + env(safe-area-inset-bottom, 0px)); flex:1;">
                <p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px 0;">Cargando opciones...</p>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    const chkCupos = document.getElementById('chkCuposEnVivo');
    const usarCuposEnVivo = !!(chkCupos && chkCupos.checked);
    let mapaCupos = null;

    if (usarCuposEnVivo) {
        try {
            mapaCupos = await consultarCuposEnVivo(candidatos);
            let minCupos = parseInt(document.getElementById('minCuposVal')?.value) || 1;
            candidatos = candidatos.filter(nrc => nrc === nrcActual || ((mapaCupos[nrc] && mapaCupos[nrc].disponibles) || 0) >= minCupos);
        } catch (e) {
            const aviso = document.getElementById('listaMaestrosModal');
            if (aviso) aviso.innerHTML = `<p style="color:#FF9F0A; font-size:12px; text-align:center; padding:10px 0;">⚠️ No se pudo verificar cupos en vivo. Mostrando todas las opciones.</p>`;
            mapaCupos = null;
        }
    }

    // El modal pudo haberse cerrado mientras esperábamos la respuesta del backend
    const contenedor = document.getElementById('listaMaestrosModal');
    if (!contenedor) return;

    if (candidatos.length === 0) {
        contenedor.innerHTML = `<p style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px 0;">No hay otras opciones disponibles${usarCuposEnVivo ? ' con cupo' : ''}.</p>`;
        return;
    }

    let html = '';
    candidatos.forEach(nrc => {
        const curso = ofertaAcademica[nrc];
        const esActual = nrc === nrcActual;
        const dias = formatearHorariosMaestro(curso.horarios);
        let badgeCupos = '';
        if (mapaCupos && mapaCupos[nrc]) {
            const dis = mapaCupos[nrc].disponibles;
            const color = dis > 0 ? '#30D158' : '#FF453A';
            badgeCupos = `<div style="margin-top:6px; font-size:11px; font-weight:bold; color:${color};">🟢 ${dis} cupo(s) disponibles</div>`;
        }
        html += `<div onclick="seleccionarNuevoMaestro('${uid}', ${posicion}, '${nrc}')" style="padding:12px; margin-bottom:8px; border-radius:12px; cursor:pointer; background:${esActual ? 'rgba(10,132,255,0.15)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${esActual ? 'rgba(10,132,255,0.5)' : 'rgba(255,255,255,0.08)'};">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <strong style="font-size:13px; color:#fff;">Maestro: ${curso.profesor || 'Por definir'}</strong>
                ${esActual ? '<span style="font-size:10px; color:#0A84FF; font-weight:bold; flex-shrink:0;">ACTUAL</span>' : ''}
            </div>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Días: ${dias}</div>
            <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">NRC: ${nrc}</div>
            ${badgeCupos}
        </div>`;
    });
    contenedor.innerHTML = html;
}

function cerrarModalMaestro() {
    const overlay = document.getElementById('modalCambiarMaestroOverlay');
    if (overlay) overlay.remove();
}

// Reemplaza el NRC de esa materia SOLO dentro de esta opción generada,
// valida que no choque con las demás materias de la misma opción, y
// vuelve a dibujar nada más esa tarjeta.
function seleccionarNuevoMaestro(uid, posicion, nuevoNrc) {
    const state = window.cardState[uid];
    if (!state) return;
    if (state.nrcs[posicion] === nuevoNrc) { cerrarModalMaestro(); return; }

    const otrasMaterias = state.nrcs.filter((_, i) => i !== posicion);
    if (choca(ofertaAcademica[nuevoNrc], otrasMaterias)) {
        alert('⚠️ Ese horario choca con otra materia de esta misma opción. Elige otro grupo.');
        return;
    }

    state.nrcs[posicion] = nuevoNrc;
    cerrarModalMaestro();
    renderizarTarjeta(uid);
}