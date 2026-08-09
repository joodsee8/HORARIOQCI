import mongoose from 'mongoose';

// Un documento por código de 9 dígitos. Guarda TODO lo que hay que
// preservar del alumno: su malla completa (que ya incluye estado y
// calificación de cada materia) y su horario más reciente. No se guarda
// `ofertaAcademica` aquí porque es solo una caché de la oferta del SIIAU,
// no información propia del alumno, y se puede volver a descargar cuando
// haga falta.
const perfilSchema = new mongoose.Schema({
    codigo: {
        type: String,
        required: true,
        unique: true,
        match: /^\d{9}$/
    },
    carrera: { type: String, default: '' },
    materias: { type: mongoose.Schema.Types.Mixed, default: [] },
    horarioActual: { type: mongoose.Schema.Types.Mixed, default: [] },
    actualizadoEn: { type: Date, default: Date.now }
}, { minimize: false });

export const PerfilModel = mongoose.model('Perfil', perfilSchema);