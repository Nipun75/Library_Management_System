const API_BASE = window.LIBRARY_API_BASE || 'http://localhost:3000/api';

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const booksBody = document.getElementById('books-body');
const bookSearch = document.getElementById('book-search');

function getToken() {
  return sessionStorage.getItem('library_token');
}

function setAuthenticated(user, token) {
  sessionStorage.setItem('library_token', token);
  sessionStorage.setItem('library_user', JSON.stringify(user));
}

function clearAuthenticated() {
  sessionStorage.removeItem('library_token');
  sessionStorage.removeItem('library_user');
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.message || 'Request failed');
  }
  return body;
}

async function loadBooks() {
  const q = encodeURIComponent(bookSearch.value.trim());
  booksBody.innerHTML = '<tr><td colspan="4">Loading…</td></tr>';

  try {
    const books = await api(`/books${q ? `?q=${q}` : ''}`);
    booksBody.innerHTML = books.length
      ? books.map(book => `
        <tr>
          <td>${escapeHtml(book.title)}</td>
          <td>${escapeHtml(book.author)}</td>
          <td>${escapeHtml(book.category || '—')}</td>
          <td>${book.available_quantity} / ${book.quantity}</td>
        </tr>`).join('')
      : '<tr><td colspan="4">No books found.</td></tr>';
    document.getElementById('book-count').textContent = books.length;
  } catch (error) {
    booksBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadDashboard() {
  const user = JSON.parse(sessionStorage.getItem('library_user') || '{}');
  document.getElementById('user-info').textContent = `${user.fullName || user.username || ''} · ${user.role || ''}`;

  try {
    const [books, members, loans] = await Promise.all([
      api('/books'),
      api('/members'),
      api('/loans?status=ISSUED')
    ]);
    document.getElementById('book-count').textContent = books.length;
    document.getElementById('member-count').textContent = members.length;
    document.getElementById('loan-count').textContent = loans.length;
    renderBooks(books);
  } catch (error) {
    booksBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderBooks(books) {
  booksBody.innerHTML = books.length
    ? books.map(book => `
      <tr><td>${escapeHtml(book.title)}</td><td>${escapeHtml(book.author)}</td>
      <td>${escapeHtml(book.category || '—')}</td><td>${book.available_quantity} / ${book.quantity}</td></tr>`).join('')
    : '<tr><td colspan="4">No books found.</td></tr>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[char]));
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';

  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
      })
    });
    setAuthenticated(data.user, data.token);
    showApp();
  } catch (error) {
    loginError.textContent = error.message;
  }
});

document.getElementById('logout').addEventListener('click', () => {
  clearAuthenticated();
  appView.hidden = true;
  loginView.hidden = false;
});

bookSearch.addEventListener('input', loadBooks);

function showApp() {
  loginView.hidden = true;
  appView.hidden = false;
  loadDashboard();
}

if (getToken()) showApp();
