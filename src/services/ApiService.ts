import axios, { AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, ChatBotResponse } from '../types';
import NetInfo from '@react-native-community/netinfo';

class ApiService {
  private baseURL: string;
  private timeout: number;

  constructor() {
    // Replace with your actual API endpoint
    this.baseURL = 'https://api.yourcompany.com/v1';
    this.timeout = 10000; // 10 seconds
  }

  private async checkNetworkConnection(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  private handleApiError(error: AxiosError): ApiResponse {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        error: `Server error: ${error.response.status}`,
        message: error.response.data?.message || 'Server error occurred',
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        error: 'Network error',
        message: 'Unable to connect to server. Please check your internet connection.',
      };
    } else {
      // Other error
      return {
        success: false,
        error: 'Request failed',
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  async searchCompanyData(query: string): Promise<ApiResponse> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection',
          message: 'Please check your internet connection and try again.',
        };
      }

      const response: AxiosResponse = await axios.get(
        `${this.baseURL}/search`,
        {
          params: { q: query, limit: 10 },
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            // Add authentication headers if needed
            // 'Authorization': `Bearer ${token}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data retrieved successfully',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async getChatbotResponse(message: string, context?: string[]): Promise<ApiResponse> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection',
          message: 'Please check your internet connection and try again.',
        };
      }

      const response: AxiosResponse = await axios.post(
        `${this.baseURL}/chatbot`,
        {
          message,
          context: context || [],
          timestamp: new Date().toISOString(),
        },
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            // Add authentication headers if needed
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Response generated successfully',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async uploadAudioFile(audioPath: string): Promise<ApiResponse> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection',
          message: 'Please check your internet connection and try again.',
        };
      }

      const formData = new FormData();
      formData.append('audio', {
        uri: audioPath,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const response: AxiosResponse = await axios.post(
        `${this.baseURL}/audio/upload`,
        formData,
        {
          timeout: 30000, // 30 seconds for file upload
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Audio uploaded successfully',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async getCompanyDataCategories(): Promise<ApiResponse> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection',
          message: 'Please check your internet connection and try again.',
        };
      }

      const response: AxiosResponse = await axios.get(
        `${this.baseURL}/categories`,
        {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Categories retrieved successfully',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  async syncLocalData(lastSyncTimestamp?: string): Promise<ApiResponse> {
    try {
      const isConnected = await this.checkNetworkConnection();
      if (!isConnected) {
        return {
          success: false,
          error: 'No internet connection',
          message: 'Please check your internet connection and try again.',
        };
      }

      const params: any = {};
      if (lastSyncTimestamp) {
        params.since = lastSyncTimestamp;
      }

      const response: AxiosResponse = await axios.get(
        `${this.baseURL}/sync`,
        {
          params,
          timeout: 30000, // 30 seconds for sync
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        data: response.data,
        message: 'Data synchronized successfully',
      };
    } catch (error) {
      return this.handleApiError(error as AxiosError);
    }
  }

  // Mock response generator for offline usage
  generateMockResponse(message: string): ChatBotResponse {
    const lowercaseMessage = message.toLowerCase();
    
    if (lowercaseMessage.includes('hello') || lowercaseMessage.includes('hi')) {
      return {
        text: 'Hello! How can I help you today? I can assist you with company information and answer your questions.',
        confidence: 0.9,
        source: 'default',
        relatedTopics: ['greeting', 'help', 'assistance'],
      };
    }
    
    if (lowercaseMessage.includes('help')) {
      return {
        text: 'I can help you with:\n• Company information and policies\n• Product details\n• General inquiries\n• Voice commands\n\nJust ask me anything or use voice input!',
        confidence: 0.8,
        source: 'default',
        relatedTopics: ['help', 'features', 'voice'],
      };
    }
    
    if (lowercaseMessage.includes('thank')) {
      return {
        text: 'You\'re welcome! Is there anything else I can help you with?',
        confidence: 0.9,
        source: 'default',
        relatedTopics: ['thanks', 'assistance'],
      };
    }
    
    return {
      text: 'I understand you\'re asking about: "' + message + '". Let me search our database for relevant information. If you need immediate assistance, please try rephrasing your question.',
      confidence: 0.5,
      source: 'default',
      relatedTopics: ['search', 'information'],
    };
  }

  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}

export default new ApiService();
