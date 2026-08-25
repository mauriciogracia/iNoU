import { ServerResponse } from "http";
import { BaseController } from "./BaseController";
import { ChatRepository, ChatMessageRepository, ChatEntity, ChatMessageEntity } from "../../repositories/ChatRepository";
import { getProjectPaths, loadState, saveState } from "../../cli/context";

export class ChatController extends BaseController {
  private chatRepo: ChatRepository;
  private messageRepo: ChatMessageRepository;
  private rootDir: string;

  constructor(rootDir: string = process.cwd()) {
    super();
    this.rootDir = rootDir;
    this.chatRepo = new ChatRepository(rootDir);
    this.messageRepo = new ChatMessageRepository(rootDir);
  }

  public getAll(res: ServerResponse): void {
    const chats = this.chatRepo.findAll();
    const paths = getProjectPaths(this.rootDir);
    const state = loadState(paths.statePath);
    const activeChatId = state.activeChat || (chats.length > 0 ? chats[0].id : null);

    const mapped = chats.map((c) => ({
      ...c,
      isActive: c.id === activeChatId,
      messageCount: this.chatRepo.getMessageIds(c.id).length,
    }));

    // Sort active first, then most recent updated_at
    mapped.sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    this.sendJson(res, 200, { chats: mapped, activeChatId });
  }

  public create(body: any, res: ServerResponse): void {
    const id = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const title = (body?.title || "").trim() || `Chat ${new Date().toLocaleDateString()}`;
    const now = new Date().toISOString();

    const entity: ChatEntity = {
      id,
      title,
      status: "Active",
      message_ids_json: "[]",
      model_type: body?.modelType || "default",
      owner_id: body?.ownerId || "user_local",
      created_at: now,
      updated_at: now,
      sync_status: "LOCAL_ONLY",
      sync_version: 1,
    };

    const created = this.chatRepo.save(entity);

    // Set as active
    const paths = getProjectPaths(this.rootDir);
    const state = loadState(paths.statePath);
    state.activeChat = id;
    saveState(paths.statePath, state);

    this.sendJson(res, 201, { chat: created, activeChatId: id });
  }

  public activate(chatId: string, res: ServerResponse): void {
    const chat = this.chatRepo.findById(chatId);
    if (!chat) {
      this.sendJson(res, 404, { error: `Chat "${chatId}" not found.` });
      return;
    }

    const paths = getProjectPaths(this.rootDir);
    const state = loadState(paths.statePath);
    state.activeChat = chatId;
    saveState(paths.statePath, state);

    this.sendJson(res, 200, { status: "activated", activeChatId: chatId, chat });
  }

  public merge(body: any, res: ServerResponse): void {
    const chatIds: string[] = body?.chatIds || [];
    if (!Array.isArray(chatIds) || chatIds.length < 2) {
      this.sendJson(res, 400, { error: "At least 2 chat IDs are required to merge." });
      return;
    }

    const sourceChats: ChatEntity[] = [];
    const allMessages: ChatMessageEntity[] = [];

    for (const cid of chatIds) {
      const c = this.chatRepo.findById(cid);
      if (c) {
        sourceChats.push(c);
        const msgs = this.messageRepo.findByChatId(cid);
        allMessages.push(...msgs);
      }
    }

    if (sourceChats.length < 2) {
      this.sendJson(res, 400, { error: "Could not find at least 2 valid source chats." });
      return;
    }

    // Chronological sort
    allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const newChatId = `chat_merged_${Date.now()}`;
    const newTitle = (body?.title || "").trim() || `Merge of ${sourceChats.map((c) => c.title).join(" + ")}`;
    const now = new Date().toISOString();

    const mergedMessageIds: string[] = [];
    for (const m of allMessages) {
      const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.messageRepo.save({
        ...m,
        id: newMsgId,
        chat_id: newChatId,
      });
      mergedMessageIds.push(newMsgId);
    }

    const newChat: ChatEntity = {
      id: newChatId,
      title: newTitle,
      status: "Active",
      message_ids_json: JSON.stringify(mergedMessageIds),
      model_type: sourceChats[0].model_type || "default",
      owner_id: sourceChats[0].owner_id || "user_local",
      created_at: now,
      updated_at: now,
      sync_status: "LOCAL_ONLY",
      sync_version: 1,
    };

    this.chatRepo.save(newChat);

    if (body?.deleteSources === true) {
      for (const sc of sourceChats) {
        this.messageRepo.deleteByChatId(sc.id);
        this.chatRepo.delete(sc.id);
      }
    } else {
      for (const sc of sourceChats) {
        sc.status = "Archived";
        sc.updated_at = now;
        this.chatRepo.save(sc);
      }
    }

    // Set merged chat as active
    const paths = getProjectPaths(this.rootDir);
    const state = loadState(paths.statePath);
    state.activeChat = newChatId;
    saveState(paths.statePath, state);

    this.sendJson(res, 201, {
      status: "merged",
      chat: newChat,
      activeChatId: newChatId,
      mergedMessagesCount: allMessages.length,
    });
  }

  public delete(chatId: string, res: ServerResponse): void {
    const chat = this.chatRepo.findById(chatId);
    if (!chat) {
      this.sendJson(res, 404, { error: `Chat "${chatId}" not found.` });
      return;
    }

    this.messageRepo.deleteByChatId(chatId);
    this.chatRepo.delete(chatId);

    const paths = getProjectPaths(this.rootDir);
    const state = loadState(paths.statePath);
    if (state.activeChat === chatId) {
      const remaining = this.chatRepo.findAll();
      state.activeChat = remaining.length > 0 ? remaining[0].id : undefined;
      saveState(paths.statePath, state);
    }

    this.sendJson(res, 200, { status: "deleted", chatId });
  }
}
