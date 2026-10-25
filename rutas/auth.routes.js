const express = require('express');
const router = express.Router();
const {
    registrarUsuario,
    loginUsuario,
    obtenerPerfil,
    listarUsuarios
} = require('../controladores/auth.controller');
const { verificarAutenticacion, verificarAdmin } = require('../middlewares/auth.middleware');

router.post('/registro', registrarUsuario);
router.post('/login', loginUsuario);
router.get('/perfil', verificarAutenticacion, obtenerPerfil);
router.get('/usuarios', verificarAutenticacion, verificarAdmin, listarUsuarios);

module.exports = router;