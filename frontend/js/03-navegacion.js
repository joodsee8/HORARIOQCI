// =================================================================
// 3. NAVEGACIÓN Y UI BÁSICA
// =================================================================
function toggleMobileMenu() {
    document.getElementById('mainNav').classList.toggle('expanded');
}

function cambiarPagina(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(pageId)) btn.classList.add('active');
    });
    
    const nav = document.getElementById('mainNav');
    if(nav.classList.contains('expanded')) nav.classList.remove('expanded');

    actualizarVistas();
    
    if(pageId === 'dashboard-page') { setTimeout(() => { renderizarDashboard(); }, 50); }
    if(pageId === 'horario-page') renderizarHorario();
}

function actualizarColorPreview() {
    document.getElementById('colorPreview').style.backgroundColor = document.getElementById('colorMateria').value;
}

function hexToRgba(hex, alpha) {
    let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


function toggleTheme() {
    const root = document.documentElement; // Hace referencia a la etiqueta <html>
    const btn = document.getElementById('btn-theme');

    // Si el tema actual es claro, lo quitamos (regresa al oscuro por defecto)
    if (root.getAttribute('data-theme') === 'light') {
        root.removeAttribute('data-theme');
        btn.innerHTML = '🌞 Modo Claro'; // Cambia el texto del botón
    } 
    // Si no tiene el tema claro, se lo agregamos
    else {
        root.setAttribute('data-theme', 'light');
        btn.innerHTML = '🌙 Modo Oscuro'; // Cambia el texto del botón
    }
}


