import { Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import SongList from './pages/SongList';
import SongView from './pages/SongView';
import SetlistView from './pages/SetlistView';
import Settings from './pages/Settings';

export default function App() {
  return (
    <SettingsProvider>
      <Routes>
        <Route path="/" element={<SongList />} />
        <Route path="/song/:id" element={<SongView />} />
        <Route path="/setlist/:id" element={<SetlistView />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </SettingsProvider>
  );
}
