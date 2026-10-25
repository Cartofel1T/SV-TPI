const jwt = require('jsonwebtoken');
const db = require('../configuracion/db/conexion');
const hashpass = require('@damianegreco/hashpass');

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        if (!nombre || !email || !password) {
            return res.status(400).json({ error: 'faltan datos' });
        }

        const [existente] = await db.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);

        if (existente.length > 0) {
            return res.status(409).json({ error: 'ese email ya esta registrado' });
        }

        const passwordHasheada = hashpass.hashPass(password);

        const [resultado] = await db.query(
            "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, 'cliente')",
            [nombre, email, passwordHasheada]
        );

        res.status(201).json({ mensaje: 'usuario creado exitosamente', id: resultado.insertId });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'hubo un problema al registrar el usuario' });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'faltan datos' });
        }

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
        const usuario = usuarios[0];

        if (!usuario || !hashpass.verificarPass(password, usuario.password)) {
            return res.status(401).json({ error: 'email o contraseña incorrectos' });
        }

        const token = jwt.sign(
            { id: usuario.id_usuario, rol: usuario.rol },
            process.env.JWT_SECRET,
            { expiresIn: '6h' }
        );

        res.status(200).json({
            mensaje: 'iniciaste sesion',
            token: token,
            usuario: { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol }
        });
    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'hubo un problema al iniciar sesion' });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const [usuarios] = await db.query(
            'SELECT id_usuario, nombre, email, rol FROM usuarios WHERE id_usuario = ?',
            [req.usuario.id]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({ error: 'usuario no encontrado' });
        }

        res.status(200).json(usuarios[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pudo obtener el perfil' });
    }
};

const listarUsuarios = async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT id_usuario, nombre, email, rol FROM usuarios');
        res.status(200).json(usuarios);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'no se pudieron obtener los usuarios' });
    }
};

module.exports = { registrarUsuario, loginUsuario, obtenerPerfil, listarUsuarios };