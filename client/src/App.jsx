import { Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import SongList from './pages/SongList';
import SongView from './pages/SongView';
import SetlistView from './pages/SetlistView';
import Settings from './pages/Settings';
import Admin, { AdminDashboard } from './pages/Admin';
import SongEditor from './pages/SongEditor';
import SetlistEditor from './pages/SetlistEditor';
import Import from './pages/Import';

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<SongList />} />
        <Route path="/song/:id" element={<SongView />} />
        <Route path="/setlist/:id" element={<SetlistView />} />
        <Route path="/settings" element={<Settings />} />

        {/* Admin (password-protected) */}
        <Route path="/admin" element={<Admin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="songs/new" element={<SongEditor />} />
          <Route path="songs/:id" element={<SongEditor />} />
          <Route path="setlists/new" element={<SetlistEditor />} />
          <Route path="setlists/:id" element={<SetlistEditor />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </SettingsProvider>
  );
}
