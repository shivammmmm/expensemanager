export function getLocalToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('token') || window.localStorage.getItem('access_token');
}

export function setLocalToken(token) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('token', token);
}

export function clearLocalToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('token');
  window.localStorage.removeItem('access_token');
}

