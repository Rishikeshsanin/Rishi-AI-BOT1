import * as webllm from "@mlc-ai/web-llm";
import "./style.css";

const MODEL_ID = "Qwen3-1.7B-q4f16_1-MLC";
const STORAGE_KEY = "rishi-ai-bot1-chat-v1";
const SYSTEM_PROMPT = "You are Rishi AI BOT1, a helpful, concise, friendly local AI assistant. Give clear answers, use structure when useful, and be transparent when unsure.";

const $ = (selector) => document.querySelector(selector);
const chat = $("#chat");
const hero = $("#hero");
const loadButton = $("#load-model");
const loadButtonLabel = $("#load-button-label");
const progressWrap = $("#progress-wrap");
const progressBar = $("#progress-bar");
const progressText = $("#progress-text");
const progressPercent = $("#progress-percent");
const statusPill = $("#status-pill");
const statusText = $("#status-text");
const deviceIndicator = $("#device-indicator");
const composer = $("#composer");
const promptInput = $("#prompt");
const sendButton = $("#send-button");
const stopButton = $("#stop-button");
const newChatButton = $("#new-chat");
const thinkingToggle = $("#thinking-toggle");
const toast = $("#toast");

let engine = null;
let worker = null;
let loading = false;
let generating = false;
let toastTimer;
let messages = loadHistory();

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-24)
      : [];
  } catch {
    return [];
  }
}

function saveHistory() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24))); } catch { /* optional */ }
}

function setStatus(state, text) {
  statusPill.className = `status-pill ${state}`;
  statusText.textContent = text;
}

function notify(text) {
  toast.textContent = text;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function markdown(text) {
  const blocks = [];
  let value = String(text || "").replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const id = blocks.length;
    blocks.push(`<pre><code${lang ? ` data-language="${escapeHtml(lang)}"` : ""}>${escapeHtml(code.trim())}</code></pre>`);
    return `@@CODE_${id}@@`;
  });

  value = escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/^#{1,3}\s+(.+)$/gm, "<strong>$1</strong>")
    .split(/\n{2,}/)
    .map((part) => /^@@CODE_\d+@@$/.test(part.trim()) ? part.trim() : `<p>${part.replaceAll("\n", "<br>")}</p>`)
    .join("");

  blocks.forEach((block, index) => {
    value = value.replace(`<p>@@CODE_${index}@@</p>`, block).replace(`@@CODE_${index}@@`, block);
  });
  return value || "<p></p>";
}

function stripThinking(text) {
  return String(text || "").replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, "").trim();
}

function splitThinking(text) {
  const value = String(text || "");
  const closed = value.match(/^\s*<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/i);
  if (closed) return { thought: closed[1].trim(), answer: closed[2].trim() };
  const open = value.match(/^\s*<think>([\s\S]*)$/i);
  if (open) return { thought: open[1].trim(), answer: "" };
  return { thought: "", answer: value };
}

function assistantMarkup(content, streaming = false) {
  const { thought, answer } = splitThinking(content);
  const reasoning = thought
    ? `<details class="thoughts"><summary>Reasoning${streaming && !answer ? " …" : ""}</summary><div class="thoughts-content">${escapeHtml(thought)}</div></details>`
    : "";
  const visible = answer ? markdown(answer) : thought ? "" : markdown(content);
  return `${reasoning}<div class="answer-content${streaming ? " typing-cursor" : ""}">${visible}</div>`;
}

function messageView(message, streaming = false) {
  const row = document.createElement("div");
  row.className = `message ${message.role}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = message.role === "assistant" ? "R" : "YOU";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = message.role === "assistant"
    ? assistantMarkup(message.content, streaming)
    : `<p>${escapeHtml(message.content).replaceAll("\n", "<br>")}</p>`;
  row.append(avatar, bubble);
  return { row, bubble };
}

function ensureList() {
  let list = $("#message-list");
  if (!list) {
    chat.innerHTML = '<div id="message-list" class="message-list"></div>';
    list = $("#message-list");
  }
  return list;
}

function renderHistory() {
  if (!messages.length) return;
  chat.innerHTML = '<div id="message-list" class="message-list"></div>';
  const list = $("#message-list");
  messages.forEach((m) => list.append(messageView(m).row));
  scrollBottom();
}

function scrollBottom() {
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
}

function setChatEnabled(enabled) {
  promptInput.disabled = !enabled;
  sendButton.disabled = !enabled || generating;
  promptInput.placeholder = enabled ? "Message Rishi AI…" : "Load the model to start chatting…";
  if (enabled) promptInput.focus();
}

function resizeComposer() {
  promptInput.style.height = "auto";
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
}

async function webGpuReady() {
  if (!("gpu" in navigator)) {
    deviceIndicator.textContent = "WebGPU unavailable — use a recent Chrome or Edge browser";
    deviceIndicator.style.color = "#fb7185";
    loadButton.disabled = true;
    setStatus("error", "WebGPU unavailable");
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter");
    deviceIndicator.textContent = "WebGPU ready · model runs on this device";
    deviceIndicator.style.color = "#5f9f8b";
    return true;
  } catch (error) {
    console.error(error);
    deviceIndicator.textContent = "WebGPU adapter unavailable";
    deviceIndicator.style.color = "#fb7185";
    loadButton.disabled = true;
    setStatus("error", "WebGPU unavailable");
    return false;
  }
}

async function loadModel() {
  if (engine || loading || !(await webGpuReady())) return;
  loading = true;
  loadButton.disabled = true;
  loadButtonLabel.textContent = "Loading model…";
  progressWrap.classList.remove("hidden");
  setStatus("loading", "Loading Qwen3");

  try {
    worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    engine = await webllm.CreateWebWorkerMLCEngine(worker, MODEL_ID, {
      initProgressCallback: (report) => {
        const progress = Number.isFinite(report.progress) ? Math.max(0, Math.min(1, report.progress)) : 0;
        const pct = Math.round(progress * 100);
        progressBar.style.width = `${pct}%`;
        progressPercent.textContent = `${pct}%`;
        progressText.textContent = report.text || "Preparing Qwen3…";
      },
    });
    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";
    progressText.textContent = "Qwen3 is ready on your device";
    loadButtonLabel.textContent = "Model loaded";
    setStatus("ready", "Qwen3 ready");
    setChatEnabled(true);
    notify("Rishi AI is ready. Inference now runs on your device.");
  } catch (error) {
    console.error(error);
    engine = null;
    worker?.terminate();
    worker = null;
    loadButton.disabled = false;
    loadButtonLabel.textContent = "Retry loading AI";
    progressText.textContent = "Could not load the model";
    setStatus("error", "Model load failed");
    notify("Model load failed. Check WebGPU support and available GPU memory.");
  } finally {
    loading = false;
  }
}

function requestHistory() {
  const recent = messages
    .filter((m) => !(m.role === "assistant" && !m.content.trim()))
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.role === "assistant" ? stripThinking(m.content) : m.content }));
  return [{ role: "system", content: SYSTEM_PROMPT }, ...recent];
}

async function generate(text) {
  const list = ensureList();
  const user = { role: "user", content: text };
  messages.push(user);
  list.append(messageView(user).row);

  const assistant = { role: "assistant", content: "" };
  messages.push(assistant);
  const view = messageView(assistant, true);
  list.append(view.row);
  saveHistory();
  scrollBottom();

  generating = true;
  sendButton.disabled = true;
  stopButton.classList.remove("hidden");
  setStatus("loading", "Generating");

  try {
    const thinking = thinkingToggle.checked;
    const request = {
      stream: true,
      stream_options: { include_usage: true },
      messages: requestHistory(),
      temperature: thinking ? 0.6 : 0.7,
      top_p: thinking ? 0.95 : 0.8,
      max_tokens: thinking ? 768 : 512,
      extra_body: { enable_thinking: thinking },
    };

    const stream = await engine.chat.completions.create(request);
    for await (const chunk of stream) {
      assistant.content += chunk.choices[0]?.delta?.content || "";
      view.bubble.innerHTML = assistantMarkup(assistant.content, true);
      scrollBottom();
    }
    if (!assistant.content.trim()) assistant.content = "I couldn't produce a response. Please try again.";
    view.bubble.innerHTML = assistantMarkup(assistant.content);
    saveHistory();
  } catch (error) {
    console.error(error);
    if (!assistant.content.trim()) assistant.content = "Generation stopped or failed. Please try again.";
    view.bubble.innerHTML = assistantMarkup(assistant.content);
    saveHistory();
    notify("Generation stopped or encountered an error.");
  } finally {
    generating = false;
    stopButton.classList.add("hidden");
    sendButton.disabled = false;
    setStatus("ready", "Qwen3 ready");
    promptInput.focus();
    scrollBottom();
  }
}

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!engine || generating) return;
  const text = promptInput.value.trim();
  if (!text) return;
  promptInput.value = "";
  resizeComposer();
  await generate(text);
});

promptInput.addEventListener("input", resizeComposer);
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

stopButton.addEventListener("click", () => {
  if (!engine || !generating) return;
  engine.interruptGenerate();
  notify("Stopping generation…");
});

newChatButton.addEventListener("click", () => {
  if (generating) return notify("Stop the current response before starting a new chat.");
  messages = [];
  saveHistory();
  chat.innerHTML = "";
  hero.classList.remove("hidden");
  chat.append(hero);
  notify("New chat started.");
});

loadButton.addEventListener("click", loadModel);

renderHistory();
setChatEnabled(false);
webGpuReady();
