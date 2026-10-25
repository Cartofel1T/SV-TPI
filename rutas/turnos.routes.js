const express = require('express');
const router = express.Router();
const {
    listarEstados,
    listarTurnos,
    horariosOcupados,
    obtenerTurno,
    crearTurno,
    actualizarTurno,
    cancelarTurno,
    eliminarTurno,
    cambiarEstado
} = require('../controladores/turnos.controlador');
const { verificarAutenticacion, verificarAdmin } = require('../middlewares/auth.middleware');

router.get('/', verificarAutenticacion, listarTurnos);
router.get('/estados', verificarAutenticacion, listarEstados);
router.get('/ocupados', verificarAutenticacion, horariosOcupados);
router.get('/:id', verificarAutenticacion, obtenerTurno);
router.post('/', verificarAutenticacion, crearTurno);
router.put('/:id', verificarAutenticacion, actualizarTurno);
router.patch('/:id/cancelar', verificarAutenticacion, cancelarTurno);
router.patch('/:id/estado', verificarAutenticacion, verificarAdmin, cambiarEstado);
router.delete('/:id', verificarAutenticacion, eliminarTurno);

module.exports = router;