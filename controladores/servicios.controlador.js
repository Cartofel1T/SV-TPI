const db = require('../configuracion/db/conexion');

const obtenerServicios = async (req, res) => {
    try {
        const [servicios] = await db.query('SELECT * FROM servicios');
        res.status(200).json(servicios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener servicios' });
    }
};

const obtenerServicio = async (req, res) => {
    try {
        const id_servicio = req.params.id;
        const [servicios] = await db.query('SELECT * FROM servicios WHERE id_servicio = ?', [id_servicio]);

        if (servicios.length === 0) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        res.status(200).json(servicios[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtener el servicio' });
    }
};

const crearServicio = async (req, res) => {
    try {
        const { nombre, descripcion, precio } = req.body;

        if (!nombre || precio === undefined) {
            return res.status(400).json({ error: 'faltan datos' });
        }

        const [resultado] = await db.query(
            'INSERT INTO servicios (nombre, descripcion, precio) VALUES (?, ?, ?)',
            [nombre, descripcion || '', precio]
        );

        res.status(201).json({ mensaje: 'servicio creado', id: resultado.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al crear servicio' });
    }
};

const actualizarServicio = async (req, res) => {
    try {
        const id_servicio = req.params.id;
        const [servicios] = await db.query('SELECT * FROM servicios WHERE id_servicio = ?', [id_servicio]);

        if (servicios.length === 0) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        const servicioActual = servicios[0];

        const nuevoNombre = req.body.nombre || servicioActual.nombre;
        const nuevaDescripcion = req.body.descripcion ?? servicioActual.descripcion;
        const nuevoPrecio = req.body.precio ?? servicioActual.precio;

        await db.query(
            'UPDATE servicios SET nombre = ?, descripcion = ?, precio = ? WHERE id_servicio = ?',
            [nuevoNombre, nuevaDescripcion, nuevoPrecio, id_servicio]
        );

        res.status(200).json({ mensaje: 'servicio actualizado' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al actualizar servicio' });
    }
};

const eliminarServicio = async (req, res) => {
    try {
        const id_servicio = req.params.id;
        const [resultado] = await db.query('DELETE FROM servicios WHERE id_servicio = ?', [id_servicio]);

        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'servicio no encontrado' });
        }

        res.status(200).json({ mensaje: 'servicio eliminado' });
    } catch (error) {
        //eso preguntar
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({ error: 'no se puede borrar: tiene turnos asociados' });
        }
        console.error(error);
        res.status(500).json({ error: 'error al eliminar servicio' });
    }
};

module.exports = {
    obtenerServicios,
    obtenerServicio,
    crearServicio,
    actualizarServicio,
    eliminarServicio
};