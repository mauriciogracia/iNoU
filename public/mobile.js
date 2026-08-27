"use strict";
const PROVIDERS = {
    ollama: { id: "ollama", name: "Ollama", icon: "🦙", desc: "0 tokens · Rápido y privado (qwen2.5:3b)" },
    gemini: { id: "gemini", name: "Gemini", icon: "✨", desc: "Free / Pro · Razonamiento avanzado" },
    anthropic: { id: "anthropic", name: "Claude", icon: "🟣", desc: "Claude 3.5 Sonnet · Código & arquitectura" },
    openai: { id: "openai", name: "OpenAI", icon: "🟢", desc: "GPT-4o / GPT-4o-mini · Inteligencia general" },
    openrouter: { id: "openrouter", name: "OpenRouter", icon: "🪐", desc: "DeepSeek, Mistral, Llama 3.3 Ultra" }
};
class InouMobileClient {
    constructor() {
        this.activeChatId = null;
        this.activeProvider = "ollama";
        this.history = [];
        this.historyIndex = -1;
        this.sse = null;
        this.activeChoice = null;
        this.selectedChoices = new Set();
        /* ══════════════════════════════════════════════════════════════════════════
           Interactive Choice Chips Engine (Single, Multi, "Other", Numbered Index)
           ══════════════════════════════════════════════════════════════════════════ */
        this.choiceCustomCallback = null;
        this.initElements();
        this.initViewportDocking();
        this.initEventListeners();
        this.initServiceWorker();
        this.initSse();
        this.fetchActiveChatAndEngine();
        this.checkAndPromptIdentityOnboarding();
    }
    initElements() {
        this.streamEl = document.getElementById("mobile-stream");
        this.outputEl = document.getElementById("stream-output");
        this.inputEl = document.getElementById("mobile-cmd-input");
        this.sendBtn = document.getElementById("mobile-send-btn");
        this.upBtn = document.getElementById("mobile-history-up");
        this.enginePill = document.getElementById("mobile-engine-pill");
        this.engineIcon = document.getElementById("mobile-engine-icon");
        this.engineLabel = document.getElementById("mobile-engine-label");
        this.statusDot = document.getElementById("mobile-status-dot");
        this.clearBtn = document.getElementById("mobile-clear-btn");
        this.engineModal = document.getElementById("mobile-engine-modal");
        this.modalBackdrop = document.getElementById("modal-backdrop");
        this.choiceContainer = document.getElementById("mobile-choice-container");
    }
    /**
     * Adjusts the viewport height dynamically using window.visualViewport to dock above virtual keyboard.
     */
    initViewportDocking() {
        const handleViewport = () => {
            const app = document.getElementById("mobile-app");
            if (app && window.visualViewport) {
                app.style.height = `${window.visualViewport.height}px`;
                this.scrollToBottom();
            }
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleViewport);
            window.visualViewport.addEventListener("scroll", handleViewport);
        }
        window.addEventListener("resize", handleViewport);
    }
    initEventListeners() {
        // Send action
        this.sendBtn.addEventListener("click", () => this.handleSend());
        this.inputEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                this.handleSend();
            }
            else if (e.key === "ArrowUp") {
                e.preventDefault();
                this.navigateHistory(-1);
            }
            else if (e.key === "ArrowDown") {
                e.preventDefault();
                this.navigateHistory(1);
            }
        });
        // History UP button for mobile
        this.upBtn.addEventListener("click", () => this.navigateHistory(-1));
        // Clear stream
        this.clearBtn.addEventListener("click", () => {
            this.outputEl.innerHTML = "";
            this.hideChoices();
        });
        // Engine Switcher Modal
        this.enginePill.addEventListener("click", () => this.openEngineModal());
        this.modalBackdrop.addEventListener("click", () => this.closeEngineModal());
        const engineCards = document.querySelectorAll(".engine-card");
        engineCards.forEach((card) => {
            card.addEventListener("click", (e) => {
                const target = e.currentTarget.dataset.provider;
                if (target) {
                    this.switchEngine(target);
                    this.closeEngineModal();
                }
            });
        });
    }
    initServiceWorker() {
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").catch(() => { });
        }
    }
    initSse() {
        try {
            this.sse = new EventSource("/api/stream");
            this.sse.onopen = () => {
                this.statusDot.className = "status-dot online";
            };
            this.sse.onmessage = (e) => {
                this.handleSseMessage(e.data);
            };
            this.sse.onerror = () => {
                this.statusDot.className = "status-dot";
            };
        }
        catch {
            this.statusDot.className = "status-dot";
        }
    }
    handleSseMessage(data) {
        if (!data)
            return;
        try {
            const parsed = JSON.parse(data);
            if (parsed.type === "INTERACTIVE_CHOICE") {
                this.renderChoiceChips(parsed);
                return;
            }
        }
        catch { }
        this.appendStreamEntry("entry-assistant", data);
    }
    async fetchActiveChatAndEngine() {
        try {
            const res = await fetch("/api/chats");
            if (res.ok) {
                const data = await res.json();
                if (data.activeChatId) {
                    this.activeChatId = data.activeChatId;
                    const active = (data.chats || []).find((c) => c.id === data.activeChatId);
                    if (active?.providerId) {
                        this.updateEngineDisplay(active.providerId);
                    }
                }
            }
        }
        catch { }
    }
    async switchEngine(providerId) {
        this.updateEngineDisplay(providerId);
        if (!this.activeChatId) {
            await this.fetchActiveChatAndEngine();
        }
        if (this.activeChatId) {
            try {
                await fetch(`/api/chats/${this.activeChatId}/engine`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ providerId }),
                });
                this.appendStreamEntry("entry-system", `✔ Motor cambiado a: ${PROVIDERS[providerId]?.name || providerId}`);
            }
            catch { }
        }
    }
    updateEngineDisplay(providerId) {
        const p = PROVIDERS[providerId.toLowerCase()] || PROVIDERS.ollama;
        this.activeProvider = p.id;
        this.engineIcon.textContent = p.icon;
        this.engineLabel.textContent = p.name;
        document.querySelectorAll(".engine-card").forEach((card) => {
            const el = card;
            if (el.dataset.provider === p.id) {
                el.classList.add("active");
            }
            else {
                el.classList.remove("active");
            }
        });
    }
    openEngineModal() {
        this.engineModal.classList.remove("hidden");
    }
    closeEngineModal() {
        this.engineModal.classList.add("hidden");
    }
    handleSend() {
        const raw = this.inputEl.value.trim();
        if (!raw)
            return;
        // Check if answering an active choice by number
        if (this.activeChoice) {
            const num = parseInt(raw, 10);
            if (!isNaN(num)) {
                const matched = this.activeChoice.options.find((o) => o.index === num);
                if (matched) {
                    this.inputEl.value = "";
                    this.submitChoice(matched.label);
                    return;
                }
            }
        }
        this.history.push(raw);
        this.historyIndex = this.history.length;
        this.inputEl.value = "";
        // Client-side quick slash commands
        if (raw.startsWith("/engine ")) {
            const target = raw.replace("/engine ", "").trim().toLowerCase();
            if (PROVIDERS[target]) {
                this.switchEngine(target);
            }
            else {
                this.appendStreamEntry("entry-error", `❌ Motor no reconocido: ${target}. Opciones: ${Object.keys(PROVIDERS).join(", ")}`);
            }
            return;
        }
        if (raw === "/clear" || raw === "clear") {
            this.outputEl.innerHTML = "";
            this.hideChoices();
            return;
        }
        this.appendStreamEntry("entry-user", `iNoU > ${raw}`);
        this.executeCommand(raw);
    }
    async executeCommand(command) {
        try {
            const res = await fetch("/api/command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command }),
            });
            const data = await res.json();
            if (data.output && !this.sse) {
                this.appendStreamEntry("entry-assistant", data.output);
            }
        }
        catch (err) {
            this.appendStreamEntry("entry-error", `❌ Error al conectar con el servidor: ${err.message}`);
        }
    }
    navigateHistory(direction) {
        if (this.history.length === 0)
            return;
        this.historyIndex += direction;
        if (this.historyIndex < 0)
            this.historyIndex = 0;
        if (this.historyIndex >= this.history.length) {
            this.historyIndex = this.history.length;
            this.inputEl.value = "";
            return;
        }
        this.inputEl.value = this.history[this.historyIndex] || "";
    }
    appendStreamEntry(type, text) {
        const entry = document.createElement("div");
        entry.className = `stream-entry ${type}`;
        entry.textContent = text;
        this.outputEl.appendChild(entry);
        this.scrollToBottom();
    }
    scrollToBottom() {
        setTimeout(() => {
            this.streamEl.scrollTop = this.streamEl.scrollHeight;
        }, 20);
    }
    renderChoiceChips(payload, onSelect) {
        this.activeChoice = payload;
        this.choiceCustomCallback = onSelect || null;
        this.selectedChoices.clear();
        this.choiceContainer.innerHTML = "";
        this.choiceContainer.classList.remove("hidden");
        // Question
        const q = document.createElement("div");
        q.className = "choice-question";
        q.textContent = payload.question;
        this.choiceContainer.appendChild(q);
        // Chips Grid
        const grid = document.createElement("div");
        grid.className = "choice-chips-grid";
        payload.options.forEach((opt) => {
            const chip = document.createElement("div");
            chip.className = "choice-chip";
            chip.dataset.index = String(opt.index);
            chip.innerHTML = `
        <span class="chip-badge">[${opt.index}]</span>
        <span class="chip-label">${opt.label}</span>
      `;
            chip.addEventListener("click", () => {
                if (!payload.isMultiSelect) {
                    // Single select: immediate highlight and submit
                    document.querySelectorAll(".choice-chip").forEach((c) => c.classList.remove("selected"));
                    chip.classList.add("selected");
                    this.submitChoice(opt.label);
                }
                else {
                    // Multi select toggle
                    if (this.selectedChoices.has(opt.index)) {
                        this.selectedChoices.delete(opt.index);
                        chip.classList.remove("selected");
                    }
                    else {
                        this.selectedChoices.add(opt.index);
                        chip.classList.add("selected");
                    }
                    this.updateMultiSubmitBtn(submitBtn, payload);
                }
            });
            grid.appendChild(chip);
        });
        this.choiceContainer.appendChild(grid);
        // Other Write-In Row
        let otherInput = null;
        if (payload.allowOther !== false) {
            const otherRow = document.createElement("div");
            otherRow.className = "choice-other-row";
            otherInput = document.createElement("input");
            otherInput.type = "text";
            otherInput.className = "choice-other-input";
            otherInput.placeholder = "✏ Escribir otra opción...";
            otherInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter" && otherInput?.value.trim()) {
                    this.submitChoice(otherInput.value.trim());
                }
            });
            otherRow.appendChild(otherInput);
            this.choiceContainer.appendChild(otherRow);
        }
        // Submit Button (Required for Multi-Choice or confirmation)
        const submitBtn = document.createElement("button");
        submitBtn.className = "choice-submit-btn";
        submitBtn.textContent = payload.isMultiSelect ? "Continuar ↵" : "Confirmar Selección ↵";
        submitBtn.addEventListener("click", () => {
            if (otherInput && otherInput.value.trim()) {
                this.submitChoice(otherInput.value.trim());
                return;
            }
            if (payload.isMultiSelect) {
                const labels = [];
                this.selectedChoices.forEach((idx) => {
                    const opt = payload.options.find((o) => o.index === idx);
                    if (opt)
                        labels.push(opt.label);
                });
                if (labels.length > 0) {
                    this.submitChoice(labels.join(", "));
                }
            }
        });
        this.choiceContainer.appendChild(submitBtn);
        this.scrollToBottom();
    }
    updateMultiSubmitBtn(btn, payload) {
        const count = this.selectedChoices.size;
        btn.textContent = count > 0 ? `Continuar (${count} seleccionados) ↵` : "Continuar ↵";
    }
    submitChoice(answer) {
        const cb = this.choiceCustomCallback;
        this.hideChoices();
        this.appendStreamEntry("entry-user", `iNoU > ${answer}`);
        if (cb) {
            cb(answer);
        }
        else {
            this.executeCommand(answer);
        }
    }
    hideChoices() {
        this.activeChoice = null;
        this.choiceCustomCallback = null;
        this.selectedChoices.clear();
        this.choiceContainer.classList.add("hidden");
        this.choiceContainer.innerHTML = "";
    }
    async checkAndPromptIdentityOnboarding() {
        try {
            const res = await fetch("/api/identity");
            if (res.ok) {
                const data = await res.json();
                if (data.identity?.globalHandle) {
                    this.appendStreamEntry("entry-system", `👤 Identidad activa: @${data.identity.globalHandle}`);
                    return;
                }
            }
            // If no identity set, fetch candidates
            const candRes = await fetch(`/api/identity/candidates?lang=es`);
            if (candRes.ok) {
                const choicePayload = await candRes.json();
                this.appendStreamEntry("entry-assistant", "👋 ¡Bienvenido a iNoU! Selecciona tu alias único o escribe el tuyo:");
                this.renderChoiceChips(choicePayload, async (chosen) => {
                    try {
                        await fetch("/api/identity", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ handle: chosen, lang: "es" })
                        });
                        this.appendStreamEntry("entry-success", `✔ Identidad establecida: @${chosen}`);
                    }
                    catch { }
                });
            }
        }
        catch { }
    }
}
// Instantiate upon DOM readiness
document.addEventListener("DOMContentLoaded", () => {
    window.inouMobile = new InouMobileClient();
});
