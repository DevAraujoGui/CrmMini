import { getLeads } from './api.js';
import { escHtml, showToast } from '../utils.js';
import { openLeadModal } from './leads.js';
import { updateDashboardStats } from './dashboard.js';

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
      
      removePlaceholders();
      
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
        
        targetLeads.splice(newTargetIndex !== -1 ? newTargetIndex : targetLeads.length, 0, { ...draggedLead, stage });
        
        const orders = targetLeads.map((lead, index) => ({
          id: lead.id,
          stage: stage,
          sort_order: index + 1
        }));
        
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
        
        let res = await fetch('/api/leads/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders })
        });
        
        if (!res.ok) {
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
          await renderKanban();
        }
      } catch (err) {
        console.error(err);
        showToast('Erro ao salvar nova posição', 'error');
        await renderKanban();
      }
      
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

export async function renderKanban() {
  const leads = await getLeads();
  const stages = ['new', 'negotiating', 'proposal', 'closed', 'winback'];
  
  stages.forEach(stage => {
    const colCards = document.getElementById(`kanban-cards-${stage}`);
    const colCount = document.getElementById(`kanban-count-${stage}`);
    const colVal = document.getElementById(`kanban-val-${stage}`);
    if (!colCards || !colCount) return;
    
    const stageLeads = leads.filter(l => l.stage === stage).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    colCount.textContent = stageLeads.length;
    
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
      
      let tempBadge = '';
      if (lead.temperature === 'cold') {
        tempBadge = '<span class="lead-badge temp-cold"><i class="fa-solid fa-snowflake"></i> Frio</span>';
      } else if (lead.temperature === 'warm') {
        tempBadge = '<span class="lead-badge temp-warm"><i class="fa-solid fa-bolt"></i> Morno</span>';
      } else if (lead.temperature === 'hot') {
        tempBadge = '<span class="lead-badge temp-hot"><i class="fa-solid fa-fire"></i> Quente</span>';
      }

      let priorityBadge = '';
      if (lead.priority === 'high') {
        priorityBadge = '<span class="lead-badge prio-high">Alta</span>';
      } else if (lead.priority === 'medium') {
        priorityBadge = '<span class="lead-badge prio-medium">Média</span>';
      } else if (lead.priority === 'low') {
        priorityBadge = '<span class="lead-badge prio-low">Baixa</span>';
      }

      const phoneHtml = lead.phone ? `<a href="https://wa.me/${lead.phone.replace(/\D/g, '')}" target="_blank" class="kanban-card-phone" style="color: #25d366; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; margin-top: 4px; text-decoration: none;"><i class="fa-brands fa-whatsapp"></i> ${escHtml(lead.phone)}</a>` : '';
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
        if (e.target.closest('a')) return;
        openLeadModal(lead.id);
      });

      colCards.appendChild(card);
    });
  });

  setupColumnDragListeners();
}

export function openQuickAdd(stage) {
  openLeadModal(null);
  const stageSelect = document.getElementById('modal-lead-stage');
  if (stageSelect) stageSelect.value = stage;
}
