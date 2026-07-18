// components/FriendsPanel.tsx
'use client';

import { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';

export default function FriendsPanel() {
  const { friends, incoming, outgoing, loading, error, sendRequest, respondToRequest, removeFriend } = useFriends();
  const [username, setUsername] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendError(null);
    try {
      await sendRequest(username.trim());
      setUsername('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send request');
    }
  };

  if (loading) return <p className="text-zinc-400 text-sm">Cargando amigos…</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nombre de usuario"
          className="flex-1 h-10 rounded-lg bg-zinc-800 text-white px-3 text-sm outline-none"
        />
        <button type="submit" className="h-10 px-4 rounded-lg bg-white text-black text-sm font-medium">
          Añadir
        </button>
      </form>
      {sendError && <p className="text-red-400 text-xs -mt-4">{sendError}</p>}

      {incoming.length > 0 && (
        <div>
          <h3 className="text-zinc-300 text-sm font-semibold mb-2">Solicitudes recibidas</h3>
          <ul className="flex flex-col gap-2">
            {incoming.map((req) => (
              <li key={req.id} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
                <span className="text-white text-sm">{req.sender.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(req.id, 'accept')}
                    className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => respondToRequest(req.id, 'decline')}
                    className="text-xs px-2 py-1 rounded bg-zinc-600 text-white"
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <h3 className="text-zinc-300 text-sm font-semibold mb-2">Solicitudes enviadas</h3>
          <ul className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <li key={req.id} className="text-zinc-400 text-sm bg-zinc-800/50 rounded-lg px-3 py-2">
                {req.receiver.username} — pendiente
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-zinc-300 text-sm font-semibold mb-2">Amigos ({friends.length})</h3>
        <ul className="flex flex-col gap-2">
          {friends.map((f) => (
            <li key={f.friendshipId} className="flex items-center justify-between bg-zinc-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${f.online ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                <span className="text-white text-sm">{f.username}</span>
              </div>
              <button
                onClick={() => removeFriend(f.friendshipId)}
                className="text-xs text-zinc-400 hover:text-red-400"
              >
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}