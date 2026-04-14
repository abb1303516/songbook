import { Outlet } from 'react-router-dom';
import { useSidebar } from '../context/SidebarContext';
import { useSettings } from '../context/SettingsContext';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './Sidebar';

export default function AppLayout() {
  const { isOpen, isMobile, toggle } = useSidebar();
  const { settings } = useSettings();
  const { colors } = settings;

  const marginLeft = isMobile ? 0 : (isOpen ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED);

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

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden"
        style={{
          marginLeft,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
