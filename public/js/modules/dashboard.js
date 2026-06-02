import { getLeads, getUsers } from './api.js';

export async function updateStatUsers() {
  const el = document.getElementById('stat-users');
  if (el) {
    const users = await getUsers();
    el.textContent = users.length;
  }
}

export async function updateBadge() {
  const users = await getUsers();
  const badge = document.getElementById('user-count-badge');
  if (badge) {
    badge.textContent = users.length;
  }
}

export async function updateDashboardStats() {
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
