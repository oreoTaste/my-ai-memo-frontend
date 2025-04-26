// Define interfaces based on provided API response
export interface Chat {
    createdAt: string;
    insertId: number;
    modifiedAt: string;
    updateId: number;
    chatSeq: number;
    title: string;
    members: ChatMember[];
}

export interface ChatMember {
    createdAt: string;
    insertId: number;
    modifiedAt: string;
    updateId: number;
    chatSeq: number;
    userId: number;
    user: {
      id: number;
      loginId: string;
      name: string;
    };
}

export interface ChatMessage {
    createdAt: string;
    insertId: number;
    modifiedAt: string;
    updateId: number;
    chatSeq: number;
    seq: number;
    message: string;
    user: {
      id: number;
      loginId: string;
      name: string;
    };
  }