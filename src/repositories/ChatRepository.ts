import { BaseRepository } from "./BaseRepository";

/**
 * Chat Entity Row Format (as stored in SQLite)
 */
export interface ChatEntity {
  id: string;
  title: string;
  status: string;
  message_ids_json: string; // JSON array of message IDs
  model_type?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  cloud_sync_id?: string;
  sync_version?: number;
  sync_status?: string;
}

/**
 * Chat Message Entity Row Format (as stored in SQLite)
 */
export interface ChatMessageEntity {
  id: string;
  chat_id: string;
  role: string; // 'user' | 'assistant' | 'system'
  content: string;
  metadata_json?: string;
  created_at: string;
  cloud_sync_id?: string;
  sync_status?: string;
}

/**
 * Repository for Chat entity CRUD operations
 */
export class ChatRepository extends BaseRepository<ChatEntity> {
  constructor(rootDir: string = process.cwd()) {
    super("chats", rootDir);
  }

  mapRowToEntity(row: Record<string, any>): ChatEntity {
    return {
      id: row.id,
      title: row.title,
      status: row.status,
      message_ids_json: row.message_ids_json || "[]",
      model_type: row.model_type,
      owner_id: row.owner_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      cloud_sync_id: row.cloud_sync_id,
      sync_version: row.sync_version,
      sync_status: row.sync_status,
    };
  }

  mapEntityToRow(entity: ChatEntity): Record<string, any> {
    return {
      id: entity.id,
      title: entity.title || "Untitled Chat",
      status: entity.status || "Active",
      message_ids_json: entity.message_ids_json || "[]",
      model_type: entity.model_type || "default",
      owner_id: entity.owner_id || "user_local",
      created_at: entity.created_at || new Date().toISOString(),
      updated_at: entity.updated_at || new Date().toISOString(),
      cloud_sync_id: entity.cloud_sync_id || null,
      sync_version: entity.sync_version || 1,
      sync_status: entity.sync_status || "LOCAL_ONLY",
    };
  }

  save(entity: ChatEntity): ChatEntity {
    const db = this.getDb();
    if (!db) return entity;
    try {
      const row = this.mapEntityToRow(entity);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO chats (id, title, status, message_ids_json, model_type, owner_id, created_at, updated_at, cloud_sync_id, sync_version, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        row.id,
        row.title,
        row.status,
        row.message_ids_json,
        row.model_type,
        row.owner_id,
        row.created_at,
        row.updated_at,
        row.cloud_sync_id,
        row.sync_version,
        row.sync_status,
      );
      db.close();
      return entity;
    } catch {
      try {
        db.close();
      } catch {}
      return entity;
    }
  }

  /**
   * Get message IDs for a specific chat
   */
  getMessageIds(chatId: string): string[] {
    const chat = this.findById(chatId);
    if (!chat) return [];
    try {
      return JSON.parse(chat.message_ids_json);
    } catch {
      return [];
    }
  }

  /**
   * Add a message ID to the chat
   */
  addMessageId(chatId: string, messageId: string): boolean {
    const chat = this.findById(chatId);
    if (!chat) return false;

    const messageIds = this.getMessageIds(chatId);
    if (!messageIds.includes(messageId)) {
      messageIds.push(messageId);
      chat.message_ids_json = JSON.stringify(messageIds);
      chat.updated_at = new Date().toISOString();
      this.save(chat);
    }
    return true;
  }

  /**
   * Remove a message ID from the chat
   */
  removeMessageId(chatId: string, messageId: string): boolean {
    const chat = this.findById(chatId);
    if (!chat) return false;

    const messageIds = this.getMessageIds(chatId);
    const index = messageIds.indexOf(messageId);
    if (index > -1) {
      messageIds.splice(index, 1);
      chat.message_ids_json = JSON.stringify(messageIds);
      chat.updated_at = new Date().toISOString();
      this.save(chat);
    }
    return true;
  }
}

/**
 * Repository for Chat Messages entity CRUD operations
 */
export class ChatMessageRepository extends BaseRepository<ChatMessageEntity> {
  constructor(rootDir: string = process.cwd()) {
    super("chat_messages", rootDir);
  }

  mapRowToEntity(row: Record<string, any>): ChatMessageEntity {
    return {
      id: row.id,
      chat_id: row.chat_id,
      role: row.role,
      content: row.content,
      metadata_json: row.metadata_json,
      created_at: row.created_at,
      cloud_sync_id: row.cloud_sync_id,
      sync_status: row.sync_status,
    };
  }

  mapEntityToRow(entity: ChatMessageEntity): Record<string, any> {
    return {
      id: entity.id,
      chat_id: entity.chat_id,
      role: entity.role || "user",
      content: entity.content || "",
      metadata_json: entity.metadata_json || null,
      created_at: entity.created_at || new Date().toISOString(),
      cloud_sync_id: entity.cloud_sync_id || null,
      sync_status: entity.sync_status || "LOCAL_ONLY",
    };
  }

  save(entity: ChatMessageEntity): ChatMessageEntity {
    const db = this.getDb();
    if (!db) return entity;
    try {
      const row = this.mapEntityToRow(entity);
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO chat_messages (id, chat_id, role, content, metadata_json, created_at, cloud_sync_id, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        row.id,
        row.chat_id,
        row.role,
        row.content,
        row.metadata_json,
        row.created_at,
        row.cloud_sync_id,
        row.sync_status,
      );
      db.close();
      return entity;
    } catch {
      try {
        db.close();
      } catch {}
      return entity;
    }
  }

  /**
   * Find all messages for a specific chat
   */
  findByChatId(chatId: string): ChatMessageEntity[] {
    const db = this.getDb();
    if (!db) return [];
    try {
      const stmt = db.prepare(
        `SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC`,
      );
      const rows = stmt.all(chatId);
      db.close();
      return rows.map((r: any) => this.mapRowToEntity(r));
    } catch {
      try {
        db.close();
      } catch {}
      return [];
    }
  }

  /**
   * Delete all messages for a specific chat
   */
  deleteByChatId(chatId: string): boolean {
    const db = this.getDb();
    if (!db) return false;
    try {
      const stmt = db.prepare(`DELETE FROM chat_messages WHERE chat_id = ?`);
      stmt.run(chatId);
      db.close();
      return true;
    } catch {
      try {
        db.close();
      } catch {}
      return false;
    }
  }
}
