import React, { useState } from 'react';
import Auth from './components/Auth';
import MainPage from './components/MainPage';
import HistoryPage from './components/HistoryPage';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [pageInfo, setPageInfo] = useState({page: 'main'});

  if (!user) return <div className='app'><Auth onSignIn={setUser} /></div>;
  const { page } = pageInfo;
  if (page === 'main') return <div className='app'><MainPage user={user}
    pageInfo={pageInfo} setPageInfo={setPageInfo} /></div>;
  if (page === 'wiki') return <div className='app'><WikiPage user={user}
    pageInfo={pageInfo} setPageInfo={setPageInfo} /></div>;
  return <div className='app'><p>Invalid page</p></div>;
};

export default App;
