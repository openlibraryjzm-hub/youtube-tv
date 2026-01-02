import { useState, useMemo } from 'react';
import { 
  LayoutGrid, 
  Columns, 
  ListMusic, 
  Folder, 
  Filter,
  ChevronRight,
  Check,
  Feather,
  Trash2,
  RefreshCw,
  Layers,
  Eye,
  EyeOff,
  XCircle,
  ChevronDown,
  X
} from 'lucide-react';

const DataNavigator = () => {
  const [activeLevel, setActiveLevel] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(null);
  
  const [selections, setSelections] = useState({
    0: [], 1: [], 2: [], 3: []
  });

  const [hiddenIds, setHiddenIds] = useState(new Set());

  const levels = [
    { id: 0, label: 'Presets', icon: LayoutGrid, color: 'bg-indigo-600', text: 'text-indigo-600' },
    { id: 1, label: 'Tabs', icon: Columns, color: 'bg-blue-500', text: 'text-blue-500' },
    { id: 2, label: 'Playlists', icon: ListMusic, color: 'bg-emerald-500', text: 'text-emerald-500' },
    { id: 3, label: 'Folders', icon: Folder, color: 'bg-amber-500', text: 'text-amber-500' },
    { id: 4, label: 'Filters', icon: Filter, color: 'bg-slate-800', text: 'text-slate-800' },
  ];

  const universalColors = [
    { name: "Crimson", bg: "bg-rose-600" }, { name: "Azure", bg: "bg-blue-600" },
    { name: "Jade", bg: "bg-emerald-600" }, { name: "Sunshine", bg: "bg-amber-500" },
    { name: "Amethyst", bg: "bg-purple-600" }, { name: "Flamingo", bg: "bg-pink-600" },
    { name: "Sunset", bg: "bg-orange-600" }, { name: "Teal", bg: "bg-teal-600" },
    { name: "Indigo", bg: "bg-indigo-600" }, { name: "Lime", bg: "bg-lime-600" },
    { name: "Slate", bg: "bg-slate-600" }, { name: "Cyan", bg: "bg-cyan-600" },
    { name: "Coffee", bg: "bg-amber-900" }, { name: "Violet", bg: "bg-violet-600" },
    { name: "Fuchsia", bg: "bg-fuchsia-600" }, { name: "Forest", bg: "bg-green-800" },
  ];

  const allData = useMemo(() => {
    const presets = Array.from({length: 5}, (_, i) => ({ id: `${i+1}`, name: `Preset ${i+1}`, parentId: null }));
    const tabs = [];
    presets.forEach(p => Array.from({length: 5}, (_, i) => tabs.push({ id: `${p.id}.${i+1}`, name: `Tab ${p.id}.${i+1}`, parentId: p.id })));
    const playlists = [];
    tabs.forEach(t => Array.from({length: 10}, (_, i) => playlists.push({ id: `${t.id}.${i+1}`, name: `Playlist ${t.id}.${i+1}`, parentId: t.id })));
    const folders = [];
    playlists.forEach(pl => universalColors.forEach((c, i) => folders.push({ id: `${pl.id}.${i+1}`, name: `${c.name} Folder`, subName: `PL ${pl.id}`, color: c.bg, parentId: pl.id })));
    return { 0: presets, 1: tabs, 2: playlists, 3: folders };
  }, []);

  const isPruned = (id) => {
    if (hiddenIds.has(id)) return true;
    for (const hiddenId of hiddenIds) if (id.startsWith(hiddenId + '.')) return true;
    return false;
  };

  const visibleItems = useMemo(() => {
    if (activeLevel === 4) return [];
    let data = allData[activeLevel].filter(item => !isPruned(item.id));
    if (activeLevel > 0 && selections[activeLevel - 1].length > 0) {
      data = data.filter(item => selections[activeLevel - 1].includes(item.parentId));
    }
    if (activeLevel === 3 && selections[2].length === 0) data = data.slice(0, 160);
    return data;
  }, [activeLevel, selections, hiddenIds]);

  const toggleSelect = (level, id) => {
    setSelections(prev => {
      const current = prev[level];
      const isSelected = current.includes(id);
      let next = { ...prev };
      if (isSelected) {
        next[level] = current.filter(x => x !== id);
        for (let i = level + 1; i <= 3; i++) {
          next[i] = next[i].filter(childId => !childId.startsWith(id + '.'));
        }
      } else {
        next[level] = [...current, id];
      }
      return next;
    });
  };

  const toggleVisibility = (id) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="h-full w-full bg-white flex flex-col overflow-hidden">
      {/* Level Tabs - Responsive */}
      <div className="shrink-0 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-wrap gap-4 justify-center">
          {levels.map(level => {
            const LIcon = level.icon;
            const isActive = activeLevel === level.id;
            return (
              <button
                key={level.id}
                onClick={() => setActiveLevel(level.id)}
                className={`flex flex-col items-center justify-center px-6 py-8 rounded-3xl transition-all duration-300 shadow-xl min-w-32 ${
                  isActive ? `${level.color} text-white scale-110` : 'bg-slate-50 text-slate-600 hover:scale-105'
                }`}
              >
                <LIcon size={48} strokeWidth={2} />
                <span className="mt-4 text-lg font-black uppercase tracking-wider">{level.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable Bars List - Vertical Scroll */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <div className="space-y-3">
          {visibleItems.map(item => {
            const isSelected = selections[activeLevel]?.includes(item.id) || false;
            const isHidden = hiddenIds.has(item.id);
            const theme = levels[activeLevel];

            return (
              <div
                key={item.id}
                className="bg-white/95 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-4 group backdrop-blur-sm border border-slate-100 flex items-center gap-4 w-full"
                style={{ minHeight: '80px' }}
              >
                {/* Color Indicator */}
                {item.color && (
                  <div className={`w-12 h-12 rounded-lg ${item.color} shadow-inner flex-shrink-0`} />
                )}
                
                {/* Main Content - Scrollable */}
                <div className="flex-1 min-w-0 overflow-x-auto">
                  <div className="flex items-center gap-4" style={{ minWidth: 'max-content' }}>
                    <h3 className={`text-2xl font-black transition-colors whitespace-nowrap ${
                      isSelected ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {item.name}
                    </h3>
                    {item.subName && (
                      <span className="text-lg text-slate-500 whitespace-nowrap">{item.subName}</span>
                    )}
                    <span className="text-sm text-slate-400 font-mono whitespace-nowrap">UID: {item.id}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => toggleSelect(activeLevel, item.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isSelected ? `${theme.color} text-white shadow-lg` : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check size={20} strokeWidth={3} />}
                  </button>
                  <button
                    onClick={() => toggleVisibility(item.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isHidden ? 'bg-rose-500 text-white' : 'bg-slate-100 hover:bg-slate-200'
                    }`}
                  >
                    {isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <ChevronRight 
                    size={24} 
                    className={`${theme.text} opacity-30 group-hover:opacity-80 transition-opacity flex-shrink-0`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DataNavigator;