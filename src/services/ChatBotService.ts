import { Message, ChatSession, ChatBotResponse } from '../types';
import DatabaseService from '../database/DatabaseService';
import VoiceService from './VoiceService';
import ApiService from './ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ChatBotService {
  private currentSession: ChatSession | null = null;
  private isProcessing = false;

  async initialize(): Promise<void> {
    try {
      await DatabaseService.initDatabase();
      await this.loadSampleData();
      console.log('ChatBot service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ChatBot service:', error);
      throw error;
    }
  }

  private async loadSampleData(): Promise<void> {
    try {
      // Check if sample data already exists
      const hasData = await AsyncStorage.getItem('sampleDataLoaded');
      if (hasData) return;

      // Sample company data - replace with your actual data
      const sampleData = [
        {
          title: 'Company Overview',
          content: 'Our company is a leading technology firm specializing in AI solutions, mobile app development, and cloud services. Founded in 2015, we serve clients worldwide.',
          category: 'company-info',
          keywords: ['company', 'overview', 'technology', 'AI', 'mobile', 'cloud'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: 'Product Catalog',
          content: 'We offer a comprehensive suite of products including mobile applications, web platforms, AI chatbots, and custom software solutions.',
          category: 'products',
          keywords: ['products', 'mobile', 'web', 'chatbot', 'software'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: 'Support Policy',
          content: 'Our support team is available 24/7 to assist customers. We provide email, phone, and chat support with response times under 2 hours.',
          category: 'support',
          keywords: ['support', 'help', 'customer service', '24/7', 'response time'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          title: 'Privacy Policy',
          content: 'We respect your privacy and protect your personal data according to GDPR and other applicable regulations. Your data is encrypted and secure.',
          category: 'legal',
          keywords: ['privacy', 'data protection', 'GDPR', 'security', 'encryption'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      await DatabaseService.insertCompanyData(sampleData);
      await AsyncStorage.setItem('sampleDataLoaded', 'true');
      console.log('Sample data loaded successfully');
    } catch (error) {
      console.error('Failed to load sample data:', error);
    }
  }

  async createNewSession(title?: string): Promise<ChatSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    this.currentSession = {
      id: sessionId,
      title: title || `Chat ${now.toLocaleDateString()}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    await DatabaseService.saveChatSession(this.currentSession);
    return this.currentSession;
  }

  async loadSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const sessions = await DatabaseService.getChatSessions();
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        this.currentSession = session;
        return session;
      }
      return null;
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  async sendMessage(text: string, isUser: boolean = true): Promise<Message> {
    if (!this.currentSession) {
      await this.createNewSession();
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const message: Message = {
      id: messageId,
      text,
      isUser,
      timestamp: new Date(),
    };

    this.currentSession!.messages.push(message);
    this.currentSession!.updatedAt = new Date();

    await DatabaseService.saveMessage(this.currentSession!.id, message);
    await DatabaseService.saveChatSession(this.currentSession!);

    // If user message, generate bot response
    if (isUser && !this.isProcessing) {
      setTimeout(() => this.generateResponse(text), 500);
    }

    return message;
  }

  private async generateResponse(userMessage: string): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let response: ChatBotResponse;

      // First, search local database
      const localResults = await DatabaseService.searchCompanyData(userMessage);
      
      if (localResults.length > 0) {
        // Use local data
        const bestMatch = localResults[0];
        response = {
          text: bestMatch.content,
          confidence: 0.8,
          source: 'database',
          relatedTopics: bestMatch.keywords,
        };
      } else {
        // Try API
        const apiResponse = await ApiService.getChatbotResponse(userMessage);
        
        if (apiResponse.success && apiResponse.data) {
          response = apiResponse.data;
        } else {
          // Fallback to mock response
          response = ApiService.generateMockResponse(userMessage);
        }
      }

      // Send bot response
      await this.sendMessage(response.text, false);

    } catch (error) {
      console.error('Failed to generate response:', error);
      await this.sendMessage(
        'I apologize, but I encountered an error while processing your request. Please try again.',
        false
      );
    } finally {
      this.isProcessing = false;
    }
  }

  async handleVoiceInput(): Promise<string> {
    return new Promise((resolve, reject) => {
      VoiceService.startListening(
        (text: string) => {
          console.log('Voice input received:', text);
          resolve(text);
        },
        (error: string) => {
          console.error('Voice input error:', error);
          reject(new Error(error));
        }
      );
    });
  }

  async speakMessage(text: string): Promise<void> {
    try {
      await VoiceService.speak(text);
    } catch (error) {
      console.error('Failed to speak message:', error);
      throw error;
    }
  }

  async stopVoiceInput(): Promise<void> {
    await VoiceService.stopListening();
  }

  async stopSpeaking(): Promise<void> {
    await VoiceService.stopSpeaking();
  }

  getCurrentSession(): ChatSession | null {
    return this.currentSession;
  }

  async getAllSessions(): Promise<ChatSession[]> {
    return await DatabaseService.getChatSessions();
  }

  async deleteSession(sessionId: string): Promise<void> {
    // Implementation for deleting session would go here
    // For now, we'll just clear it from current session if it matches
    if (this.currentSession?.id === sessionId) {
      this.currentSession = null;
    }
  }

  async exportChatHistory(): Promise<string> {
    try {
      const sessions = await this.getAllSessions();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalSessions: sessions.length,
        sessions: sessions.map(session => ({
          id: session.id,
          title: session.title,
          messageCount: session.messages.length,
          createdAt: session.createdAt,
          messages: session.messages,
        })),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export chat history:', error);
      throw error;
    }
  }

  async syncWithServer(): Promise<boolean> {
    try {
      const lastSync = await AsyncStorage.getItem('lastSyncTimestamp');
      const syncResponse = await ApiService.syncLocalData(lastSync || undefined);
      
      if (syncResponse.success && syncResponse.data) {
        // Update local database with new data
        if (syncResponse.data.records) {
          await DatabaseService.insertCompanyData(syncResponse.data.records);
        }
        
        await AsyncStorage.setItem('lastSyncTimestamp', new Date().toISOString());
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to sync with server:', error);
      return false;
    }
  }

  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  async cleanup(): Promise<void> {
    try {
      await VoiceService.destroy();
      await DatabaseService.closeDatabase();
      this.currentSession = null;
      this.isProcessing = false;
    } catch (error) {
      console.error('Failed to cleanup ChatBot service:', error);
    }
  }
}

export default new ChatBotService();
