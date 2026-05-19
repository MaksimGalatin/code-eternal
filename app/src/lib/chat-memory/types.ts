export interface ChatLogMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatFilePayload {
  version: 1;
  wallet: string;
  sessionId: string;
  chunkIndex: number;
  prevTxId: string | null;
  metadata: {
    summary: string;
    keyFacts: string[];
  };
  messages: ChatLogMessage[];
}

export interface ChatSessionMeta {
  txId: string;
  sessionId: string;
  title: string;
  summary: string;
  msgCount: number;
  createdAt: string;
}
