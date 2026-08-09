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

const CREDITOS_TOTALES = 418;
const CREDITOS_DESBLOQUEO = 251;
let editandoNRC = null;

function guardarDatos() { localStorage.setItem('malla_udeg', JSON.stringify(materias)); }
function guardarHorario() { localStorage.setItem('horario_udeg', JSON.stringify(horarioActual)); }