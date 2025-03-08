import React, { useState } from 'react';
import { EditButton, SubmitButton, SaveButton, CancelButton } from './Buttons';
import './MainPage.css';
import api from '../api.js';
import { parseSummary } from '../content/content.js';
import { displayErr } from '../utils.js';

const MainPage = ({ user, pageInfo, setPageInfo }) => {
  const [text, setText] = useState('');
  const [editingData, setEditingData] = useState({editing: false, text: ''});
  const [resultData, setResultData] = useState({loading: false, result: null});

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text) { displayErr(new Error('No text to submit')); return; }
    if (text.length > 500000) { displayErr(new Error(`Text is too long, max length 500000: ${text.length}`)); return; }
    setResultData({loading: true, result: null});
    try {
      const idToken = await user.getIdToken();
      const result = await api.summarize(idToken, text);
      setResultData((prev) => ({...prev, result}));
    } catch (err) { displayErr(err); }
      finally { setResultData((prev) => ({...prev, loading: false})); }
  };

  return <>
    <form className='submit-form' onSubmit={handleSubmit}>
      {!editingData.editing && <>
        <pre><textarea rows={8} value={text} disabled /></pre>
        <div><EditButton type='button' onClick={() => setEditingData({editing: true, text})} />{' '}
          <SubmitButton type='submit' disabled={resultData.loading} /></div>
      </>}
      {editingData.editing && <>
        <textarea value={editingData.text} rows={8} onChange={(e) => setEditingData((prev) => ({...prev, text: e.target.value}))} />
        <div><SaveButton type='button' onClick={() => { setText(editingData.text); setEditingData({editing: false, text: ''}); }} />{' '}
          <CancelButton type='button' onClick={() => setEditingData({editing: false, text: ''})} /></div>
      </>}
    </form>
    <div className='result-container'>
      {resultData.loading && <p>Loading...</p>}
      {resultData.result && <pre><textarea rows={16} value={parseSummary(resultData.result)} disabled /></pre>}
    </div>
    <button onClick={() => setPageInfo({ page: 'history' })} className='history-button'>History</button>
  </>;
};

export default MainPage;
