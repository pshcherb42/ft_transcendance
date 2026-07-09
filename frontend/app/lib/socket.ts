import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

// Crea la conexión Socket.IO con el backend.
// Sin URL → usa el mismo origen que la página (http://localhost:8080), y nginx
// enruta /socket.io hacia backend:3001. El JWT viaja en el handshake para que
// el gateway pueda autenticar en handleConnection.
export function connectGameSocket(): Socket {
  return io(`${window.location.origin}/game`, {
    path: '/socket.io',
    auth: { token: getAccessToken() || '' },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });
}

