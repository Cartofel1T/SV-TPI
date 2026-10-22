const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./configuracion/db/conexion")

const app = express();

app.use(cors());
app.use(express.json());

const authRutas = require('./rutas/auth.routes');
app.use('/api/auth', authRutas);

const serviciosRutas = require('./rutas/servicios.routes');
app.use('/api/servicios', serviciosRutas);

const turnosRutas = require('./rutas/turnos.routes');
app.use('/api/turnos', turnosRutas);

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('el servidor funciona');
});

console.log('Rutas cargadas: auth y servicios');
app.listen(PORT, () => {
    console.log(`el servidor funciona ${PORT}`);
});