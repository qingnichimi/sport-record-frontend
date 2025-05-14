import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import MapPage from './pages/MapPage';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapPage />} />
      </Routes>
    </Router>
  );
}

export default App;
