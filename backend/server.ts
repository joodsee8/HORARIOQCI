import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import mongoose from 'mongoose'; 
import 'dotenv/config'; 
import { PerfilModel } from './Perfil.js';
import fs from 'fs';
import axios from 'axios';

const app = express();
const PUERTO = 3000;

// Permisos abiertos para que el navegador no llore
app.use(cors());
app.use(express.json({ limit: '2mb' })); // la malla completa puede pesar más que el default de express

// Conexión a Base de Datos
mongoose.connect(process.env.MONGO_URI as string)
    .then(() => console.log('Base de Datos MongoDB ejecutandose'))
    .catch((err) => console.error('Error conectando a Mongo:', err));


// --- RUTA 1: STATUS DEL LED ---
app.get('/api/status', (req, res) => {
    res.json({ status: "vivo" });
});


const REGEX_CODIGO = /^\d{9}$/;

// --- RUTA 2: SUBIR RESPALDO (malla + horario + carrera) asociado a un código de 9 dígitos ---
// Upsert: si el código ya existía, reemplaza su respaldo; si no, lo crea.
app.post('/api/respaldo/:codigo', async (req, res) => {
    const { codigo } = req.params;

    if (!REGEX_CODIGO.test(codigo)) {
        return res.status(400).json({ error: "El código debe ser exactamente 9 dígitos." });
    }

    try {
        const { carrera, materias, horarioActual } = req.body;

        const perfil = await PerfilModel.findOneAndUpdate(
            { codigo },
            {
                codigo,
                carrera: carrera || '',
                materias: materias || [],
                horarioActual: horarioActual || [],
                actualizadoEn: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`[Respaldo] Código ${codigo}: ${(materias || []).length} materia(s) guardadas.`);
        res.json({ mensaje: "Respaldo guardado en la nube con éxito", actualizadoEn: perfil.actualizadoEn });
    } catch (error) {
        console.error("Error al guardar respaldo:", error);
        res.status(500).json({ error: "No se pudo guardar en la base de datos" });
    }
});

// --- RUTA 3: BAJAR RESPALDO por código de 9 dígitos ---
app.get('/api/respaldo/:codigo', async (req, res) => {
    const { codigo } = req.params;

    if (!REGEX_CODIGO.test(codigo)) {
        return res.status(400).json({ error: "El código debe ser exactamente 9 dígitos." });
    }

    try {
        const perfil = await PerfilModel.findOne({ codigo });
        if (!perfil) {
            return res.status(404).json({ error: "No existe ningún respaldo con ese código." });
        }

        res.json({
            carrera: perfil.carrera,
            materias: perfil.materias,
            horarioActual: perfil.horarioActual,
            actualizadoEn: perfil.actualizadoEn
        });
    } catch (error) {
        console.error("Error al leer respaldo:", error);
        res.status(500).json({ error: "No se pudo leer la base de datos" });
    }
});


// --- RUTA 3: EXTRAER OFERTA SIIAU ---
app.post('/api/extraer-oferta', async (req, res) => {
    const { ciclo, centro, carrera } = req.body;
    console.log(`\n[API] Recibí petición para: ${carrera} en ${centro} (${ciclo})`);

    const url = 'http://consulta.siiau.udg.mx/wco/sspseca.consulta_oferta';
    const formData = new URLSearchParams();
    formData.append('ciclop', ciclo);
    formData.append('cup', centro);
    formData.append('majrp', carrera);
    formData.append('crsep', '');
    formData.append('materiap', '');
    formData.append('horaip', '');
    formData.append('horafp', '');
    formData.append('edifp', '');
    formData.append('aulap', '');
    formData.append('ordenp', '0');
    formData.append('mostrarp', '500');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const html = decoder.decode(buffer);
        
        const $ = cheerio.load(html);
        const ofertaJSON: { [nrc: string]: any } = {};

        $('table[border="1"] > tbody > tr').each((i, row) => {
            const celdas = $(row).children('td');
            if (celdas.length >= 8) {
                const nrc = $(celdas[0]).text().trim();
                const clave = $(celdas[1]).text().trim();
                const materia = $(celdas[2]).text().trim();
                
                if (/^\d+$/.test(nrc)) {
                    let profesor = "Por definir";
                    const profCell = $(celdas[8]).find('td.tdprofesor').eq(1).text().trim();
                    if (profCell && profCell.length > 2) profesor = profCell;

                    const horarios: any[] = [];
                    $(celdas[7]).find('table tr').each((j, filaHorario) => {
                        const colsHorario = $(filaHorario).find('td');
                        if (colsHorario.length >= 5) {
                            const horasStr = $(colsHorario[1]).text().trim();
                            const diasStr = $(colsHorario[2]).text().trim();
                            const edificio = $(colsHorario[3]).text().trim();
                            const aula = $(colsHorario[4]).text().trim();

                            if (horasStr.includes('-')) {
                                const partesHora = horasStr.split('-');
                                const horaInicio = partesHora[0].replace(/(\d{2})(\d{2})/, '$1:$2');
                                const horaFin = partesHora[1].replace(/(\d{2})(\d{2})/, '$1:$2');
                                const mapaDias = ['L', 'M', 'I', 'J', 'V', 'S'];
                                const diasLimpios = diasStr.replace(/\s+/g, '');
                                
                                for (let k = 0; k < diasLimpios.length && k < mapaDias.length; k++) {
                                    if (diasLimpios[k] !== '.') {
                                        horarios.push({ dia: mapaDias[k], inicio: horaInicio, fin: horaFin, edificio: edificio, aula: aula });
                                    }
                                }
                            }
                        }
                    });
                    ofertaJSON[nrc] = { clave, materia, profesor, horarios };
                }
            }
        });

        console.log(`[API] ¡Éxito! Se enviarán ${Object.keys(ofertaJSON).length} materias al frontend.`);
        res.json(ofertaJSON);
    } catch (error) {
        console.error("[API] Error interno:", error);
        res.status(500).json({ error: "No se pudo conectar con el SIIAU" });
    }
});

// --- RUTA 4: LEER CATÁLOGOS JSON EXTERNOS ---
app.get('/api/catalogo/:carrera', (req, res) => {
    const carrera = req.params.carrera;
    const rutaArchivo = `./catalogos/${carrera}.json`;

    if (fs.existsSync(rutaArchivo)) {
        const archivo = fs.readFileSync(rutaArchivo, 'utf-8');
        res.json(JSON.parse(archivo));
    } else {
        res.status(404).json({ error: "No se encontró el catálogo de esta carrera" });
    }
});

// --- RUTA 4b: LEER MALLA CURRICULAR YA ARMADA (por carrera) ---
// Carpeta separada de "catalogos" a propósito: el catálogo es el diccionario
// de "todas las materias" (para el autocompletado); esto es la malla ya
// puesta semestre por semestre, lista para cargarse tal cual en la malla del
// alumno. Mismo formato que ya usa "Restaurar desde JSON" en el frontend
// (un arreglo de materias).
app.get('/api/malla/:carrera', (req, res) => {
    const carrera = req.params.carrera;
    const rutaArchivo = `./mallas/${carrera}.json`;

    if (fs.existsSync(rutaArchivo)) {
        const archivo = fs.readFileSync(rutaArchivo, 'utf-8');
        res.json(JSON.parse(archivo));
    } else {
        res.status(404).json({ error: "No se encontró la malla curricular de esta carrera" });
    }
});

// --- RUTA 5: SNIPER DE CUPOS EN VIVO (REAL) ---
app.post('/api/verificar-cupos', async (req, res) => {
    // Ahora recibimos también el centro y la carrera para saber qué página buscar
    const { nrcs, ciclo, centro, carrera } = req.body;
    
    if (!nrcs || !Array.isArray(nrcs) || !centro || !carrera) {
        return res.status(400).json({ error: "Faltan datos para la consulta" });
    }

    let cuposResult: any = {};

    try {
        console.log(`[Sniper] Infiltrando SIIAU para ver cupos reales de ${carrera} en ${centro}...`);
        
        // Armamos la URL real del SIIAU con los datos que nos mandó el Frontend
        const urlSiiau = `http://consulta.siiau.udg.mx/wco/sspmacr.forma_listado?ciclopi=${ciclo}&cupi=${centro}&crsep=${carrera}&mostrarpi=1000`;
        
        // Hacemos la petición al SIIAU
        // Cámbialo por esto bro:
const respuesta = await axios.get(urlSiiau, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-MX,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Connection': 'keep-alive'
    }
});
        const $ = cheerio.load(respuesta.data);

        // Recorremos la tabla gigante de materias
        $('table[border="1"] > tbody > tr').each((i, row) => {
            const celdas = $(row).children('td');
            
            if (celdas.length >= 8) {
                const nrcFila = $(celdas[0]).text().trim();

                // Si el NRC de esta fila está en la lista de los que queremos verificar...
                if (nrcs.includes(nrcFila)) {
                    // Columna 5 = CUP (Totales)
                    // Columna 6 = DIS (Disponibles) <-- ¡ESTA ES LA BUENA!
                    const cuposDisponibles = parseInt($(celdas[6]).text().trim()) || 0;
                    
                    cuposResult[nrcFila] = cuposDisponibles;
                }
            }
        });

        console.log(`[Sniper] Extracción exitosa. Encontramos cupos para ${Object.keys(cuposResult).length} materias.`);
        res.json(cuposResult);

    } catch (error) {
        console.error("Error al consultar cupos en SIIAU:", error);
        res.status(500).json({ error: "Error consultando SIIAU" });
    }
});


// --- RUTA 6: CUPOS EN VIVO (usando la misma página donde se busca la oferta) ---
// A diferencia de la RUTA 5 (que usa sspmacr.forma_listado y a veces no responde),
// esta ruta reutiliza sspseca.consulta_oferta, que es el endpoint que SÍ confirmaste
// funcionando (headers que mandaste). Solo lee las columnas CUP (5) y DIS (6) de la
// misma tabla que ya se usa en /api/extraer-oferta.
app.post('/api/consultar-cupos', async (req, res) => {
    const { nrcs, ciclo, centro, carrera } = req.body;

    if (!nrcs || !Array.isArray(nrcs) || !ciclo || !centro || !carrera) {
        return res.status(400).json({ error: "Faltan datos (nrcs, ciclo, centro, carrera)" });
    }

    console.log(`\n[Cupos] Consultando ${nrcs.length} NRC(s) para ${carrera} en ${centro} (${ciclo})...`);

    const url = 'http://consulta.siiau.udg.mx/wco/sspseca.consulta_oferta';
    const formData = new URLSearchParams();
    formData.append('ciclop', ciclo);
    formData.append('cup', centro);
    formData.append('majrp', carrera);
    formData.append('crsep', '');
    formData.append('materiap', '');
    formData.append('horaip', '');
    formData.append('horafp', '');
    formData.append('edifp', '');
    formData.append('aulap', '');
    formData.append('ordenp', '0');
    formData.append('mostrarp', '500');

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        const buffer = await response.arrayBuffer();
        const decoder = new TextDecoder('iso-8859-1');
        const html = decoder.decode(buffer);

        const $ = cheerio.load(html);
        const cuposResult: { [nrc: string]: { cupos: number; disponibles: number } } = {};

        $('table[border="1"] > tbody > tr').each((i, row) => {
            const celdas = $(row).children('td');
            if (celdas.length >= 8) {
                const nrcFila = $(celdas[0]).text().trim();
                if (/^\d+$/.test(nrcFila) && nrcs.includes(nrcFila)) {
                    const cupos = parseInt($(celdas[5]).text().trim()) || 0;
                    const disponibles = parseInt($(celdas[6]).text().trim()) || 0;
                    cuposResult[nrcFila] = { cupos, disponibles };
                }
            }
        });

        console.log(`[Cupos] Se encontraron ${Object.keys(cuposResult).length} de ${nrcs.length} NRC(s) pedidos.`);
        res.json(cuposResult);
    } catch (error) {
        console.error("[Cupos] Error consultando SIIAU:", error);
        res.status(500).json({ error: "No se pudo conectar con el SIIAU" });
    }
});

// RASTREADOR DE RUTAS
console.log("Rutas cargadas en memoria: /api/status, /api/respaldo/:codigo (POST/GET), /api/catalogo/:carrera, /api/malla/:carrera, /api/extraer-oferta, /api/consultar-cupos");

// ENCENDEMOS EL MOTOR
// ENCENDEMOS EL MOTOR
app.listen(PUERTO, '0.0.0.0', () => {
    console.log(`Servidor Backend ejecutandose en: http://localhost:${PUERTO}`);
});