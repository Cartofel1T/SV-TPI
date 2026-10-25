const express = require('express');
const router = express.Router();
const {
    obtenerServicios,
    obtenerServicio,
    crearServicio,
    actualizarServicio,
    eliminarServicio
} = require('../controladores/servicios.controlador');
const { verificarAutenticacion, verificarAdmin } = require('../middlewares/auth.middleware');

router.get('/', obtenerServicios);
router.get('/:id', obtenerServicio);
router.post('/', verificarAutenticacion, verificarAdmin, crearServicio);
router.put('/:id', verificarAutenticacion, verificarAdmin, actualizarServicio);
router.delete('/:id', verificarAutenticacion, verificarAdmin, eliminarServicio);

module.exports = router;