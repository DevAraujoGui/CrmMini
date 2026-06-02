export function genId() {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

export function showToast(msg, type = 'success') {
  const existing = document.getElementById('toast-el');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'toast-el';
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { if (t.parentNode) t.remove(); }, 3000);
}

export function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function formatCurrentDate() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date();
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
