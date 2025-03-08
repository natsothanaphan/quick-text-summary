const authHeader = (token) => ({ 'Authorization': `Bearer ${token}` });
const jsonHeader = () => ({ 'Content-Type': 'application/json' });

const summarize = async (token, text) => {
  console.log('api summarize start', { text });
  const resp = await fetch(`/api/summarize`, {
    method: 'POST',
    headers: { ...authHeader(token), ...jsonHeader() },
    body: JSON.stringify({ text }),
  });
  if (!resp.ok) {
    const errData = await resp.json();
    console.error('api summarize error', { errData });
    throw Error(errData.error || 'Unknown error');
  }
  const data = await resp.json();
  console.log('api summarize done', { data });
  return data;
};

const getHistory = async (token, day, timezone) => {
  console.log('api getHistory start', { day, timezone });
  const resp = await fetch(`/api/history?day=${encodeURIComponent(day)}&timezone=${encodeURIComponent(timezone)}`, {
    headers: authHeader(token),
  });
  if (!resp.ok) {
    const errData = await resp.json();
    console.error('api getHistory error', { errData });
    throw Error(errData.error || 'Unknown error');
  }
  const data = await resp.json();
  console.log('api getHistory done', { data });
  return data;
};

const historyItemCache = new Map();
const getHistoryItem = async (token, docId) => {
  console.log('api getHistoryItem start', { docId });
  if (historyItemCache.has(docId)) {
    console.log('api getHistoryItem cache hit', { docId });
    return historyItemCache.get(docId);
  }
  const resp = await fetch(`/api/history/${docId}`, {
    headers: authHeader(token),
  });
  if (!resp.ok) {
    const errData = await resp.json();
    console.error('api getHistoryItem error', { errData });
    throw Error(errData.error || 'Unknown error');
  }
  const data = await resp.json();
  console.log('api getHistoryItem done', { data });
  historyItemCache.set(docId, data);
  return data;
};

export default {
  summarize,
  getHistory,
  getHistoryItem,
};
