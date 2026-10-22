const db = require('../configuracion/db/conexion');

const obtenerServicios = async (req, res) => {
    try {
        const [servicios] = await db.query('SELECT * FROM servicios');
        res.status(200).json(servicios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al obtenet servicios' });
    }
};

const crearServicio = async (req, res) => {
    try {
        const { nombre, descripcion, precio } = req.body;
        const [resultado] = await db.query(
            'INSERT INTO servicios (nombre, descripcion, precio) VALUES (?,?,?)',
            [nombre, descripcion, precio]);
        res.status(201).json({ mensaje: 'servicio creado', id: resultado.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'error al crear servicio' });
    }
};
module.exports = { obtenerServicios, crearServicio };