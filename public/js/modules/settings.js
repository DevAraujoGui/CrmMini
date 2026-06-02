import { getLeads, getUsers, getCurrentUser, setCurrentUser } from './api.js';
import { showToast, formatCurrentDate } from '../utils.js';
import { initTheme } from './theme.js';
import { updateBadge } from './dashboard.js';

export async function renderSettings() {
  const user = getCurrentUser();
  if (!user) return;
  
  initTheme();
  
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
  
  try {
    const leads = await getLeads();
    const users = await getUsers();
    
    let totalValue = 0;
    leads.forEach(l => {
      totalValue += parseFloat(l.value) || 0;
    });
    
    const leadsStat = document.getElementById('settings-stat-leads');
    if (leadsStat) leadsStat.textContent = `${leads.length} Lead${leads.length === 1 ? '' : 's'}`;
    
    const usersStat = document.getElementById('settings-stat-users');
    if (usersStat) usersStat.textContent = `${users.length} Usuário${users.length === 1 ? '' : 's'}`;
    
    const valStat = document.getElementById('settings-stat-value');
    if (valStat) valStat.textContent = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  } catch (err) {
    console.error('Error fetching statistics for settings:', err);
  }
}

export async function saveProfileSettings() {
  const nameEl = document.getElementById('settings-user-name');
  const emailEl = document.getElementById('settings-user-email');
  if (!nameEl || !emailEl) return;
  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  
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
    
    const updatedUser = { ...user, name, email };
    setCurrentUser(updatedUser);
    
    const sidebarName = document.getElementById('sidebar-name');
    if (sidebarName) sidebarName.textContent = name.split(' ')[0];
    
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.textContent = name.charAt(0).toUpperCase();
    
    showToast('Perfil atualizado com sucesso!');
    await renderSettings();
  } catch (err) {
    showToast('Erro ao conectar com o servidor', 'error');
  }
}

export async function savePasswordSettings() {
  const currentPwEl = document.getElementById('settings-user-password-current');
  const newPwEl = document.getElementById('settings-user-password-new');
  const confirmPwEl = document.getElementById('settings-user-password-confirm');
  if (!currentPwEl || !newPwEl || !confirmPwEl) return;

  const currentPw = currentPwEl.value;
  const newPw = newPwEl.value;
  const confirmPw = confirmPwEl.value;
  
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
    
    const updatedUser = { ...user, password: newPw };
    setCurrentUser(updatedUser);
    
    currentPwEl.value = '';
    newPwEl.value = '';
    confirmPwEl.value = '';
    
    showToast('Senha atualizada com sucesso!');
  } catch (err) {
    showToast('Erro de conexão com o servidor', 'error');
  }
}

export async function exportData() {
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

export async function importData(event) {
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
      
      const existingLeads = await getLeads();
      const existingUsers = await getUsers();
      
      const existingLeadsMap = new Map(existingLeads.map(l => [l.id, l]));
      const existingUsersMap = new Map(existingUsers.map(u => [u.id, u]));
      
      for (const u of data.users) {
        const hasUser = existingUsersMap.has(u.id);
        const payload = {
          name: u.name,
          email: u.email,
          password: u.password || '123456'
        };
        
        const method = hasUser ? 'PUT' : 'POST';
        const url = hasUser ? `/api/users/${u.id}` : '/api/users';
        
        await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(hasUser ? payload : { id: u.id, ...payload })
        });
      }
      
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
      
      await renderSettings();
      await updateBadge();
    } catch (err) {
      console.error(err);
      showToast('Erro ao ler ou processar arquivo', 'error');
    }
  };
  reader.readAsText(file);
}
