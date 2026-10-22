const express = require('express');
const router = express.Router();
const { obtenerServicios, crearServicio } = require('../controladores/servicios.controlador');
const { verificarAutenticacion, verificarAdmin } = require('../middlewares/auth.middleware');

router.get('/', obtenerServicios);

router.post('/', verificarAutenticacion, verificarAdmin, crearServicio);

module.exports = router;
