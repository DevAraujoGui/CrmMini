import { getLeads, getUsers, getCurrentUser } from './api.js';
import { handleLogout } from './auth.js';
import { showToast } from '../utils.js';
import { showPage } from '../app.js';

export let deleteTargetId = null;
export let deleteTargetType = null; // 'user' or 'lead'

export async function openDeleteModal(id, type = 'user') {
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

export function closeDeleteModal() {
  deleteTargetId = null;
  deleteTargetType = null;
  document.getElementById('delete-modal').style.display = 'none';
}

export function closeDeleteOutside(e) {
  if (e.target.id === 'delete-modal') closeDeleteModal();
}

export async function confirmDelete() {
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

    const activeItem = document.querySelector('.nav-item.active');
    const activePage = activeItem ? activeItem.id.replace('nav-', '') : 'dashboard';

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
