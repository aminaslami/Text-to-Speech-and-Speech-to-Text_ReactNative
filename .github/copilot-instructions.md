# Copilot Instructions for ChatBot App

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a React Native CLI chatbot application with the following features:
- **Voice-to-Text**: Speech recognition using @react-native-voice/voice
- **Text-to-Speech**: Text-to-speech functionality using react-native-tts
- **Database Integration**: Company dataset access via SQLite and API connections
- **Real-time Chat**: Interactive chat interface with message history

## Architecture Guidelines
- Use TypeScript for type safety
- Follow React Native best practices
- Implement proper error handling for voice operations
- Use modular component architecture
- Maintain clean separation between UI, logic, and data layers

## Key Dependencies
- `@react-native-voice/voice` - Speech recognition
- `react-native-tts` - Text-to-speech
- `react-native-sqlite-storage` - Local database
- `axios` - HTTP requests for external API
- `@react-native-async-storage/async-storage` - Local storage

## Coding Standards
- Use functional components with hooks
- Implement proper TypeScript interfaces
- Handle permissions properly for microphone access
- Ensure accessibility support
- Follow React Native performance best practices
