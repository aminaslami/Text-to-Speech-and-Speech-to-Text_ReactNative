import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import Tts from 'react-native-tts';
import { VoiceConfig } from '../types';
import { PermissionsAndroid, Platform } from 'react-native';

class VoiceService {
  private isListening = false;
  private onSpeechResult?: (text: string) => void;
  private onSpeechError?: (error: string) => void;

  constructor() {
    this.initializeVoice();
    this.initializeTts();
  }

  private initializeVoice(): void {
    Voice.onSpeechStart = this.onSpeechStart;
    Voice.onSpeechResults = this.onSpeechResults;
    Voice.onSpeechError = this.onSpeechError;
    Voice.onSpeechEnd = this.onSpeechEnd;
  }

  private initializeTts(): void {
    Tts.setDefaultLanguage('en-US');
    Tts.setDefaultRate(0.5);
    Tts.setDefaultPitch(1.0);
  }

  private onSpeechStart = (): void => {
    console.log('Speech recognition started');
  };

  private onSpeechResults = (event: SpeechResultsEvent): void => {
    const text = event.value?.[0] || '';
    if (text && this.onSpeechResult) {
      this.onSpeechResult(text);
    }
  };

  private onSpeechError = (event: SpeechErrorEvent): void => {
    console.error('Speech recognition error:', event.error);
    if (this.onSpeechError) {
      this.onSpeechError(event.error?.message || 'Speech recognition failed');
    }
  };

  private onSpeechEnd = (): void => {
    this.isListening = false;
    console.log('Speech recognition ended');
  };

  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to recognize speech.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (error) {
        console.error('Permission request failed:', error);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  }

  async startListening(
    onResult: (text: string) => void,
    onError: (error: string) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        onError('Microphone permission denied');
        return false;
      }

      if (this.isListening) {
        await this.stopListening();
      }

      this.onSpeechResult = onResult;
      this.onSpeechError = onError;

      await Voice.start('en-US');
      this.isListening = true;
      return true;
    } catch (error) {
      console.error('Failed to start voice recognition:', error);
      onError('Failed to start voice recognition');
      return false;
    }
  }

  async stopListening(): Promise<void> {
    try {
      await Voice.stop();
      this.isListening = false;
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
    }
  }

  async speak(text: string, config?: Partial<VoiceConfig>): Promise<void> {
    try {
      if (config?.language) {
        Tts.setDefaultLanguage(config.language);
      }
      if (config?.rate) {
        Tts.setDefaultRate(config.rate);
      }
      if (config?.pitch) {
        Tts.setDefaultPitch(config.pitch);
      }

      await Tts.speak(text);
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      throw error;
    }
  }

  async stopSpeaking(): Promise<void> {
    try {
      await Tts.stop();
    } catch (error) {
      console.error('Failed to stop text-to-speech:', error);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  async getAvailableLanguages(): Promise<string[]> {
    try {
      return await Tts.voices();
    } catch (error) {
      console.error('Failed to get available languages:', error);
      return ['en-US'];
    }
  }

  async destroy(): Promise<void> {
    try {
      await Voice.destroy();
      await Tts.stop();
    } catch (error) {
      console.error('Failed to destroy voice service:', error);
    }
  }
}

export default new VoiceService();
