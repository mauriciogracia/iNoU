import { TOOL_PROMPT } from "./brand.js";
import { getStrings } from "./i18n.js";
document.addEventListener("DOMContentLoaded", () => {
    const logViewport = document.getElementById("log-viewport");
    const commandForm = document.getElementById("command-form");
    const commandInput = document.getElementById("command-input");
    const systemVersionEl = document.getElementById("system-version");
    const badgeThinking = document.getElementById("badge-thinking");
    const badgeDebug = document.getElementById("badge-debug");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabMainEl = document.getElementById("tab-main");
    const tabThinkingEl = document.getElementById("tab-thinking");
    const tabDebugEl = document.getElementById("tab-debug");
    const sendBtnText = document.getElementById("send-btn-text");
    const systemConnectedMsg = document.getElementById("system-connected-msg");
    const llmDialog = document.getElementById("llm-config-dialog");
    const llmForm = document.getElementById("llm-config-form");
    const llmEngineName = document.getElementById("llm-engine-name");
    const llmConfigurationName = document.getElementById("llm-configuration-name");
    const llmModel = document.getElementById("llm-model");
    const llmBaseUrl = document.getElementById("llm-base-url");
    const llmPlanMode = document.getElementById("llm-plan-mode");
    const llmExecuteMode = document.getElementById("llm-execute-mode");
    const llmCredentialGuidance = document.getElementById("llm-credential-guidance");
    const llmProviderDocs = document.getElementById("llm-provider-docs");
    const llmFormError = document.getElementById("llm-form-error");
    const llmDialogSave = document.getElementById("llm-dialog-save");
    const llmDialogClose = document.getElementById("llm-dialog-close");
    const llmDialogCancel = document.getElementById("llm-dialog-cancel");
    let activeTab = "conversation";
    let thinkingCount = 0;
    let debugCount = 0;
    let knownServerStartTime = null;
    let uiStrings = getStrings("es");
    let thinkingIndicator = null;
    let analyzingIndicator = null;
    let activeLLMSetup = null;
    function showAnalyzing() {
        if (!analyzingIndicator) {
            analyzingIndicator = document.createElement("div");
            analyzingIndicator.className = "log-entry analyzing-indicator";
            if (activeTab !== "conversation")
                analyzingIndicator.style.display = "none";
            analyzingIndicator.innerHTML = `<span class="analyzing-spinner">⏳</span> <span class="analyzing-text">${uiStrings.analyzing}</span>`;
            logViewport.appendChild(analyzingIndicator);
            logViewport.scrollTop = logViewport.scrollHeight;
        }
    }
    function hideAnalyzing() {
        if (analyzingIndicator) {
            analyzingIndicator.remove();
            analyzingIndicator = null;
        }
    }
    // 1. Tab Switching Handler
    tabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            activeTab = btn.dataset["tab"] ?? "conversation";
            filterLogs();
        });
    });
    function filterLogs() {
        const entries = logViewport.querySelectorAll(".log-entry");
        entries.forEach((entry) => {
            if (entry.classList.contains("analyzing-indicator")) {
                entry.style.display = activeTab === "conversation" ? "flex" : "none";
                return;
            }
            if (activeTab === "conversation") {
                entry.style.display =
                    entry.classList.contains("thinking-msg") ||
                        entry.classList.contains("debug-msg")
                        ? "none"
                        : "block";
            }
            else if (activeTab === "thinking") {
                entry.style.display = entry.classList.contains("thinking-msg")
                    ? "block"
                    : "none";
            }
            else if (activeTab === "debug") {
                entry.style.display = entry.classList.contains("debug-msg")
                    ? "block"
                    : "none";
            }
        });
        logViewport.scrollTop = logViewport.scrollHeight;
    }
    function applyTranslations(lang) {
        uiStrings = getStrings(lang);
        if (tabMainEl)
            tabMainEl.textContent = uiStrings.tabMain;
        if (tabThinkingEl)
            tabThinkingEl.textContent = uiStrings.tabThinking;
        if (tabDebugEl)
            tabDebugEl.textContent = uiStrings.tabDebug;
        if (sendBtnText)
            sendBtnText.textContent = uiStrings.send;
        if (commandInput)
            commandInput.placeholder = uiStrings.placeholder;
        if (systemConnectedMsg)
            systemConnectedMsg.textContent = uiStrings.connected;
    }
    // 2. Fetch System Status
    async function fetchStatus() {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const data = (await res.json());
                if (systemVersionEl)
                    systemVersionEl.textContent = `v${data.version}`;
                applyTranslations(data.lang);
            }
        }
        catch (err) {
            console.error("Status fetch error:", err);
        }
    }
    fetchStatus();
    // 3. Setup Server-Sent Events (SSE) Live Log Stream
    const eventSource = new EventSource("/api/stream");
    const handleSseMessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.channel === "SERVER_HELLO") {
                if (knownServerStartTime !== null &&
                    knownServerStartTime !== data.serverStartTime) {
                    window.location.reload();
                }
                knownServerStartTime = data.serverStartTime ?? null;
                return;
            }
            // Handle intent clarification widget
            if (data.channel === "CLARIFICATION") {
                try {
                    const clarification = JSON.parse(data.content);
                    renderClarificationWidget(clarification);
                }
                catch {
                    // If CLARIFICATION payload is malformed, fall through to appendLog
                    appendLog(data.channel, data.content);
                }
                return;
            }
            appendLog(data.channel, data.content);
        }
        catch (err) {
            console.error("SSE parse error:", err);
        }
    };
    // Flag to control console logging (defaults to false)
    // Can be toggled at runtime via window.debugToConsole = true in browser DevTools
    let debugToConsole = false;
    window.debugToConsole = debugToConsole;
    function isDebugToConsole() {
        return window.debugToConsole ?? debugToConsole;
    }
    eventSource.onmessage = handleSseMessage;
    eventSource.onerror = (err) => {
        if (isDebugToConsole()) {
            console.warn("[iNoU SSE Stream] Connection error or reconnecting:", err);
        }
        appendLog("DEBUG", "⚠️ [SSE Stream] Connection lost or reconnecting...");
    };
    // Global window error and rejection traps to surface tech errors in Depuración tab
    window.addEventListener("error", (event) => {
        if (isDebugToConsole()) {
            console.error("[iNoU Runtime Error]", event.error || event.message);
        }
        appendLog("DEBUG", `❌ [Browser Runtime Error] ${event.message} (${event.filename}:${event.lineno})`);
    });
    window.addEventListener("unhandledrejection", (event) => {
        if (isDebugToConsole()) {
            console.error("[iNoU Unhandled Rejection]", event.reason);
        }
        const reasonMsg = event.reason instanceof Error
            ? event.reason.stack || event.reason.message
            : String(event.reason);
        appendLog("DEBUG", `❌ [Unhandled Rejection] ${reasonMsg}`);
    });
    // 4. Append Log Entry to Viewport
    function appendLog(channel, content) {
        if (!content)
            return;
        // strip ANSI escape sequences for web rendering
        const cleanText = content.replace(/\x1b\[[0-9;]*m/g, "");
        const entry = document.createElement("div");
        entry.className = "log-entry";
        let entryType = "reply";
        if (channel === "THINKING" || content.includes("🧠")) {
            entry.classList.add("thinking-msg");
            entryType = "thinking";
            thinkingCount++;
            badgeThinking.textContent = String(thinkingCount);
            if (isDebugToConsole()) {
                console.log(`[iNoU Thinking]`, cleanText);
            }
            if (!thinkingIndicator) {
                thinkingIndicator = document.createElement("div");
                thinkingIndicator.className =
                    "log-entry thinking-msg thinking-indicator";
                if (activeTab !== "thinking")
                    thinkingIndicator.style.display = "none";
                thinkingIndicator.innerHTML =
                    `<span class="thinking-label">${uiStrings.thinking}` +
                        `<span class="thinking-dots"><span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span></span>` +
                        ` <span class="thinking-hint">${uiStrings.thinkingHint} <em>${uiStrings.tabThinking}</em></span>`;
                logViewport.appendChild(thinkingIndicator);
                logViewport.scrollTop = logViewport.scrollHeight;
            }
        }
        else if (channel === "DEBUG" ||
            content.includes("⚙") ||
            content.includes("❌") ||
            content.includes("[Error]")) {
            entry.classList.add("debug-msg");
            entryType = "debug";
            debugCount++;
            badgeDebug.textContent = String(debugCount);
            if (isDebugToConsole()) {
                if (cleanText.includes("❌") || cleanText.toLowerCase().includes("error")) {
                    console.error(`[iNoU Tech Error / Debug]`, cleanText);
                }
                else {
                    console.debug(`[iNoU Debug]`, cleanText);
                }
            }
        }
        else if (content.startsWith(TOOL_PROMPT)) {
            entry.classList.add("user-cmd");
            if (isDebugToConsole()) {
                console.log(`[iNoU User Command]`, cleanText);
            }
            if (thinkingIndicator) {
                thinkingIndicator.remove();
                thinkingIndicator = null;
            }
        }
        else {
            entry.classList.add("reply-msg");
            if (isDebugToConsole()) {
                console.log(`[iNoU Reply]`, cleanText);
            }
            hideAnalyzing();
            if (thinkingIndicator) {
                thinkingIndicator.remove();
                thinkingIndicator = null;
            }
        }
        if (activeTab === "conversation" && entryType !== "reply") {
            entry.style.display = "none";
        }
        else if (activeTab === "thinking" && entryType !== "thinking") {
            entry.style.display = "none";
        }
        else if (activeTab === "debug" && entryType !== "debug") {
            entry.style.display = "none";
        }
        if (cleanText.includes("[Contexto guardado]") || cleanText.includes("[Context Saved]")) {
            const safeText = cleanText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");
            entry.innerHTML = `<span>${safeText}</span> <button class="edit-prompt-btn" style="margin-left: 8px; font-size: 11px; padding: 2px 8px; background: rgba(56, 189, 248, 0.15); border: 1px solid var(--accent-cyan); color: #38bdf8; border-radius: 4px; cursor: pointer;">✏️ Continuar editando</button>`;
        }
        else {
            entry.textContent = cleanText;
        }
        logViewport.appendChild(entry);
        logViewport.scrollTop = logViewport.scrollHeight;
    }
    function appendErrorWithRetry(friendlyMessage, command) {
        hideAnalyzing();
        const entry = document.createElement("div");
        entry.className = "log-entry error-msg";
        if (activeTab !== "conversation")
            entry.style.display = "none";
        const safeCmd = command
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        entry.innerHTML =
            `<span class="error-icon">⚠️</span> <span class="error-text">${friendlyMessage}</span>` +
                ` <button class="retry-btn" data-command="${safeCmd}">${uiStrings.retryBtn}</button>`;
        logViewport.appendChild(entry);
        logViewport.scrollTop = logViewport.scrollHeight;
    }
    const PROVIDER_MODELS_MAP = {
        gemini: [
            { id: "gemini-flash-latest", label: "gemini-flash-latest (Free Tier - Default)" },
            { id: "gemini-3.7-flash", label: "gemini-3.7-flash (Free Tier)" },
            { id: "gemini-3.5-flash", label: "gemini-3.5-flash (Free Tier)" },
            { id: "gemini-3.5-flash-lite", label: "gemini-3.5-flash-lite (Free Tier)" },
            { id: "gemini-pro-latest", label: "gemini-pro-latest (Paid API Pro)" },
            { id: "gemini-3.1-pro-preview", label: "gemini-3.1-pro-preview (Paid API Pro)" },
        ],
        copilot: [
            { id: "gpt-4.1", label: "gpt-4.1 (Default)" },
            { id: "claude-3.5-sonnet", label: "claude-3.5-sonnet" },
            { id: "o3-mini", label: "o3-mini" },
        ],
        ollama: [
            { id: "qwen2.5:3b", label: "qwen2.5:3b (Default)" },
            { id: "qwen2.5:1.5b", label: "qwen2.5:1.5b" },
            { id: "qwen2.5:7b", label: "qwen2.5:7b" },
            { id: "llama3.2:3b", label: "llama3.2:3b" },
            { id: "mistral:7b", label: "mistral:7b" },
        ],
        openai: [
            { id: "gpt-4o-mini", label: "gpt-4o-mini (Default)" },
            { id: "gpt-4o", label: "gpt-4o" },
            { id: "o1", label: "o1" },
            { id: "o3-mini", label: "o3-mini" },
        ],
        anthropic: [
            { id: "claude-3-5-sonnet-20241022", label: "claude-3-5-sonnet (Default)" },
            { id: "claude-3-5-haiku-20241022", label: "claude-3-5-haiku" },
            { id: "claude-3-opus-20240229", label: "claude-3-opus" },
        ],
        groq: [
            { id: "llama-3.3-70b-versatile", label: "llama-3.3-70b-versatile (Default)" },
            { id: "llama-3.1-8b-instant", label: "llama-3.1-8b-instant" },
            { id: "deepseek-r1-distill-llama-70b", label: "deepseek-r1-distill-llama-70b" },
        ],
        deepseek: [
            { id: "deepseek-chat", label: "deepseek-chat (Default)" },
            { id: "deepseek-reasoner", label: "deepseek-reasoner (R1)" },
        ],
        mistral: [
            { id: "mistral-large-latest", label: "mistral-large-latest (Default)" },
            { id: "mistral-small-latest", label: "mistral-small-latest" },
            { id: "codestral-latest", label: "codestral-latest" },
        ],
        openrouter: [
            { id: "google/gemini-2.0-flash-001", label: "gemini-2.0-flash-001 (Default)" },
            { id: "anthropic/claude-3.5-sonnet", label: "claude-3.5-sonnet" },
            { id: "deepseek/deepseek-r1", label: "deepseek-r1" },
        ],
    };
    function openLLMConfigurationDialog(setup) {
        hideAnalyzing();
        activeLLMSetup = setup;
        llmEngineName.textContent = setup.engineName;
        llmConfigurationName.value = setup.defaultConfigurationName;
        llmBaseUrl.value = setup.defaultBaseUrl ?? "";
        llmPlanMode.checked = true;
        llmExecuteMode.checked = false;
        llmFormError.textContent = "";
        // Populate model dropdown options
        const engineKey = (setup.engineName || "gemini").toLowerCase();
        const modelsList = PROVIDER_MODELS_MAP[engineKey] || [
            { id: setup.defaultModel, label: `${setup.defaultModel} (Default)` },
        ];
        llmModel.innerHTML = "";
        for (const m of modelsList) {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.label;
            if (m.id === setup.defaultModel) {
                opt.selected = true;
            }
            llmModel.appendChild(opt);
        }
        // Auto-select default model
        llmModel.value = setup.defaultModel;
        if (setup.credentialEnvironmentVariable) {
            llmCredentialGuidance.textContent =
                `Set ${setup.credentialEnvironmentVariable} in the server environment. ` +
                    "Credentials are never entered or stored in this form.";
        }
        else {
            llmCredentialGuidance.textContent =
                "This provider profile does not require a credential environment variable.";
        }
        if (setup.documentationUrl) {
            llmProviderDocs.href = setup.documentationUrl;
            llmProviderDocs.hidden = false;
        }
        else {
            llmProviderDocs.removeAttribute("href");
            llmProviderDocs.hidden = true;
        }
        llmDialog.showModal();
        llmModel.focus();
    }
    function closeLLMConfigurationDialog() {
        activeLLMSetup = null;
        llmFormError.textContent = "";
        llmDialog.close();
        commandInput.focus();
    }
    async function sendCommand(command) {
        showAnalyzing();
        try {
            const res = await fetch("/api/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command, uiMode: true }),
            });
            const body = (await res.json().catch(() => ({})));
            if (!res.ok) {
                appendLog("DEBUG", `[Command Error] HTTP ${res.status} — ${body.error ?? "Unknown"}`);
                appendErrorWithRetry(uiStrings.errorServer, command);
                return;
            }
            if (body.status === "input_required" &&
                body.uiAction?.type === "LLM_CONFIGURATION") {
                openLLMConfigurationDialog(body.uiAction.setup);
            }
        }
        catch (err) {
            appendLog("DEBUG", `[Network Error] Couldn't reach iNoU: ${err.message}`);
            appendErrorWithRetry(uiStrings.errorNetwork, command);
        }
        finally {
            hideAnalyzing();
            void loadChats();
        }
    }
    llmDialogClose.addEventListener("click", closeLLMConfigurationDialog);
    llmDialogCancel.addEventListener("click", closeLLMConfigurationDialog);
    llmForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!activeLLMSetup)
            return;
        llmDialogSave.disabled = true;
        llmFormError.textContent = "";
        try {
            const response = await fetch("/api/llm/configurations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    configurationName: llmConfigurationName.value.trim(),
                    engineName: activeLLMSetup.engineName,
                    model: llmModel.value.trim(),
                    baseUrl: llmBaseUrl.value.trim() || undefined,
                    supportsPlanMode: llmPlanMode.checked,
                    supportsExecuteMode: llmExecuteMode.checked,
                }),
            });
            const result = (await response.json());
            if (!response.ok) {
                llmFormError.textContent =
                    result.error || "Configuration was not saved.";
                return;
            }
            appendLog("USER_REPLY", `LLM configuration "${result.configuration?.configurationName || llmConfigurationName.value}" saved.`);
            closeLLMConfigurationDialog();
            void loadEngines();
        }
        catch (error) {
            llmFormError.textContent = error.message;
        }
        finally {
            llmDialogSave.disabled = false;
        }
    });
    // Retry button click — removes the error entry and re-sends the same command
    logViewport.addEventListener("click", (e) => {
        const btn = e.target.closest(".retry-btn");
        if (btn) {
            const command = btn.dataset["command"] ?? "";
            if (command) {
                btn.closest(".error-msg")?.remove();
                void sendCommand(command);
            }
            return;
        }
        const editBtn = e.target.closest(".edit-prompt-btn");
        if (editBtn && lastSentCommand) {
            commandInput.value = lastSentCommand;
            commandInput.focus();
            commandInput.setSelectionRange(lastSentCommand.length, lastSentCommand.length);
        }
    });
    let lastSentCommand = "";
    // Key navigation: ArrowUp restores last sent command if input is empty
    commandInput.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" && commandInput.value === "" && lastSentCommand) {
            e.preventDefault();
            commandInput.value = lastSentCommand;
            commandInput.setSelectionRange(lastSentCommand.length, lastSentCommand.length);
        }
    });
    // 5. Handle Command Form Submission
    commandForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const command = commandInput.value.trim();
        if (!command)
            return;
        lastSentCommand = command;
        commandInput.value = "";
        dismissClarificationWidget();
        await sendCommand(command);
    });
    // 6. Intent Clarification Widget
    function renderClarificationWidget(clarification) {
        dismissClarificationWidget();
        const template = document.getElementById("clarification-widget-template");
        if (!template)
            return;
        const clone = template.content.cloneNode(true);
        const widget = clone.querySelector(".clarification-widget");
        if (!widget)
            return;
        // Set question text from i18n
        const questionEl = widget.querySelector("#clarification-question-text");
        if (questionEl)
            questionEl.textContent = uiStrings.clarificationQuestion;
        // Render radio-style option buttons
        const optionsContainer = widget.querySelector("#clarification-options");
        if (optionsContainer) {
            clarification.options.forEach((opt) => {
                const label = uiStrings.styleOptionLabels[opt.value] ?? opt.label;
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "clarification-option-btn";
                btn.dataset["value"] = opt.value;
                btn.dataset["contextKey"] = clarification.contextKey;
                btn.textContent = label;
                btn.addEventListener("click", () => {
                    dismissClarificationWidget();
                    void sendCommand(`style ${opt.value}`);
                });
                optionsContainer.appendChild(btn);
            });
        }
        // Write-in placeholder from i18n
        const writeInInput = widget.querySelector("#clarification-writein-input");
        if (writeInInput) {
            writeInInput.placeholder = uiStrings.clarificationWriteIn;
        }
        // Submit button from i18n
        const submitBtn = widget.querySelector("#clarification-submit-btn");
        if (submitBtn) {
            submitBtn.textContent = uiStrings.clarificationSubmit;
            submitBtn.addEventListener("click", () => {
                const val = writeInInput?.value.trim() ?? "";
                if (val) {
                    dismissClarificationWidget();
                    void sendCommand(val);
                }
            });
        }
        // Allow Enter in write-in to submit
        writeInInput?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                const val = writeInInput.value.trim();
                if (val) {
                    dismissClarificationWidget();
                    void sendCommand(val);
                }
            }
        });
        logViewport.appendChild(widget);
        logViewport.scrollTop = logViewport.scrollHeight;
        writeInInput?.focus();
    }
    function dismissClarificationWidget() {
        const existing = document.getElementById("clarification-widget");
        existing?.remove();
    }
    // 7. Multi-Chat Sidebar & Management
    const chatListEl = document.getElementById("chat-list");
    const chatSearchInput = document.getElementById("chat-search-input");
    const btnNewChat = document.getElementById("btn-new-chat");
    const btnMergeChats = document.getElementById("btn-merge-chats");
    const btnOpenEngines = document.getElementById("btn-open-engines");
    let allChats = [];
    const selectedChatIds = new Set();
    const activeChatTitleEl = document.getElementById("active-chat-title");
    const activeChatTimeEl = document.getElementById("active-chat-time");
    const activeChatMsgCountEl = document.getElementById("active-chat-msg-count");
    async function loadChats() {
        try {
            const res = await fetch("/api/chats");
            if (!res.ok)
                return;
            const data = await res.json();
            allChats = data.chats || [];
            renderChatList(allChats);
        }
        catch { }
    }
    function renderChatList(chats) {
        if (!chatListEl)
            return;
        const activeChat = chats.find((c) => c.isActive) || chats[0];
        if (activeChat) {
            if (activeChatTitleEl)
                activeChatTitleEl.textContent = activeChat.title;
            if (activeChatTimeEl) {
                const date = new Date(activeChat.updated_at || activeChat.created_at || Date.now());
                activeChatTimeEl.textContent = `Actualizado ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
            }
            if (activeChatMsgCountEl) {
                activeChatMsgCountEl.textContent = `${activeChat.messageCount || 0} mensaje${(activeChat.messageCount || 0) === 1 ? "" : "s"}`;
            }
        }
        const filter = (chatSearchInput?.value || "").toLowerCase().trim();
        const visible = filter
            ? chats.filter((c) => c.title.toLowerCase().includes(filter) ||
                c.id.toLowerCase().includes(filter))
            : chats;
        chatListEl.innerHTML = "";
        if (visible.length === 0) {
            chatListEl.innerHTML = `<div style="padding: 12px; font-size: 12px; color: var(--text-muted); text-align: center;">No hay chats disponibles.</div>`;
            return;
        }
        for (const c of visible) {
            const item = document.createElement("div");
            item.className = `chat-item ${c.isActive ? "active" : ""}`;
            item.dataset.id = c.id;
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.className = "chat-checkbox";
            checkbox.checked = selectedChatIds.has(c.id);
            checkbox.addEventListener("click", (e) => {
                e.stopPropagation();
                if (checkbox.checked) {
                    selectedChatIds.add(c.id);
                }
                else {
                    selectedChatIds.delete(c.id);
                }
                updateMergeButton();
            });
            const info = document.createElement("div");
            info.className = "chat-info";
            const title = document.createElement("div");
            title.className = "chat-title-text";
            title.textContent = c.title;
            const meta = document.createElement("div");
            meta.className = "chat-meta";
            const dateStr = new Date(c.updated_at).toLocaleDateString();
            meta.textContent = `${dateStr} · ${c.messageCount || 0} msgs`;
            info.appendChild(title);
            info.appendChild(meta);
            item.appendChild(checkbox);
            item.appendChild(info);
            item.addEventListener("click", () => {
                if (!c.isActive) {
                    void activateChat(c.id);
                }
            });
            chatListEl.appendChild(item);
        }
        updateMergeButton();
    }
    function updateMergeButton() {
        if (!btnMergeChats)
            return;
        const count = selectedChatIds.size;
        btnMergeChats.disabled = count < 2;
        btnMergeChats.textContent = `🔀 Combinar seleccionados (${count})`;
    }
    async function activateChat(chatId) {
        try {
            const res = await fetch(`/api/chats/${chatId}/activate`, {
                method: "POST",
            });
            if (res.ok) {
                logViewport.innerHTML = `<div class="log-entry system-msg"><span class="log-time">[System]</span><span class="log-text">Chat cambiado. Sesión activa: ${chatId}</span></div>`;
                await loadChats();
            }
        }
        catch { }
    }
    async function createNewChat() {
        try {
            const res = await fetch("/api/chats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: `Chat ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
                }),
            });
            if (res.ok) {
                logViewport.innerHTML = `<div class="log-entry system-msg"><span class="log-time">[System]</span><span class="log-text">Nuevo chat creado e iniciado.</span></div>`;
                await loadChats();
            }
        }
        catch { }
    }
    async function mergeSelectedChats() {
        if (selectedChatIds.size < 2)
            return;
        try {
            const chatIds = Array.from(selectedChatIds);
            const res = await fetch("/api/chats/merge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatIds, deleteSources: false }),
            });
            if (res.ok) {
                selectedChatIds.clear();
                logViewport.innerHTML = `<div class="log-entry system-msg"><span class="log-time">[System]</span><span class="log-text">Chats combinados exitosamente en una nueva sesión activa.</span></div>`;
                await loadChats();
            }
        }
        catch { }
    }
    chatSearchInput?.addEventListener("input", () => renderChatList(allChats));
    btnNewChat?.addEventListener("click", () => void createNewChat());
    btnMergeChats?.addEventListener("click", () => void mergeSelectedChats());
    // 8. Sidebar Navigation Tabs Switching (Chats vs Config)
    const sidebarTabBtns = document.querySelectorAll(".sidebar-tab-btn");
    const paneChats = document.getElementById("pane-chats");
    const paneConfig = document.getElementById("pane-config");
    sidebarTabBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            sidebarTabBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const tab = btn.dataset.sidebarTab;
            if (tab === "chats") {
                paneChats?.classList.add("active");
                paneConfig?.classList.remove("active");
            }
            else {
                paneChats?.classList.remove("active");
                paneConfig?.classList.add("active");
            }
        });
    });
    const enginesListEl = document.getElementById("engines-list");
    let allEngines = [];
    async function loadEngines() {
        try {
            const res = await fetch("/api/llm/engines");
            if (!res.ok)
                return;
            const data = await res.json();
            allEngines = data.engines || [];
            renderEnginesList(allEngines);
        }
        catch { }
    }
    function renderEnginesList(engines) {
        if (!enginesListEl)
            return;
        enginesListEl.innerHTML = "";
        if (engines.length === 0) {
            enginesListEl.innerHTML = `<div style="padding: 10px; font-size: 11.5px; color: var(--text-muted); text-align: center;">No hay motores registrados.</div>`;
            return;
        }
        for (const eng of engines) {
            const item = document.createElement("div");
            item.className = "engine-item";
            const dotClass = eng.statusColor === "orange"
                ? "dot-orange"
                : eng.statusColor === "red"
                    ? "dot-red"
                    : "dot-green";
            const dot = document.createElement("span");
            dot.className = `status-dot ${dotClass}`;
            dot.title = `Estado: ${eng.status} (${eng.tier})`;
            const info = document.createElement("div");
            info.className = "engine-info";
            const nameRow = document.createElement("div");
            nameRow.className = "engine-name-row";
            const title = document.createElement("span");
            title.className = "engine-title-text";
            title.textContent = eng.engineName;
            const badge = document.createElement("span");
            badge.className = "engine-tier-badge";
            badge.textContent = eng.tier;
            nameRow.appendChild(title);
            nameRow.appendChild(badge);
            const modelText = document.createElement("div");
            modelText.className = "engine-model-text";
            modelText.textContent = eng.model;
            info.appendChild(nameRow);
            info.appendChild(modelText);
            const gearBtn = document.createElement("button");
            gearBtn.className = "engine-gear-btn";
            gearBtn.title = `Configurar ${eng.engineName}`;
            gearBtn.innerHTML = "⚙";
            gearBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openLLMConfigurationDialog({
                    engineName: eng.engineName,
                    defaultConfigurationName: eng.defaultConfigurationName,
                    defaultModel: eng.model,
                    defaultBaseUrl: eng.defaultBaseUrl || "",
                    credentialEnvironmentVariable: eng.credentialEnvironmentVariable,
                    documentationUrl: eng.documentationUrl,
                });
            });
            item.appendChild(dot);
            item.appendChild(info);
            item.appendChild(gearBtn);
            enginesListEl.appendChild(item);
        }
    }
    // 9. Integrations List & Dialog
    const integrationsListEl = document.getElementById("integrations-list");
    // Integration Dialog Elements
    const integrationDialog = document.getElementById("integration-config-dialog");
    const integrationForm = document.getElementById("integration-config-form");
    const integrationProviderName = document.getElementById("integration-provider-name");
    const integrationChannel = document.getElementById("integration-channel");
    const integrationEnvVar = document.getElementById("integration-env-var");
    const integrationCredentialGuidance = document.getElementById("integration-credential-guidance");
    const integrationProviderDocs = document.getElementById("integration-provider-docs");
    const integrationFormError = document.getElementById("integration-form-error");
    const integrationDialogClose = document.getElementById("integration-dialog-close");
    const integrationDialogCancel = document.getElementById("integration-dialog-cancel");
    let allIntegrations = [];
    let activeIntegrationSetup = null;
    async function loadIntegrations() {
        try {
            const res = await fetch("/api/v1/integrations/status");
            if (!res.ok)
                return;
            const data = await res.json();
            allIntegrations = data.integrations || [];
            renderIntegrationsList(allIntegrations);
        }
        catch { }
    }
    function renderIntegrationsList(integrations) {
        if (!integrationsListEl)
            return;
        integrationsListEl.innerHTML = "";
        if (integrations.length === 0) {
            integrationsListEl.innerHTML = `<div style="padding: 10px; font-size: 11.5px; color: var(--text-muted); text-align: center;">No hay integraciones registradas.</div>`;
            return;
        }
        for (const integ of integrations) {
            const item = document.createElement("div");
            item.className = "integration-item";
            const dotClass = integ.statusColor === "orange"
                ? "dot-orange"
                : integ.statusColor === "red"
                    ? "dot-red"
                    : "dot-green";
            const dot = document.createElement("span");
            dot.className = `status-dot ${dotClass}`;
            dot.title = `Estado: ${integ.status} (${integ.category})`;
            const info = document.createElement("div");
            info.className = "engine-info";
            const nameRow = document.createElement("div");
            nameRow.className = "engine-name-row";
            const title = document.createElement("span");
            title.className = "engine-title-text";
            title.textContent = integ.name;
            const badge = document.createElement("span");
            badge.className = "integration-tier-badge";
            badge.textContent = integ.category;
            nameRow.appendChild(title);
            nameRow.appendChild(badge);
            const channelText = document.createElement("div");
            channelText.className = "engine-model-text";
            channelText.textContent = integ.channel || "Broadcast";
            info.appendChild(nameRow);
            info.appendChild(channelText);
            const gearBtn = document.createElement("button");
            gearBtn.className = "engine-gear-btn";
            gearBtn.title = `Configurar ${integ.name}`;
            gearBtn.innerHTML = "⚙";
            gearBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openIntegrationDialog(integ);
            });
            item.appendChild(dot);
            item.appendChild(info);
            item.appendChild(gearBtn);
            integrationsListEl.appendChild(item);
        }
    }
    function openIntegrationDialog(item) {
        activeIntegrationSetup = item;
        if (integrationProviderName)
            integrationProviderName.textContent = item.name;
        if (integrationChannel)
            integrationChannel.value = item.channel || "";
        if (integrationEnvVar)
            integrationEnvVar.value = item.credentialEnvVar || "N/A";
        if (integrationFormError)
            integrationFormError.textContent = "";
        if (integrationCredentialGuidance) {
            integrationCredentialGuidance.textContent = item.credentialEnvVar
                ? `Configure la variable de entorno ${item.credentialEnvVar} en el servidor para autenticación segura.`
                : "Esta integración no requiere variable de entorno obligatoria.";
        }
        if (integrationProviderDocs) {
            if (item.documentationUrl) {
                integrationProviderDocs.href = item.documentationUrl;
                integrationProviderDocs.hidden = false;
            }
            else {
                integrationProviderDocs.hidden = true;
            }
        }
        integrationDialog?.showModal();
        integrationChannel?.focus();
    }
    function closeIntegrationDialog() {
        activeIntegrationSetup = null;
        if (integrationFormError)
            integrationFormError.textContent = "";
        integrationDialog?.close();
    }
    integrationDialogClose?.addEventListener("click", closeIntegrationDialog);
    integrationDialogCancel?.addEventListener("click", closeIntegrationDialog);
    integrationForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!activeIntegrationSetup)
            return;
        appendLog("USER_REPLY", `Integración "${activeIntegrationSetup.name}" guardada. Canal/Target: ${integrationChannel?.value || "N/A"}`);
        closeIntegrationDialog();
        void loadIntegrations();
    });
    // Initial load of chats, engines & integrations on boot
    void loadChats();
    void loadEngines();
    void loadIntegrations();
});
