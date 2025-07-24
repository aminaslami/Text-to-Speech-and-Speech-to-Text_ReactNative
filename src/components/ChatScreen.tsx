import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Message, ChatSession } from '../types';
import ChatBotService from '../services/ChatBotService';
import VoiceService from '../services/VoiceService';
import { formatMessageTime, validateMessage } from '../utils/helpers';

interface ChatScreenProps {
  sessionId?: string;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  
  const flatListRef = useRef<FlatList<Message>>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const sendWelcomeMessage = async () => {
      const welcomeText = "Hello! I'm your AI assistant. I can help you with company information, answer questions, and I support both text and voice input. How can I assist you today?";
      await ChatBotService.sendMessage(welcomeText, false);
      updateMessages();
    };

    const initializeChat = async () => {
      try {
        setIsLoading(true);
        await ChatBotService.initialize();

        if (sessionId) {
          const session = await ChatBotService.loadSession(sessionId);
          if (session) {
            setCurrentSession(session);
            setMessages(session.messages);
          }
        } else {
          const newSession = await ChatBotService.createNewSession();
          setCurrentSession(newSession);
          setMessages([]);
          
          // Send welcome message
          setTimeout(() => {
            sendWelcomeMessage();
          }, 500);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        Alert.alert('Error', 'Failed to initialize chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();
    return () => {
      // Cleanup
      VoiceService.stopListening();
      VoiceService.stopSpeaking();
    };
  }, [sessionId]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const updateMessages = () => {
    const session = ChatBotService.getCurrentSession();
    if (session) {
      setMessages([...session.messages]);
      setCurrentSession(session);
    }
  };

  const sendMessage = async () => {
    const validation = validateMessage(inputText);
    if (!validation.isValid) {
      Alert.alert('Invalid Message', validation.error);
      return;
    }

    try {
      setIsLoading(true);
      await ChatBotService.sendMessage(inputText.trim(), true);
      setInputText('');
      updateMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = async () => {
    try {
      setIsListening(true);
      const voiceText = await ChatBotService.handleVoiceInput();
      setInputText(voiceText);
    } catch (error) {
      console.error('Voice input failed:', error);
      Alert.alert('Voice Input Error', 'Failed to process voice input. Please try again.');
    } finally {
      setIsListening(false);
    }
  };

  const stopVoiceInput = async () => {
    try {
      await ChatBotService.stopVoiceInput();
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop voice input:', error);
    }
  };

  const speakMessage = async (text: string) => {
    try {
      setIsSpeaking(true);
      await ChatBotService.speakMessage(text);
    } catch (error) {
      console.error('Failed to speak message:', error);
      Alert.alert('Speech Error', 'Failed to play speech. Please try again.');
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = async () => {
    try {
      await ChatBotService.stopSpeaking();
      setIsSpeaking(false);
    } catch (error) {
      console.error('Failed to stop speaking:', error);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.isUser ? styles.userMessage : styles.botMessage
    ]}>
      <View style={[
        styles.messageBubble,
        item.isUser ? styles.userBubble : styles.botBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.isUser ? styles.userText : styles.botText
        ]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.messageTime}>
            {formatMessageTime(item.timestamp)}
          </Text>
          {!item.isUser && (
            <TouchableOpacity
              style={styles.speakButton}
              onPress={() => speakMessage(item.text)}
              disabled={isSpeaking}
            >
              <Text style={styles.speakButtonText}>🔊</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing chat...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {currentSession?.title || 'ChatBot'}
        </Text>
        {isSpeaking && (
          <TouchableOpacity onPress={stopSpeaking} style={styles.stopSpeakButton}>
            <Text style={styles.stopSpeakText}>Stop 🔇</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message or use voice input..."
            multiline
            maxLength={1000}
            editable={!isListening}
          />
          
          <TouchableOpacity
            style={[styles.voiceButton, isListening && styles.listeningButton]}
            onPress={isListening ? stopVoiceInput : startVoiceInput}
            disabled={isLoading}
          >
            <Text style={styles.voiceButtonText}>
              {isListening ? '🔴' : '🎤'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading || isListening}
          >
            <Text style={styles.sendButtonText}>
              {isLoading ? '⏳' : '➤'}
            </Text>
          </TouchableOpacity>
        </View>

        {isListening && (
          <View style={styles.listeningIndicator}>
            <ActivityIndicator size="small" color="#FF3B30" />
            <Text style={styles.listeningText}>Listening...</Text>
          </View>
        )}

        {ChatBotService.getIsProcessing() && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.typingText}>AI is typing...</Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  stopSpeakButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stopSpeakText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#8E8E93',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#007AFF',
  },
  botBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E1E1E6',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#000000',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  speakButton: {
    padding: 4,
  },
  speakButtonText: {
    fontSize: 16,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E1E1E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E1E6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 8,
    backgroundColor: '#F8F8F8',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  listeningButton: {
    backgroundColor: '#FF3B30',
  },
  voiceButtonText: {
    fontSize: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  listeningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  typingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
  },
});

export default ChatScreen;
