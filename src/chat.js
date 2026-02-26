import { getAccessToken } from './auth.js';

let chatHistory = [];
let chatOpen = false;

export function initChat() {
  createChatElements();
  bindChatEvents();
  loadHistory();
}

function createChatElements() {
  // Chat FAB
  const fab = document.createElement('button');
  fab.id = 'chatFab';
  fab.className = 'chat-fab';
  fab.innerHTML = '&#128172;';
  fab.title = 'Chat with AI';
  document.body.appendChild(fab);

  // Chat panel
  const panel = document.createElement('div');
  panel.id = 'chatPanel';
  panel.className = 'chat-panel hidden';
  panel.innerHTML = `
    <div class="chat-header">
      <span class="chat-title">WORMS! Assistant</span>
      <button id="chatCloseBtn" class="chat-close-btn">&times;</button>
    </div>
    <div id="chatMessages" class="chat-messages">
      <div class="chat-message bot">
        <div class="chat-bubble">Hey! I'm your Worms battle advisor and terrain architect. Ask me about weapons, strategy, or let me help you design terrain!</div>
      </div>
    </div>
    <form id="chatForm" class="chat-input-area">
      <input type="text" id="chatInput" class="chat-input" placeholder="Ask about weapons, strategy, terrain..." autocomplete="off" />
      <button type="submit" class="chat-send-btn">&#9654;</button>
    </form>
  `;
  document.body.appendChild(panel);
}

function bindChatEvents() {
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const closeBtn = document.getElementById('chatCloseBtn');
  const form = document.getElementById('chatForm');

  fab.addEventListener('click', () => {
    chatOpen = !chatOpen;
    panel.classList.toggle('hidden', !chatOpen);
    fab.classList.toggle('active', chatOpen);
    if (chatOpen) {
      document.getElementById('chatInput').focus();
    }
  });

  closeBtn.addEventListener('click', () => {
    chatOpen = false;
    panel.classList.add('hidden');
    fab.classList.remove('active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    addMessage('user', message);

    // Build context from game state
    const context = getGameContext();

    try {
      addMessage('bot', '...', true);
      const response = await sendChatMessage(message, context);
      removeTypingIndicator();
      addMessage('bot', response.response);

      // If terrain data was generated, offer to load it
      if (response.terrainData && response.terrainData.heights) {
        addTerrainAction(response.terrainData);
      }
    } catch (err) {
      removeTypingIndicator();
      addMessage('bot', 'Sorry, something went wrong. Try again!');
      console.error('Chat error:', err);
    }
  });
}

function getGameContext() {
  const context = {};

  if (window.wormsGameState) {
    const gs = window.wormsGameState;
    context.gameState = gs.state;
    context.selectedTerrain = gs.selectedTerrain;

    if (gs.activeWorm) {
      context.activeWorm = {
        x: Math.round(gs.activeWorm.x),
        y: Math.round(gs.activeWorm.y),
        hp: gs.activeWorm.hp,
        team: gs.activeWorm.team
      };
    }

    if (gs.worms) {
      context.enemies = gs.worms
        .filter(w => w.alive && gs.activeWorm && w.team !== gs.activeWorm.team)
        .map(w => ({ x: Math.round(w.x), y: Math.round(w.y), hp: w.hp }));
    }

    if (gs.wind !== undefined) context.wind = gs.wind;
    if (gs.weaponAmmo) context.availableWeapons = gs.weaponAmmo;
  }

  return context;
}

async function sendChatMessage(message, context) {
  const token = await getAccessToken();

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      message,
      history: chatHistory.slice(-10),
      context
    })
  });

  if (!res.ok) throw new Error('Chat request failed');
  const data = await res.json();

  // Update history
  chatHistory.push({ role: 'user', content: message });
  chatHistory.push({ role: 'assistant', content: data.response });
  saveHistory();

  return data;
}

function addMessage(role, text, isTyping = false) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  if (isTyping) div.classList.add('typing');

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  div.appendChild(bubble);

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function removeTypingIndicator() {
  const typing = document.querySelector('.chat-message.typing');
  if (typing) typing.remove();
}

function addTerrainAction(terrainData) {
  const container = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-message bot';

  const btn = document.createElement('button');
  btn.className = 'chat-terrain-btn';
  btn.textContent = 'Load This Terrain';
  btn.addEventListener('click', () => {
    if (window.wormsLoadTerrain) {
      window.wormsLoadTerrain(terrainData);
      btn.textContent = 'Loaded!';
      btn.disabled = true;
    } else {
      btn.textContent = 'Start a game first!';
    }
  });

  div.appendChild(btn);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function saveHistory() {
  try {
    const key = window.wormsUser ? `worms_chat_${window.wormsUser.id}` : 'worms_chat_guest';
    localStorage.setItem(key, JSON.stringify(chatHistory.slice(-20)));
  } catch (e) { /* ignore */ }
}

function loadHistory() {
  try {
    const key = window.wormsUser ? `worms_chat_${window.wormsUser.id}` : 'worms_chat_guest';
    const saved = localStorage.getItem(key);
    if (saved) chatHistory = JSON.parse(saved);
  } catch (e) { /* ignore */ }
}
