// =================================================================
// 11. RESPALDO EN LA NUBE (por código de 9 dígitos)
// =================================================================
const CLAVE_CODIGO_RESPALDO = 'codigo_respaldo_udeg';
const REGEX_CODIGO_RESPALDO = /^\d{9}$/;
async function checkBackendStatus() {
    const led = document.getElementById('statusLed');
    try {
        const res = await fetch(
            'https://generador-horarios-cucei.onrender.com/api/status'
        );
        if (!res.ok) throw new Error();
        led.style.background = "#30D158";
        led.style.boxShadow = "0 0 8px #30D158";
        led.title = "Servidor en línea";
    } catch (e) {
        led.style.background = "#FF453A";
        led.style.boxShadow = "0 0 8px #FF453A";
        led.title = "Servidor fuera de línea";
    }
}
setInterval(checkBackendStatus, 10000);
checkBackendStatus();
// =================================================================
// UTILIDAD: MOSTRAR ERROR EN VENTANA FLOTANTE
// =================================================================
function mostrarErrorRespaldo(titulo, mensaje, detalles = '') {
    const anterior = document.getElementById('modalErrorRespaldo');
    if (anterior) {
        anterior.remove();
    }
    const overlay = document.createElement('div');
    overlay.id = 'modalErrorRespaldo';
    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        z-index: 10001;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="
            width:100%;
            max-width:380px;
            background:#1c1c1e;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 15px 50px rgba(0,0,0,0.6);
        ">
            <div style="padding:22px;">
                <div style="
                    width:48px;
                    height:48px;
                    border-radius:50%;
                    background:rgba(255,69,58,0.15);
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    font-size:24px;
                    margin-bottom:14px;
                ">
                    ❌
                </div>
                <h3 style="
                    margin:0 0 7px;
                    font-size:18px;
                    color:#fff;
                ">
                    ${titulo}
                </h3>
                <p style="
                    margin:0;
                    font-size:13px;
                    color:#d1d1d6;
                    line-height:1.5;
                ">
                    ${mensaje}
                </p>
                ${
                    detalles
                        ? `
                            <div style="
                                margin-top:14px;
                                padding:11px;
                                border-radius:10px;
                                background:rgba(255,255,255,0.06);
                                border:1px solid rgba(255,255,255,0.08);
                            ">
                                <div style="
                                    font-size:10px;
                                    color:#8e8e93;
                                    margin-bottom:5px;
                                    text-transform:uppercase;
                                    letter-spacing:0.5px;
                                ">
                                    Detalles técnicos
                                </div>
                                <div style="
                                    font-size:11px;
                                    color:#aeaeb2;
                                    line-height:1.4;
                                    word-break:break-word;
                                    max-height:120px;
                                    overflow:auto;
                                ">
                                    ${detalles}
                                </div>
                            </div>
                        `
                        : ''
                }
                <button
                    id="btnCerrarErrorRespaldo"
                    style="
                        width:100%;
                        margin-top:18px;
                        padding:12px;
                        border:none;
                        border-radius:11px;
                        background:#007AFF;
                        color:white;
                        font-size:14px;
                        font-weight:600;
                        cursor:pointer;
                    "
                >
                    Entendido
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const cerrar = () => overlay.remove();
    overlay.querySelector('#btnCerrarErrorRespaldo').onclick = cerrar;
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            cerrar();
        }
    };
}
// =================================================================
// CÓDIGO DE RESPALDO
// =================================================================
function obtenerCodigoGuardado() {
    return localStorage.getItem(CLAVE_CODIGO_RESPALDO) || null;
}
function guardarCodigoRespaldo(codigo) {
    localStorage.setItem(CLAVE_CODIGO_RESPALDO, codigo);
    actualizarUiCodigoRespaldo();
}
function cambiarCodigoRespaldo() {
    localStorage.removeItem(CLAVE_CODIGO_RESPALDO);
    actualizarUiCodigoRespaldo();
}
function actualizarUiCodigoRespaldo() {
    const texto = document.getElementById('codigoRespaldoTexto');
    if (!texto) return;
    const codigo = obtenerCodigoGuardado();
    texto.textContent = codigo
        ? `Código: ${codigo}`
        : 'Sin código configurado';
}
async function obtenerOPedirCodigo() {
    const guardado = obtenerCodigoGuardado();
    if (
        guardado &&
        REGEX_CODIGO_RESPALDO.test(guardado)
    ) {
        return guardado;
    }
    const nuevo = await pedirCodigoRespaldo();
    guardarCodigoRespaldo(nuevo);
    return nuevo;
}
// =================================================================
// MODAL PARA CAPTURAR CÓDIGO
// =================================================================
function pedirCodigoRespaldo() {
    return new Promise((resolve, reject) => {
        cerrarModalCodigo();
        const overlay = document.createElement('div');
        overlay.id = 'modalCodigoOverlay';
        overlay.style.cssText = `
            position:fixed;
            inset:0;
            background:rgba(0,0,0,0.6);
            backdrop-filter:blur(4px);
            -webkit-backdrop-filter:blur(4px);
            z-index:10000;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:20px;
        `;
        overlay.onclick = (e) => {
            if (e.target !== overlay) return;
            cerrarModalCodigo();
            reject(
                new Error('Captura de código cancelada')
            );
        };
        overlay.innerHTML = `
            <div style="
                width:100%;
                max-width:360px;
                background:#1c1c1e;
                border-radius:20px;
                overflow:hidden;
                box-shadow:0 10px 40px rgba(0,0,0,0.5);
            ">
                <div style="padding:20px;">
                    <h3 style="
                        margin:0 0 4px;
                        font-size:16px;
                        color:#fff;
                    ">
                        🔑 Tu código de respaldo
                    </h3>
                    <p style="
                        margin:0 0 14px;
                        font-size:12px;
                        color:var(--text-muted);
                        line-height:1.4;
                    ">
                        Son 9 dígitos. Es tu identificador personal:
                        úsalo para subir tu progreso y para volver a
                        bajarlo.
                    </p>
                    <input
                        type="text"
                        id="inputCodigoRespaldo"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        maxlength="9"
                        placeholder="000000000"
                        style="
                            width:100%;
                            box-sizing:border-box;
                            padding:12px;
                            font-size:18px;
                            letter-spacing:3px;
                            text-align:center;
                            border-radius:10px;
                            background:rgba(0,0,0,0.3);
                            border:1px solid var(--glass-border);
                            color:#fff;
                        "
                    >
                    <p
                        id="errorCodigoRespaldo"
                        style="
                            display:none;
                            color:#FF453A;
                            font-size:11px;
                            margin:8px 0 0;
                        "
                    >
                        Debe ser exactamente 9 dígitos.
                    </p>
                    <button
                        id="btnConfirmarCodigo"
                        class="btn-submit"
                        style="
                            width:100%;
                            margin-top:14px;
                        "
                    >
                        Continuar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        const input =
            overlay.querySelector('#inputCodigoRespaldo');
        const error =
            overlay.querySelector('#errorCodigoRespaldo');
        const boton =
            overlay.querySelector('#btnConfirmarCodigo');
        input.addEventListener('input', () => {
            input.value =
                input.value
                    .replace(/\D/g, '')
                    .slice(0, 9);
        });
        input.focus();
        const confirmar = () => {
            const valor = input.value.trim();
            if (!REGEX_CODIGO_RESPALDO.test(valor)) {
                error.style.display = 'block';
                return;
            }
            cerrarModalCodigo();
            resolve(valor);
        };
        boton.onclick = confirmar;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                confirmar();
            }
        });
    });
}
function cerrarModalCodigo() {
    const overlay =
        document.getElementById('modalCodigoOverlay');
    if (overlay) {
        overlay.remove();
    }
}
// =================================================================
// SUBIR RESPALDO
// =================================================================
async function respaldarEnNube() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    const lastSyncTxt =
        document.getElementById('lastSync');
    let codigo;
    try {
        codigo = await obtenerOPedirCodigo();
    } catch (e) {
        return;
    }
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.innerHTML = "<span>⏳</span> Subiendo...";
    const payload = {
        carrera:
            localStorage.getItem('carreraSeleccionada') || '',
        materias,
        horarioActual
    };
    try {
        const respuesta = await fetch(
            `https://generador-horarios-cucei.onrender.com/api/respaldo/${codigo}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }
        );
        // ---------------------------------------------------------
        // ERROR HTTP
        // ---------------------------------------------------------
        if (!respuesta.ok) {
            let mensajeServidor = '';
            try {
                const contenido =
                    await respuesta.text();
                if (contenido) {
                    mensajeServidor = contenido;
                }
            } catch (e) {
                mensajeServidor = '';
            }
            let mensaje;
            switch (respuesta.status) {
                case 400:
                    mensaje =
                        'El servidor rechazó la información enviada. Revisa que el código y los datos sean válidos.';
                    break;
                case 401:
                    mensaje =
                        'No tienes autorización para realizar esta operación.';
                    break;
                case 403:
                    mensaje =
                        'El servidor bloqueó esta operación.';
                    break;
                case 404:
                    mensaje =
                        'La ruta de respaldo no existe en el servidor.';
                    break;
                case 409:
                    mensaje =
                        'Ya existe un conflicto con este respaldo.';
                    break;
                case 429:
                    mensaje =
                        'Se hicieron demasiadas solicitudes. Espera un momento e inténtalo nuevamente.';
                    break;
                case 500:
                    mensaje =
                        'El servidor tuvo un error interno al guardar tu respaldo.';
                    break;
                case 502:
                case 503:
                case 504:
                    mensaje =
                        'El servidor está temporalmente fuera de servicio o tardó demasiado en responder.';
                    break;
                default:
                    mensaje =
                        `El servidor respondió con el código HTTP ${respuesta.status}.`;
            }
            throw new Error(
                `${mensaje}${mensajeServidor
                    ? ` | Respuesta del servidor: ${mensajeServidor}`
                    : ''}`
            );
        }
        // ---------------------------------------------------------
        // ÉXITO
        // ---------------------------------------------------------
        btn.style.background = "#30D158";
        btn.innerHTML =
            "<span>✅</span> ¡Hecho!";
        lastSyncTxt.innerText =
            `Último respaldo: ${new Date().toLocaleTimeString()}`;
        setTimeout(() => {
            btn.style.background = "#007AFF";
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }, 2000);
    } catch (error) {
        console.error(
            'Error al subir respaldo:',
            error
        );
        btn.style.background = "#FF453A";
        btn.innerHTML =
            "<span>❌</span> Error";
        mostrarErrorRespaldo(
            'No se pudo subir el respaldo',
            error.message ||
                'Ocurrió un error desconocido.',
            error.stack || ''
        );
        setTimeout(() => {
            btn.style.background = "#007AFF";
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }, 3000);
    }
}
// =================================================================
// BAJAR RESPALDO
// =================================================================
async function restaurarDesdeNube() {
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    let codigo;
    try {
        codigo = await obtenerOPedirCodigo();
    } catch (e) {
        return;
    }
    btn.disabled = true;
    btn.style.opacity = "0.7";
    btn.innerHTML =
        "<span>⏳</span> Buscando...";
    try {
        const respuesta = await fetch(
            `https://generador-horarios-cucei.onrender.com/api/respaldo/${codigo}`
        );
        // ---------------------------------------------------------
        // RESPALDO NO ENCONTRADO
        // ---------------------------------------------------------
        if (respuesta.status === 404) {
            alert(
                'No hay ningún respaldo guardado con ese código todavía. Usa "Subir" primero.'
            );
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.innerHTML = originalText;
            return;
        }
        // ---------------------------------------------------------
        // OTROS ERRORES HTTP
        // ---------------------------------------------------------
        if (!respuesta.ok) {
            let mensajeServidor = '';
            try {
                const contenido =
                    await respuesta.text();
                if (contenido) {
                    mensajeServidor = contenido;
                }
            } catch (e) {
                mensajeServidor = '';
            }
            let mensaje;
            switch (respuesta.status) {
                case 400:
                    mensaje =
                        'El servidor considera inválida la solicitud.';
                    break;
                case 401:
                    mensaje =
                        'No tienes autorización para consultar este respaldo.';
                    break;
                case 403:
                    mensaje =
                        'El servidor rechazó el acceso a este respaldo.';
                    break;
                case 429:
                    mensaje =
                        'Se hicieron demasiadas solicitudes. Espera un momento e inténtalo nuevamente.';
                    break;
                case 500:
                    mensaje =
                        'El servidor tuvo un error interno al buscar el respaldo.';
                    break;
                case 502:
                case 503:
                case 504:
                    mensaje =
                        'El servidor está temporalmente fuera de servicio.';
                    break;
                default:
                    mensaje =
                        `El servidor respondió con el código HTTP ${respuesta.status}.`;
            }
            throw new Error(
                `${mensaje}${mensajeServidor
                    ? ` | Respuesta del servidor: ${mensajeServidor}`
                    : ''}`
            );
        }
        // ---------------------------------------------------------
        // LEER RESPALDO
        // ---------------------------------------------------------
        const datos =
            await respuesta.json();
        const fecha =
            datos.actualizadoEn
                ? new Date(
                    datos.actualizadoEn
                ).toLocaleString()
                : 'fecha desconocida';
        if (
            !confirm(
                `Se encontró un respaldo del ${fecha}.\n¿Reemplazar tu malla y horario actuales con esa información?`
            )
        ) {
            btn.disabled = false;
            btn.style.opacity = "1";
            btn.innerHTML = originalText;
            return;
        }
        materias =
            datos.materias || [];
        horarioActual =
            datos.horarioActual || [];
        if (datos.carrera) {
            localStorage.setItem(
                'carreraSeleccionada',
                datos.carrera
            );
        }
        sanitizarDatosGuardados();
        guardarDatos();
        guardarHorario();
        actualizarVistas();
        if (
            document
                .getElementById('dashboard-page')
                ?.classList
                .contains('active')
        ) {
            renderizarDashboard();
        }
        // ---------------------------------------------------------
        // ÉXITO
        // ---------------------------------------------------------
        btn.style.background =
            "#30D158";
        btn.innerHTML =
            "<span>✅</span> ¡Listo!";
        setTimeout(() => {
            btn.style.background =
                "rgba(255,255,255,0.08)";
            btn.innerHTML =
                originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }, 2000);
    } catch (error) {
        console.error(
            'Error al restaurar respaldo:',
            error
        );
        btn.style.background =
            "#FF453A";
        btn.innerHTML =
            "<span>❌</span> Error";
        mostrarErrorRespaldo(
            'No se pudo restaurar el respaldo',
            error.message ||
                'Ocurrió un error desconocido.',
            error.stack || ''
        );
        setTimeout(() => {
            btn.style.background =
                "rgba(255,255,255,0.08)";
            btn.innerHTML =
                originalText;
            btn.disabled = false;
            btn.style.opacity = "1";
        }, 3000);
    }
}
actualizarUiCodigoRespaldo();