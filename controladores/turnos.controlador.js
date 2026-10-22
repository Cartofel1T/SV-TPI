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

module.exports = { crearTurno };