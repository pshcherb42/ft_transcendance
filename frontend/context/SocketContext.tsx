// context/SocketContext.tsx
'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { getAccessToken } from '@/app/lib/auth';

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
      // Logged out (or never logged in): make sure no stray socket lingers.
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
      auth: (cb) => cb({ token: getAccessToken() || '' }),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      // No forceNew: this is the ONE long-lived socket for the whole app.
    });

    s.on('forceDisconnect', (data: { reason: string }) => {
      console.warn('Session replaced:', data.reason);
      logout();
      router.replace('/login');
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