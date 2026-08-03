// =================================================================
// 1. VARIABLES GLOBALES Y ALMACENAMIENTO
// =================================================================
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

