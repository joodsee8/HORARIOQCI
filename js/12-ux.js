// =================================================================
// 12. 🛠️ MEJORAS DE EXPERIENCIA DE USUARIO (UX)
// =================================================================
function obtenerSiguienteColumna(sem) {
    let letrasUsadas = materias.filter(m => m.semestre === sem).map(m => m.letra);
    if (letrasUsadas.length === 0) return 'A';
    
    let maxLetra = 'A';
    letrasUsadas.forEach(l => { if (l > maxLetra) maxLetra = l; });
    
    let nextCode = maxLetra.charCodeAt(0) + 1;
    if (nextCode > 82) return 'R';
    return String.fromCharCode(nextCode);
}

function actualizarColumnaAutomatica() {
    let sem = parseInt(document.getElementById('semestre').value);
    if (!isNaN(sem)) {
        let letraLibre = obtenerSiguienteColumna(sem); 
        let selectorLetra = document.getElementById('letra');
        if (selectorLetra.querySelector(`option[value="${letraLibre}"]`)) {
            selectorLetra.value = letraLibre;
        }
    }
}

// Guardar al dar Enter
document.querySelector('.formulario').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') { e.preventDefault(); agregarMateria(); }
});

// Detectar cambios en el semestre para saltar a la columna correcta sin regresar
document.getElementById('semestre').addEventListener('input', actualizarColumnaAutomatica);
document.getElementById('semestre').addEventListener('change', actualizarColumnaAutomatica);