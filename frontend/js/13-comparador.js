// =================================================================
// 13. COMPARADOR DE HORARIOS
// =================================================================
// No implementa NADA nuevo a nivel de motor: reutiliza tal cual el mismo
// backtracking del Generador (generarCombinaciones), la misma detección de
// choques (choca), el mismo filtro de restricciones/veto (respetaRestricciones,
// vía window.prefsGeneradorGlobal), la misma consulta de cupos en vivo
// (consultarCuposEnVivo, con su propio modal de "falta la carrera" incluido
// gratis) y el mismo componente visual de tarjeta (armarTarjetaHorario /
// cuerpoTarjeta / abrirSelectorMaestro), así que "Cambiar" maestro también
// funciona igual dentro de una opción del Comparador.
//
// Lo único nuevo aquí es: parsear la lista de NRC de otra persona, decidir
// cuáles ya no cumplen el mínimo de cupos, armar los "grupos" (fijo vs. pool
// de alternativas) para alimentar generarCombinaciones(), y puntuar/ordenar
// las combinaciones resultantes según qué tan parecidas son al horario
// original.
// =================================================================

/**
 * Acepta TXT pegado, lista manual o NRC separados por comas: separa por
 * saltos de línea, comas, punto y coma o espacios. Valida 4-6 dígitos,
 * quita duplicados y trunca a 10 (límite real del SIIAU).
 */
function parsearNrcsComparador(textoPlano) {
    const tokens = (textoPlano || '')
        .split(/[\n\r,;]+|\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

    const vistos = new Set();
    const nrcs = [];
    const descartados = [];

    tokens.forEach(t => {
        if (!/^\d{4,6}$/.test(t)) { descartados.push(t); return; }
        if (vistos.has(t)) return;
        vistos.add(t);
        nrcs.push(t);
    });

    const truncado = nrcs.length > 10;
    return { nrcs: truncado ? nrcs.slice(0, 10) : nrcs, descartados, truncado };
}

/** Cuenta huecos "largos" (> 2h) y minutos muertos totales de un horario. Regla de Prioridad 3. */
function analizarHuecos(nrcs) {
    const porDia = { L: [], M: [], I: [], J: [], V: [], S: [] };
    nrcs.forEach(nrc => {
        ofertaAcademica[nrc].horarios.forEach(h => {
            if (h.inicio === '00:00' || h.inicio === '0:00') return;
            porDia[h.dia].push({ ini: convertirHoraAMinutos(h.inicio), fin: convertirHoraAMinutos(h.fin) });
        });
    });

    let huecosLargos = 0;
    let minutosMuertosTotal = 0;

    Object.values(porDia).forEach(clases => {
        clases.sort((a, b) => a.ini - b.ini);
        for (let i = 0; i < clases.length - 1; i++) {
            const gap = clases[i + 1].ini - clases[i].fin;
            if (gap > 0) {
                minutosMuertosTotal += gap;
                if (gap > 120) huecosLargos++; // más de 2 horas
            }
        }
    });

    return { huecosLargos, minutosMuertosTotal };
}

/** Suma de cupos disponibles conocidos para un conjunto de NRC (Prioridad 4, desempate). */
function totalCuposDisponibles(nrcs, mapaCupos) {
    return nrcs.reduce((acc, nrc) => acc + ((mapaCupos[nrc] && mapaCupos[nrc].disponibles) || 0), 0);
}

/**
 * Puntúa una combinación candidata frente al horario original, en el orden
 * de prioridades pedido:
 *  1) Menos cambios, mejor (peso dominante).
 *  2) Igual horario que el original = implícito en "menos cambios" (cada
 *     cambio ya es, por definición, una diferencia).
 *  3) Menos huecos largos / menos tiempo muerto total.
 *  4) Desempate: más cupos disponibles en total.
 */
function puntuarCombinacion(nrcsCombo, nrcsOriginales, mapaCupos) {
    const cambios = nrcsCombo.filter((nrc, i) => nrc !== nrcsOriginales[i]).length;
    const { huecosLargos, minutosMuertosTotal } = analizarHuecos(nrcsCombo);
    const cupos = totalCuposDisponibles(nrcsCombo, mapaCupos);

    const score = 1000
        - (cambios * 100)
        - (huecosLargos * 15)
        - (minutosMuertosTotal / 10)
        + (cupos * 0.05);

    return { score, cambios, huecosLargos, minutosMuertosTotal };
}

/** Preferencias a usar: reutiliza las del Generador si ya se configuraron; si no, sin restricciones. */
function obtenerPreferenciasParaComparador() {
    return window.prefsGeneradorGlobal || { type: 'global', turno: 'mixto', limites: {}, vetados: [], favoritos: [] };
}

async function ejecutarComparador() {
    if (!window.cardState) window.cardState = {};

    if (Object.keys(ofertaAcademica).length === 0) {
        alert('Primero extrae la oferta académica en la pestaña "Armador de Horarios" (botón "Extraer Oferta").');
        return;
    }

    const texto = document.getElementById('comparadorInputNrcs').value;
    const { nrcs, descartados, truncado } = parsearNrcsComparador(texto);

    if (nrcs.length === 0) {
        alert('No se encontró ningún NRC válido (se esperan 4 a 6 dígitos, uno por línea o separados por comas).');
        return;
    }
    if (truncado) alert('Se detectaron más de 10 NRC; el SIIAU solo permite 10, así que solo se usarán los primeros 10.');
    if (descartados.length > 0) console.warn('[Comparador] Líneas ignoradas (no parecen NRC válidos):', descartados);

    const minCupos = parseInt(document.getElementById('comparadorMinCupos').value) || 1;

    // cuerpoTarjeta() (reutilizada del Generador) lee window.prefsGeneradorGlobal
    // directo, así que hay que garantizar que exista ANTES de renderizar
    // cualquier tarjeta -- incluso si el usuario nunca corrió el Generador.
    const prefs = obtenerPreferenciasParaComparador();
    window.prefsGeneradorGlobal = prefs;

    // El modal de "Cambiar maestro" (reutilizado de la tarjeta) lee estos dos
    // controles del Generador para saber si debe pedir cupos en vivo y con qué
    // mínimo. El Comparador SIEMPRE trabaja con cupos en vivo, así que los
    // sincronizamos para que, si el usuario usa "🔄 Cambiar" dentro de una
    // tarjeta del Comparador, se comporte con el mismo mínimo que acaba de pedir aquí.
    const chkCuposGenerador = document.getElementById('chkCuposEnVivo');
    const minCuposGenerador = document.getElementById('minCuposVal');
    if (chkCuposGenerador) chkCuposGenerador.checked = true;
    if (minCuposGenerador) minCuposGenerador.value = minCupos;

    const btn = document.getElementById('btnComparar');
    const contenedor = document.getElementById('resultadosComparador');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Verificando disponibilidad...'; }
    contenedor.innerHTML = '';

    const nrcsEnOferta = nrcs.filter(n => ofertaAcademica[n]);
    const nrcsNoEncontrados = nrcs.filter(n => !ofertaAcademica[n]);

    if (nrcsEnOferta.length === 0) {
        contenedor.innerHTML = `<div class="locked-screen"><h3>Ningún NRC coincide</h3><p>Ninguno de esos NRC aparece en la oferta académica que ya descargaste. Revisa que el ciclo/centro/carrera en "Armador de Horarios" sean los correctos.</p></div>`;
        if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
        return;
    }

    let mapaCupos;
    try {
        mapaCupos = await consultarCuposEnVivo(nrcsEnOferta);
    } catch (e) {
        contenedor.innerHTML = `<div class="locked-screen"><h3>⚠️ Error al consultar cupos</h3><p>No se pudo conectar con el backend del SIIAU. Intenta de nuevo.</p></div>`;
        if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
        return;
    }

    // --- Diagnóstico inicial: quién falla y por qué ---
    const fallas = nrcsEnOferta
        .filter(nrc => ((mapaCupos[nrc] && mapaCupos[nrc].disponibles) || 0) < minCupos)
        .map(nrc => ({
            nrc,
            materia: ofertaAcademica[nrc].materia,
            disponibles: (mapaCupos[nrc] && mapaCupos[nrc].disponibles) || 0,
            necesarios: minCupos
        }));

    // --- Caso ideal: todo cumple y no hay NRC ausentes de la oferta ---
    if (fallas.length === 0 && nrcsNoEncontrados.length === 0) {
        renderizarComparadorIdentico(nrcs, mapaCupos, minCupos);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
        return;
    }

    if (btn) btn.innerHTML = 'Buscando alternativas...';

    const nrcsConsiderados = nrcsEnOferta; // los que sí están en la oferta descargada
    const mapaOriginalPorGrupo = [];
    const esReemplazable = [];
    const gruposMaterias = [];
    const universoExtraCupos = new Set();

    nrcsConsiderados.forEach(nrcOriginal => {
        mapaOriginalPorGrupo.push(nrcOriginal);
        const dis = (mapaCupos[nrcOriginal] && mapaCupos[nrcOriginal].disponibles) || 0;

        if (dis >= minCupos) {
            gruposMaterias.push([nrcOriginal]);
            esReemplazable.push(false);
            return;
        }

        const clave = ofertaAcademica[nrcOriginal].clave;
        const pool = Object.keys(ofertaAcademica)
            .filter(k => k !== nrcOriginal && ofertaAcademica[k].clave === clave)
            .filter(k => respetaRestricciones(ofertaAcademica[k], prefs));

        pool.forEach(k => universoExtraCupos.add(k));
        gruposMaterias.push(pool);
        esReemplazable.push(true);
    });

    // Una sola consulta en vivo (en lote) para todo el universo de posibles
    // reemplazos, en vez de una llamada por candidato.
    if (universoExtraCupos.size > 0) {
        try {
            const extra = await consultarCuposEnVivo(Array.from(universoExtraCupos));
            Object.assign(mapaCupos, extra);
        } catch (e) {
            console.warn('[Comparador] No se pudieron verificar cupos de las alternativas; se listarán sin garantía de cupo.');
        }

        gruposMaterias.forEach((grupo, i) => {
            if (!esReemplazable[i]) return;
            gruposMaterias[i] = grupo.filter(k => ((mapaCupos[k] && mapaCupos[k].disponibles) || 0) >= minCupos);
        });
    }

    // Materias sin NINGUNA alternativa válida (vetada, chocaría siempre, o
    // sin cupo): no hay forma de armar un horario completo, hay que avisar
    // exactamente cuál es el cuello de botella.
    const sinSolucion = [];
    gruposMaterias.forEach((grupo, i) => {
        if (esReemplazable[i] && grupo.length === 0) {
            const nrcOriginal = mapaOriginalPorGrupo[i];
            sinSolucion.push({
                nrc: nrcOriginal,
                materia: ofertaAcademica[nrcOriginal].materia,
                disponibles: (mapaCupos[nrcOriginal] && mapaCupos[nrcOriginal].disponibles) || 0,
                necesarios: minCupos
            });
        }
    });

    if (sinSolucion.length > 0) {
        renderizarComparadorSinSolucion(sinSolucion, nrcsNoEncontrados);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
        return;
    }

    if (btn) btn.innerHTML = 'Optimizando combinaciones...';

    // MISMO motor que el Generador de Horarios (generarCombinaciones), solo
    // que aquí casi todos los "grupos" traen un único NRC fijo (las materias
    // que sí cumplen) y solo las que fallan traen un pool de alternativas.
    const combos = generarCombinaciones(gruposMaterias, prefs);

    if (combos.length === 0) {
        renderizarComparadorSinCombinacion(fallas, nrcsNoEncontrados);
        if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
        return;
    }

    const puntuados = combos.map(c => {
        const { score, cambios } = puntuarCombinacion(c.nrcs, mapaOriginalPorGrupo, mapaCupos);
        return { nrcs: c.nrcs, score, cambios };
    });

    puntuados.sort((a, b) => b.score - a.score || a.cambios - b.cambios);

    const top = puntuados.slice(0, 5);
    renderizarComparadorOpciones(top, mapaOriginalPorGrupo, mapaCupos, nrcsNoEncontrados, minCupos);

    if (btn) { btn.disabled = false; btn.innerHTML = 'Comparar Horario'; }
}

// --- Render: caso ideal (nada que cambiar) ---

function renderizarComparadorIdentico(nrcsOriginales, mapaCupos, minCupos) {
    const contenedor = document.getElementById('resultadosComparador');
    contenedor.innerHTML = `
        <div class="locked-screen" style="background:rgba(48,209,88,0.08); border:1px solid rgba(48,209,88,0.3);">
            <h3 style="color:#30D158; margin-top:0;">✅ Puedes registrar exactamente este horario</h3>
            <p style="color:var(--text-muted); font-size:13px; margin-bottom:0;">Los ${nrcsOriginales.length} NRC cumplen con el mínimo de ${minCupos} cupo(s) que pediste.</p>
        </div>
        <div style="margin-top:15px;">${armarTarjetaHorario(nrcsOriginales, 0, 'CMP', mapaCupos)}</div>`;
}

// --- Render: hay una o más materias sin ninguna alternativa viable ---

function renderizarComparadorSinSolucion(sinSolucion, nrcsNoEncontrados) {
    const contenedor = document.getElementById('resultadosComparador');
    let html = `<div class="locked-screen" style="background:rgba(255,69,58,0.08); border:1px solid rgba(255,69,58,0.3);">
        <h3 style="color:#FF453A; margin-top:0;">No se pudo armar ninguna alternativa completa</h3>
        <p style="color:var(--text-muted); font-size:13px;">Al menos una materia no tiene ningún grupo disponible que cumpla tus cupos, tus vetos y tus horarios permitidos a la vez:</p>
        <ul style="list-style:none; padding:0; margin:10px 0 0;">`;

    sinSolucion.forEach(f => {
        html += `<li style="padding:10px; margin-bottom:8px; border-radius:10px; background:rgba(255,69,58,0.08); border:1px solid rgba(255,69,58,0.25);">
            <div><span style="color:var(--accent-blue);">NRC ${f.nrc}</span> · <strong style="color:#fff;">${f.materia}</strong></div>
            <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Cupos: ${f.disponibles} · Necesarios: ${f.necesarios}</div>
            <div style="font-size:11px; color:#FF453A; margin-top:2px;">Motivo: no cumple el mínimo solicitado, y ningún otro grupo de esa materia cumple tus restricciones (veto/turno) con cupo suficiente.</div>
        </li>`;
    });

    html += '</ul></div>';
    html += avisoNoEncontrados(nrcsNoEncontrados);
    contenedor.innerHTML = html;
}

// --- Render: había pools válidos por materia pero ninguna combinación conjunta funcionó (chocan entre sí) ---

function renderizarComparadorSinCombinacion(fallas, nrcsNoEncontrados) {
    const contenedor = document.getElementById('resultadosComparador');
    let html = `<div class="locked-screen">
        <h3>Sin combinaciones posibles</h3>
        <p style="color:var(--text-muted); font-size:13px;">Hay alternativas para las materias con problema de cupo, pero todas terminan chocando con el resto del horario.</p>
    </div>`;
    html += avisoNoEncontrados(nrcsNoEncontrados);
    contenedor.innerHTML = html;
}

function avisoNoEncontrados(nrcsNoEncontrados) {
    if (!nrcsNoEncontrados || nrcsNoEncontrados.length === 0) return '';
    return `<div style="margin-top:12px; font-size:12px; color:#FF9F0A; background:rgba(255,159,10,0.1); border:1px solid rgba(255,159,10,0.3); border-radius:10px; padding:10px;">
        ⚠️ Estos NRC no aparecen en la oferta académica que ya descargaste, así que no se pudieron evaluar: ${nrcsNoEncontrados.join(', ')}.
    </div>`;
}

// --- Render: ranking de opciones (caso con cambios) ---

function renderizarComparadorOpciones(top, nrcsOriginales, mapaCupos, nrcsNoEncontrados, minCupos) {
    const contenedor = document.getElementById('resultadosComparador');
    const totalMaterias = nrcsOriginales.length;

    let html = `<p style="font-size:13px; color:var(--text-muted); margin-bottom:15px;">No puedes registrar el horario exacto, pero encontramos ${top.length} alternativa(s) parecida(s), de la más a la menos parecida:</p>`;
    html += avisoNoEncontrados(nrcsNoEncontrados);

    top.forEach((opcion, idx) => {
        const similitud = Math.round(((totalMaterias - opcion.cambios) / totalMaterias) * 100);

        const cambios = opcion.nrcs
            .map((nrcNuevo, i) => ({ nrcOriginal: nrcsOriginales[i], nrcNuevo }))
            .filter(c => c.nrcOriginal !== c.nrcNuevo);

        let htmlCambios = '';
        if (cambios.length > 0) {
            htmlCambios = '<div style="margin-bottom:12px;">' + cambios.map(c => {
                const original = ofertaAcademica[c.nrcOriginal];
                const nuevo = ofertaAcademica[c.nrcNuevo];
                const disOriginal = (mapaCupos[c.nrcOriginal] && mapaCupos[c.nrcOriginal].disponibles) || 0;
                return `<div style="font-size:12px; padding:8px 10px; margin-bottom:6px; border-radius:8px; background:rgba(255,159,10,0.08); border:1px solid rgba(255,159,10,0.25);">
                    <strong style="color:#fff;">${original.materia}</strong><br>
                    Reemplaza <span style="color:#FF453A;">NRC ${c.nrcOriginal}</span> (${original.profesor || 'Por definir'}) por <span style="color:#30D158;">NRC ${c.nrcNuevo}</span> (${nuevo.profesor || 'Por definir'})<br>
                    <span style="color:var(--text-muted); font-size:11px;">Motivo: el NRC original ya solo tiene ${disOriginal} cupo(s) (necesitas ${minCupos}); el nuevo sí cumple.</span>
                </div>`;
            }).join('') + '</div>';
        }

        html += `<div class="comparador-opcion" style="margin-bottom:22px; padding-bottom:22px; border-bottom:1px solid var(--glass-border);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                <h3 style="margin:0; font-size:15px;">Opción ${idx + 1} <span style="color:#30D158; font-size:13px;">· ${similitud}% similar</span></h3>
                <span style="font-size:11px; color:var(--text-muted); background:rgba(255,255,255,0.06); padding:4px 10px; border-radius:999px;">${cambios.length} cambio${cambios.length === 1 ? '' : 's'}</span>
            </div>
            ${htmlCambios}
            ${armarTarjetaHorario(opcion.nrcs, idx, 'CMP', mapaCupos)}
        </div>`;
    });

    contenedor.innerHTML = html;
}