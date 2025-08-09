
import express from 'express';
import { ExpressPeerServer } from 'peer';
import http from 'http';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 9000;

// Habilitar CORS para todas las rutas. Esencial para la conexión desde el navegador.
app.use(cors());

app.get('/', (req, res) => {
  res.send('Servidor de señalización para Bancomatón está activo.');
});

const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, {
  path: '/peerjs', // El cliente se conectará a esta ruta.
  allow_discovery: true, // Permite a los clientes buscar otros peers por ID.
});

app.use(peerServer);

server.listen(port, () => {
  console.log(`Servidor de señalización escuchando en el puerto ${port}`);
});
