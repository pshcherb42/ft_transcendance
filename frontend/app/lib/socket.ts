import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './auth';

// Crea la conexión Socket.IO con el backend.
export function connectGameSocket(): Socket {
  return io(`${window.location.origin}`, {
    path: '/socket.io',
    // 1. Transformamos auth en una función para que el token se lea en tiempo real
    auth: (cb) => {
      cb({ token: getAccessToken() || '' });
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    forceNew: true, // 2. Fuerza una nueva conexión limpia en lugar de reutilizar una rechazada
  });
}

