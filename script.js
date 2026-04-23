// ============================================================
// STORAGE UTILS
// ============================================================
function getUsers() {
  return JSON.parse(localStorage.getItem('crmini_users') || '[]');
}
function saveUsers(users) {
  localStorage.setItem('crmini_users', JSON.stringify(users));
}
function getCurrentUser() {
  return JSON.parse(localStorage.getItem('crmini_current') || 'null');
}
function setCurrentUser(user) {
  localStorage.setItem('crmini_current', JSON.stringify(user));
}
function clearCurrentUser() {
  localStorage.removeItem('crmini_current');
}
function genId() {
  return Math.random().toString(36).substr(2,9) + Date.now().toString(36);
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'success') {
  const existing = document.getElementById('toast-el');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast-el';
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3000);
}

// ============================================================
// AUTH
// ============================================================
function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}
function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Preencha todos os campos', 'error'); return; }
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) { showToast('E-mail ou senha inválidos', 'error'); return; }
  setCurrentUser(user);
  goToApp();
}

function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) { showToast('Preencha todos os campos', 'error'); return; }
  if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
  const users = getUsers();
  if (users.find(u => u.email === email)) { showToast('E-mail já cadastrado', 'error'); return; }
  const user = { id: genId(), name, email, password };
  users.push(user);
  saveUsers(users);
  setCurrentUser(user);
  showToast('Conta criada com sucesso!');
  setTimeout(goToApp, 600);
}

function handleLogout() {
  clearCurrentUser();
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  showToast('Até logo!');
}

function goToApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  const user = getCurrentUser();
  if (user) {
    document.getElementById('sidebar-name').textContent = user.name.split(' ')[0];
    document.getElementById('sidebar-avatar').textContent = user.name.charAt(0).toUpperCase();
  }
  showPage('dashboard');
  updateBadge();
}

// ============================================================
// NAVIGATION
// ============================================================
const pageConfig = {
  dashboard: { title: 'Dashboard', sub: 'Visão geral do sistema' },
  users:     { title: 'Usuários',  sub: 'Gerenciar usuários do sistema' },
  pipeline:  { title: 'Pipeline',  sub: 'Funil de vendas' },
  settings:  { title: 'Configurações', sub: 'Preferências do sistema' },
};

function showPage(page) {
  ['dashboard','users','pipeline','settings'].forEach(p => {
    document.getElementById('page-' + p).style.display = p === page ? 'block' : 'none';
    document.getElementById('nav-' + p).classList.toggle('active', p === page);
  });
  const cfg = pageConfig[page] || {};
  document.getElementById('header-title').textContent = cfg.title || '';
  document.getElementById('header-sub').textContent = cfg.sub || '';
  if (page === 'users') renderUsersTable();
  if (page === 'dashboard') updateStatUsers();
}

function updateStatUsers() {
  // O dashboard atual usa dados de leads, não de usuários.
  // Se futuramente houver um campo para total de usuários no dashboard, adicione o ID 'stat-users' no HTML.
  const el = document.getElementById('stat-users');
  if (el) el.textContent = getUsers().length;
}
function updateBadge() {
  document.getElementById('user-count-badge').textContent = getUsers().length;
}

// ============================================================
// USERS TABLE
// ============================================================
function renderUsersTable() {
  const users = getUsers();
  const wrap = document.getElementById('users-table-wrap');
  updateBadge();
  if (users.length === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fa-solid fa-users"></i></div><p style="font-weight:600;color:#4f46e5;margin:0 0 .4rem;">Nenhum usuário encontrado</p><p style="font-size:.85rem;margin:0;">Clique em "Novo Usuário" para começar.</p></div>`;
    return;
  }
  wrap.innerHTML = `
    <div style="overflow-x:auto;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Usuário</th>
            <th>E-mail</th>
            <th>ID</th>
            <th style="text-align:right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="user-avatar-sm">${u.name.charAt(0).toUpperCase()}</div>
                  <span style="font-weight:600;">${escHtml(u.name)}</span>
                </div>
              </td>
              <td style="color:#6b7280;">${escHtml(u.email)}</td>
              <td><span class="mono" style="font-size:.75rem;color:#a5b4fc;">${u.id.substring(0,8)}…</span></td>
              <td style="text-align:right;">
                <button class="btn-sm btn-edit" onclick="openUserModal('${u.id}')"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                &nbsp;
                <button class="btn-sm btn-delete" onclick="openDeleteModal('${u.id}')"><i class="fa-solid fa-trash"></i> Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
// USER MODAL (CREATE / EDIT)
// ============================================================
function openUserModal(userId = null) {
  document.getElementById('modal-user-id').value = userId || '';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-email').value = '';
  document.getElementById('modal-password').value = '';
  document.getElementById('modal-pw-hint').style.display = userId ? 'block' : 'none';

  if (userId) {
    const user = getUsers().find(u => u.id === userId);
    if (user) {
      document.getElementById('modal-title').textContent = 'Editar Usuário';
      document.getElementById('modal-name').value = user.name;
      document.getElementById('modal-email').value = user.email;
    }
  } else {
    document.getElementById('modal-title').textContent = 'Novo Usuário';
  }
  document.getElementById('user-modal').style.display = 'flex';
}
function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
}
function closeModalOutside(e) {
  if (e.target.id === 'user-modal') closeUserModal();
}

function saveUser() {
  const id = document.getElementById('modal-user-id').value;
  const name = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const password = document.getElementById('modal-password').value;

  if (!name || !email) { showToast('Nome e e-mail são obrigatórios', 'error'); return; }

  let users = getUsers();

  if (id) {
    // Edit
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) { showToast('Usuário não encontrado', 'error'); return; }
    const emailConflict = users.find(u => u.email === email && u.id !== id);
    if (emailConflict) { showToast('E-mail já está em uso', 'error'); return; }
    users[idx].name = name;
    users[idx].email = email;
    if (password) {
      if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
      users[idx].password = password;
    }
    // Update currentUser if editing self
    const cur = getCurrentUser();
    if (cur && cur.id === id) setCurrentUser(users[idx]);
    showToast('Usuário atualizado!');
  } else {
    // Create
    if (!password || password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
    if (users.find(u => u.email === email)) { showToast('E-mail já cadastrado', 'error'); return; }
    users.push({ id: genId(), name, email, password });
    showToast('Usuário criado com sucesso!');
  }

  saveUsers(users);
  closeUserModal();
  renderUsersTable();
  updateBadge();
  updateStatUsers();
}

// ============================================================
// DELETE MODAL
// ============================================================
let deleteTargetId = null;
function openDeleteModal(userId) {
  deleteTargetId = userId;
  const user = getUsers().find(u => u.id === userId);
  if (!user) return;
  document.getElementById('delete-user-name').textContent = user.name;
  document.getElementById('delete-modal').style.display = 'flex';
}
function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('delete-modal').style.display = 'none';
}
function closeDeleteOutside(e) {
  if (e.target.id === 'delete-modal') closeDeleteModal();
}
function confirmDelete() {
  if (!deleteTargetId) return;
  
  const currentUser = getCurrentUser();
  const isDeletingSelf = currentUser && currentUser.id === deleteTargetId;
  
  const users = getUsers().filter(u => u.id !== deleteTargetId);
  saveUsers(users);
  closeDeleteModal();

  if (users.length === 0 || isDeletingSelf) {
    handleLogout();
    if (users.length === 0) {
      showToast('Nenhum usuário restante. Desconectando...', 'error');
    } else {
      showToast('Seu usuário foi excluído. Desconectando...', 'error');
    }
  } else {
    renderUsersTable();
    updateBadge();
    updateStatUsers();
    showToast('Usuário excluído');
  }
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeUserModal();
    closeDeleteModal();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    if (document.getElementById('user-modal').style.display !== 'none') saveUser();
  }
});

// ============================================================
// INIT
// ============================================================
(function init() {
  const user = getCurrentUser();
  const users = getUsers();
  if (user && users.length > 0) {
    goToApp();
  } else {
    clearCurrentUser();
  }
})();
