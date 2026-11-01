const db = require('../configuracion/db/conexion');

const SQL_TURNOS = `
    SELECT t.id_turno, t.id_usuario, t.id_servicio, t.id_estado, t.fecha_hora,
           s.nombre AS servicio, s.duracion, e.nombre_estado AS estado, u.nombre AS cliente
    FROM turnos t
    JOIN servicios s ON t.id_servicio = s.id_servicio
    JOIN estados_turno e ON t.id_estado = e.id_estado
    JOIN usuarios u ON t.id_usuario = u.id_usuario
`;

const NO_CANCELADO = "t.id_estado <> (SELECT id_estado FROM estados_turno WHERE nombre_estado = 'Cancelado')";
const ESTADOS_CERRADOS = ['Completado', 'Cancelado'];

// La atención va de 10:00 a 19:00, medido en minutos desde las 00:00
const HORA_APERTURA = 10 * 60;
const HORA_CIERRE = 19 * 60;

const obtenerIdEstado = async (nombre) => {
    const [estados] = await db.query('SELECT id_estado FROM estados_turno WHERE nombre_estado = ?', [nombre]);
    return estados[0].id_estado;
};

const esDuenoOAdmin = (turno, usuario) => {
    return usuario.rol === 'admin' || turno.id_usuario === usuario.id;
};

// Devuelve la duración en minutos del servicio, o null si no existe
const obtenerDuracion = async (id_servicio) => {
    const [servicios] = await db.query('SELECT duracion FROM servicios WHERE id_servicio = ?', [id_servicio]);
    return servicios.length ? servicios[0].duracion : null;
};

// "2026-11-03 10:30:00" -> 630
const minutosDelDia = (fechaHora) => {
    const [horas, minutos] = fechaHora.slice(11, 16).split(':').map(Number);
    return horas * 60 + minutos;
};

// Devuelve un mensaje de error si el horario no sirve, o null si está bien
const validarHorario = (fecha_hora, duracion) => {
    const inicio = new Date(fecha_hora.replace(' ', 'T'));

    if (isNaN(inicio)) return 'fecha y hora no válidas';
    if (inicio <= new Date()) return 'no podés reservar en el pasado';
    if (inicio.getDay() === 0) return 'los domingos estamos cerrados';
    if (inicio.getMinutes() % 30 !== 0) return 'los turnos empiezan en punto o y media';

    const minutosInicio = inicio.getHours() * 60 + inicio.getMinutes();
    const minutosFin = minutosInicio + Number(duracion);

    if (minutosInicio < HORA_APERTURA || minutosFin > HORA_CIERRE) {
        return 'ese horario está fuera de la atención (10:00 a 19:00)';
    }

    return null;
};

// Revisa si otro turno activo se superpone con el intervalo nuevo
const hayConflicto = async (fecha_hora, duracion, id_turno = 0) => {
    const [choques] = await db.query(
        `SELECT t.id_turno
         FROM turnos t
         JOIN servicios s ON t.id_servicio = s.id_servicio
         WHERE t.id_turno <> ?
         AND ${NO_CANCELADO}
         AND t.fecha_hora < DATE_ADD(?, INTERVAL ? MINUTE)
         AND DATE_ADD(t.fecha_hora, INTERVAL s.duracion MINUTE) > ?`,
        [id_turno, fecha_hora, duracion, fecha_hora]
    );
    return choques.length > 0;
};

const listarEstados = async (req, res) => {
    try {
        const [estados] = await db.query('SELECT id_estado, nombre_estado FROM estados_turno ORDER BY id_estado');
        res.status(200).json(estados);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener estados' });
    }
};

const listarTurnos = async (req, res) => {
    try {
        let turnos;

        if (req.usuario.rol === 'admin') {
            [turnos] = await db.query(SQL_TURNOS + ' ORDER BY t.fecha_hora');
        } else {
            [turnos] = await db.query(
                SQL_TURNOS + ' WHERE t.id_usuario = ? ORDER BY t.fecha_hora',
                [req.usuario.id]
            );
        }

        res.status(200).json(turnos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener turnos' });
    }
};

// GET /api/turnos/disponibles?fecha=2026-11-03&id_servicio=1
const horariosDisponibles = async (req, res) => {
    try {
        const { fecha, id_servicio } = req.query;

        if (!fecha || !id_servicio) {
            return res.status(400).json({ error: 'faltan datos' });
        }

        const duracion = await obtenerDuracion(id_servicio);
        if (duracion === null) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        const [anio, mes, dia] = fecha.split('-').map(Number);
        const cerrado = new Date(anio, mes - 1, dia).getDay() === 0;

        const [ocupados] = await db.query(
            `SELECT t.fecha_hora, s.duracion
             FROM turnos t
             JOIN servicios s ON t.id_servicio = s.id_servicio
             WHERE DATE(t.fecha_hora) = ? AND ${NO_CANCELADO}`,
            [fecha]
        );

        const intervalosOcupados = ocupados.map((turno) => {
            const inicio = minutosDelDia(turno.fecha_hora);
            return { inicio, fin: inicio + Number(turno.duracion) };
        });

        const ahora = new Date();
        const horarios = [];

        for (let minutos = HORA_APERTURA; minutos < HORA_CIERRE; minutos += 30) {
            const hora = `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
            const fin = minutos + Number(duracion);

            const yaPaso = new Date(`${fecha}T${hora}:00`) <= ahora;
            const choca = intervalosOcupados.some((i) => i.inicio < fin && i.fin > minutos);

            horarios.push({
                hora,
                disponible: !cerrado && !yaPaso && fin <= HORA_CIERRE && !choca
            });
        }

        res.status(200).json(horarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener horarios disponibles' });
    }
};

const obtenerTurno = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const [turnos] = await db.query(SQL_TURNOS + ' WHERE t.id_turno = ?', [id_turno]);

        if (turnos.length === 0) {
            return res.status(404).json({ error: 'turno no encontrado' });
        }

        if (!esDuenoOAdmin(turnos[0], req.usuario)) {
            return res.status(403).json({ error: 'no podes ver este turno' });
        }

        res.status(200).json(turnos[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener el turno' });
    }
};

const crearTurno = async (req, res) => {
    try {
        const id_usuario = req.usuario.id;
        const { id_servicio, fecha_hora } = req.body;

        if (!id_servicio || !fecha_hora) {
            return res.status(400).json({ error: 'faltan datos' });
        }

        const duracion = await obtenerDuracion(id_servicio);
        if (duracion === null) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        const errorHorario = validarHorario(fecha_hora, duracion);
        if (errorHorario) {
            return res.status(400).json({ error: errorHorario });
        }

        if (await hayConflicto(fecha_hora, duracion)) {
            return res.status(400).json({ error: 'ese horario ya está ocupado, elegí otro' });
        }

        const id_estado = await obtenerIdEstado('Pendiente');

        const [resultado] = await db.query(
            'INSERT INTO turnos (id_usuario, id_servicio, fecha_hora, id_estado) VALUES (?, ?, ?, ?)',
            [id_usuario, id_servicio, fecha_hora, id_estado]
        );

        res.status(201).json({ mensaje: 'turno reservado', id_turno: resultado.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pudo reservar' });
    }
};

const actualizarTurno = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const [turnos] = await db.query('SELECT * FROM turnos WHERE id_turno = ?', [id_turno]);

        if (turnos.length === 0) {
            return res.status(404).json({ error: 'turno no encontrado' });
        }

        const turnoActual = turnos[0];

        if (!esDuenoOAdmin(turnoActual, req.usuario)) {
            return res.status(403).json({ error: 'no podes modificar este turno' });
        }

        const nuevoServicio = req.body.id_servicio || turnoActual.id_servicio;
        const nuevaFechaHora = req.body.fecha_hora || turnoActual.fecha_hora;

        const duracion = await obtenerDuracion(nuevoServicio);
        if (duracion === null) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        const errorHorario = validarHorario(nuevaFechaHora, duracion);
        if (errorHorario) {
            return res.status(400).json({ error: errorHorario });
        }

        if (await hayConflicto(nuevaFechaHora, duracion, id_turno)) {
            return res.status(400).json({ error: 'ese horario ya está ocupado, elegí otro' });
        }

        await db.query(
            'UPDATE turnos SET id_servicio = ?, fecha_hora = ? WHERE id_turno = ?',
            [nuevoServicio, nuevaFechaHora, id_turno]
        );

        res.status(200).json({ mensaje: 'turno actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al actualizar el turno' });
    }
};

const cancelarTurno = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const [turnos] = await db.query(SQL_TURNOS + ' WHERE t.id_turno = ?', [id_turno]);

        if (turnos.length === 0) {
            return res.status(404).json({ error: 'turno no encontrado' });
        }

        const turno = turnos[0];

        if (!esDuenoOAdmin(turno, req.usuario)) {
            return res.status(403).json({ error: 'no podes cancelar este turno' });
        }

        if (ESTADOS_CERRADOS.includes(turno.estado)) {
            return res.status(400).json({ error: 'este turno ya no se puede cancelar' });
        }

        const id_cancelado = await obtenerIdEstado('Cancelado');
        await db.query('UPDATE turnos SET id_estado = ? WHERE id_turno = ?', [id_cancelado, id_turno]);

        res.status(200).json({ mensaje: 'turno cancelado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al cancelar el turno' });
    }
};

const eliminarTurno = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const [turnos] = await db.query('SELECT * FROM turnos WHERE id_turno = ?', [id_turno]);

        if (turnos.length === 0) {
            return res.status(404).json({ error: 'turno no encontrado' });
        }

        if (!esDuenoOAdmin(turnos[0], req.usuario)) {
            return res.status(403).json({ error: 'no podes borrar este turno' });
        }

        await db.query('DELETE FROM turnos WHERE id_turno = ?', [id_turno]);

        res.status(200).json({ mensaje: 'turno eliminado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al eliminar el turno' });
    }
};

const cambiarEstado = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const { id_estado } = req.body;

        if (!id_estado) {
            return res.status(400).json({ error: 'falta el id_estado' });
        }

        const [resultado] = await db.query(
            'UPDATE turnos SET id_estado = ? WHERE id_turno = ?',
            [id_estado, id_turno]
        );

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'turno no encontrado' });
        }

        res.status(200).json({ mensaje: 'estado del turno actualizado' });
    } catch (error) {
        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ error: 'ese estado no existe' });
        }
        console.error(error);
        res.status(500).json({ error: 'error al cambiar el estado' });
    }
};

module.exports = {
    listarEstados,
    listarTurnos,
    horariosDisponibles,
    obtenerTurno,
    crearTurno,
    actualizarTurno,
    cancelarTurno,
    eliminarTurno,
    cambiarEstado
};