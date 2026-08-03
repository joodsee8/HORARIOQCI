// =================================================================
// 11. SINCRONIZACIÓN MONGODB BACKEND
// =================================================================
async function checkBackendStatus() {
    const led = document.getElementById('statusLed');
    try {
        const res = await fetch('https://generador-horarios-cucei.onrender.com/api/status');
        if (!res.ok) throw new Error();
        led.style.background = "#30D158"; led.style.boxShadow = "0 0 8px #30D158"; led.title = "Servidor en línea";
    } catch (e) {
        led.style.background = "#FF453A"; led.style.boxShadow = "0 0 8px #FF453A"; led.title = "Servidor fuera de línea";
    }
}
setInterval(checkBackendStatus, 10000); checkBackendStatus();

async function respaldarEnNube() {
    const btn = event.currentTarget; const originalText = btn.innerHTML; const lastSyncTxt = document.getElementById('lastSync');
    btn.disabled = true; btn.style.opacity = "0.7"; btn.innerHTML = "<span>⏳</span> Sincronizando...";

    try {
        const respuesta = await fetch('https://generador-horarios-cucei.onrender.com/api/guardar-malla', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ malla: materias }) });
        if (!respuesta.ok) throw new Error();

        btn.style.background = "#30D158"; btn.innerHTML = "<span>✅</span> ¡Hecho!";
        lastSyncTxt.innerText = `Último respaldo: ${new Date().toLocaleTimeString()}`;
        setTimeout(() => { btn.style.background = "#007AFF"; btn.innerHTML = originalText; btn.disabled = false; btn.style.opacity = "1"; }, 2000);
    } catch (error) {
        btn.style.background = "#FF453A"; btn.innerHTML = "<span>❌</span> Error de Red";
        setTimeout(() => { btn.style.background = "#007AFF"; btn.innerHTML = originalText; btn.disabled = false; btn.style.opacity = "1"; }, 3000);
    }
}

