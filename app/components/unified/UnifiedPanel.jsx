import { useRef, useEffect, useState } from 'react';
import DataNavigator from './DataNavigator';
import SupportOrbital from './SupportOrbital';
import CreativeMode from './CreativeMode';
import PlaceholderPage from './PlaceholderPage';
import { 
  LayoutGrid, 
  Film, 
  Menu, 
  Home, 
  Palette, 
  Heart, 
  Settings, 
  History,
  Maximize2,
  Columns as ColumnsIcon,
  Square
} from 'lucide-react';

/**
 * UnifiedPanel - Flexible integration wrapper for unified components
 * 
 * @param {string} viewMode - 'full' | 'half' | 'quarter'
 * @param {string} activeTab - Current active tab
 * @param {React.Ref|string} container - Container ref or selector for half/quarter views
 * @param {function} onTabChange - Callback when tab changes
 * @param {function} onViewModeChange - Callback when view mode changes
 * @param {boolean} showNavBar - Whether to show navigation bar
 * @param {array} menuItems - Custom menu items (optional)
 * @param {object} style - Additional styles
 * @param {string} className - Additional classes
 */
const UnifiedPanel = ({
  viewMode = 'full',
  activeTab = 'content',
  container = null,
  onTabChange = () => {},
  onViewModeChange = () => {},
  showNavBar = true,
  menuItems: customMenuItems = null,
  style = {},
  className = ''
}) => {
  const panelRef = useRef(null);
  const [internalActiveTab, setInternalActiveTab] = useState(activeTab);
  const [internalViewMode, setInternalViewMode] = useState(viewMode);

  // Sync external activeTab prop
  useEffect(() => {
    setInternalActiveTab(activeTab);
  }, [activeTab]);

  // Sync external viewMode prop
  useEffect(() => {
    setInternalViewMode(viewMode);
  }, [viewMode]);

  // Handle container mounting for half/quarter views
  useEffect(() => {
    if ((internalViewMode === 'half' || internalViewMode === 'quarter') && container && panelRef.current) {
      const containerElement = typeof container === 'string' 
        ? document.querySelector(container)
        : (container?.current || container);
      
      if (containerElement && panelRef.current.parentNode !== containerElement) {
        containerElement.appendChild(panelRef.current);
      }
    }
  }, [internalViewMode, container]);

  const defaultMenuItems = [
    { id: 'playlist', label: 'Playlist Menu', icon: LayoutGrid },
    { id: 'video', label: 'Video Menu', icon: Film },
    { id: 'main', label: 'Main Menu', icon: Menu },
    { id: 'content', label: 'Content', icon: Home },
    { id: 'creative', label: 'Creative', icon: Palette },
    { id: 'support', label: 'Support', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'history', label: 'History', icon: History },
  ];

  const menuItems = customMenuItems || defaultMenuItems;

  const viewModes = [
    { id: 'full', label: 'Full', icon: Maximize2 },
    { id: 'half', label: 'Half', icon: ColumnsIcon },
    { id: 'quarter', label: 'Quarter', icon: Square },
  ];

  const handleTabChange = (tabId) => {
    setInternalActiveTab(tabId);
    onTabChange(tabId);
  };

  const handleViewModeChange = (mode) => {
    setInternalViewMode(mode);
    onViewModeChange(mode);
  };

  // Determine panel classes based on view mode
  const getPanelClasses = () => {
    const baseClasses = 'transition-all duration-500 ease-in-out';
    
    if (internalViewMode === 'full') {
      return `${baseClasses} w-full h-full`;
    } else if (internalViewMode === 'half') {
      return `${baseClasses} w-full h-full`; // Parent container controls size
    } else if (internalViewMode === 'quarter') {
      return `${baseClasses} w-full h-full`; // Parent container controls size
    }
    
    return `${baseClasses} w-full h-full`;
  };

  const renderContent = () => {
    switch(internalActiveTab) {
      case 'content':
        return <DataNavigator />;
      case 'support':
        return <SupportOrbital onGoHome={() => handleTabChange('content')} />;
      case 'creative':
        return <CreativeMode />;
      case 'playlist':
        return <PlaceholderPage title="Playlist Menu" description="Menu elements from main project will be integrated here" />;
      case 'video':
        return <PlaceholderPage title="Video Menu" description="Menu elements from main project will be integrated here" />;
      case 'main':
        return <PlaceholderPage title="Main Menu" description="Menu elements from main project will be integrated here" />;
      case 'settings':
        return <PlaceholderPage title="Settings" description="Menu elements from main project will be integrated here" />;
      case 'history':
        return <PlaceholderPage title="History" description="Menu elements from main project will be integrated here" />;
      default:
        return <PlaceholderPage title="Coming Soon" description="This page is under construction~ ✨" />;
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`unified-panel ${getPanelClasses()} ${className}`}
      style={{ ...style, pointerEvents: 'auto' }}
    >
      {showNavBar && (
        <div className="bg-white/95 backdrop-blur-lg shadow-xl border-b border-sky-200 relative z-[100]" style={{ pointerEvents: 'auto' }}>
          <nav className="flex items-center justify-between py-4 px-6" style={{ pointerEvents: 'auto' }}>
            <div className="flex flex-wrap gap-3 justify-center flex-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = internalActiveTab === item.id;
                const hasPage = ['content', 'support', 'creative', 'playlist', 'video', 'main', 'settings', 'history'].includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => hasPage && handleTabChange(item.id)}
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-md ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-xl scale-110'
                        : 'bg-sky-100/80 text-sky-700 hover:bg-sky-200 hover:scale-110'
                    } ${!hasPage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={item.label}
                  >
                    <Icon size={28} strokeWidth={2} />
                    <span className="text-[10px] font-bold mt-1">{item.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3">
              {viewModes.map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => handleViewModeChange(mode.id)}
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-md ${
                      internalViewMode === mode.id
                        ? 'bg-sky-600 text-white shadow-xl scale-110'
                        : 'bg-sky-100/80 text-sky-700 hover:bg-sky-200 hover:scale-110'
                    }`}
                    title={mode.label}
                  >
                    <Icon size={28} strokeWidth={2} />
                    <span className="text-[10px] font-bold mt-1">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      )}

      {/* Content */}
      <div className="h-full overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default UnifiedPanel;


