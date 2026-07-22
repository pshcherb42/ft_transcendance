// types/friend.ts
export interface FriendUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface Friend extends FriendUser {
  friendshipId: string;
  online: boolean;
}

export interface PendingIncoming {
  id: string;
  sender: FriendUser;
  createdAt: string;
}

export interface PendingOutgoing {
  id: string;
  receiver: FriendUser;
  createdAt: string;
}