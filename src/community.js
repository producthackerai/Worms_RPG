import { getAccessToken } from './auth.js';

let communityOpen = false;
let terrains = [];
let currentSort = 'newest';

export function initCommunity() {
  createCommunityElements();
  bindCommunityEvents();
}

function createCommunityElements() {
  const overlay = document.createElement('div');
  overlay.id = 'communityOverlay';
  overlay.className = 'screen hidden';
  overlay.innerHTML = `
    <div class="community-content">
      <div class="community-header">
        <button id="communityBack" class="community-back-btn">&larr; Back</button>
        <h2 class="community-title">Community Terrains</h2>
        <div class="community-controls">
          <select id="communitySort" class="community-sort">
            <option value="newest">Newest</option>
            <option value="popular">Most Played</option>
            <option value="top">Top Rated</option>
          </select>
        </div>
      </div>
      <div id="communityGrid" class="community-grid">
        <div class="community-loading">Loading terrains...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function bindCommunityEvents() {
  document.getElementById('communityBack').addEventListener('click', closeCommunity);

  document.getElementById('communitySort').addEventListener('change', (e) => {
    currentSort = e.target.value;
    loadTerrains();
  });
}

export function openCommunity() {
  communityOpen = true;
  document.getElementById('communityOverlay').classList.remove('hidden');
  document.getElementById('menuScreen')?.classList.add('hidden');
  loadTerrains();
}

export function closeCommunity() {
  communityOpen = false;
  document.getElementById('communityOverlay').classList.add('hidden');
  document.getElementById('menuScreen')?.classList.remove('hidden');
}

async function loadTerrains() {
  const grid = document.getElementById('communityGrid');
  grid.innerHTML = '<div class="community-loading">Loading terrains...</div>';

  try {
    const token = await getAccessToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`/api/terrains?sort=${currentSort}&limit=20`, { headers });
    if (!res.ok) throw new Error('Failed to load');

    terrains = await res.json();

    if (terrains.length === 0) {
      grid.innerHTML = '<div class="community-empty">No terrains yet. Be the first to share one!</div>';
      return;
    }

    grid.innerHTML = terrains.map(t => renderTerrainCard(t)).join('');
    bindCardEvents();
  } catch (err) {
    console.error('Error loading terrains:', err);
    grid.innerHTML = '<div class="community-empty">Failed to load terrains. Is the backend running?</div>';
  }
}

function renderTerrainCard(terrain) {
  const voteClass = terrain.user_vote === 1 ? 'voted-up' : terrain.user_vote === -1 ? 'voted-down' : '';

  return `
    <div class="community-card" data-id="${terrain.id}">
      <div class="community-card-preview" style="background: ${getThemeGradient(terrain.terrain_config?.theme)}">
        ${terrain.preview_url ? `<img src="${terrain.preview_url}" alt="${terrain.name}" />` : ''}
      </div>
      <div class="community-card-info">
        <h3 class="community-card-name">${escapeHtml(terrain.name)}</h3>
        <span class="community-card-author">by ${escapeHtml(terrain.author_name)}</span>
        <div class="community-card-stats">
          <span class="plays-count">${terrain.plays || 0} plays</span>
          <div class="vote-controls ${voteClass}">
            <button class="vote-btn vote-up" data-id="${terrain.id}" data-vote="1">&#9650;</button>
            <span class="vote-score">${terrain.vote_score || 0}</span>
            <button class="vote-btn vote-down" data-id="${terrain.id}" data-vote="-1">&#9660;</button>
          </div>
        </div>
      </div>
      <button class="community-play-btn" data-id="${terrain.id}">Play</button>
    </div>
  `;
}

function bindCardEvents() {
  // Play buttons
  document.querySelectorAll('.community-play-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const terrain = terrains.find(t => t.id === id);
      if (!terrain) return;

      // Increment play count
      fetch(`/api/terrains/${id}/play`, { method: 'POST' }).catch(() => {});

      // Load terrain into game
      if (window.wormsLoadTerrain && terrain.terrain_config) {
        closeCommunity();
        window.wormsStartWithTerrain(terrain.terrain_config);
      } else {
        alert('Start a game first, then load community terrains via chat!');
      }
    });
  });

  // Vote buttons
  document.querySelectorAll('.vote-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!window.wormsUser) {
        alert('Sign in to vote!');
        return;
      }

      const id = btn.dataset.id;
      const vote = Number(btn.dataset.vote);

      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/terrains/${id}/vote`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ vote })
        });

        if (res.ok) {
          loadTerrains(); // Refresh to show updated votes
        }
      } catch (err) {
        console.error('Vote error:', err);
      }
    });
  });
}

function getThemeGradient(theme) {
  const gradients = {
    greenHills: 'linear-gradient(180deg, #0a3d62 0%, #3cb332 60%, #1e64b4 100%)',
    volcanicPeaks: 'linear-gradient(180deg, #5c1a0a 0%, #5a5550 60%, #dc6414 100%)',
    frozenValleys: 'linear-gradient(180deg, #7090a8 0%, #dcebfa 60%, #14505a 100%)',
    alienFloaters: 'linear-gradient(180deg, #1a0040 0%, #b432dc 60%, #32dc32 100%)'
  };
  return gradients[theme] || gradients.greenHills;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
