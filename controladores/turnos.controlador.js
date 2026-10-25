const db = require('../configuracion/db/conexion');

//trae el turno con el nombre del servicio, del estado y del cliente
const SQL_TURNOS = `
    SELECT t.id_turno, t.id_usuario, t.id_servicio, t.id_estado, t.fecha_hora,
           s.nombre AS servicio, e.nombre AS estado, u.nombre AS cliente
    FROM turnos t
    JOIN servicios s ON t.id_servicio = s.id_servicio
    JOIN estados_turno e ON t.id_estado = e.id_estado
    JOIN usuarios u ON t.id_usuario = u.id_usuario
`;


const NO_CANCELADO = "id_estado <> (SELECT id_estado FROM estados_turno WHERE nombre = 'Cancelado')";

const ESTADOS_CERRADOS = ['Completado', 'Cancelado'];

const obtenerIdEstado = async (nombre) => {
    const [estados] = await db.query('SELECT id_estado FROM estados_turno WHERE nombre = ?', [nombre]);
    return estados[0].id_estado;
};

const esDuenoOAdmin = (turno, usuario) => {
    return usuario.rol === 'admin' || turno.id_usuario === usuario.id;
};


const horarioOcupado = async (fecha_hora, id_turno = 0) => {
    const [ocupados] = await db.query(
        `SELECT id_turno FROM turnos WHERE fecha_hora = ? AND id_turno != ? AND ${NO_CANCELADO}`,
        [fecha_hora, id_turno]
    );
    return ocupados.length > 0;
};


const listarEstados = async (req, res) => {
    try {
        const [estados] = await db.query('SELECT id_estado, nombre FROM estados_turno ORDER BY id_estado');
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

const horariosOcupados = async (req, res) => {
    try {
        const fecha = req.query.fecha;

        if (!fecha) {
            return res.status(400).json({ error: 'falta la fecha' });
        }

        const [filas] = await db.query(
            `SELECT DATE_FORMAT(fecha_hora, '%H:%i') AS hora FROM turnos WHERE DATE(fecha_hora) = ? AND ${NO_CANCELADO}`,
            [fecha]
        );

        res.status(200).json(filas.map((fila) => fila.hora));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener horarios ocupados' });
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

        if (await horarioOcupado(fecha_hora)) {
            return res.status(400).json({ error: 'ya esta en uso, elegi otro.' });
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

        if (req.body.fecha_hora && await horarioOcupado(nuevaFechaHora, id_turno)) {
            return res.status(400).json({ error: 'ya esta en uso, elegi otro.' });
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
    horariosOcupados,
    obtenerTurno,
    crearTurno,
    actualizarTurno,
    cancelarTurno,
    eliminarTurno,
    cambiarEstado
};