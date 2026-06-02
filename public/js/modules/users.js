import { getUsers, getCurrentUser, setCurrentUser } from './api.js';
import { escHtml, showToast, genId } from '../utils.js';
import { updateBadge } from './dashboard.js';
import { openDeleteModal } from './modals.js';

export async function renderUsersTable() {
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
                <button class="btn-sm btn-edit" data-id="${u.id}"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
                &nbsp;
                <button class="btn-sm btn-delete" data-id="${u.id}"><i class="fa-solid fa-trash"></i> Excluir</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

export async function openUserModal(userId = null) {
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

export function closeUserModal() {
  document.getElementById('user-modal').style.display = 'none';
}

export function closeModalOutside(e) {
  if (e.target.id === 'user-modal') closeUserModal();
}

export async function saveUser() {
  const id = document.getElementById('modal-user-id').value;
  const name = document.getElementById('modal-name').value.trim();
  const email = document.getElementById('modal-email').value.trim();
  const password = document.getElementById('modal-password').value;

  if (!name || !email) { showToast('Nome e e-mail são obrigatórios', 'error'); return; }
  if (!id && !password) { showToast('A senha é obrigatória', 'error'); return; }
  if (password && password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

  try {
    if (id) {
      // Edit
      const payload = { name, email };
      if (password) payload.password = password;
      
      // Fetch user's current password if not setting a new one
      if (!password) {
        const users = await getUsers();
        const existing = users.find(u => u.id === id);
        payload.password = existing ? existing.password : '123456';
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
        if (password) cur.password = password;
        setCurrentUser(cur);
      }
      showToast('Usuário atualizado!');
    } else {
      // Create
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
