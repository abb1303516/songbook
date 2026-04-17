import { Outlet } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useSettings } from '../context/SettingsContext';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './Sidebar';

export default function AppLayout() {
  const { isOpen, isMobile, toggle } = useSidebar();
  const { settings } = useSettings();
  const { colors } = settings;

  const marginLeft = isMobile ? 0 : (isOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED);
  const paddingLeft = isMobile && !isOpen ? 40 : 0; // space for hamburger

  return (
    <div className="h-screen flex overflow-hidden" style={{ backgroundColor: colors.bg, color: colors.text }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 transition-opacity"
          onClick={toggle}
        />
      )}

      {/* Mobile hamburger — only when sidebar is closed */}
      {isMobile && !isOpen && (
        <button
          onClick={toggle}
          className="fixed top-2 left-2 z-20 p-1.5 rounded cursor-pointer"
          style={{ backgroundColor: colors.surface, color: colors.text, border: `1px solid ${colors.border}` }}
          title="Открыть меню"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden"
        style={{
          marginLeft,
          paddingLeft,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
