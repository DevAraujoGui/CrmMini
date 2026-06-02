import { setCurrentUser, clearCurrentUser, getCurrentUser } from './api.js';
import { genId, showToast } from '../utils.js';
import { goToApp } from '../app.js';

export function showLogin() {
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('register-form').style.display = 'none';
}

export function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
}

export async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) { showToast('Preencha todos os campos', 'error'); return; }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'E-mail ou senha inválidos', 'error');
      return;
    }
    const user = await res.json();
    setCurrentUser(user);
    await goToApp();
  } catch (err) {
    showToast('Erro ao conectar ao servidor', 'error');
  }
}

export async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!name || !email || !password) { showToast('Preencha todos os campos', 'error'); return; }
  if (password.length < 6) { showToast('Senha deve ter ao menos 6 caracteres', 'error'); return; }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: genId(), name, email, password })
    });
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || 'Erro ao criar conta', 'error');
      return;
    }
    const user = await res.json();
    setCurrentUser({ ...user, password });
    showToast('Conta criada com sucesso!');
    setTimeout(goToApp, 600);
  } catch (err) {
    showToast('Erro de conexão com o servidor', 'error');
  }
}

export function handleLogout() {
  clearCurrentUser();
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  showToast('Até logo!');
}
