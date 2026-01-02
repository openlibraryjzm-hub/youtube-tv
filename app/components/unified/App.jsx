import { useState } from 'react'
import DataNavigator from './components/DataNavigator'
import PlayerController from './components/PlayerController'
import SupportOrbital from './components/SupportOrbital'
import CreativeMode from './components/CreativeMode'
import PlaceholderPage from './components/PlaceholderPage'
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
} from 'lucide-react'

function App() {
  const [activeTab, setActiveTab] = useState('creative')
  const [viewMode, setViewMode] = useState('right') // Default to half view



  const menuItems = [
    { id: 'playlist', label: 'Playlist Menu', icon: LayoutGrid },
    { id: 'video', label: 'Video Menu', icon: Film },
    { id: 'main', label: 'Main Menu', icon: Menu },
    { id: 'content', label: 'Content', icon: Home },
    { id: 'creative', label: 'Creative', icon: Palette },
    { id: 'support', label: 'Support', icon: Heart },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'history', label: 'History', icon: History },
  ]

  const viewModes = [
    { id: 'full', label: 'Full', icon: Maximize2 },
    { id: 'right', label: 'Half', icon: ColumnsIcon },
    { id: 'bottom-right', label: 'Quarter', icon: Square },
  ]

  const panelClass = viewMode === 'full'
    ? 'fixed inset-0 top-[176px]'
    : viewMode === 'right'
    ? 'fixed inset-y-0 top-[176px] right-0 left-1/2'
    : 'fixed top-[40%] left-1/2 bottom-0 right-0' // Quarter view: bottom right, slightly taller (starts at 40% from top)

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-gradient-to-br from-sky-50 to-white" style={{ minHeight: '100vh', minWidth: '100vw' }}>
      {/* Player Controller - Flush to top, perfectly centered */}
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div className="w-full h-full flex justify-center pointer-events-auto">
          <div className="w-full max-w-5xl">
            <PlayerController />
          </div>
        </div>
      </div>

      {/* Panel - Icon Bar + Content (resizes in half/quarter) */}
      <div className={`transition-all duration-500 ease-in-out ${panelClass}`}>
        {/* Icon Bar - Pinned to top of panel */}
        <div className="bg-white/95 backdrop-blur-lg shadow-xl border-b border-sky-200 relative z-[60]">
          <nav className="flex items-center justify-between py-4 px-6">
            <div className="flex flex-wrap gap-3 justify-center flex-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const hasPage = ['content', 'support', 'creative', 'playlist', 'video', 'main', 'settings', 'history'].includes(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => hasPage && setActiveTab(item.id)}
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
                    onClick={() => setViewMode(mode.id)}
                    className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 shadow-md ${
                      viewMode === mode.id
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

        {/* Content */}
        <div className="h-full">
          {activeTab === 'content' ? (
            <DataNavigator />
          ) : activeTab === 'support' ? (
            <SupportOrbital onGoHome={() => setActiveTab('content')} />
          ) : activeTab === 'creative' ? (
            <CreativeMode />
          ) : activeTab === 'playlist' ? (
            <PlaceholderPage title="Playlist Menu" description="Menu elements from main project will be integrated here" />
          ) : activeTab === 'video' ? (
            <PlaceholderPage title="Video Menu" description="Menu elements from main project will be integrated here" />
          ) : activeTab === 'main' ? (
            <PlaceholderPage title="Main Menu" description="Menu elements from main project will be integrated here" />
          ) : activeTab === 'settings' ? (
            <PlaceholderPage title="Settings" description="Menu elements from main project will be integrated here" />
          ) : activeTab === 'history' ? (
            <PlaceholderPage title="History" description="Menu elements from main project will be integrated here" />
          ) : (
            <PlaceholderPage title="Coming Soon" description="This page is under construction~ ✨" />
          )}
        </div>
      </div>
    </div>
  )
}

export default App
