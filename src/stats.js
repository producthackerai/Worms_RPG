import { getAccessToken } from './auth.js';

let statsOpen = false;

export function initStats() {
  createStatsElements();
  bindStatsEvents();
}

function createStatsElements() {
  // Mini stats badge on menu screen
  const badge = document.createElement('div');
  badge.id = 'menuStatsBadge';
  badge.className = 'menu-stats-badge hidden';
  document.body.appendChild(badge);

  // Full stats overlay
  const overlay = document.createElement('div');
  overlay.id = 'statsOverlay';
  overlay.className = 'screen hidden';
  overlay.innerHTML = `
    <div class="stats-content">
      <button id="statsBack" class="community-back-btn">&larr; Back</button>
      <h2 class="stats-title">Your Stats</h2>
      <div id="statsBody" class="stats-body">
        <div class="community-loading">Loading stats...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function bindStatsEvents() {
  document.getElementById('statsBack').addEventListener('click', closeStats);
}

export function openStats() {
  if (!window.wormsUser) return;
  statsOpen = true;
  document.getElementById('statsOverlay').classList.remove('hidden');
  document.getElementById('menuScreen')?.classList.add('hidden');
  loadStats();
}

export function closeStats() {
  statsOpen = false;
  document.getElementById('statsOverlay').classList.add('hidden');
  document.getElementById('menuScreen')?.classList.remove('hidden');
}

export async function refreshMenuBadge() {
  const badge = document.getElementById('menuStatsBadge');
  if (!window.wormsUser || !badge) {
    if (badge) badge.classList.add('hidden');
    return;
  }

  try {
    const token = await getAccessToken();
    const res = await fetch('/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      badge.classList.add('hidden');
      return;
    }

    const stats = await res.json();
    if (stats.total_matches === 0) {
      badge.classList.add('hidden');
      return;
    }

    badge.innerHTML = `
      <span class="stats-record">${stats.wins}W - ${stats.losses}L</span>
      <span class="stats-winrate">${Math.round(stats.win_rate * 100)}%</span>
      ${stats.current_streak > 0 ? `<span class="stats-streak">${stats.current_streak} streak</span>` : ''}
    `;
    badge.classList.remove('hidden');
  } catch (err) {
    badge.classList.add('hidden');
  }
}

async function loadStats() {
  const body = document.getElementById('statsBody');
  body.innerHTML = '<div class="community-loading">Loading stats...</div>';

  try {
    const token = await getAccessToken();
    const res = await fetch('/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load');
    const stats = await res.json();

    if (stats.total_matches === 0) {
      body.innerHTML = '<div class="community-empty">No matches played yet. Play a game to start tracking!</div>';
      return;
    }

    body.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total_matches}</div>
          <div class="stat-label">Total Matches</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-wins">${stats.wins}</div>
          <div class="stat-label">Wins</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-losses">${stats.losses}</div>
          <div class="stat-label">Losses</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${Math.round(stats.win_rate * 100)}%</div>
          <div class="stat-label">Win Rate</div>
        </div>
      </div>

      <div class="stats-section">
        <h3>Breakdown</h3>
        <div class="stats-row">
          <span>vs CPU</span>
          <span class="stat-wins">${stats.vs_cpu.wins}W</span> / <span class="stat-losses">${stats.vs_cpu.losses}L</span>
        </div>
        <div class="stats-row">
          <span>vs Human</span>
          <span class="stat-wins">${stats.vs_human.wins}W</span> / <span class="stat-losses">${stats.vs_human.losses}L</span>
        </div>
      </div>

      <div class="stats-section">
        <h3>Streaks</h3>
        <div class="stats-row">
          <span>Current Streak</span>
          <span>${stats.current_streak}</span>
        </div>
        <div class="stats-row">
          <span>Best Streak</span>
          <span>${stats.best_streak}</span>
        </div>
      </div>

      ${stats.favorite_terrain ? `
        <div class="stats-section">
          <h3>Favorite Terrain</h3>
          <div class="stats-row">
            <span>${formatTerrainName(stats.favorite_terrain)}</span>
          </div>
        </div>
      ` : ''}

      ${stats.recent_matches.length > 0 ? `
        <div class="stats-section">
          <h3>Recent Matches</h3>
          ${stats.recent_matches.map(m => `
            <div class="stats-row match-row">
              <span class="${m.result === 'win' ? 'stat-wins' : 'stat-losses'}">${m.result.toUpperCase()}</span>
              <span>vs ${m.opponent_type.toUpperCase()}</span>
              <span>${formatTerrainName(m.terrain_type)}</span>
              <span class="match-date">${new Date(m.created_at).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
  } catch (err) {
    console.error('Error loading stats:', err);
    body.innerHTML = '<div class="community-empty">Failed to load stats.</div>';
  }
}

function formatTerrainName(key) {
  if (!key) return '';
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

export async function recordMatch(result, opponentType, terrainType, durationSeconds, wormsRemaining) {
  if (!window.wormsUser) return;

  try {
    const token = await getAccessToken();
    await fetch('/api/stats/matches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        opponent_type: opponentType,
        result,
        terrain_type: terrainType,
        duration_seconds: durationSeconds,
        worms_remaining: wormsRemaining
      })
    });
  } catch (err) {
    console.error('Failed to record match:', err);
  }
}
