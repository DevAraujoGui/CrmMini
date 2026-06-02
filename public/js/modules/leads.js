import { getLeads } from './api.js';
import { showToast, genId, formatCurrentDate } from '../utils.js';
import { openDeleteModal } from './modals.js';
import { renderKanban } from './kanban.js';
import { updateDashboardStats, updateStatUsers } from './dashboard.js';

export async function openLeadModal(leadId = null) {
  document.getElementById('modal-lead-id').value = leadId || '';
  document.getElementById('modal-lead-name').value = '';
  document.getElementById('modal-lead-company').value = '';
  document.getElementById('modal-lead-value').value = '';
  document.getElementById('modal-lead-source').value = 'whatsapp';
  document.getElementById('modal-lead-stage').value = 'new';
  document.getElementById('modal-lead-phone').value = '';
  document.getElementById('modal-lead-temperature').value = '';
  document.getElementById('modal-lead-priority').value = '';
  document.getElementById('modal-lead-notes').value = '';
  
  const deleteBtn = document.getElementById('btn-delete-lead');
  const idContainer = document.getElementById('lead-id-container');
  const idDisplay = document.getElementById('lead-id-display');
  
  if (leadId) {
    const leads = await getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      if (idContainer && idDisplay) {
        idContainer.style.display = 'grid';
        idDisplay.textContent = lead.id;
      }
      document.getElementById('modal-lead-name').value = lead.name;
      document.getElementById('modal-lead-company').value = lead.company;
      document.getElementById('modal-lead-value').value = lead.value || '';
      document.getElementById('modal-lead-source').value = lead.source || 'whatsapp';
      document.getElementById('modal-lead-stage').value = lead.stage || 'new';
      document.getElementById('modal-lead-phone').value = lead.phone || '';
      document.getElementById('modal-lead-temperature').value = lead.temperature || '';
      document.getElementById('modal-lead-priority').value = lead.priority || '';
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

export function closeLeadModal() {
  document.getElementById('lead-modal').style.display = 'none';
}

export function closeLeadModalOutside(e) {
  if (e.target.id === 'lead-modal') closeLeadModal();
}

export async function saveLead() {
  const id = document.getElementById('modal-lead-id').value;
  const nameInput = document.getElementById('modal-lead-name').value.trim();
  const name = nameInput || 'Sem título';
  const company = document.getElementById('modal-lead-company').value.trim();
  const value = parseFloat(document.getElementById('modal-lead-value').value) || 0;
  const source = document.getElementById('modal-lead-source').value;
  const stage = document.getElementById('modal-lead-stage').value;
  const phone = document.getElementById('modal-lead-phone').value.trim();
  const temperature = document.getElementById('modal-lead-temperature').value;
  const priority = document.getElementById('modal-lead-priority').value;
  const custom_notes = document.getElementById('modal-lead-notes').value.trim();
  
  if (!company) {
    showToast('Empresa é obrigatória', 'error');
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
    
    const activeItem = document.querySelector('.nav-item.active');
    const activePage = activeItem ? activeItem.id.replace('nav-', '') : 'dashboard';
    
    if (activePage === 'pipeline') await renderKanban();
    if (activePage === 'dashboard') {
      await updateStatUsers();
      await updateDashboardStats();
    }
  } catch (err) {
    showToast('Erro de conexão', 'error');
  }
}

export async function deleteLeadFromModal() {
  const id = document.getElementById('modal-lead-id').value;
  if (!id) return;
  
  closeLeadModal();
  await openDeleteModal(id, 'lead');
}
