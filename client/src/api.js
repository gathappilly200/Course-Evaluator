async function request(path) {
  const res = await fetch(`/api${path}`);
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  getStudents: () => request('/students'),
};

export function formatDate(isoDay, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: 'UTC' });
}

export function formatPercent(n) {
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}
