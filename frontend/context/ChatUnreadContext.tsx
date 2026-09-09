'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { ChatMessage } from '@/types/chat';

const STORAGE_KEY = 'chat-unread';
// this will store user and sender messages like { "uuid-of-Bob": 3 } = 3 unread messages from Bob
type UnreadMap = Record<string, number>;

interface ChatUnreadValue {
  unread: UnreadMap;
  totalUnread: number;
  markRead: (friendId: string) => void;
  setActiveConversation: (friendId: string | null) => void;
}

const ChatUnreadContext = createContext<ChatUnreadValue>({
  unread: {},
  totalUnread: 0,
  markRead: () => {},
  setActiveConversation: () => {},
});

function loadInitial(): UnreadMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UnreadMap) : {};
  } catch {
    return {};
  }
}

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user } = useAuth();
  const myId = user?.id;

  const [unread, setUnread] = useState<UnreadMap>(loadInitial);

  const activeConvRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(unread));
    } catch {
      //ignore
    }
  }, [unread]);

  const markRead = useCallback((friendId: string) => {
    setUnread((prev) => {
      if (!prev[friendId]) return prev;
      const next = { ...prev };
      delete next[friendId];
      return next;
    });
  }, []);

  const setActiveConversation = useCallback(
    (friendId: string | null) => {
      activeConvRef.current = friendId;
      if (friendId) markRead(friendId);
    },
    [markRead],
  );

  useEffect(() => {
    if (!socket || !myId) return;

    const onMessage = (msg: ChatMessage) => {
      if (msg.senderId === myId) return;
      if (msg.senderId === activeConvRef.current) return;
      setUnread((prev) => ({
        ...prev,
        [msg.senderId]: (prev[msg.senderId] ?? 0) + 1,
      }));
    };

    socket.on('chatMessageReceived', onMessage);
    return () => {
      socket.off('chatMessageReceived', onMessage);
    };
  }, [socket, myId]);

  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <ChatUnreadContext.Provider
      value={{ unread, totalUnread, markRead, setActiveConversation }}
    >
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread(): ChatUnreadValue {
  return useContext(ChatUnreadContext);
}
