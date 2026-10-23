const express = require('express');
const router = express.Router();
const { crearTurno, obtenerTurnos, cancelarturno } = require('../controladores/turnos.controlador');
const { verificarAutenticacion } = require('../middlewares/auth.middleware');

router.post('/', verificarAutenticacion, crearTurno);

router.get('/', verificarAutenticacion, obtenerTurnos);
router.put('/:id/cancelar', verificarAutenticacion, cancelarturno);

module.exports = router;