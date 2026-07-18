// hooks/useFriends.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/app/lib/api';
import { useSocket } from '@/context/SocketContext';
import type { Friend, PendingIncoming, PendingOutgoing } from '@/types/friend';

export function useFriends() {
  const socket = useSocket();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<PendingIncoming[]>([]);
  const [outgoing, setOutgoing] = useState<PendingOutgoing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, inRes, outRes] = await Promise.all([
        apiFetch('/friends'),
        apiFetch('/friends/pending/incoming'),
        apiFetch('/friends/pending/outgoing'),
      ]);
      if (!friendsRes.ok || !inRes.ok || !outRes.ok) throw new Error('Failed to load friends');
      setFriends(await friendsRes.json());
      setIncoming(await inRes.json());
      setOutgoing(await outRes.json());
    } catch (e) {
      setError('Could not load friends');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Live presence updates — patch in place, no refetch.
  useEffect(() => {
    if (!socket) return;

    const onFriendOnline = (data: { userId: string }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === data.userId ? { ...f, online: true } : f)),
      );
    };
    const onFriendOffline = (data: { userId: string }) => {
      setFriends((prev) =>
        prev.map((f) => (f.id === data.userId ? { ...f, online: false } : f)),
      );
    };

    const onRequestReceived = (data: PendingIncoming) => {
      setIncoming((prev) => [...prev, data]);
    };
    const onRequestAccepted = (data: { friendshipId: string; friend: Friend }) => {
      setOutgoing((prev) => prev.filter((r) => r.id !== data.friendshipId));
      setFriends((prev) => [...prev, { friendshipId: data.friendshipId, ...data.friend }]);
    };
    const onRequestDeclined = (data: { friendshipId: string }) => {
      setOutgoing((prev) => prev.filter((r) => r.id !== data.friendshipId));
    };
    const onFriendRemoved = (data: { friendshipId: string }) => {
      setFriends((prev) => prev.filter((f) => f.friendshipId !== data.friendshipId));
    };

    socket.on('friendOnline', onFriendOnline);
    socket.on('friendOffline', onFriendOffline);
    socket.on('friendRequestReceived', onRequestReceived);   // ADD
    socket.on('friendRequestAccepted', onRequestAccepted);   // ADD
    socket.on('friendRequestDeclined', onRequestDeclined);   // ADD
    socket.on('friendRemoved', onFriendRemoved);

    return () => {
      socket.off('friendOnline', onFriendOnline);
      socket.off('friendOffline', onFriendOffline);
      socket.off('friendRequestReceived', onRequestReceived);   // ADD
      socket.off('friendRequestAccepted', onRequestAccepted);   // ADD
      socket.off('friendRequestDeclined', onRequestDeclined);   // ADD
      socket.off('friendRemoved', onFriendRemoved);
    };
  }, [socket]);

  const sendRequest = useCallback(async (username: string) => {
    const res = await apiFetch(`/friends/request/${encodeURIComponent(username)}`, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.message || 'Could not send request');
    }
    await refetch();
  }, [refetch]);

  const respondToRequest = useCallback(async (friendshipId: string, action: 'accept' | 'decline') => {
    const res = await apiFetch(`/friends/respond/${friendshipId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) throw new Error('Could not respond to request');
    await refetch();
  }, [refetch]);

  const removeFriend = useCallback(async (friendshipId: string) => {
    const res = await apiFetch(`/friends/${friendshipId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Could not remove friend');
    await refetch();
  }, [refetch]);

  const blockUser = useCallback(async (username: string) => {
    const res = await apiFetch(`/friends/block/${encodeURIComponent(username)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Could not block user');
    await refetch();
  }, [refetch]);

  return {
    friends, incoming, outgoing, loading, error,
    sendRequest, respondToRequest, removeFriend, blockUser, refetch,
  };
}