// ======================================================================
// public/client.js — Cliente Web com WebRTC Realtime Voice (VERSÃO FINAL)
// ======================================================================

const socket = io({
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

// UI Elements
const chat = document.getElementById("chat");
const input = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendButton");
const liaStatus = document.getElementById("liaStatus");
const sessionButton = document.getElementById("sessionButton");
const micButton = document.getElementById("micButton");
const dictateButton = document.getElementById("dictateButton");
const liaImage = document.getElementById("liaImage");

let voiceActive = false;
let messageQueue = [];
let isReconnecting = false;
let currentVoicePersonality = "viva";

let isRecordingDictation = false;
let dictationRecorder = null;
let dictationStream = null;

let realtimeVoiceClient = null;

// Conversação
let conversationId = localStorage.getItem("lia_conversation_id");
if (!conversationId) {
  conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem("lia_conversation_id", conversationId);
}

socket.emit("register-conversation", conversationId);
loadHistory(conversationId);

// ======================================================================
// UI Helpers
// ======================================================================
function addDebugMessage(text) {
  const div = document.createElement("div");
  div.classList.add("message", "debug");
  div.textContent = "🔍 " + text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  console.log("🔍", text);
}

function addUserMessage(text) {
  const div = document.createElement("div");
  div.classList.add("message", "user");
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById("typing");
  if (t) t.remove();
}

function showTyping() {
  hideTyping();
  const t = document.createElement("div");
  t.id = "typing";
  t.className = "message lia";
  t.innerHTML = "LIA pensando...";
  chat.appendChild(t);
  chat.scrollTop = chat.scrollHeight;
}

async function typeWriter(text) {
  hideTyping();
  return new Promise(resolve => {
    const div = document.createElement("div");
    div.classList.add("message", "lia");
    chat.appendChild(div);
    let i = 0;
    function type() {
      if (i < text.length) {
        div.textContent += text.charAt(i++);
        chat.scrollTop = chat.scrollHeight;
        setTimeout(type, 8);
      } else resolve();
    }
    type();
  });
}

function addMemoryMessage(key, value, status) {
  const div = document.createElement("div");
  div.classList.add("message", "memory");
  div.style.backgroundColor = "#d4edda";
  div.style.borderLeft = "4px solid #28a745";
  div.style.padding = "10px";

  const label = status === "created" ? "Memória salva" : "Memória atualizada";
  const displayKey = key.replace(/_/g, " ");
  div.textContent = `🧠 ${label}: ${displayKey} = ${value}`;

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

function updateVoiceUI(active) {
  input.disabled = active;
  sendBtn.disabled = active;
  dictateButton.disabled = active;
  dictateButton.style.opacity = active ? "0.5" : "1";
  input.placeholder = active ? "🎤 Modo voz ativo" : "Digite sua mensagem...";
  sessionButton.textContent = active ? "⏹️ Encerrar" : "🎤 Iniciar Chat de Voz";
  sessionButton.classList.toggle("active", active);
  micButton.classList.toggle("recording", active);
  liaStatus.textContent = active ? "🎤 Escutando..." : "💚 Pronta.";
  liaImage.classList.remove("speaking", "searching");
}

// ======================================================================
// Socket.IO events
// ======================================================================
socket.on("audio-response", async ({ audio, text }) => {
  hideTyping();
  liaImage.classList.remove("searching");

  try {
    if (audio) {
      const uint8 = new Uint8Array(audio);
      const blob = new Blob([uint8], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audioPlayer = new Audio(url);

      liaImage.classList.add("speaking");
      audioPlayer.onended = () => {
        liaImage.classList.remove("speaking");
        URL.revokeObjectURL(url);
      };

      await audioPlayer.play();
    }

    if (text) await typeWriter(text);

  } catch (err) {
    console.error("Erro processar audio-response:", err);
    if (text) await typeWriter(text);
  }
});

socket.on("lia-message", async text => {
  hideTyping();
  liaImage.classList.remove("searching");
  await typeWriter(text);
});

socket.on("lia-typing", showTyping);
socket.on("lia-stop-typing", hideTyping);

socket.on("memory-saved", ({ key, value, status }) => {
  addMemoryMessage(key, value, status);
});

socket.on("debug", msg => addDebugMessage(msg));

socket.on("connect", () => {
  document.getElementById("connectionStatus").textContent = "🟢 Conectado";
  document.getElementById("connectionStatus").style.color = "#00ff6a";

  if (isReconnecting) {
    addDebugMessage("Reconectado!");
    while (messageQueue.length > 0)
      socket.emit("text-message", messageQueue.shift());
    isReconnecting = false;
  }

  socket.emit("register-conversation", conversationId);
});

socket.on("disconnect", () => {
  document.getElementById("connectionStatus").textContent = "🔴 Desconectado";
  document.getElementById("connectionStatus").style.color = "#ff3366";
  isReconnecting = true;
  addDebugMessage("Conexão perdida. Tentando reconectar...");
});

// ======================================================================
// Funções de Voz — WebRTC Realtime
// ======================================================================
async function startVoice() {
  try {
    addDebugMessage("Iniciando voz...");
    liaImage.classList.add("searching");

    socket.emit("iniciarChat", conversationId);

    if (!realtimeVoiceClient) {
      realtimeVoiceClient = new RealtimeVoiceClient({
        conversationId,

        onTranscript: text => {
          addDebugMessage("📝 Transcrição parcial: " + text);
        },

        // ❗ CORRIGIDO — agora compatível com realtime-voice-client.js
        onResponse: async ({ text }) => {
          hideTyping();
          liaImage.classList.remove("searching");

          if (text) {
            liaImage.classList.add("speaking");
            await typeWriter(text);
            liaImage.classList.remove("speaking");
          }
        },

        onDebug: msg => addDebugMessage(msg)
      });
    }

    await realtimeVoiceClient.start();

    voiceActive = true;
    updateVoiceUI(true);

  } catch (err) {
    console.error("Erro startVoice:", err);
    addDebugMessage("❌ Erro ao iniciar WebRTC");
    updateVoiceUI(false);
  }
}

async function stopVoice() {
  try {
    if (realtimeVoiceClient) await realtimeVoiceClient.stop();
  } catch (err) {
    console.error("Erro ao parar WebRTC:", err);
  }

  voiceActive = false;
  updateVoiceUI(false);
  liaImage.classList.remove("speaking", "searching");
  addDebugMessage("🛑 Chat de voz encerrado");
}

// ======================================================================
// UI Events
// ======================================================================
sessionButton.addEventListener("click", () =>
  !voiceActive ? startVoice() : stopVoice()
);

micButton.addEventListener("click", () =>
  !voiceActive ? startVoice() : stopVoice()
);

// ======================================================================
// Dictation STT (Whisper)
// ======================================================================
dictateButton.addEventListener("click", async () => {
  if (voiceActive) {
    addDebugMessage("⚠️ Encerre o chat de voz primeiro");
    return;
  }

  if (!isRecordingDictation) {
    try {
      dictationStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dictationRecorder = new MediaRecorder(dictationStream);
      const chunks = [];

      dictationRecorder.ondataavailable = (e) => chunks.push(e.data);

      dictationRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });

        addDebugMessage("🎙️ Transcrevendo...");

        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(",")[1];

          const response = await fetch("/api/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio: base64Audio,
              mimeType: "audio/webm"
            })
          });

          const data = await response.json();

          if (data.success || data.ok) {
            input.value = data.text;
            addDebugMessage(`✅ Ditado: "${data.text}"`);
          } else {
            addDebugMessage("⚠️ Não foi possível transcrever o áudio");
          }
        };

        dictationStream.getTracks().forEach(track => track.stop());
        dictationStream = null;
      };

      dictationRecorder.start();
      isRecordingDictation = true;
      dictateButton.textContent = "⏹️";
      dictateButton.style.backgroundColor = "#ff3366";
      addDebugMessage("🎙️ Gravando ditado...");

    } catch (err) {
      addDebugMessage("❌ Erro ao acessar microfone");
    }

  } else {
    if (dictationRecorder && dictationRecorder.state === "recording") {
      dictationRecorder.stop();
    }
    isRecordingDictation = false;
    dictateButton.textContent = "🎙️";
    dictateButton.style.backgroundColor = "";
  }
});

sendBtn.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;

  addUserMessage(text);
  input.value = "";

  if (socket.connected) {
    socket.emit("text-message", { text, conversationId });
    showTyping();
  } else {
    messageQueue.push({ text, conversationId });
    addDebugMessage("Mensagem adicionada à fila");
  }
});

input.addEventListener("keypress", e => {
  if (e.key === "Enter") sendBtn.click();
});

// ======================================================================
// Voice personality selector
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {
  const voiceButtons = document.querySelectorAll(".voice-btn");
  voiceButtons.forEach(btn =>
    btn.addEventListener("click", () => {
      const personality = btn.dataset.voice;
      currentVoicePersonality = personality;
      voiceButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      socket.emit("set-voice-personality", personality);
      addDebugMessage(`Voz alterada para modo ${personality}`);
    })
  );
});

addDebugMessage("LIA pronta!");

// ======================================================================
// Carregar Histórico
// ======================================================================
async function loadHistory(id) {
  try {
    addDebugMessage("Carregando histórico...");

    const response = await fetch(`/api/history?conversationId=${id}`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      chat.innerHTML = "";

      data.forEach(msg => {
        if (msg.role === "user") {
          addUserMessage(msg.content);
        } else if (msg.role === "assistant") {
          const div = document.createElement("div");
          div.classList.add("message", "lia");
          div.textContent = msg.content;
          chat.appendChild(div);
        }
      });

      chat.scrollTop = chat.scrollHeight;
      addDebugMessage(`✅ ${data.length} mensagens carregadas`);

    } else {
      addDebugMessage("💬 Nenhuma mensagem anterior");
    }

  } catch (error) {
    addDebugMessage("❌ Erro ao carregar histórico.");
  }
}
