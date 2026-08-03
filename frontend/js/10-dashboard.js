// =================================================================
// 10. DASHBOARD Y ANALÍTICA
// =================================================================
function calcularImpacto(nrc, visitados = new Set()) {
    if (visitados.has(nrc)) return 0;
    visitados.add(nrc);
    let hijos = materias.filter(m => m.prerequisito === nrc || m.correquisito === nrc);
    let impacto = hijos.length;
    hijos.forEach(h => { impacto += calcularImpacto(h.nrc, visitados); });
    return impacto;
}

function renderizarDashboard() {
    if (materias.length === 0) return;

    const maxSemestre = Math.max(...materias.map(m => m.semestre));
    document.getElementById('dash-semestres').innerText = maxSemestre;
    document.getElementById('dash-creditos').innerText = `${obtenerCreditosAprobados()} / ${CREDITOS_TOTALES}`;
    
    const intentadas = materias.filter(m => m.estado === 'aprobada' || m.estado === 'reprobada').length;
    const aprobadas = materias.filter(m => m.estado === 'aprobada').length;
    const eficiencia = intentadas === 0 ? 0 : Math.round((aprobadas / intentadas) * 100);
    document.getElementById('dash-eficiencia').innerText = `${eficiencia}%`;

    let impactos = materias.map(m => { return { nombre: m.nombre, impacto: calcularImpacto(m.nrc) }; });
    impactos.sort((a, b) => b.impacto - a.impacto);
    const topCuellos = impactos.slice(0, 5); 
    
    const ulCuellos = document.getElementById('listaCuellosBotella'); ulCuellos.innerHTML = '';
    topCuellos.forEach((c, idx) => { if(c.impacto > 0) { ulCuellos.innerHTML += `<li style="background:rgba(0,0,0,0.2); border:none;"><span>${idx+1}. ${c.nombre}</span> <strong style="color:#FF453A;">Desbloquea ${c.impacto} materias</strong></li>`; } });

    let adj = {}; materias.forEach(m => adj[m.nrc] = []);
    materias.forEach(m => {
        if (m.prerequisito) { if(adj[m.prerequisito] !== undefined) { adj[m.prerequisito].push(m.nrc); adj[m.nrc].push(m.prerequisito); } }
        if (m.correquisito) { if(adj[m.correquisito] !== undefined) { adj[m.correquisito].push(m.nrc); adj[m.nrc].push(m.correquisito); } }
    });

    let visitados = new Set(); let componentes = [];
    materias.forEach(m => {
        if (!visitados.has(m.nrc)) {
            let comp = []; let q = [m.nrc]; visitados.add(m.nrc);
            while(q.length > 0) {
                let curr = q.shift(); comp.push(curr);
                adj[curr].forEach(vecino => { if(!visitados.has(vecino)) { visitados.add(vecino); q.push(vecino); } });
            }
            componentes.push(comp);
        }
    });

    let grafosHTML = "";
    componentes.forEach((comp) => {
        let matComp = materias.filter(m => comp.includes(m.nrc));
        let tieneDependencia = matComp.some(m => (m.prerequisito && comp.includes(m.prerequisito)) || (m.correquisito && comp.includes(m.correquisito)));
        
        if (tieneDependencia) {
            let raices = matComp.filter(m => (!m.prerequisito || !comp.includes(m.prerequisito)) && (!m.correquisito || !comp.includes(m.correquisito)));
            raices.sort((a, b) => a.semestre - b.semestre); 
            let nombrePrincipal = raices.length > 0 ? raices[0].nombre : "Especialización";

            let def = "graph LR;\n"; 
            matComp.forEach(m => { let idNodo = m.nrc.replace(/[^a-zA-Z0-9]/g, ''); let nombreLimpio = m.nombre.replace(/["']/g, ''); def += `  ${idNodo}["${nombreLimpio}"]\n`; });
            matComp.forEach(m => {
                if (m.prerequisito) { let idPadre = m.prerequisito.replace(/[^a-zA-Z0-9]/g, ''); let idNodo = m.nrc.replace(/[^a-zA-Z0-9]/g, ''); if (matComp.some(x => x.nrc === m.prerequisito)) { def += `  ${idPadre} --> ${idNodo}\n`; } }
                if (m.correquisito) { let idCorreq = m.correquisito.replace(/[^a-zA-Z0-9]/g, ''); let idNodo = m.nrc.replace(/[^a-zA-Z0-9]/g, ''); if (matComp.some(x => x.nrc === m.correquisito)) { def += `  ${idCorreq} -.-> ${idNodo}\n`; } }
            });
            matComp.forEach(m => { let idNodo = m.nrc.replace(/[^a-zA-Z0-9]/g, ''); let colorHex = m.color || '#3498db'; def += `  style ${idNodo} fill:#1e1e24,stroke:${colorHex},stroke-width:2px,color:#fff;\n`; });

            grafosHTML += `<div class="ruta-grafo"><h4 style="border:none;">Ruta: ${nombrePrincipal}</h4><div class="mermaid" style="background:transparent; border:1px solid rgba(255,255,255,0.1);">${def}</div></div>`;
        }
    });

    const grafoContainer = document.getElementById('grafoMermaidContainer');
    if (grafosHTML !== "") {
        grafoContainer.innerHTML = grafosHTML;
        setTimeout(() => {
            try {
                mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
                document.querySelectorAll('.mermaid').forEach(el => el.removeAttribute('data-processed'));
                mermaid.init(undefined, document.querySelectorAll('.mermaid'));
            } catch(e) { console.error("Error al dibujar el grafo:", e); }
        }, 100);
    } else {
        grafoContainer.innerHTML = "<p style='color:var(--text-muted); margin-top:10px;'>Añade materias con dependencias para visualizar los grafos.</p>";
    }
}

