// context/SocketContext.tsx
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getAccessToken } from '@/app/lib/auth';
import { tryRefresh } from '@/app/lib/api';

function isTokenExpired(token: string): boolean {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1]));
    return typeof exp !== 'number' || exp * 1000 < Date.now() + 30_000;
  } catch {
    return true;
  }
}

interface SocketContextValue {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Already have a live socket for this session — don't reconnect on
    // every re-render (user object can change identity on refetch).
    if (socketRef.current) return;

    const s = io(window.location.origin, {
      path: '/socket.io',
      auth: async (cb) => {
        try {
          let token = getAccessToken();
          if (token && isTokenExpired(token)) {
            await tryRefresh();
            token = getAccessToken();
          }
          cb({ token: token || '' });
        } catch {
          cb({ token: getAccessToken() || '' });
        }
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    let kicked = false;

    s.on('forceDisconnect', (data: { reason: string }) => {
      kicked = true;
      console.warn('Session replaced:', data.reason);
      logout();
      router.replace('/login');
    });

    // Server rejects a bad/expired token by calling socket.disconnect()
    // If server disconects socket.io doesn't auto-reconnect, so it needs to be recovered manually
    /*s.on('disconnect', async (reason) => {
      if (kicked) return;
      if (reason === 'io server disconnect') {
        const ok = await tryRefresh();
        if (ok) {
          s.auth = { token: getAccessToken() || '' };
          s.connect();
        } else {
          logout();
          router.replace('/login');
        }
      }
    });*/

    s.on('disconnect', (reason) => {
      if (!kicked && reason === 'io server disconnect' && !s.connected) {
        s.connect();
      }
    });

    socketRef.current = s;
    setSocket(s);
  }, [user, logout, router]);

  // Full teardown only when the provider itself unmounts (app close).
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketContext).socket;
}
