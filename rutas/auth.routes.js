const express = require('express');
const router = express.Router();
const { registrarUsuario, loginUsuario } = require("../controladores/auth.controller.js");
const { verificarAutenticacion } = require("../middlewares/auth.middleware.js");

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);


router.get('/perfil', verificarAutenticacion, (req, res) => {
    res.status(200).json({
        mensaje: 'funciona',
        datosDelToken: req.usuario
    });
});

module.exports = router;