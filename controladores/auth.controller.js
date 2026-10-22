const db = require('../configuracion/db/conexion');
const hashpass = require('@damianegreco/hashpass');

const registrarUsuario = async (req, res) => {
    try {
        const { nombre, email, password } = req.body;

        const hashedPassword = hashpass.hashPass(password);

        const [resultado] = await db.query(
            'INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)',
            [nombre, email, hashedPassword]
        );

        res.status(201).json({ mensaje: 'usuario creado', id: resultado.insertId });
    } catch (error) {
        console.error('error al registrar', error);
        res.status(500).json({ error: 'hubo un problema' });
    }
};

//** -------------------**/

const loginUsuario = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);

        if (usuarios.length === 0) {
            return res.status(401).json({ error: "algo esta mal" });
        }

        const usuario = usuarios[0];

        const passwordValida = hashpass.verificarPass(password, usuario.password);

        if (!passwordValida) {
            return res.status(401).json({ error: "algo esta mal" });
        }

        const payload = { id: usuario.id_usuario, rol: usuario.rol };

        const token = hashpass.generarToken(process.env.JWT_SECRET, 6, payload);

        res.status(200).json({
            mensaje: "iniciaste sesion",
            token: token,
            usuario: { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol }
        });
    }
    catch (error) {
        console.error("error:", error);
        res.status(500).json({ error: "paso algo pe" });
    }
};

module.exports = { registrarUsuario, loginUsuario };