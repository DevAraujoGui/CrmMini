export function toggleTheme() {
  const checkbox = document.getElementById('theme-toggle');
  const isDark = checkbox.checked;
  if (isDark) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('crmini_theme', 'dark');
    const textEl = document.getElementById('theme-status-text');
    if (textEl) textEl.textContent = 'Ativado';
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('crmini_theme', 'light');
    const textEl = document.getElementById('theme-status-text');
    if (textEl) textEl.textContent = 'Desativado';
  }
}

export function initTheme() {
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
