import { showToast, escHtml } from '../utils.js';

let chatHistory = [];
const SYSTEM_INSTRUCTION = "Você é o Assistente de IA do LeadBoard CRM. Seu objetivo é ajudar o usuário a analisar leads, otimizar taxas de conversão de vendas, sugerir abordagens de vendas personalizadas e fornecer insights valiosos sobre CRM e gestão de contatos.";

export function initAiChat() {
  const savedKey = localStorage.getItem('crmini_gemini_key') || '';
  const keyInput = document.getElementById('ai-api-key');
  if (keyInput) keyInput.value = savedKey;

  updateConnectionBadge(!!savedKey);
  if (savedKey) {
    renderWelcomeMessage();
  }
}

export function saveAiConfig() {
  const keyInput = document.getElementById('ai-api-key');
  if (!keyInput) return;
  const key = keyInput.value.trim();

  if (!key) {
    localStorage.removeItem('crmini_gemini_key');
    updateConnectionBadge(false);
    showToast('Chave API removida', 'error');
  } else {
    localStorage.setItem('crmini_gemini_key', key);
    updateConnectionBadge(true);
    showToast('Configurações de IA salvas com sucesso!');
    renderWelcomeMessage();
  }
}

function updateConnectionBadge(connected) {
  const badge = document.getElementById('ai-connection-status');
  if (!badge) return;

  if (connected) {
    badge.className = 'ai-status-badge connected';
    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Conectado';
  } else {
    badge.className = 'ai-status-badge disconnected';
    badge.innerHTML = '<i class="fa-solid fa-circle-dot"></i> Desconectado';
  }
}

function renderWelcomeMessage() {
  const container = document.getElementById('ai-chat-messages-container');
  if (!container) return;

  // Clear container
  container.innerHTML = '';
  chatHistory = [];

  appendMessage('ai', 'Olá! Sou o seu Assistente de IA integrado ao LeadBoard. Como posso ajudar você a gerenciar seus leads ou otimizar suas vendas hoje?');
}

export async function sendAiMessage() {
  const inputEl = document.getElementById('ai-chat-input-field');
  if (!inputEl) return;
  const messageText = inputEl.value.trim();
  if (!messageText) return;

  const apiKey = localStorage.getItem('crmini_gemini_key');
  if (!apiKey) {
    showToast('Por favor, conecte uma Gemini API Key antes de enviar mensagens.', 'error');
    return;
  }

  // Clear input field
  inputEl.value = '';

  // Append user message
  appendMessage('user', messageText);
  
  // Show thinking typing indicator
  showTypingIndicator();

  try {
    // Add user message to history
    chatHistory.push({
      role: 'user',
      parts: [{ text: messageText }]
    });

    // Format request following the standard Gemini payload structure
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        contents: chatHistory
      })
    });

    removeTypingIndicator();

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      appendMessage('ai', 'Ops! Ocorreu um erro ao processar sua mensagem. Certifique-se de que a API Key configurada é válida e tente novamente.');
      return;
    }

    const data = await response.json();
    const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui obter uma resposta.';
    
    // Append AI reply
    appendMessage('ai', replyText);

    // Save AI reply to history
    chatHistory.push({
      role: 'model',
      parts: [{ text: replyText }]
    });

  } catch (err) {
    console.error(err);
    removeTypingIndicator();
    appendMessage('ai', 'Não foi possível conectar ao servidor da IA. Verifique sua conexão.');
  }
}

function appendMessage(sender, text) {
  const container = document.getElementById('ai-chat-messages-container');
  if (!container) return;

  const emptyState = document.getElementById('ai-chat-empty-state');
  if (emptyState) emptyState.remove();

  const msgWrapper = document.createElement('div');
  msgWrapper.className = `chat-bubble-container ${sender}`;

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender}`;
  
  // Clean markup with formatting or standard escaping
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  bubble.innerHTML = `
    <div class="chat-text">${escHtml(text).replace(/\n/g, '<br>')}</div>
    <span class="chat-bubble-meta">${time}</span>
  `;

  msgWrapper.appendChild(bubble);
  container.appendChild(msgWrapper);
  
  // Auto-scroll to the bottom
  container.scrollTop = container.scrollHeight;
}

function showTypingIndicator() {
  const container = document.getElementById('ai-chat-messages-container');
  if (!container) return;

  const indicatorWrapper = document.createElement('div');
  indicatorWrapper.className = 'chat-bubble-container ai';
  indicatorWrapper.id = 'ai-typing-indicator';

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ai';
  bubble.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;

  indicatorWrapper.appendChild(bubble);
  container.appendChild(indicatorWrapper);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('ai-typing-indicator');
  if (indicator) indicator.remove();
}
