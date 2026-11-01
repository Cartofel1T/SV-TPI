const db = require('../configuracion/db/conexion');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, contrasenia } = req.body;
        if (!nombre || !email || !contrasenia) {
            return res.status(400).json({ error: 'Faltan datos' });
        }

        const [existe] = await db.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
        if (existe.length > 0) return res.status(400).json({ error: 'El email ya esta registrado' });

        const passwordEncriptada = await bcrypt.hash(contrasenia, 10);
        await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, "cliente")',
            [nombre, email, passwordEncriptada]
        );
        res.status(201).json({ mensaje: 'Usuario registrado' });
    } catch (error) {
        res.status(500).json({ error: 'Error al registrar' });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { email, contrasenia } = req.body;
        const [resultado] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        const usuario = resultado[0];

        if (!usuario || !(await bcrypt.compare(contrasenia, usuario.password))) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '4h' }
        );
        res.json({ token, nombre: usuario.nombre, rol: usuario.rol });
    } catch (error) {
        console.error('ERROR EN LOGIN:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const [resultado] = await db.query(
            'SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = ?',
            [req.usuario.id]
        );
        res.json(resultado[0]);
    } catch (error) {
        res.status(500).json({ error: 'error al obtener el perfil' });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, nombre, email, rol FROM usuarios');
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
};

module.exports = { registrarUsuario, loginUsuario, obtenerPerfil, listarUsuarios };