import React, { useState, useEffect } from 'react';
import { BackButton, ReloadButton } from './Buttons';
import './HistoryPage.css';
import api from '../api.js';
import { parseSummary } from '../content/content.js';
import { displayErr, formatDay, formatTime, getTimezone } from '../utils.js';

const HistoryPage = ({ user, pageInfo, setPageInfo }) => {
  const [selectedDay, setSelectedDay] = useState(formatDay(new Date()));
  const [resultData, setResultData] = useState({loading: false, result: []});
  const [expanded, setExpanded] = useState({});
  const [items, setItems] = useState({});

  const timezone = getTimezone();
  const fetchHistory = async () => {
    setResultData({loading: true, result: []});
    try {
      const token = await user.getIdToken();
      const result = await api.getHistory(token, selectedDay, timezone);
      setResultData((prev) => ({...prev, result}));
      setExpanded({});
    } catch (err) { displayErr(err); }
      finally { setResultData((prev) => ({...prev, loading: false})); }
  };

  const toggleExpand = async (id) => {
    setExpanded((prev) => ({...prev, [id]: !prev[id]}));
    if (expanded[id]) return; if (items[id]) return;
    try {
      const token = await user.getIdToken();
      const item = await api.getHistoryItem(token, id);
      setItems((prev) => ({...prev, [id]: item}));
    } catch (err) { displayErr(err); }
  };

  useEffect(() => { fetchHistory(); }, [selectedDay]);

  return <>
    <BackButton onClick={() => setPageInfo({ page: 'main' })} />
    <div className='history-list'>
      <input type='date' value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)} />
      {resultData.loading && <p>Loading...</p>}
      {!resultData.loading && resultData.result.length === 0 && <p>No history.</p>}
      {!resultData.loading && resultData.result.length > 0 && <ul>{resultData.result.map((item) => <li key={item.id}>
        <a href='#' onClick={() => toggleExpand(item.id)}>
          <span>{expanded[item.id] ? '📖' : '📕'}</span>{' '}<span>{formatTime(item.createdAt)}</span>
        </a>
        {expanded[item.id] && <div className='history-item'>
          {!items[item.id] && <p>Loading...</p>}
          {items[item.id] && !items[item.id].result && <p>No result.</p>}
          {items[item.id] && items[item.id].result && <div className='history-result-container'>
            <pre><textarea rows={16} value={parseSummary(items[item.id].result, item.id)} disabled /></pre>
          </div>}
        </div>}
      </li>)}</ul>}
      {!resultData.loading && <ReloadButton onClick={fetchHistory} />}
    </div>
  </>;
};

export default HistoryPage;
