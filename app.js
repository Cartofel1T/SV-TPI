const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./configuracion/db/conexion");

const app = express();

app.use(cors());
app.use(express.json());

const authRutas = require('./rutas/auth.routes');
app.use('/api/auth', authRutas);

const serviciosRutas = require('./rutas/servicios');
app.use('/api/servicios', serviciosRutas);

const turnosRutas = require('./rutas/turnos');
app.use('/api/turnos', turnosRutas);

app.get('/', (req, res) => {
    res.send('el servidor funciona');
});

app.use((req, res) => {
    res.status(404).json({ error: 'ruta no encontrada' });
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'error del servidor' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`el servidor funciona en el puerto ${PORT}`);
});