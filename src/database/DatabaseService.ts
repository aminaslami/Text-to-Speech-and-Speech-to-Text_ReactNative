import SQLite from 'react-native-sqlite-storage';
import { DatabaseRecord, ChatSession, Message } from '../types';

// Enable promise for SQLite
SQLite.enablePromise(true);

class DatabaseService {
  private database: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.database = await SQLite.openDatabase({
        name: 'ChatBotDB.db',
        location: 'default',
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const createCompanyDataTable = `
      CREATE TABLE IF NOT EXISTS company_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        keywords TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createChatSessionsTable = `
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        text TEXT NOT NULL,
        is_user INTEGER NOT NULL,
        audio_path TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions (id)
      );
    `;

    await this.database.executeSql(createCompanyDataTable);
    await this.database.executeSql(createChatSessionsTable);
    await this.database.executeSql(createMessagesTable);
  }

  async insertCompanyData(records: Omit<DatabaseRecord, 'id'>[]): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    for (const record of records) {
      const insertQuery = `
        INSERT INTO company_data (title, content, category, keywords, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.database.executeSql(insertQuery, [
        record.title,
        record.content,
        record.category,
        JSON.stringify(record.keywords),
        record.createdAt,
        record.updatedAt,
      ]);
    }
  }

  async searchCompanyData(query: string): Promise<DatabaseRecord[]> {
    if (!this.database) throw new Error('Database not initialized');

    const searchQuery = `
      SELECT * FROM company_data 
      WHERE title LIKE ? OR content LIKE ? OR keywords LIKE ?
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    const searchTerm = `%${query}%`;
    const [results] = await this.database.executeSql(searchQuery, [
      searchTerm,
      searchTerm,
      searchTerm,
    ]);

    const records: DatabaseRecord[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      records.push({
        id: row.id,
        title: row.title,
        content: row.content,
        category: row.category,
        keywords: JSON.parse(row.keywords || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }

    return records;
  }

  async saveChatSession(session: ChatSession): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const insertSessionQuery = `
      INSERT OR REPLACE INTO chat_sessions (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `;

    await this.database.executeSql(insertSessionQuery, [
      session.id,
      session.title,
      session.createdAt.toISOString(),
      session.updatedAt.toISOString(),
    ]);

    // Save messages
    for (const message of session.messages) {
      await this.saveMessage(session.id, message);
    }
  }

  async saveMessage(sessionId: string, message: Message): Promise<void> {
    if (!this.database) throw new Error('Database not initialized');

    const insertMessageQuery = `
      INSERT OR REPLACE INTO messages (id, session_id, text, is_user, audio_path, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await this.database.executeSql(insertMessageQuery, [
      message.id,
      sessionId,
      message.text,
      message.isUser ? 1 : 0,
      message.audioPath || null,
      message.timestamp.toISOString(),
    ]);
  }

  async getChatSessions(): Promise<ChatSession[]> {
    if (!this.database) throw new Error('Database not initialized');

    const [results] = await this.database.executeSql(
      'SELECT * FROM chat_sessions ORDER BY updated_at DESC'
    );

    const sessions: ChatSession[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      const messages = await this.getSessionMessages(row.id);
      
      sessions.push({
        id: row.id,
        title: row.title,
        messages,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      });
    }

    return sessions;
  }

  async getSessionMessages(sessionId: string): Promise<Message[]> {
    if (!this.database) throw new Error('Database not initialized');

    const [results] = await this.database.executeSql(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );

    const messages: Message[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      messages.push({
        id: row.id,
        text: row.text,
        isUser: row.is_user === 1,
        timestamp: new Date(row.timestamp),
        audioPath: row.audio_path,
      });
    }

    return messages;
  }

  async closeDatabase(): Promise<void> {
    if (this.database) {
      await this.database.close();
      this.database = null;
    }
  }
}

export default new DatabaseService();
