
import express from 'express';
import { ExpressPeerServer } from 'peer';
import http from 'http';
import path from 'path';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 9000;

// Habilitar CORS para todas las rutas
app.use(cors());

const server = http.createServer(app);

const peerServer = ExpressPeerServer(server, {
  path: '/peerjs', // Es importante que coincida con el path del cliente
  generateClientId: () => {
    // Genera un ID de cliente más robusto y aleatorio
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
});

app.use(peerServer);

app.get('/', (req, res) => {
  res.send('Servidor de señalización para Bancomatón está activo.');
});

server.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});