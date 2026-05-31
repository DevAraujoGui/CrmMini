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
    setCurrentUser({ ...user, password });
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

// ============================================================
// NAVIGATION
// ============================================================
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const icon = document.getElementById('toggle-icon');
  
  if (!sidebar || !main) return;
  
  const isCollapsed = sidebar.classList.toggle('collapsed');
  main.classList.toggle('sidebar-collapsed', isCollapsed);
  
  if (icon) {
    if (isCollapsed) {
      icon.className = 'fa-solid fa-angles-right';
    } else {
      icon.className = 'fa-solid fa-bars';
    }
  }
  
  localStorage.setItem('crmini_sidebar_collapsed', isCollapsed ? 'true' : 'false');
}

function initSidebarState() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('main');
  const icon = document.getElementById('toggle-icon');
  const collapsedSaved = localStorage.getItem('crmini_sidebar_collapsed') === 'true';
  
  if (sidebar && main) {
    sidebar.classList.toggle('collapsed', collapsedSaved);
    main.classList.toggle('sidebar-collapsed', collapsedSaved);
    if (icon) {
      icon.className = collapsedSaved ? 'fa-solid fa-angles-right' : 'fa-solid fa-bars';
    }
  }
}
// Run on app load in goToApp
async function goToApp() {
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
  if (page === 'settings') await renderSettings();
  // Ensure the user count badge is always up-to-date
  await updateBadge();
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

  // Update Lead Source Chart
  const countWhatsapp = leads.filter(l => l.source === 'whatsapp').length;
  const countInstagram = leads.filter(l => l.source === 'instagram').length;
  const countFacebook = leads.filter(l => l.source === 'facebook').length;
  const countOutros = leads.filter(l => l.source === 'outros' || !l.source || (l.source !== 'whatsapp' && l.source !== 'instagram' && l.source !== 'facebook')).length;

  const pctWhatsapp = totalLeads > 0 ? Math.round((countWhatsapp / totalLeads) * 100) : 0;
  const pctInstagram = totalLeads > 0 ? Math.round((countInstagram / totalLeads) * 100) : 0;
  const pctFacebook = totalLeads > 0 ? Math.round((countFacebook / totalLeads) * 100) : 0;
  const pctOutros = totalLeads > 0 ? Math.round((countOutros / totalLeads) * 100) : 0;

  const updateElPctAndBar = (source, pct) => {
    const pctEl = document.getElementById(`source-pct-${source}`);
    const barEl = document.getElementById(`source-bar-${source}`);
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;
  };

  updateElPctAndBar('whatsapp', pctWhatsapp);
  updateElPctAndBar('instagram', pctInstagram);
  updateElPctAndBar('facebook', pctFacebook);
  updateElPctAndBar('outros', pctOutros);

  // Update Sales Chart
  const monthlySales = { Jan: 0, Fev: 0, Mar: 0, Abr: 0, Mai: 0 };
  leads.filter(l => l.stage === 'closed').forEach(l => {
    if (l.date) {
      const m = l.date.split(' ')[0];
      if (monthlySales[m] !== undefined) {
        monthlySales[m] += 1;
      }
    }
  });

  const maxSale = Math.max(...Object.values(monthlySales), 0);
  const maxMonth = Object.keys(monthlySales).reduce((a, b) => monthlySales[a] >= monthlySales[b] ? a : b, 'Jan');

  Object.keys(monthlySales).forEach(m => {
    const val = monthlySales[m];
    const heightPct = maxSale > 0 ? Math.round((val / maxSale) * 100) : 0;
    const lowerM = m.toLowerCase();
    const bar = document.getElementById(`sales-bar-${lowerM}`);
    if (bar) {
      bar.style.height = `${val > 0 ? Math.max(heightPct, 8) : 0}%`;
      bar.title = `Leads fechados em ${m}: ${val}`;
      
      if (val > 0 && m === maxMonth) {
        bar.style.background = 'var(--indigo)';
        bar.style.boxShadow = '0 4px 12px rgba(79,70,229,.2)';
      } else {
        bar.style.background = val > 0 ? '#c7d2fe' : '#e0e7ff';
        bar.style.boxShadow = 'none';
      }
    }
  });
}

// ============================================================
// KANBAN PIPELINE RENDER
// ============================================================
async function renderKanban() {
  const leads = await getLeads();
  const stages = ['new', 'negotiating', 'proposal', 'closed', 'winback'];
  
  stages.forEach(stage => {
    const colCards = document.getElementById(`kanban-cards-${stage}`);
    const colCount = document.getElementById(`kanban-count-${stage}`);
    const colVal = document.getElementById(`kanban-val-${stage}`);
    if (!colCards || !colCount) return;
    
    // Sort leads by sort_order
    const stageLeads = leads.filter(l => l.stage === stage).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    colCount.textContent = stageLeads.length;
    
    // Calculate total value for this column
    const totalValue = stageLeads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
    if (colVal) {
      colVal.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    }

    colCards.innerHTML = '';
    
    stageLeads.forEach(lead => {
      const card = document.createElement('div');
      card.className = 'kanban-card';
      card.draggable = true;
      card.id = `lead-card-${lead.id}`;
      card.dataset.id = lead.id;
      
      const formattedValue = Number(lead.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
      const sourceClass = lead.source || 'outros';
      const sourceLabel = sourceClass === 'outros' ? 'Outros' : sourceClass.charAt(0).toUpperCase() + sourceClass.slice(1);
      
      // Determine temperature badge
      let tempBadge = '';
      if (lead.temperature === 'hot') {
        tempBadge = '<span class="lead-badge temp-hot"><i class="fa-solid fa-fire"></i> Quente</span>';
      } else if (lead.temperature === 'warm') {
        tempBadge = '<span class="lead-badge temp-warm"><i class="fa-solid fa-bolt"></i> Morno</span>';
      } else if (lead.temperature === 'cold') {
        tempBadge = '<span class="lead-badge temp-cold"><i class="fa-solid fa-snowflake"></i> Frio</span>';
      }

      // Determine priority badge
      let priorityBadge = '';
      if (lead.priority === 'high') {
        priorityBadge = '<span class="lead-badge prio-high">Alta</span>';
      } else if (lead.priority === 'medium') {
        priorityBadge = '<span class="lead-badge prio-medium">Média</span>';
      } else if (lead.priority === 'low') {
        priorityBadge = '<span class="lead-badge prio-low">Baixa</span>';
      }

      // Custom phone number action icon if exists
      const phoneHtml = lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/\D/g, '')}" target="_blank" class="kanban-card-phone" onclick="event.stopPropagation();" style="color: #25d366; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i> ${escHtml(lead.phone)}</a>` : '';

      // Notes preview truncated
      const notesPreview = lead.custom_notes ? `<div class="kanban-card-notes-preview" title="${escHtml(lead.custom_notes)}">${escHtml(lead.custom_notes)}</div>` : '';

      card.innerHTML = `
        <div style="margin-bottom: .5rem; display: flex; justify-content: space-between; align-items: center;">
          <span class="kanban-tag ${sourceClass}">${sourceLabel}</span>
          <span class="kanban-date">${lead.date || ''}</span>
        </div>
        <div class="kanban-card-title">${escHtml(lead.name)}</div>
        <div class="kanban-card-company"><i class="fa-regular fa-building" style="font-size: 0.72rem; opacity: 0.7;"></i> ${escHtml(lead.company)}</div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 0.6rem;">
          ${tempBadge}
          ${priorityBadge}
        </div>

        ${notesPreview}
        
        <div class="kanban-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div class="kanban-card-value">${formattedValue}</div>
          ${phoneHtml}
        </div>
      `;
      
      // Events for individual cards
      card.addEventListener('dragstart', (e) => {
        draggedLeadId = lead.id;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', lead.id);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedLeadId = null;
        removePlaceholders();
      });

      card.addEventListener('click', (e) => {
        openLeadModal(lead.id);
      });

      colCards.appendChild(card);
    });
  });

  setupColumnDragListeners();
}

// ============================================================
// DRAG AND DROP HANDLERS (NOTION STYLE)
// ============================================================
let draggedLeadId = null;
let activePlaceholder = null;

function removePlaceholders() {
  const placeholders = document.querySelectorAll('.kanban-placeholder');
  placeholders.forEach(p => p.remove());
  activePlaceholder = null;
  
  // Remove drag over highlights from columns
  const cols = document.querySelectorAll('.kanban-column');
  cols.forEach(c => c.classList.remove('drag-over'));
}

function setupColumnDragListeners() {
  const columns = document.querySelectorAll('.kanban-column');
  
  columns.forEach(col => {
    const stage = col.id.replace('col-', '');
    const cardsContainer = col.querySelector('.kanban-cards');
    
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      col.classList.add('drag-over');
      
      // Find where to insert placeholder
      const afterElement = getDragAfterElement(cardsContainer, e.clientY);
      
      // Get or create placeholder
      if (!activePlaceholder) {
        activePlaceholder = document.createElement('div');
        activePlaceholder.className = 'kanban-placeholder';
        // Height of the placeholder matches typical dragging card height
        activePlaceholder.style.height = '100px';
        activePlaceholder.style.marginBottom = '0.6rem';
      }
      
      if (afterElement == null) {
        cardsContainer.appendChild(activePlaceholder);
      } else {
        cardsContainer.insertBefore(activePlaceholder, afterElement);
      }
    });
    
    col.addEventListener('dragleave', (e) => {
      // Only remove highlight if leaving the column boundary
      const rect = col.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
        col.classList.remove('drag-over');
      }
    });
    
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      
      const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
      if (!leadId) return;

      // OPTIMISTIC UI: Find the dragged card element and insert it directly into the DOM
      const cardEl = document.getElementById(`lead-card-${leadId}`);
      const cardsContainer = col.querySelector('.kanban-cards');
      if (cardEl && cardsContainer) {
        if (activePlaceholder && activePlaceholder.parentNode === cardsContainer) {
          cardsContainer.insertBefore(cardEl, activePlaceholder);
        } else {
          const afterElement = getDragAfterElement(cardsContainer, e.clientY);
          if (afterElement == null) {
            cardsContainer.appendChild(cardEl);
          } else {
            cardsContainer.insertBefore(cardEl, afterElement);
          }
        }
      }
      
      // Clean up drag UI elements immediately
      removePlaceholders();
      
      // Process database updates asynchronously in the background
      try {
        const leads = await getLeads();
        const draggedLead = leads.find(l => l.id === leadId);
        if (!draggedLead) return;
        
        // Recalculate positions based on the new visual order in the DOM
        const targetCardElements = Array.from(cardsContainer.querySelectorAll('.kanban-card'));
        const newTargetIndex = targetCardElements.indexOf(cardEl);
        
        let targetLeads = leads
          .filter(l => l.stage === stage && l.id !== leadId)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        // Insert dragged lead at calculated visual position
        targetLeads.splice(newTargetIndex !== -1 ? newTargetIndex : targetLeads.length, 0, { ...draggedLead, stage });
        
        // Build reorder updates array
        const orders = targetLeads.map((lead, index) => ({
          id: lead.id,
          stage: stage,
          sort_order: index + 1
        }));
        
        // If it came from another stage, update that stage's ordering to prevent gaps
        if (draggedLead.stage !== stage) {
          const oldStageLeads = leads
            .filter(l => l.stage === draggedLead.stage && l.id !== leadId)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
            
          oldStageLeads.forEach((lead, index) => {
            orders.push({
              id: lead.id,
              stage: draggedLead.stage,
              sort_order: index + 1
            });
          });
        }
        
        // Send batch update to API
        let res = await fetch('/api/leads/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders })
        });
        
        if (!res.ok) {
          // Fallback to single lead stage update
          draggedLead.stage = stage;
          res = await fetch(`/api/leads/${leadId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draggedLead)
          });
        }
        
        if (res.ok) {
          showToast(`Lead "${draggedLead.name}" movido com sucesso`);
        } else {
          showToast('Erro ao salvar nova posição', 'error');
          // If save failed, revert UI by re-rendering
          await renderKanban();
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao salvar nova posição', 'error');
        await renderKanban();
      }
      
      // Update totals/counts and background data structures without a full card destruction/re-render
      const leads = await getLeads();
      const stages = ['new', 'negotiating', 'proposal', 'closed', 'winback'];
      stages.forEach(s => {
        const colCount = document.getElementById(`kanban-count-${s}`);
        const colVal = document.getElementById(`kanban-val-${s}`);
        if (!colCount) return;
        
        const stageLeads = leads.filter(l => l.stage === s);
        colCount.textContent = stageLeads.length;
        
        const totalValue = stageLeads.reduce((sum, l) => sum + (parseFloat(l.value) || 0), 0);
        if (colVal) {
          colVal.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
        }
      });
      
      await updateDashboardStats();
    });
  });
}

// Find closest element relative to pointer position
function getDragAfterElement(container, y) {
  const draggableElements = Array.from(container.querySelectorAll('.kanban-card:not(.dragging)'));
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function openQuickAdd(stage) {
  openLeadModal(null);
  document.getElementById('modal-lead-stage').value = stage;
}

// ============================================================
// USERS TABLE
// ============================================================
async function renderUsersTable() {
  let users = [];
  try {
    users = await getUsers();
  } catch (err) {
    console.error('Failed to fetch users:', err);
  }
  const wrap = document.getElementById('users-table-wrap');
  await updateBadge();
  // Fallback: if DB returns empty but a logged-in user exists, show that user
  if (users.length === 0) {
    const current = getCurrentUser();
    if (current) {
      users.push({ id: current.id, name: current.name, email: current.email });
    }
  }
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

  if (!name || !email || !password) { showToast('Nome, e-mail e senha são obrigatórios', 'error'); return; }
  if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

  try {
    if (id) {
      // Edit
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
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

  const targetId = deleteTargetId;
  const targetType = deleteTargetType;
  const endpoint = targetType === 'lead'
    ? `/api/leads/${targetId}`
    : `/api/users/${targetId}`;

  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (!res.ok) {
      showToast(`Erro ao excluir ${targetType === 'lead' ? 'lead' : 'usuário'}`, 'error');
      return;
    }
    closeDeleteModal();

    const activePage = document.querySelector('.nav-item.active').id.replace('nav-', '');

    if (targetType === 'lead') {
      showToast('Lead excluído');
      await showPage(activePage);
    } else {
      const currentUser = getCurrentUser();
      const isDeletingSelf = currentUser && currentUser.id === targetId;
      const users = await getUsers();
      if (users.length === 0 || isDeletingSelf) {
        handleLogout();
        if (users.length === 0) {
          showToast('Nenhum usuário restante. Desconectando...', 'error');
        } else {
          showToast('Seu usuário foi excluído. Desconectando...', 'error');
        }
      } else {
        await showPage(activePage);
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
  document.getElementById('modal-lead-phone').value = '';
  document.getElementById('modal-lead-temperature').value = 'warm';
  document.getElementById('modal-lead-priority').value = 'medium';
  document.getElementById('modal-lead-notes').value = '';
  
  const deleteBtn = document.getElementById('btn-delete-lead');
  const idContainer = document.getElementById('lead-id-container');
  const idDisplay = document.getElementById('lead-id-display');
  
  if (leadId) {
    const leads = await getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      if (idContainer && idDisplay) {
        idContainer.style.display = 'grid'; // Align to the CSS grid in the new Notion property modal
        idDisplay.textContent = lead.id;
      }
      document.getElementById('modal-lead-name').value = lead.name;
      document.getElementById('modal-lead-company').value = lead.company;
      document.getElementById('modal-lead-value').value = lead.value;
      document.getElementById('modal-lead-source').value = lead.source || 'whatsapp';
      document.getElementById('modal-lead-stage').value = lead.stage || 'new';
      document.getElementById('modal-lead-phone').value = lead.phone || '';
      document.getElementById('modal-lead-temperature').value = lead.temperature || 'warm';
      document.getElementById('modal-lead-priority').value = lead.priority || 'medium';
      document.getElementById('modal-lead-notes').value = lead.custom_notes || '';
      if (deleteBtn) deleteBtn.style.display = 'block';
    }
  } else {
    if (idContainer) idContainer.style.display = 'none';
    if (deleteBtn) deleteBtn.style.display = 'none';
    document.getElementById('modal-lead-name').placeholder = 'Novo Lead (Sem título)';
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
  const phone = document.getElementById('modal-lead-phone').value.trim();
  const temperature = document.getElementById('modal-lead-temperature').value;
  const priority = document.getElementById('modal-lead-priority').value;
  const custom_notes = document.getElementById('modal-lead-notes').value.trim();
  
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
        body: JSON.stringify({ name, company, value, source, stage, phone, temperature, priority, custom_notes })
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
        phone,
        temperature,
        priority,
        custom_notes,
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
// SETTINGS
// ============================================================
function toggleTheme() {
  const checkbox = document.getElementById('theme-toggle');
  const isDark = checkbox.checked;
  if (isDark) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('crmini_theme', 'dark');
    document.getElementById('theme-status-text').textContent = 'Ativado';
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('crmini_theme', 'light');
    document.getElementById('theme-status-text').textContent = 'Desativado';
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('crmini_theme') || 'light';
  const checkbox = document.getElementById('theme-toggle');
  const statusText = document.getElementById('theme-status-text');
  
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (checkbox) checkbox.checked = true;
    if (statusText) statusText.textContent = 'Ativado';
  } else {
    document.body.classList.remove('dark-mode');
    if (checkbox) checkbox.checked = false;
    if (statusText) statusText.textContent = 'Desativado';
  }
}

async function renderSettings() {
  const user = getCurrentUser();
  if (!user) return;
  
  // Checkboxes
  initTheme();
  
  // Database Health Check
  const dbStatusEl = document.getElementById('settings-db-status');
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      const health = await res.json();
      if (health.database === 'connected') {
        dbStatusEl.innerHTML = `<i class="fa-solid fa-circle" style="font-size:0.75rem; margin-right:4px;"></i> SQLite Conectado`;
        dbStatusEl.style.color = 'var(--success)';
      } else {
        dbStatusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="font-size:0.75rem; margin-right:4px;"></i> SQLite Erro Interno`;
        dbStatusEl.style.color = 'var(--danger)';
      }
    } else {
      dbStatusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="font-size:0.75rem; margin-right:4px;"></i> SQLite Desconectado`;
      dbStatusEl.style.color = 'var(--danger)';
    }
  } catch (err) {
    dbStatusEl.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="font-size:0.75rem; margin-right:4px;"></i> SQLite Desconectado`;
    dbStatusEl.style.color = 'var(--danger)';
  }
  
  // System Stats
  try {
    const leads = await getLeads();
    const users = await getUsers();
    
    let totalValue = 0;
    leads.forEach(l => {
      totalValue += parseFloat(l.value) || 0;
    });
    
    document.getElementById('settings-stat-leads').textContent = `${leads.length} Lead${leads.length === 1 ? '' : 's'}`;
    document.getElementById('settings-stat-users').textContent = `${users.length} Usuário${users.length === 1 ? '' : 's'}`;
    document.getElementById('settings-stat-value').textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  } catch (err) {
    console.error('Error fetching statistics for settings:', err);
  }
}

async function saveProfileSettings() {
  const name = document.getElementById('settings-user-name').value.trim();
  const email = document.getElementById('settings-user-email').value.trim();
  
  if (!name || !email) {
    showToast('Nome completo e E-mail são obrigatórios', 'error');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) return;
  
  const password = user.password;
  if (!password) {
    showToast('Erro interno: Senha de confirmação indisponível na sessão. Por favor, refaça o login.', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Erro ao salvar alterações do perfil', 'error');
      return;
    }
    
    // Update local session
    const updatedUser = { ...user, name, email };
    setCurrentUser(updatedUser);
    
    // Update Sidebar elements
    document.getElementById('sidebar-name').textContent = name.split(' ')[0];
    document.getElementById('sidebar-avatar').textContent = name.charAt(0).toUpperCase();
    
    showToast('Perfil atualizado com sucesso!');
    await renderSettings();
  } catch (err) {
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

async function savePasswordSettings() {
  const currentPw = document.getElementById('settings-user-password-current').value;
  const newPw = document.getElementById('settings-user-password-new').value;
  const confirmPw = document.getElementById('settings-user-password-confirm').value;
  
  if (!currentPw || !newPw || !confirmPw) {
    showToast('Preencha todos os campos de senha', 'error');
    return;
  }
  
  if (newPw.length < 6) {
    showToast('A nova senha deve ter no mínimo 6 caracteres', 'error');
    return;
  }
  
  if (newPw !== confirmPw) {
    showToast('A nova senha e a confirmação não coincidem', 'error');
    return;
  }
  
  const user = getCurrentUser();
  if (!user) return;
  
  if (currentPw !== user.password) {
    showToast('A senha atual digitada está incorreta', 'error');
    return;
  }
  
  try {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: user.name, email: user.email, password: newPw })
    });
    
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Erro ao atualizar a senha', 'error');
      return;
    }
    
    // Update local session
    const updatedUser = { ...user, password: newPw };
    setCurrentUser(updatedUser);
    
    // Clear inputs
    document.getElementById('settings-user-password-current').value = '';
    document.getElementById('settings-user-password-new').value = '';
    document.getElementById('settings-user-password-confirm').value = '';
    
    showToast('Senha atualizada com sucesso!');
  } catch (err) {
    showToast('Erro de conexão com o servidor', 'error');
  }
}

async function exportData() {
  try {
    const leads = await getLeads();
    const users = await getUsers();
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ leads, users, exportedAt: new Date().toISOString() }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `crmini-backup-${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Dados exportados com sucesso!');
  } catch (err) {
    showToast('Erro ao exportar dados', 'error');
  }
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.leads || !data.users) {
        showToast('Formato de backup inválido!', 'error');
        return;
      }
      
      showToast('Importando dados, aguarde...');
      
      // Fetch existing items for comparison
      const existingLeads = await getLeads();
      const existingUsers = await getUsers();
      
      const existingLeadsMap = new Map(existingLeads.map(l => [l.id, l]));
      const existingUsersMap = new Map(existingUsers.map(u => [u.id, u]));
      
      // Import Users
      for (const u of data.users) {
        const hasUser = existingUsersMap.has(u.id);
        const payload = {
          name: u.name,
          email: u.email,
          password: u.password || '123456' // Fallback safe password
        };
        
        const method = hasUser ? 'PUT' : 'POST';
        const url = hasUser ? `/api/users/${u.id}` : '/api/users';
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hasUser ? payload : { id: u.id, ...payload })
        });
      }
      
      // Import Leads
      for (const l of data.leads) {
        const hasLead = existingLeadsMap.has(l.id);
        const payload = {
          name: l.name,
          company: l.company,
          value: parseFloat(l.value) || 0,
          source: l.source || 'outros',
          stage: l.stage || 'new',
          date: l.date || formatCurrentDate()
        };
        
        const method = hasLead ? 'PUT' : 'POST';
        const url = hasLead ? `/api/leads/${l.id}` : '/api/leads';
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hasLead ? payload : { id: l.id, ...payload })
        });
      }
      
      showToast('Importação concluída com sucesso!');
      
      // Reload stats and sidebar
      await renderSettings();
      await updateBadge();
    } catch (err) {
      console.error(err);
      showToast('Erro ao ler ou processar arquivo', 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================
// INIT
// ============================================================
(async function init() {
  initTheme(); // Apply dark mode if preferred
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
