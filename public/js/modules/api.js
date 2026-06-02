export async function getUsers() {
  try {
    const res = await fetch('/api/users');
    return await res.json();
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
}

export function getCurrentUser() {
  return JSON.parse(localStorage.getItem('crmini_current') || 'null');
}

export function setCurrentUser(user) {
  localStorage.setItem('crmini_current', JSON.stringify(user));
}

export function clearCurrentUser() {
  localStorage.removeItem('crmini_current');
}

export async function getLeads() {
  try {
    const res = await fetch('/api/leads');
    return await res.json();
  } catch (err) {
    console.error('Error fetching leads:', err);
    return [];
  }
}
