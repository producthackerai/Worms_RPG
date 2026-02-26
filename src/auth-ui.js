import { signIn, signUp, signInWithGoogle, signOut, getUser } from './auth.js';

let currentUser = null;

export function initAuthUI() {
  createAuthElements();
  bindAuthEvents();
}

export function setCurrentUser(user) {
  currentUser = user;
  updateAuthDisplay();
}

function createAuthElements() {
  // Auth button (top-right of menu)
  const authBtn = document.createElement('button');
  authBtn.id = 'authBtn';
  authBtn.className = 'auth-btn';
  authBtn.textContent = 'Sign In';
  document.body.appendChild(authBtn);

  // User badge (when signed in)
  const userBadge = document.createElement('div');
  userBadge.id = 'userBadge';
  userBadge.className = 'user-badge hidden';
  userBadge.innerHTML = `
    <span id="userDisplayName"></span>
    <button id="signOutBtn" class="sign-out-btn">Sign Out</button>
  `;
  document.body.appendChild(userBadge);

  // Auth modal
  const modal = document.createElement('div');
  modal.id = 'authModal';
  modal.className = 'screen hidden';
  modal.innerHTML = `
    <div class="auth-content">
      <button class="help-close" id="authClose">&times;</button>
      <h2 class="help-title" id="authTitle">Sign In</h2>
      <div id="authError" class="auth-error hidden"></div>
      <form id="authForm">
        <div class="auth-field">
          <label>Email</label>
          <input type="email" id="authEmail" required autocomplete="email" />
        </div>
        <div class="auth-field">
          <label>Password</label>
          <input type="password" id="authPassword" required autocomplete="current-password" />
        </div>
        <button type="submit" class="menu-btn auth-submit" id="authSubmitBtn">Sign In</button>
      </form>
      <div class="auth-divider"><span>or</span></div>
      <button class="menu-btn auth-google" id="googleBtn">Continue with Google</button>
      <p class="auth-toggle">
        <span id="authToggleText">Don't have an account?</span>
        <button id="authToggleBtn" class="auth-toggle-btn">Sign Up</button>
      </p>
    </div>
  `;
  document.body.appendChild(modal);
}

function bindAuthEvents() {
  const authBtn = document.getElementById('authBtn');
  const modal = document.getElementById('authModal');
  const closeBtn = document.getElementById('authClose');
  const form = document.getElementById('authForm');
  const googleBtn = document.getElementById('googleBtn');
  const toggleBtn = document.getElementById('authToggleBtn');
  const signOutBtn = document.getElementById('signOutBtn');

  let isSignUp = false;

  authBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  toggleBtn.addEventListener('click', () => {
    isSignUp = !isSignUp;
    document.getElementById('authTitle').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('authSubmitBtn').textContent = isSignUp ? 'Sign Up' : 'Sign In';
    document.getElementById('authToggleText').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
    toggleBtn.textContent = isSignUp ? 'Sign In' : 'Sign Up';
    hideError();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;

    try {
      if (isSignUp) {
        await signUp(email, password);
        showError('Check your email to confirm your account!', 'success');
      } else {
        await signIn(email, password);
        modal.classList.add('hidden');
      }
    } catch (err) {
      showError(err.message);
    }
  });

  googleBtn.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err.message);
    }
  });

  signOutBtn.addEventListener('click', async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  });
}

function updateAuthDisplay() {
  const authBtn = document.getElementById('authBtn');
  const userBadge = document.getElementById('userBadge');
  const displayName = document.getElementById('userDisplayName');

  if (currentUser) {
    authBtn.classList.add('hidden');
    userBadge.classList.remove('hidden');
    const name = currentUser.user_metadata?.display_name || currentUser.email?.split('@')[0] || 'Player';
    displayName.textContent = name;
    window.wormsUser = currentUser;
  } else {
    authBtn.classList.remove('hidden');
    userBadge.classList.add('hidden');
    window.wormsUser = null;
  }
}

function showError(msg, type = 'error') {
  const el = document.getElementById('authError');
  el.textContent = msg;
  el.className = `auth-error ${type}`;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('authError').classList.add('hidden');
}
