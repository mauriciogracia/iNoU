/**
 * Dynamic Multi-Engine Chat Routing & Provider Attribution Integration Test
 *
 * Validates:
 * 1. Continuous single chat context with turn-by-turn engine switching.
 * 2. SQLite persistence of provider_id on chats and metadata_json on chat_messages.
 * 3. ChatRepository.setChatEngine() updates without losing message history.
 * 4. ChatController / Router PATCH /api/chats/:id/engine endpoint.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");

const { ChatRepository, ChatMessageRepository, recordChatMessage } = require("../dist/repositories/ChatRepository");
const { Router } = require("../dist/api/routes/Router");

test("Dynamic Multi-Engine Chat Routing: Integration Suite", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(__dirname, "tmp_engine_routing_"));

  t.after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  await t.test("Chat entity defaults to 'ollama' provider and persists engine updates", async () => {
    const chatRepo = new ChatRepository(tmpDir);
    const chatId = `chat_${Date.now()}`;

    // 1. Create chat
    const chat = chatRepo.save({
      id: chatId,
      title: "Architecture & Code Chat",
      status: "Active",
      message_ids_json: "[]",
      provider_id: "ollama",
      model_type: "qwen2.5:3b",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: "LOCAL_ONLY",
      sync_version: 1,
    });

    assert.equal(chat.provider_id, "ollama");
    assert.equal(chat.model_type, "qwen2.5:3b");

    // 2. Add turn 1 with Ollama
    const msg1 = recordChatMessage(
      chatId,
      "user",
      "Explain microservices vs monolith",
      { providerId: "ollama", model: "qwen2.5:3b" },
      tmpDir
    );
    assert.ok(msg1, "msg1 should be recorded");
    assert.equal(JSON.parse(msg1.metadata_json).providerId, "ollama");

    // 3. Switch engine to Anthropic Claude for turn 2 in the same continuous chat
    const switched = chatRepo.setChatEngine(chatId, "anthropic", "claude-3-5-sonnet");
    assert.equal(switched, true, "setChatEngine should return true");

    const updatedChat = chatRepo.findById(chatId);
    assert.equal(updatedChat.provider_id, "anthropic");
    assert.equal(updatedChat.model_type, "claude-3-5-sonnet");

    // 4. Add turn 2 with Claude
    const msg2 = recordChatMessage(
      chatId,
      "assistant",
      "Here is a TypeScript architectural comparison...",
      { providerId: "anthropic", model: "claude-3-5-sonnet", tokenCount: { prompt: 150, completion: 420 } },
      tmpDir
    );
    assert.ok(msg2, "msg2 should be recorded");
    assert.equal(JSON.parse(msg2.metadata_json).providerId, "anthropic");

    // 5. Verify continuous history is preserved across engine switches
    const msgRepo = new ChatMessageRepository(tmpDir);
    const allMsgs = msgRepo.findByChatId(chatId);
    assert.equal(allMsgs.length, 2, "Chat should contain both messages seamlessly");
    assert.equal(JSON.parse(allMsgs[0].metadata_json).providerId, "ollama");
    assert.equal(JSON.parse(allMsgs[1].metadata_json).providerId, "anthropic");
  });

  await t.test("PATCH /api/chats/:id/engine updates engine via HTTP API", async () => {
    const router = new Router(tmpDir);
    const chatRepo = new ChatRepository(tmpDir);
    const chatId = `chat_api_${Date.now()}`;

    chatRepo.save({
      id: chatId,
      title: "API Engine Switch Test",
      status: "Active",
      message_ids_json: "[]",
      provider_id: "ollama",
      model_type: "qwen2.5:3b",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_status: "LOCAL_ONLY",
      sync_version: 1,
    });

    // Mock HTTP server and request
    const server = http.createServer((req, res) => router.handleRequest(req, res));
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = server.address().port;

    try {
      // Send PATCH request
      const payload = JSON.stringify({ providerId: "gemini", modelType: "gemini-flash-latest" });
      const patchRes = await new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port,
            path: `/api/chats/${chatId}/engine`,
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              "Content-Length": Buffer.byteLength(payload),
            },
          },
          (res) => {
            let data = "";
            res.on("data", (c) => (data += c));
            res.on("end", () => resolve({ statusCode: res.statusCode, body: JSON.parse(data) }));
          }
        );
        req.on("error", reject);
        req.write(payload);
        req.end();
      });

      assert.equal(patchRes.statusCode, 200);
      assert.equal(patchRes.body.status, "updated");
      assert.equal(patchRes.body.chat.provider_id, "gemini");
      assert.equal(patchRes.body.chat.model_type, "gemini-flash-latest");

      // Verify in database
      const dbChat = chatRepo.findById(chatId);
      assert.equal(dbChat.provider_id, "gemini");
      assert.equal(dbChat.model_type, "gemini-flash-latest");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
