export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername?: string | null;
  receiverId: string;
  text: string;
  timestamp: number;
}
