const API = '/api';

function getAdminHeaders() {
  const password = localStorage.getItem('songbook-admin-password');
  return password ? { 'X-Admin-Password': password } : {};
}

export async function fetchSongs() {
  const res = await fetch(`${API}/songs`);
  return res.json();
}

export async function fetchSong(id) {
  const res = await fetch(`${API}/songs/${id}`);
  if (!res.ok) throw new Error('Песня не найдена');
  return res.json();
}

export async function createSong(data) {
  const res = await fetch(`${API}/songs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateSong(id, data) {
  const res = await fetch(`${API}/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteSong(id) {
  const res = await fetch(`${API}/songs/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function fetchSetlists() {
  const res = await fetch(`${API}/setlists`);
  return res.json();
}

export async function fetchSetlist(id) {
  const res = await fetch(`${API}/setlists/${id}`);
  if (!res.ok) throw new Error('Сет-лист не найден');
  return res.json();
}

export async function createSetlist(data) {
  const res = await fetch(`${API}/setlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function updateSetlist(id, data) {
  const res = await fetch(`${API}/setlists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function deleteSetlist(id) {
  const res = await fetch(`${API}/setlists/${id}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export async function verifyAdmin(password) {
  const res = await fetch(`${API}/admin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function importChordPro(text, tags) {
  const res = await fetch(`${API}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
    body: JSON.stringify({ text, tags }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.json();
}

export function getExportUrl() {
  return `${API}/export`;
}
