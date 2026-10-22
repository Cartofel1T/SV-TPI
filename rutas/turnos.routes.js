const express = require('express');
const router = express.Router();
const { crearTurno } = require('../controladores/turnos.controlador');
const { verificarAutenticacion } = require('../middlewares/auth.middleware');

router.post('/', verificarAutenticacion, crearTurno);

module.exports = router;