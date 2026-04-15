import { Routes, Route } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { AdminProvider } from './context/AdminContext';
import { SongsProvider } from './context/SongsContext';
import { SidebarProvider } from './context/SidebarContext';
import { SongControlsProvider } from './context/SongControlsContext';
import AppLayout from './components/AppLayout';
import SongList from './pages/SongList';
import SongView from './pages/SongView';
import SetlistRedirect from './pages/SetlistRedirect';
import Admin from './pages/Admin';
import SongEditor from './pages/SongEditor';
import SetlistEditor from './pages/SetlistEditor';
import Import from './pages/Import';

export default function App() {
  return (
    <SettingsProvider>
      <AdminProvider>
        <SongsProvider>
          <SidebarProvider>
            <SongControlsProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  {/* Public */}
                  <Route path="/" element={<SongList />} />
                  <Route path="/song/:id" element={<SongView />} />
                  <Route path="/setlist/:id" element={<SetlistRedirect />} />

                  {/* Admin (password-protected) */}
                  <Route path="/admin" element={<Admin />}>
                    <Route path="songs/new" element={<SongEditor />} />
                    <Route path="songs/:id" element={<SongEditor />} />
                    <Route path="setlists/new" element={<SetlistEditor />} />
                    <Route path="setlists/:id" element={<SetlistEditor />} />
                    <Route path="import" element={<Import />} />
                  </Route>
                </Route>
              </Routes>
            </SongControlsProvider>
          </SidebarProvider>
        </SongsProvider>
      </AdminProvider>
    </SettingsProvider>
  );
}
