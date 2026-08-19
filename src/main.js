import * as webllm from "@mlc-ai/web-llm";
import "./style.css";

const MODEL_ID = "Qwen3-1.7B-q4f16_1-MLC";
const STORAGE_KEY = "rishi-ai-bot1-chat-v1";
const SYSTEM_PROMPT =
  "You are Rishi AI BOT1, a helpful, concise, friendly local AI assistant. Give clear answers, use structure when useful, and be transparent when you are unsure.";

const chat = document.querySelector("#chat");
const hero = document.querySelector("#hero");
const loadButton = document.querySelector("#load-model");
const loadButtonLabel = document.querySelector("#load-button-label");
const progressWrap = document.querySelector("#progress-wrap");
const progressBar = document.querySelector("#progress-bar");
const progressText = document.querySelector("#progress-text");
const progressPercent = document.querySelector("#progress-percent");
const statusPill = document.querySelector("#status-pill");
const statusText = document.querySelector("#status-text");
const deviceIndicator = document.querySelector("#device-indicator");
const composer = document.querySelector("#composer");
const promptInput = document.querySelector("#prompt");
const sendButton = document.querySelector("#send-button");
const stopButton = document.querySelector("#stop-button");
const newChatButton = document.querySelector("#new-chat");
const thinkingToggle = document.querySelector("#thinking-toggle");
const toast = document.querySelector("#toast");

let engine = null;
let modelWorker = null;
let isLoading = false;
let isGenerating = false;
let toastTimer = null;
let messages = readStoredMessages();

function readStoredMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
      .slice(-24);
  } catch {
    return [];
  }
}

function persistMessages() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
  } catch {
    // Chat still works if browser storage is unavailable.
  }
}

function setStatus(state, label) {
  statusPill.className = `status-pill ${state}`;
  statusText.textContent = label;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMarkdown(value) {
  const codeBlocks = [];
  let text = String(value || "").replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (_, language, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(
      `<pre><code${language ? ` data-language="${escapeHtml(language)}"` : ""}>${escapeHtml(code.trim())}</code></pre>`,
    );
    return `@@RISHI_CODE_${index}@@`;
  });

  text = escapeHtml(text);
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/^###\s+(.+)$/gm, "<strong>$1</strong>");
  text = text.replace(/^##\s+(.+)$/gm, "<strong>$1</strong>");
  text = text.replace(/^#\s+(.+)$/gm, "<strong>$1</strong>");

  text = text
    .split(/\n{2,}/)
    .map((block) => {
      if (/^@@RISHI_CODE_\d+@@$/.test(block.trim())) return block.trim();
      return `<p>${block.replaceAll("\n", "<br>")}</p>`;
    })
    .join("");

  codeBlocks.forEach((block, index) => {
    text = text.replace(`<p>@@RISHI_CODE_${index}@@</p>`, block);
    text = text.replace(`@@RISHI_CODE_${index}@@`, block);
  });

  return text || "<p></p>";
}

function stripThinking(value) {
  return String(value || "")
    .replace(/^\s*<think>[\s\S]*?<\/think>\s*/i, "")
    .trim();
}

function splitThinking(value) {
  const text = String(value || "");
  const closed = text.match(/^\s*<think>([\s\S]*?)<\/think>\s*([\s\S]*)$/i);
  if (closed) return { thinking: closed[1].trim(), answer: closed[2].trim() };

  const open = text.match(/^\s*<think>([\s\S]*)$/i);
  if (open) return { thinking: open[1].trim(), answer: "" };

  return { thinking: "", answer: text };
}

function assistantHtml(content, streaming = false) {
  const { thinking, answer } = splitThinking(content);
  const thoughts = thinking
    ? `<details class="thoughts"><summary>Reasoning ${streaming && !answer ? "…" : ""}</summary><div class="thoughts-content">${escapeHtml(thinking)}</div></details>`
    : "";
  const body = answer ? renderMarkdown(answer) : thinking ? "" : renderMarkdown(content);
  return `${thoughts}<div class="answer-content${streaming ? " typing-cursor" : ""}">${body}</div>`;
}

function createMessageElement(message, streaming = false) {
  const row = document.createElement("div");
  row.className = `message ${message.role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = message.role === "assistant" ? "R" : "YOU";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (message.role === "assistant") {
    bubble.innerHTML = assistantHtml(message.content, streaming);
  } else {
    bubble.innerHTML = `<p>${escapeHtml(message.content).replaceAll("\n", "<br>")}</p>`;
  }

  row.append(avatar, bubble);
  return { row, bubble };
}

function renderConversation() {
  if (!messages.length) return;
  if (hero) hero.classList.add("hidden");

  chat.innerHTML = '<div id="message-list" class="message-list"></div>';
  const list = document.querySelector("#message-list");
  messages.forEach((message) => list.append(createMessageElement(message).row));
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function ensureMessageList() {
  let list = document.querySelector("#message-list");
  if (!list) {
    chat.innerHTML = '<div id="message-list" class="message-list"></div>';
    list = document.querySelector("#message-list");
  }
  return list;
}

function scrollToLatest() {
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function setReadyState(ready) {
  promptInput.disabled = !ready;
  sendButton.disabled = !ready || isGenerating;
  promptInput.placeholder = ready ? "Message Rishi AI…" : "Load the model to start chatting…";
  if (ready) promptInput.focus();
}

function autoResizeInput() {
  promptInput.style.height = "auto";
  promptInput.style.height = `${Math.min(promptInput.scrollHeight, 180)}px`;
}

async function verifyWebGPU() {
  if (!("gpu" in navigator)) {
    deviceIndicator.textContent = "WebGPU unavailable — use a recent Chrome or Edge browser";
    deviceIndicator.style.color = "#fb7185";
    loadButton.disabled = true;
    setStatus("error", "WebGPU unavailable");
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter found");
    deviceIndicator.textContent = "WebGPU ready · model runs on this device";
    deviceIndicator.style.color = "#5f9f8b";
    return true;
  } catch (error) {
    deviceIndicator.textContent = "WebGPU adapter unavailable";
    deviceIndicator.style.color = "#fb7185";
    loadButton.disabled = true;
    setStatus("error", "WebGPU unavailable");
    console.error(error);
    return false;
  }
}

async function loadModel() {
  if (engine || isLoading) return;
  if (!(await verifyWebGPU())) return;

  isLoading = true;
  loadButton.disabled = true;
  loadButtonLabel.textContent = "Loading model…";
  progressWrap.classList.remove("hidden");
  setStatus("loading", "Loading Qwen3");

  try {
    modelWorker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    engine = await webllm.CreateWebWorkerMLCEngine(modelWorker, MODEL_ID, {
      initProgressCallback: (report) => {
        const progress = Number.isFinite(report.progress) ? Math.max(0, Math.min(1, report.progress)) : 0;
        const percent = Math.round(progress * 100);
        progressBar.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;
        progressText.textContent = report.text || "Preparing Qwen3…";
      },
    });

    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";
    progressText.textContent = "Qwen3 is ready on your device";
    loadButtonLabel.textContent = "Model loaded";
    setStatus("ready", "Qwen3 ready");
    setReadyState(true);
    showToast("Rishi AI is ready. Inference now runs on your device.");
  } catch (error) {
    console.error(error);
    engine = null;
    modelWorker?.terminate();
    modelWorker = null;
    loadButton.disabled = false;
    loadButtonLabel.textContent = "Retry loading AI";
    setStatus("error", "Model load failed");
    progressText.textContent = "Could not load the model";
    showToast("Model loading failed. Check WebGPU support and available GPU memory.");
  } finally {
    isLoading = false;
  }
}

function buildRequestMessages() {
  const recent = messages.slice(-12).map((message) => ({
    role: message.role,
    content: message.role === "assistant" ? stripThinking(message.content) : message.content,
  }));
  return [{ role: "system", content: SYSTEM_PROMPT }, ...recent];
}

async function generateReply(userText) {
  const list = ensureMessageList();

  const userMessage = { role: "user", content: userText };
  messages.push(userMessage);
  list.append(createMessageElement(userMessage).row);

  const assistantMessage = { role: "assistant", content: "" };
  messages.push(assistantMessage);
  const assistantView = createMessageElement(assistantMessage, true);
  list.append(assistantView.row);

  persistMessages();
  scrollToLatest();

  isGenerating = true;
  sendButton.disabled = true;
  stopButton.classList.remove("hidden");
  setStatus("loading", "Generating");

  try {
    const thinking = thinkingToggle.checked;
    const historyForRequest = buildRequestMessages().slice(0, -1);
    historyForRequest.push({ role: "user", content: userText });

    const request = {
      stream: true,
      stream_options: { include_usage: true },
      messages: historyForRequest,
      temperature: thinking ? 0.6 : 0.7,
      top_p: thinking ? 0.95 : 0.8,
      max_tokens: thinking ? 768 : 512,
      extra_body: { enable_thinking: thinking },
    };

    const stream = await engine.chat.completions.create(request);
    for await (const chunk of stream) {
      assistantMessage.content += chunk.choices[0]?.delta?.content || "";
      assistantView.bubble.innerHTML = assistantHtml(assistantMessage.content, true);
      scrollToLatest();
    }

    if (!assistantMessage.content.trim()) {
      assistantMessage.content = "I couldn't produce a response. Please try again.";
    }
    assistantView.bubble.innerHTML = assistantHtml(assistantMessage.content, false);
    persistMessages();
  } catch (error) {
    console.error(error);
    if (!assistantMessage.content.trim()) {
      assistantMessage.content = "Generation stopped or failed. Please try again.";
    }
    assistantView.bubble.innerHTML = assistantHtml(assistantMessage.content, false);
    persistMessages();
    showToast("Generation stopped or encountered an error.");
  } finally {
    isGenerating = false;
    stopButton.classList.add("hidden");
    sendButton.disabled = false;
    setStatus("ready", "Qwen3 ready");
    promptInput.focus();
    scrollToLatest();
  }
}

composer.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!engine || isGenerating) return;

  const text = promptInput.value.trim();
  if (!text) return;

  promptInput.value = "";
  autoResizeInput();
  await generateReply(text);
});

promptInput.addEventListener("input", autoResizeInput);
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    composer.requestSubmit();
  }
});

stopButton.addEventListener("click", () => {
  if (!engine || !isGenerating) return;
  engine.interruptGenerate();
  showToast("Stopping generation…");
});

newChatButton.addEventListener("click", () => {
  if (isGenerating) {
    showToast("Stop the current response before starting a new chat.");
    return;
  }
  messages = [];
  persistMessages();
  chat.innerHTML = "";
  if (hero) {
    hero.classList.remove("hidden");
    chat.append(hero);
  }
  showToast("New chat started.");
});

loadButton.addEventListener("click", loadModel);

renderConversation();
setReadyState(false);
verifyWebGPU();
