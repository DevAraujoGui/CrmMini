import { initTheme, toggleTheme } from './modules/theme.js';
import { initSidebarState, toggleSidebar } from './modules/sidebar.js';
import { getCurrentUser, clearCurrentUser } from './modules/api.js';
import { handleLogin, handleRegister, handleLogout, showLogin, showRegister } from './modules/auth.js';
import { updateStatUsers, updateBadge, updateDashboardStats } from './modules/dashboard.js';
import { renderUsersTable, openUserModal, closeUserModal, closeModalOutside, saveUser } from './modules/users.js';
import { renderKanban, openQuickAdd } from './modules/kanban.js';
import { openLeadModal, closeLeadModal, closeLeadModalOutside, saveLead, deleteLeadFromModal } from './modules/leads.js';
import { openDeleteModal, closeDeleteModal, closeDeleteOutside, confirmDelete } from './modules/modals.js';
import { renderSettings, saveProfileSettings, savePasswordSettings, exportData, importData } from './modules/settings.js';
import { initAiChat, saveAiConfig, sendAiMessage } from './modules/aiChat.js';

// Expose handlers globally for HTML inline event listeners
window.toggleSidebar = toggleSidebar;
window.handleLogout = handleLogout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.showPage = showPage;
window.openLeadModal = openLeadModal;
window.closeLeadModal = closeLeadModal;
window.closeLeadModalOutside = closeLeadModalOutside;
window.saveLead = saveLead;
window.deleteLeadFromModal = deleteLeadFromModal;
window.openUserModal = openUserModal;
window.closeUserModal = closeUserModal;
window.closeModalOutside = closeModalOutside;
window.saveUser = saveUser;
window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.closeDeleteOutside = closeDeleteOutside;
window.confirmDelete = confirmDelete;
window.openQuickAdd = openQuickAdd;
window.toggleTheme = toggleTheme;
window.exportData = exportData;
window.importData = importData;
window.saveProfileSettings = saveProfileSettings;
window.savePasswordSettings = savePasswordSettings;
window.saveAiConfig = saveAiConfig;
window.sendAiMessage = sendAiMessage;

const pageConfig = {
  dashboard: { title: 'Dashboard', sub: 'Visão geral do sistema' },
  users:     { title: 'Usuários',  sub: 'Gerenciar usuários do sistema' },
  pipeline:  { title: 'Pipeline',  sub: 'Funil de vendas' },
  whatsapp:  { title: 'WhatsApp',  sub: 'Integração de mensagens' },
  'ai-chat': { title: 'IA Chat',  sub: 'Assistente virtual inteligente' },
  settings:  { title: 'Configurações', sub: 'Preferências do sistema' },
};

export async function goToApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  const user = getCurrentUser();
  if (user) {
    document.getElementById('sidebar-name').textContent = user.name.split(' ')[0];
    document.getElementById('sidebar-avatar').textContent = user.name.charAt(0).toUpperCase();
  }
  initSidebarState();
  await showPage('dashboard');
}

export async function showPage(page) {
  ['dashboard','users','pipeline','whatsapp','ai-chat','settings'].forEach(p => {
    const pageEl = document.getElementById('page-' + p);
    const navEl = document.getElementById('nav-' + p);
    if (pageEl) pageEl.style.display = p === page ? 'block' : 'none';
    if (navEl) navEl.classList.toggle('active', p === page);
  });
  const cfg = pageConfig[page] || {};
  document.getElementById('header-title').textContent = cfg.title || '';
  document.getElementById('header-sub').textContent = cfg.sub || '';
  if (page === 'users') await renderUsersTable();
  if (page === 'dashboard') {
    await updateStatUsers();
    await updateDashboardStats();
  }
  if (page === 'pipeline') await renderKanban();
  if (page === 'ai-chat') initAiChat();
  if (page === 'settings') await renderSettings();
  await updateBadge();
}

// Global Event Listeners & Delegation
document.addEventListener('DOMContentLoaded', () => {
  // Bind dynamic actions that aren't inline
  document.addEventListener('click', (e) => {
    // Edit User
    if (e.target.closest('.btn-edit')) {
      const btn = e.target.closest('.btn-edit');
      const id = btn.dataset.id;
      if (id && btn.closest('#page-users')) {
        openUserModal(id);
      }
    }
    // Delete User
    if (e.target.closest('.btn-delete')) {
      const btn = e.target.closest('.btn-delete');
      const id = btn.dataset.id;
      if (id && btn.closest('#page-users')) {
        openDeleteModal(id, 'user');
      }
    }
  });

  // Handle enter key inside AI Chat input field
  const aiChatInput = document.getElementById('ai-chat-input-field');
  if (aiChatInput) {
    aiChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendAiMessage();
      }
    });
  }
});

// Keyboard shortcuts helper
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeUserModal();
    closeDeleteModal();
    closeLeadModal();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    if (document.getElementById('user-modal').style.display !== 'none') saveUser();
    if (document.getElementById('lead-modal').style.display !== 'none') saveLead();
  }
});

// Self-initiation
(async function init() {
  initTheme();
  initAiChat();
  const user = getCurrentUser();
  if (user) {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        const exists = users.some(u => u.id === user.id);
        if (exists) {
          await goToApp();
          return;
        }
      }
    } catch (e) {
      console.error('Session validation failed:', e);
    }
  }
  clearCurrentUser();
})();

