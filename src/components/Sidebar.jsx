// src/components/Sidebar.jsx
export default function Sidebar({ activeTab, setActiveTab, currentStore, stores, className }) {
  const menus = [
    { id: 'pos', icon: '💰', label: '收銀結帳' },
    { id: 'members', icon: '👤', label: '會員管理' },
    { id: 'inventory', icon: '📦', label: '庫存進貨' },
    { id: 'orders', icon: '📜', label: '營收紀錄' },
  ];

  const displayStoreName = () => {
    if (!currentStore || !stores.length) return '...';
    return currentStore.id === stores[0]?.id ? '中壢' : '分店';
  };

  return (
    <div className={`${className} h-screen bg-slate-800 text-white flex flex-col items-center py-8 gap-6 shadow-xl z-50 shrink-0 w-20 lg:w-28 transition-all`}>

      {/* --- 頂部店名 --- */}
      <div
        className="flex flex-col items-center mb-6 cursor-pointer group"
        onClick={() => setActiveTab('pos')}
      >
        <div className="text-3xl lg:text-4xl mb-2 group-hover:scale-110 transition-transform">🐟</div>
        <div className="flex flex-col items-center leading-tight text-center overflow-hidden">
          <span className="text-[10px] lg:text-sm font-black tracking-widest text-blue-400 truncate w-full px-1">水博館水族</span>
          <span className="text-sm lg:text-lg font-bold tracking-[0.1em] text-white mt-1">
            {displayStoreName()}
          </span>
        </div>
        <div className="w-10 lg:w-12 h-0.5 bg-slate-600 mt-4"></div>
      </div>

      {/* --- 中間功能選單 --- */}
      <div className="flex-1 flex flex-col gap-4 lg:gap-6 w-full px-2 lg:px-3">
        {menus.map((menu) => (
          <button
            key={menu.id}
            onClick={() => setActiveTab(menu.id)}
            className={`group relative flex flex-col items-center justify-center p-3 lg:p-4 rounded-2xl lg:rounded-[2rem] transition-all duration-300 ${activeTab === menu.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
              }`}
          >
            <span className="text-2xl lg:text-3xl mb-1 lg:mb-2">{menu.icon}</span>
            <span className="text-[10px] lg:text-sm font-bold whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">{menu.label}</span>
          </button>
        ))}
      </div>

      {/* --- 底部設定按鈕 --- */}
      <div className="w-full px-2 lg:px-3 pt-6 border-t border-slate-700">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex flex-col items-center justify-center p-3 lg:p-4 rounded-2xl lg:rounded-[2rem] transition-all ${activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'
            }`}
        >
          <span className="text-2xl lg:text-3xl mb-1">⚙️</span>
          <span className="text-[10px] lg:text-sm font-bold">設定</span>
        </button>
      </div>
    </div>
  );
}