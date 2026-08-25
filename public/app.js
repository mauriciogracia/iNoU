import { TOOL_PROMPT } from "./brand.js";
import { getStrings } from "./i18n.js";
document.addEventListener("DOMContentLoaded", () => {
    const logViewport = document.getElementById("log-viewport");
    const commandForm = document.getElementById("command-form");
    const commandInput = document.getElementById("command-input");
    const systemVersionEl = document.getElementById("system-version");
    const modeSelect = null; // mode selector removed — intent is now detected from NL context
    const statusSuccinctEl = document.getElementById("status-succinct");
    const statusDebugEl = document.getElementById("status-debug");
    const statusAiEl = document.getElementById("status-ai");
    const labelAiEl = document.getElementById("label-ai");
    const badgeThinking = document.getElementById("badge-thinking");
    const badgeDebug = document.getElementById("badge-debug");
    const tabBtns = document.querySelectorAll(".tab-btn");
    const labelSuccinct = document.getElementById("label-succinct");
    const labelDebugEl = document.getElementById("label-debug");
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
        tabMainEl.textContent = uiStrings.tabMain;
        tabThinkingEl.textContent = uiStrings.tabThinking;
        tabDebugEl.textContent = uiStrings.tabDebug;
        labelSuccinct.textContent = uiStrings.pillSuccinct;
        labelDebugEl.textContent = uiStrings.pillDebug;
        labelAiEl.textContent = uiStrings.pillAi;
        sendBtnText.textContent = uiStrings.send;
        commandInput.placeholder = uiStrings.placeholder;
        systemConnectedMsg.textContent = uiStrings.connected;
    }
    // 2. Fetch System Status
    async function fetchStatus() {
        try {
            const res = await fetch("/api/status");
            if (res.ok) {
                const data = (await res.json());
                systemVersionEl.textContent = `v${data.version}`;
                applyTranslations(data.lang);
                statusSuccinctEl.textContent = data.succinct ? "ON" : "OFF";
                statusDebugEl.textContent = `Level ${data.debugLevel}`;
                if (data.aiUsage) {
                    const t = data.aiUsage.totalTokens;
                    const label = t >= 1000000
                        ? `${(t / 1000000).toFixed(1)}M tk`
                        : t >= 1000
                            ? `${(t / 1000).toFixed(1)}k tk`
                            : t > 0
                                ? `${t} tk`
                                : `${data.aiUsage.requestCount} req`;
                    statusAiEl.textContent = label;
                }
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
        entry.textContent = cleanText;
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
    function openLLMConfigurationDialog(setup) {
        hideAnalyzing();
        activeLLMSetup = setup;
        llmEngineName.textContent = setup.engineName;
        llmConfigurationName.value = setup.defaultConfigurationName;
        llmModel.value = setup.defaultModel;
        llmBaseUrl.value = setup.defaultBaseUrl ?? "";
        llmPlanMode.checked = true;
        llmExecuteMode.checked = false;
        llmFormError.textContent = "";
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
        llmConfigurationName.focus();
        llmConfigurationName.select();
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
                hideAnalyzing();
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
            hideAnalyzing();
            appendLog("DEBUG", `[Network Error] Couldn't reach iNoU: ${err.message}`);
            appendErrorWithRetry(uiStrings.errorNetwork, command);
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
        if (!btn)
            return;
        const command = btn.dataset["command"] ?? "";
        if (command) {
            btn.closest(".error-msg")?.remove();
            void sendCommand(command);
        }
    });
    // 5. Handle Command Form Submission
    commandForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const command = commandInput.value.trim();
        if (!command)
            return;
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
});
