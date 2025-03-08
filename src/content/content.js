const summaryCache = new Map();
const parseSummary = (result, cacheId = null) => {
  if (cacheId && summaryCache.has(cacheId)) return summaryCache.get(cacheId);
  let summary = '';
  result['3-summaries']?.forEach((part, i, arr) => {
    summary += (part['3.1-mainPoint'] ?? '') + '\n\n' + (part['3.3-synthesis'] ?? '');
    if (i < arr.length - 1) summary += '\n\n';
  });
  if (cacheId) summaryCache.set(cacheId, summary);
  return summary;
};

export { parseSummary };
