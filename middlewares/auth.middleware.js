const hashpass = require('@damianegreco/hashpass');

const verificarAutenticacion = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(403).json({ error: 'no se dio el token' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'token invalido' });
    }

    const resultado = hashpass.verificarToken(token, process.env.JWT_SECRET);

    if (typeof resultado === 'string') {
        return res.status(401).json({ error: resultado });
    }

    req.usuario = resultado.data;
    next();
};

const verificarAdmin = (req, res, next) => {
    if (req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: "no sos admin" });
    }
    next();
}

module.exports = { verificarAutenticacion, verificarAdmin };