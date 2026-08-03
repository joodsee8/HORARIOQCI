// =================================================================
// 6. RENDERIZADO VISUAL (Malla, Listas, Exportar)
// =================================================================
function actualizarVistas() {
    const creditosTotales = obtenerCreditosAprobados();
    document.getElementById('indicadorCreditosListas').innerText = `Obtenidos: ${creditosTotales} / ${CREDITOS_TOTALES}`;
    document.getElementById('indicadorCreditosMalla').innerText = `Obtenidos: ${creditosTotales} / ${CREDITOS_TOTALES}`;
    renderizarListas(); renderizarMalla(); renderizarSeccionesBloqueadas(creditosTotales); 
    actualizarDropdownSemestresGenerador();
}

function actualizarDropdownSemestresGenerador() {
    const sel = document.getElementById('selSemestreGenerador');
    if(!sel) return;
    sel.innerHTML = '<option value="">Cargar de Semestre...</option>';
    if(materias.length === 0) return;
    const semestresUnicos = [...new Set(materias.map(m => m.semestre))].sort((a,b) => a - b);
    semestresUnicos.forEach(s => { sel.innerHTML += `<option value="${s}">Semestre ${s}</option>`; });
}

function getEstadoHtml(m) {
    if (m.estado === 'aprobada') return `<span class="badge-estado" style="background:rgba(48, 209, 88, 0.5);">Aprobada</span>`;
    if (m.estado === 'convalidada') return `<span class="badge-estado" style="background:rgba(191, 90, 242, 0.5);">Convalidada</span>`;
    if (m.estado === 'reprobada') return `<span class="badge-estado" style="background:rgba(255, 69, 58, 0.5);">Reprobada</span>`;
    if (m.estado === 'cursando') return `<span class="badge-estado" style="background:rgba(10, 132, 255, 0.5);">Cursando</span>`;
    return `<span class="badge-estado" style="background:rgba(142, 142, 147, 0.4);">Pendiente</span>`;
}

function renderizarListas() {
    const contenedor = document.getElementById('contenedorListas'); contenedor.innerHTML = '';
    if(materias.length === 0) { contenedor.innerHTML = '<p style="color:var(--text-muted);">No hay materias registradas.</p>'; return; }

    const materiasPorSemestre = {};
    materias.forEach(m => { if(!materiasPorSemestre[m.semestre]) materiasPorSemestre[m.semestre] = []; materiasPorSemestre[m.semestre].push(m); });

    Object.keys(materiasPorSemestre).sort((a,b) => a - b).forEach(semestre => {
        const matSem = materiasPorSemestre[semestre];
        const credProyectados = matSem.reduce((sum, m) => m.estado !== 'reprobada' ? sum + m.creditos : sum, 0);
        const credObtenidos = matSem.filter(m => m.estado === 'aprobada' || m.estado === 'convalidada').reduce((sum, m) => sum + m.creditos, 0);
        
        let tienePracticas = matSem.some(m => m.nrc === 'IA896');
        let alertaHtml = ((credProyectados > 45 && !tienePracticas) || matSem.length > 8) ? `<div class="alerta-sobrecarga">Semestre Sobrecargado</div>` : '';

        const details = document.createElement('details'); details.className = 'semestre-block';
        details.innerHTML = `
            <summary class="semestre-summary">
                <div style="display:flex; align-items:center;">Semestre ${semestre} &nbsp; ${alertaHtml}</div>
                <div style="display:flex; align-items:center; gap: 15px;">
                    <span style="color: var(--text-muted); font-size: 0.85em;">Proyectados: <strong style="color:#fff;">${credProyectados}</strong></span>
                    <span style="color: #30D158; font-size: 0.9em;">Obtenidos: <strong>${credObtenidos}</strong></span>
                    <select class="batch-select" onclick="event.stopPropagation()" onchange="cambiarEstadoSemestre(${semestre}, this.value); this.value='';">
                        <option value="">Lote...</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="cursando">Cursando</option>
                        <option value="aprobada">Aprobada</option>
                    </select>
                </div>
            </summary>`;

        matSem.forEach(m => {
            let badgeNormativo = m.esArt34 ? '<span class="badge-estado badge-art34">Art. 34</span>' : '';
            if (m.esArt34 && m.estado === 'reprobada') badgeNormativo = '<span class="badge-estado badge-art35">ART. 35</span>';
            let gradeText = (m.estado === 'aprobada' || m.estado === 'reprobada' || m.estado === 'convalidada') ? `Nota: ${m.calificacion}` : '';

            details.innerHTML += `
                <div class="materia-item" style="border-left: 6px solid ${m.color};">
                    <div class="materia-info">
                        <strong>${m.nombre}</strong> (Columna ${m.letra}) ${badgeNormativo}<br>
                        <span style="font-size: 0.85em; color: var(--text-muted); font-family:monospace;">NRC: ${m.nrc} | Créditos: ${m.creditos}</span>
                        <div style="margin-top:5px;">${getEstadoHtml(m)} <span style="font-weight:bold; font-size: 13px; margin-left: 8px; color: var(--text-main);">${gradeText}</span></div>
                    </div>
                    <div class="materia-acciones">
                        <button class="btn-editar" onclick="editarMateria('${m.nrc}')">Editar</button>
                        <button class="btn-eliminar" onclick="eliminarMateria('${m.nrc}')">Borrar</button>
                    </div>
                </div>`;
        });
        contenedor.appendChild(details);
    });
}

function renderizarMalla() {
    const contenedor = document.getElementById('contenedorMalla'); contenedor.innerHTML = ''; if(materias.length === 0) return;

    const maxSemestre = Math.max(...materias.map(m => m.semestre));
    let maxLetraCode = 72; materias.forEach(m => { if(m.letra) { let code = m.letra.charCodeAt(0); if(code > maxLetraCode) maxLetraCode = code; } });
    let letrasDinamicas = []; for(let i = 65; i <= maxLetraCode; i++) { letrasDinamicas.push(String.fromCharCode(i)); }

    let gridTemplate = `80px repeat(${letrasDinamicas.length}, 1fr) 100px`;
    let htmlMalla = `<div class="malla-grid" style="grid-template-columns: ${gridTemplate};"><div class="malla-header" style="background:transparent; border:none;">Semestre</div>`;
    
    letrasDinamicas.forEach(l => htmlMalla += `<div class="malla-header" style="background:transparent; border:none; color:var(--text-muted);">${l}</div>`);
    htmlMalla += `<div class="malla-header total-creditos" style="background:transparent; border:none; color:var(--text-muted);">Total</div>`;

    for(let s = 1; s <= maxSemestre; s++) {
        let creditosTotales = 0;
        htmlMalla += `<div class="malla-header" style="display:flex; align-items:center; justify-content:center; font-size:18px;">${s}</div>`;
        
        let materiasEspecialesSemestre = materias.filter(m => m.semestre === s && (m.nrc === 'SSINQU' || m.nrc === 'IA896'));
        
        letrasDinamicas.forEach(letra => {
            const materia = materias.find(m => m.semestre === s && m.letra === letra && m.nrc !== 'SSINQU' && m.nrc !== 'IA896');
            if (materia) {
                if (materia.estado !== 'reprobada') { creditosTotales += materia.creditos; }
                let prHtml = ''; if (materia.prerequisito) { let prMat = materias.find(x => x.nrc === materia.prerequisito); if (prMat) prHtml = `<div class="badge-pr">PR: ${prMat.semestre}${prMat.letra}</div>`; }
                let crHtml = ''; if (materia.correquisito) { let crMat = materias.find(x => x.nrc === materia.correquisito); if (crMat) crHtml = `<div class="badge-sm">SM: ${crMat.semestre}${crMat.letra}</div>`; }
                let gradeHtml = (materia.estado === 'aprobada' || materia.estado === 'reprobada' || materia.estado === 'convalidada') ? `<span class="materia-nota" style="font-size: 11px; margin-top: 2px;">Nota: <strong>${materia.calificacion}</strong></span>` : '';
                let rgbaBg = hexToRgba(materia.color, 0.15); 
                let isReprobadaClass = (materia.estado === 'reprobada') ? 'is-reprobada' : '';

                htmlMalla += `
                    <div class="malla-cell" style="background: transparent !important; border:none !important;">
                        <div class="malla-materia ${isReprobadaClass}" style="--color:${materia.color}; border-left: 4px solid ${materia.color}; background: ${rgbaBg};">
                            <div class="etiquetas-coord">${prHtml} ${crHtml}</div>
                            <span class="materia-nrc">${materia.nrc}</span>
                            <span style="line-height: 1.1; text-align:center;">${materia.nombre}</span>
                            <span style="font-size: 10px; margin-top: 4px; color: rgba(255,255,255,0.7);">Créditos: ${materia.creditos}</span>
                            ${gradeHtml}
                            ${getEstadoHtml(materia)}
                        </div>
                    </div>`;
            } else { htmlMalla += `<div class="malla-cell" style="background:transparent !important; border:none !important;"></div>`; }
        });

        materiasEspecialesSemestre.forEach(m => { if (m.estado !== 'reprobada') creditosTotales += m.creditos; });
        let tienePracticas = materiasEspecialesSemestre.some(m => m.nrc === 'IA896');
        let colorFila = (creditosTotales > 45 && !tienePracticas) ? 'rgba(255, 69, 58, 0.3)' : (creditosTotales >= 30 ? 'rgba(48, 209, 88, 0.3)' : 'rgba(255, 159, 10, 0.3)');
        let fontColor = (creditosTotales > 45 && !tienePracticas) ? '#FF453A' : (creditosTotales >= 30 ? '#30D158' : '#FF9F0A');

        htmlMalla += `<div class="malla-header total-creditos" style="background: ${colorFila}; color: ${fontColor}; display:flex; align-items:center; justify-content:center; flex-direction:column; border:none;">
            <span style="font-size: 1.4em;">${creditosTotales}</span>
        </div>`;

        materiasEspecialesSemestre.forEach(materia => {
            let gradeHtml = (materia.estado === 'aprobada' || materia.estado === 'reprobada' || materia.estado === 'convalidada') ? `<span class="materia-nota" style="margin-right:15px;">Nota: <strong>${materia.calificacion}</strong></span>` : '';
            let isReprobadaClass = (materia.estado === 'reprobada') ? 'is-reprobada' : '';
            htmlMalla += `
                <div class="malla-bar-especial ${isReprobadaClass}" style="--color:#30D158;">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <strong style="font-size: 1.1em;">${materia.nombre}</strong><span class="materia-nrc" style="opacity: 0.8;">(${materia.nrc})</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 15px;">
                        <span style="font-size: 0.9em;">Créditos: ${materia.creditos}</span>${gradeHtml}${getEstadoHtml(materia)}
                    </div>
                </div>`;
        });
    }
    htmlMalla += `</div>`;
    contenedor.innerHTML = htmlMalla;
}

function renderizarSeccionesBloqueadas(creditos) {
    const faltan = CREDITOS_DESBLOQUEO - creditos;
    const htmlFinal = faltan > 0 
        ? `<div class="locked-screen"><h3>Bloqueado</h3><p>Te faltan <strong>${faltan}</strong> créditos aprobados para iniciar trámites.</p></div>`
        : `<div class="unlocked-screen"><h3>Desbloqueado</h3><p>Has alcanzado los créditos necesarios. Ya puedes iniciar tus trámites oficiales.</p></div>`;
    document.getElementById('contenidoSocial').innerHTML = htmlFinal;
    document.getElementById('contenidoPracticas').innerHTML = htmlFinal;
}

function exportarPDF() {
    const elemento = document.getElementById('contenedorMalla');
    const grid = elemento.querySelector('.malla-grid');
    const btn = document.getElementById('btnDescargaPdf');
    const txtOriginal = btn.innerHTML;
    
    let originalOverflow = ''; let originalWidth = '';
    if (grid) {
        originalOverflow = grid.style.overflowX; originalWidth = grid.style.width;
        grid.style.overflowX = 'visible'; grid.style.width = 'max-content'; elemento.style.width = 'max-content';
    }

    elemento.classList.add('pdf-mode');
    btn.innerHTML = 'Generando...'; btn.disabled = true;

    setTimeout(() => {
        const rect = elemento.getBoundingClientRect();
        const widthPx = rect.width + 40; const heightPx = rect.height + 40;
        const opciones = {
            margin: 10, filename: 'Malla_Gestión.pdf', image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true, width: widthPx, height: heightPx, windowWidth: widthPx },
            jsPDF: { unit: 'px', format: [widthPx > heightPx ? widthPx : heightPx, widthPx > heightPx ? heightPx : widthPx], orientation: widthPx > heightPx ? 'landscape' : 'portrait' }
        };

        html2pdf().set(opciones).from(elemento).save().then(() => {
            if (grid) { grid.style.overflowX = originalOverflow || 'auto'; grid.style.width = originalWidth || 'auto'; elemento.style.width = 'auto'; }
            elemento.classList.remove('pdf-mode'); btn.innerHTML = txtOriginal; btn.disabled = false;
        });
    }, 100); 
}

