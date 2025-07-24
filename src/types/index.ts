export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  audioPath?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface VoiceConfig {
  language: string;
  pitch: number;
  rate: number;
  volume: number;
}

export interface DatabaseRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

export interface ChatBotResponse {
  text: string;
  confidence: number;
  source: 'database' | 'api' | 'default';
  relatedTopics?: string[];
}
