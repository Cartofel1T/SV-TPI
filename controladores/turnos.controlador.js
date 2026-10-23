const db = require('../configuracion/db/conexion');

const crearTurno = async (req, res) => {
    try {
        const id_usuario = req.usuario.id;
        const { id_servicio, fecha_hora } = req.body;

        const [turnosOcupados] = await db.query(
            'SELECT * FROM turnos WHERE fecha_hora = ?',
            [fecha_hora]
        );

        if (turnosOcupados.length > 0) {
            return res.status(400).json({ error: 'ya esta en uso, elegi otro.' });
        }

        const id_estado = 1;
        const [resultado] = await db.query(
            'INSERT INTO turnos (id_usuario, id_servicio, fecha_hora, id_estado) VALUES (?, ?, ?, ?)',
            [id_usuario, id_servicio, fecha_hora, id_estado]
        );

        res.status(201).json({
            mensaje: 'turno reservado',
            id_turno: resultado.insertId
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pudo reservar' });
    }
};

const obtenerTurnos = async (req, res) => {
    try {
        const id_usuario = req.usuario.id;
        const rol = req.usuario.rol;

        let sql = `
        SELECT t.id_turno, t.fecha_hora, s.nombre AS servicio, s.precio, u.nombre AS cliente, e.nombre_estado AS estado
        FROM turnos t
        JOIN servicios s ON t.id_servicio = s.id_servicio
        JOIN usuarios u ON t.id_usuario = u.id_usuario
        JOIN estados_turno e ON t.id_estado = e.id_estado`;

        let parametros = [];

        if (rol !== 'admin') {
            sql += ' WHERE t.id_usuario = ?';
            parametros.push(id_usuario);
        }

        const [turnos] = await db.query(sql, parametros);
        res.json(turnos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pude obtener el turno/s' });
    }
};

const cancelarTurno = async (req, res) => {
    try {
        const id_turno = req.params.id;
        const id_usuario = req.usuario.id;

        const [resultado] = await db.query(
            'UPDATE turnos SET id_estado = 3 WHERE id_turno = ? AND id_usuario = ?',
            [id_turno, id_usuario]
        );

        if (resultado.affectedRows === 0) {
            return res.status(403).json({ error: 'turno no encontrado' });
        }

        res.status(200).json({ mensaje: 'turno cancelado' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pudo cancelar' })
    }
};

module.exports = { crearTurno, obtenerTurnos, cancelarTurno };