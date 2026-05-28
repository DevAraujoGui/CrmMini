// ============================================================
// STORAGE UTILS
// ============================================================
async function getUsers() {
  try {
    const res = await fetch('/api/users');
    return await res.json();
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
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
// LEAD STORAGE UTILS (API BACKED)
// ============================================================
async function getLeads() {
  try {
    const res = await fetch('/api/leads');
    return await res.json();
  } catch (err) {
    console.error('Error fetching leads:', err);
    return [];
  }
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

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Preencha todos os campos', 'error'); return; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'E-mail ou senha inválidos', 'error');
      return;
    }
    const user = await res.json();
    setCurrentUser(user);
    await goToApp();
  } catch (err) {
    showToast('Erro ao conectar ao servidor', 'error');
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) { showToast('Preencha todos os campos', 'error'); return; }
  if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: genId(), name, email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Erro ao criar conta', 'error');
      return;
    }
    const user = await res.json();
    setCurrentUser(user);
    showToast('Conta criada com sucesso!');
    setTimeout(goToApp, 600);
  } catch (err) {
    showToast('Erro de conexão com o servidor', 'error');
  }
}

function handleLogout() {
  clearCurrentUser();
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  showToast('Até logo!');
}

async function goToApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  const user = getCurrentUser();
  if (user) {
    document.getElementById('sidebar-name').textContent = user.name.split(' ')[0];
    document.getElementById('sidebar-avatar').textContent = user.name.charAt(0).toUpperCase();
  }
  await showPage('dashboard');
}

// ============================================================
// NAVIGATION
// ============================================================
const pageConfig = {
  dashboard: { title: 'Dashboard', sub: 'Visão geral do sistema' },
  users:     { title: 'Usuários',  sub: 'Gerenciar usuários do sistema' },
  pipeline:  { title: 'Pipeline',  sub: 'Funil de vendas' },
  whatsapp:  { title: 'WhatsApp',  sub: 'Integração de mensagens' },
  settings:  { title: 'Configurações', sub: 'Preferências do sistema' },
};

async function showPage(page) {
  ['dashboard','users','pipeline','whatsapp','settings'].forEach(p => {
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
}

async function updateStatUsers() {
  const el = document.getElementById('stat-users');
  if (el) {
    const users = await getUsers();
    el.textContent = users.length;
  }
}
async function updateBadge() {
  const users = await getUsers();
  document.getElementById('user-count-badge').textContent = users.length;
}

// ============================================================
// DASHBOARD STATS SYNC
// ============================================================
async function updateDashboardStats() {
  const leads = await getLeads();
  const totalLeads = leads.length;
  const closedLeads = leads.filter(l => l.stage === 'closed').length;
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
  
  let pendingRevenue = 0;
  let closedRevenue = 0;
  
  leads.forEach(l => {
    const val = parseFloat(l.value) || 0;
    if (l.stage === 'closed') {
      closedRevenue += val;
    } else {
      pendingRevenue += val;
    }
  });

  const fmtBrl = val => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  // Update elements if they exist
  const elTotal = document.getElementById('stat-total-leads');
  if (elTotal) elTotal.textContent = totalLeads;
  
  const elClosed = document.getElementById('stat-closed-leads');
  if (elClosed) elClosed.textContent = closedLeads;
  
  const elConv = document.getElementById('stat-conversion-rate');
  if (elConv) elConv.textContent = `${conversionRate}%`;
  
  const elConvDesc = document.getElementById('stat-conversion-desc');
  if (elConvDesc) elConvDesc.textContent = `${closedLeads} de ${totalLeads} leads fechados`;
  
  const elPending = document.getElementById('stat-pending-revenue');
  if (elPending) elPending.textContent = fmtBrl(pendingRevenue);
  
  const elClosedRev = document.getElementById('stat-closed-revenue');
  if (elClosedRev) elClosedRev.textContent = fmtBrl(closedRevenue);

  // Update Bottom Summary Cards
  const sumNew = document.getElementById('summary-count-new');
  if (sumNew) sumNew.textContent = leads.filter(l => l.stage === 'new').length;
  
  const sumNeg = document.getElementById('summary-count-negotiating');
  if (sumNeg) sumNeg.textContent = leads.filter(l => l.stage === 'negotiating').length;
  
  const sumClosed = document.getElementById('summary-count-closed');
  if (sumClosed) sumClosed.textContent = closedLeads;
}

// ============================================================
// KANBAN PIPELINE RENDER
// ============================================================
async function renderKanban() {
  const leads = await getLeads();
  const stages = ['new', 'negotiating', 'closed'];
  
  stages.forEach(stage => {
    const colCards = document.getElementById(`kanban-cards-${stage}`);
    const colCount = document.getElementById(`kanban-count-${stage}`);
    if (!colCards || !colCount) return;
    
    const stageLeads = leads.filter(l => l.stage === stage);
    colCount.textContent = stageLeads.length;
    colCards.innerHTML = '';
    
    stageLeads.forEach(lead => {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.id = `lead-card-${lead.id}`;
      card.setAttribute('ondragstart', `dragLead(event, '${lead.id}')`);
      card.setAttribute('onclick', `openLeadModal('${lead.id}')`);
      
      const formattedValue = Number(lead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
      const sourceClass = lead.source || 'outros';
      const sourceLabel = sourceClass === 'outros' ? 'Outros' : sourceClass.charAt(0).toUpperCase() + sourceClass.slice(1);
      
      card.innerHTML = `
        <div style="margin-bottom: .75rem;">
          <span class="kanban-tag ${sourceClass}">${sourceLabel}</span>
        </div>
        <div class="kanban-card-title">${escHtml(lead.name)}</div>
        <div class="kanban-card-company">${escHtml(lead.company)}</div>
        <div class="kanban-card-value">${formattedValue}</div>
        <div class="kanban-card-footer">
          <div></div>
          <span class="kanban-date">${lead.date || ''}</span>
        </div>
      `;
      colCards.appendChild(card);
    });
  });
}

// ============================================================
// DRAG AND DROP HANDLERS
// ============================================================
let draggedLeadId = null;

function dragLead(event, leadId) {
  draggedLeadId = leadId;
  event.dataTransfer.setData('text/plain', leadId);
  setTimeout(() => {
    const el = document.getElementById(`lead-card-${leadId}`);
    if (el) el.style.opacity = '0.4';
  }, 0);
}

document.addEventListener('dragend', () => {
  if (draggedLeadId) {
    const el = document.getElementById(`lead-card-${draggedLeadId}`);
    if (el) el.style.opacity = '1';
    draggedLeadId = null;
  }
});

function allowDrop(event) {
  event.preventDefault();
}

function dragEnter(event) {
  event.preventDefault();
  const col = event.currentTarget;
  col.style.background = '#eef2ff';
  col.style.borderColor = '#a5b4fc';
}

function dragLeave(event) {
  const col = event.currentTarget;
  col.style.background = '#f8f8ff';
  col.style.borderColor = 'var(--border)';
}

async function dropLead(event, targetStage) {
  event.preventDefault();
  const col = event.currentTarget;
  col.style.background = '#f8f8ff';
  col.style.borderColor = 'var(--border)';
  
  const leadId = draggedLeadId || event.dataTransfer.getData('text/plain');
  if (!leadId) return;
  
  try {
    const leads = await getLeads();
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx !== -1 && leads[idx].stage !== targetStage) {
      const lead = leads[idx];
      lead.stage = targetStage;
      
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead)
      });
      if (res.ok) {
        showToast(`Lead "${lead.name}" movido para ${getStageName(targetStage)}`);
      } else {
        showToast('Erro ao mover lead', 'error');
      }
    }
  } catch (err) {
    showToast('Erro de conexão', 'error');
  }
  
  draggedLeadId = null;
  await renderKanban();
}

function getStageName(stage) {
  switch (stage) {
    case 'new': return 'Novos Leads';
    case 'negotiating': return 'Em Negociação';
    case 'closed': return 'Fechados';
    default: return stage;
  }
}

// ============================================================
// USERS TABLE
// ============================================================
async function renderUsersTable() {
  const users = await getUsers();
  const wrap = document.getElementById('users-table-wrap');
  await updateBadge();
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
async function openUserModal(userId = null) {
  document.getElementById('modal-user-id').value = userId || '';
  document.getElementById('modal-name').value = '';
  document.getElementById('modal-email').value = '';
  document.getElementById('modal-password').value = '';
  document.getElementById('modal-pw-hint').style.display = userId ? 'block' : 'none';

  if (userId) {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
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

async function saveUser() {
  const id = document.getElementById('modal-user-id').value;
  const name = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const password = document.getElementById('modal-password').value;

  if (!name || !email) { showToast('Nome e e-mail são obrigatórios', 'error'); return; }

  try {
    if (id) {
      // Edit
      const payload = { name, email };
      if (password) {
        if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
        payload.password = password;
      }
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Erro ao atualizar usuário', 'error');
        return;
      }
      const cur = getCurrentUser();
      if (cur && cur.id === id) {
        cur.name = name;
        cur.email = email;
        setCurrentUser(cur);
      }
      showToast('Usuário atualizado!');
    } else {
      // Create
      if (!password || password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: genId(), name, email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Erro ao criar usuário', 'error');
        return;
      }
      showToast('Usuário criado com sucesso!');
    }

    closeUserModal();
    await renderUsersTable();
  } catch (err) {
    showToast('Erro de conexão', 'error');
  }
}

// ============================================================
// DELETE MODAL (DYNAMIC: user / lead)
// ============================================================
let deleteTargetId = null;
let deleteTargetType = null; // 'user' or 'lead'

async function openDeleteModal(id, type = 'user') {
  deleteTargetId = id;
  deleteTargetType = type;

  const nameEl = document.getElementById('delete-user-name');
  const titleEl = document.getElementById('delete-modal-label');

  if (type === 'lead') {
    const leads = await getLeads();
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    nameEl.textContent = lead.name;
    if (titleEl) titleEl.textContent = 'o lead';
  } else {
    const users = await getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return;
    nameEl.textContent = user.name;
    if (titleEl) titleEl.textContent = 'o usuário';
  }

  document.getElementById('delete-modal').style.display = 'flex';
}

function closeDeleteModal() {
  deleteTargetId = null;
  deleteTargetType = null;
  document.getElementById('delete-modal').style.display = 'none';
}
function closeDeleteOutside(e) {
  if (e.target.id === 'delete-modal') closeDeleteModal();
}

async function confirmDelete() {
  if (!deleteTargetId || !deleteTargetType) return;

  const endpoint = deleteTargetType === 'lead'
    ? `/api/leads/${deleteTargetId}`
    : `/api/users/${deleteTargetId}`;

  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (!res.ok) {
      showToast(`Erro ao excluir ${deleteTargetType === 'lead' ? 'lead' : 'usuário'}`, 'error');
      return;
    }
    closeDeleteModal();

    if (deleteTargetType === 'lead') {
      showToast('Lead excluído');
      const activePage = document.querySelector('.nav-item.active').id.replace('nav-', '');
      if (activePage === 'pipeline') await renderKanban();
      if (activePage === 'dashboard') {
        await updateStatUsers();
        await updateDashboardStats();
      }
    } else {
      const currentUser = getCurrentUser();
      const isDeletingSelf = currentUser && currentUser.id === deleteTargetId;
      const users = await getUsers();
      if (users.length === 0 || isDeletingSelf) {
        handleLogout();
        if (users.length === 0) {
          showToast('Nenhum usuário restante. Desconectando...', 'error');
        } else {
          showToast('Seu usuário foi excluído. Desconectando...', 'error');
        }
      } else {
        await renderUsersTable();
        showToast('Usuário excluído');
      }
    }
  } catch (err) {
    showToast('Erro de rede', 'error');
  }
}

// ============================================================
// LEAD MODAL (CREATE / EDIT / DELETE)
// ============================================================
async function openLeadModal(leadId = null) {
  document.getElementById('modal-lead-id').value = leadId || '';
  document.getElementById('modal-lead-name').value = '';
  document.getElementById('modal-lead-company').value = '';
  document.getElementById('modal-lead-value').value = '';
  document.getElementById('modal-lead-source').value = 'whatsapp';
  document.getElementById('modal-lead-stage').value = 'new';
  
  const deleteBtn = document.getElementById('btn-delete-lead');
  
  if (leadId) {
    const leads = await getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      document.getElementById('lead-modal-title').textContent = 'Editar Lead';
      document.getElementById('modal-lead-name').value = lead.name;
      document.getElementById('modal-lead-company').value = lead.company;
      document.getElementById('modal-lead-value').value = lead.value;
      document.getElementById('modal-lead-source').value = lead.source || 'whatsapp';
      document.getElementById('modal-lead-stage').value = lead.stage || 'new';
      if (deleteBtn) deleteBtn.style.display = 'block';
    }
  } else {
    document.getElementById('lead-modal-title').textContent = 'Novo Lead';
    if (deleteBtn) deleteBtn.style.display = 'none';
  }
  document.getElementById('lead-modal').style.display = 'flex';
}

function closeLeadModal() {
  document.getElementById('lead-modal').style.display = 'none';
}

function closeLeadModalOutside(e) {
  if (e.target.id === 'lead-modal') closeLeadModal();
}

function formatCurrentDate() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

async function saveLead() {
  const id = document.getElementById('modal-lead-id').value;
  const name = document.getElementById('modal-lead-name').value.trim();
  const company = document.getElementById('modal-lead-company').value.trim();
  const value = parseFloat(document.getElementById('modal-lead-value').value) || 0;
  const source = document.getElementById('modal-lead-source').value;
  const stage = document.getElementById('modal-lead-stage').value;
  
  if (!name || !company) {
    showToast('Nome e Empresa são obrigatórios', 'error');
    return;
  }
  
  try {
    if (id) {
      // Edit
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, company, value, source, stage })
      });
      if (!res.ok) {
        showToast('Erro ao atualizar lead', 'error');
        return;
      }
      showToast('Lead atualizado!');
    } else {
      // Create
      const newLead = {
        id: genId(),
        name,
        company,
        value,
        source,
        stage,
        date: formatCurrentDate()
      };
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLead)
      });
      if (!res.ok) {
        showToast('Erro ao criar lead', 'error');
        return;
      }
      showToast('Lead criado com sucesso!');
    }
    
    closeLeadModal();
    
    const activePage = document.querySelector('.nav-item.active').id.replace('nav-', '');
    if (activePage === 'pipeline') await renderKanban();
    if (activePage === 'dashboard') {
      await updateStatUsers();
      await updateDashboardStats();
    }
  } catch (err) {
    showToast('Erro de conexão', 'error');
  }
}

async function deleteLeadFromModal() {
  const id = document.getElementById('modal-lead-id').value;
  if (!id) return;
  
  // Close the edit modal first, then open the premium confirmation modal
  closeLeadModal();
  await openDeleteModal(id, 'lead');
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
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

// ============================================================
// INIT
// ============================================================
(async function init() {
  const user = getCurrentUser();
  if (user) {
    // Validate that the user session is still active/valid in backend
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
