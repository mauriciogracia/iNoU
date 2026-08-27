import { BaseRepository } from "./BaseRepository";

/**
 * Chat Entity Row Format (as stored in SQLite)
 */
export interface ChatEntity {
  id: string;
  title: string;
  status: string;
  message_ids_json: string; // JSON array of message IDs
  provider_id?: string;
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
      provider_id: row.provider_id || "ollama",
      model_type: row.model_type || "default",
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
      provider_id: entity.provider_id || "ollama",
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
        INSERT INTO chats (id, title, status, message_ids_json, provider_id, model_type, owner_id, created_at, updated_at, cloud_sync_id, sync_version, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          status = excluded.status,
          message_ids_json = excluded.message_ids_json,
          provider_id = excluded.provider_id,
          model_type = excluded.model_type,
          owner_id = excluded.owner_id,
          updated_at = excluded.updated_at,
          cloud_sync_id = excluded.cloud_sync_id,
          sync_version = excluded.sync_version,
          sync_status = excluded.sync_status
      `);
      stmt.run(
        row.id,
        row.title,
        row.status,
        row.message_ids_json,
        row.provider_id,
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
   * Updates the active LLM engine for a specific chat
   */
  setChatEngine(chatId: string, providerId: string, modelType?: string): boolean {
    const chat = this.findById(chatId);
    if (!chat) return false;
    chat.provider_id = providerId;
    if (modelType) {
      chat.model_type = modelType;
    }
    chat.updated_at = new Date().toISOString();
    this.save(chat);
    return true;
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
        INSERT INTO chat_messages (id, chat_id, role, content, metadata_json, created_at, cloud_sync_id, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          role = excluded.role,
          content = excluded.content,
          metadata_json = excluded.metadata_json,
          created_at = excluded.created_at,
          cloud_sync_id = excluded.cloud_sync_id,
          sync_status = excluded.sync_status
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

/**
 * Persists a chat message and updates the parent chat's updated_at and message count
 */
export function recordChatMessage(
  chatId: string,
  role: string,
  content: string,
  metadataOrRootDir?: Record<string, any> | string,
  optionalRootDir?: string,
): ChatMessageEntity | null {
  let metadata: Record<string, any> | undefined;
  let rootDir: string;

  if (typeof metadataOrRootDir === "string") {
    rootDir = metadataOrRootDir;
    metadata = undefined;
  } else {
    metadata = metadataOrRootDir;
    rootDir = optionalRootDir || process.cwd();
  }

  try {
    const chatRepo = new ChatRepository(rootDir);
    let chat = chatRepo.findById(chatId);
    const now = new Date().toISOString();
    if (!chat) {
      chat = chatRepo.save({
        id: chatId,
        title: "Chat Principal",
        status: "Active",
        message_ids_json: "[]",
        provider_id: metadata?.providerId || "ollama",
        model_type: metadata?.model || "default",
        created_at: now,
        updated_at: now,
        sync_status: "LOCAL_ONLY",
        sync_version: 1,
      });
    }

    const msgRepo = new ChatMessageRepository(rootDir);
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const msg = msgRepo.save({
      id: msgId,
      chat_id: chatId,
      role,
      content,
      metadata_json: metadata ? JSON.stringify(metadata) : undefined,
      created_at: now,
      sync_status: "LOCAL_ONLY",
    });

    chatRepo.addMessageId(chatId, msgId);
    return msg;
  } catch {
    return null;
  }
}
