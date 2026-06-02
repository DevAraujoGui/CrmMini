export function toggleSidebar() {
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

export function initSidebarState() {
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
