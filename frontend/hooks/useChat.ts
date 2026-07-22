'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import type { ChatMessage } from '@/types/chat';

export function useChat(myUserId: string | undefined) {
  const socket = useSocket();
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});

  useEffect(() => {
    if (!socket || !myUserId) return;

    const onHistory = (data: { friendId: string; messages: ChatMessage[] }) => {
      setConversations((prev) => ({ ...prev, [data.friendId]: data.messages }));
    };
    const onMessage = (msg: ChatMessage) => {
      const friendId = msg.senderId === myUserId ? msg.receiverId : msg.senderId;
      setConversations((prev) => ({ ...prev, [friendId]: [...(prev[friendId] ?? []), msg] }));
    };

    socket.on('chatHistory', onHistory);
    socket.on('chatMessageReceived', onMessage);
    return () => {
      socket.off('chatHistory', onHistory);
      socket.off('chatMessageReceived', onMessage);
    };
  }, [socket, myUserId]);

  const loadHistory = useCallback((friendId: string) => socket?.emit('getChatHistory', { friendId }), [socket]);
  const sendMessage = useCallback((friendId: string, text: string) => {
    if (!socket || !text.trim()) return;
    socket.emit('sendChatMessage', { receiverId: friendId, text: text.trim() });
  }, [socket]);

  return { conversations, loadHistory, sendMessage };
}