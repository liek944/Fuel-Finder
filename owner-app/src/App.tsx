import { Routes, Route, Navigate } from 'react-router-dom';
import OwnerLogin from './components/OwnerLogin';
import OwnerDashboard from './components/OwnerDashboard';
import OwnerMagicLinkVerify from './components/OwnerMagicLinkVerify';

function App() {
  const subdomain = localStorage.getItem('owner_subdomain') || '';

  return (
    <Routes>
      <Route path="/" element={<OwnerLogin />} />
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      <Route path="/owner/verify/:token" element={<OwnerMagicLinkVerify subdomain={subdomain} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
