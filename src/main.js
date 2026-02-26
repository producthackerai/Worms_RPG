import { onAuthChange, getUser } from './auth.js';
import { initAuthUI, setCurrentUser } from './auth-ui.js';
import { initChat } from './chat.js';
import { initCommunity, openCommunity } from './community.js';
import { initStats, openStats, refreshMenuBadge, recordMatch } from './stats.js';

// Initialize all modules after DOM is ready
function init() {
  // Wire up match recording hook for game.js
  window.wormsRecordMatch = (result, opponentType, terrainType, durationSec, wormsRemaining) => {
    recordMatch(result, opponentType, terrainType, durationSec, wormsRemaining);
    // Refresh stats badge after a short delay
    setTimeout(refreshMenuBadge, 1000);
  };

  // Auth UI (sign in button, modal, user badge)
  initAuthUI();

  // Chat panel (AI assistant FAB)
  initChat();

  // Community terrain browser
  initCommunity();

  // Stats display
  initStats();

  // Add menu navigation buttons
  addMenuButtons();

  // Listen for auth state changes
  onAuthChange((user, event) => {
    setCurrentUser(user);
    refreshMenuBadge();
  });

  // Check initial auth state
  getUser().then(user => {
    setCurrentUser(user);
    refreshMenuBadge();
  });
}

function addMenuButtons() {
  const menuButtons = document.querySelector('.menu-buttons');
  if (!menuButtons) return;

  // Community button
  const communityBtn = document.createElement('button');
  communityBtn.className = 'menu-btn menu-btn-secondary';
  communityBtn.textContent = 'Community';
  communityBtn.addEventListener('click', openCommunity);
  menuButtons.appendChild(communityBtn);

  // Stats button (shown when signed in)
  const statsBtn = document.createElement('button');
  statsBtn.id = 'menuStatsBtn';
  statsBtn.className = 'menu-btn menu-btn-secondary hidden';
  statsBtn.textContent = 'My Stats';
  statsBtn.addEventListener('click', openStats);
  menuButtons.appendChild(statsBtn);

  // Show/hide stats button based on auth
  onAuthChange((user) => {
    if (user) {
      statsBtn.classList.remove('hidden');
    } else {
      statsBtn.classList.add('hidden');
    }
  });

  getUser().then(user => {
    if (user) statsBtn.classList.remove('hidden');
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
