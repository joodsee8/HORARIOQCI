// =================================================================
// 1. VARIABLES GLOBALES Y ALMACENAMIENTO
// =================================================================

// URL del backend en Render. Está en UN SOLO lugar a propósito: si vuelves
// a renombrar el servicio de Render (como pasó de "generador-horarios-cucei"
// a "horarioqci"), solo hay que cambiar esta línea, no buscar en 6 archivos.
const API_BASE_URL = 'https://horarioqci.onrender.com';

let materias = JSON.parse(localStorage.getItem('malla_udeg')) || [];
let horarioActual = JSON.parse(localStorage.getItem('horario_udeg')) || [];
let ofertaAcademica = JSON.parse(localStorage.getItem('oferta_udeg')) || {};

let cursosGenerador = []; 
let todosLosResultados = [];
let resultadosMostrados = 0;

const DIAS_LETRA = ['L', 'M', 'I', 'J', 'V', 'S'];
const DIAS_NOMBRE = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// --- Claves "comodín" de materias optativas ---
// No son claves reales del SIIAU: representan un espacio en la malla que el
// alumno llena con la optativa real que decida cursar. Por eso: (a) se
// pueden repetir en la malla del alumno (agregarMateria las auto-numera,
// ej. OAINQU, OAINQU-2...), y (b) al agendar el semestre en el Generador se
// pregunta por la clave real de la oferta en vez de buscarlas directo.
const CLAVES_OPTATIVAS = {
    INQU: [
        { clave: 'OAINQU', nombre: 'Optativa Abierta' },
        { clave: 'OTINQU', nombre: 'Optativa de Tecnología' },
        { clave: 'ESINQU', nombre: 'Especializante Selectiva' }
    ],
    INME: [
        { clave: 'OAINME', nombre: 'Optativa Abierta' }
    ],
    INDU: [
        { clave: 'OAINDU', nombre: 'Optativa Abierta' },
        { clave: 'OMINDU', nombre: 'Optativa de Movilidad' }
    ]
};

/** Regresa {clave, nombre} si la clave (sin sufijo de repetición) es una optativa comodín, o null. */
function obtenerInfoOptativa(clave) {
    const base = (clave || '').split('-')[0]; // quita el "-2", "-3"... del auto-numerado
    for (const carrera in CLAVES_OPTATIVAS) {
        const encontrada = CLAVES_OPTATIVAS[carrera].find(o => o.clave === base);
        if (encontrada) return encontrada;
    }
    return null;
}

function esClaveOptativa(clave) {
    return !!obtenerInfoOptativa(clave);
}

const CREDITOS_TOTALES = 418;
const CREDITOS_DESBLOQUEO = 251;
let editandoNRC = null;

function guardarDatos() { localStorage.setItem('malla_udeg', JSON.stringify(materias)); }
function guardarHorario() { localStorage.setItem('horario_udeg', JSON.stringify(horarioActual)); }