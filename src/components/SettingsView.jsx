import React from 'react';

export default function SettingsView({ stores = [], currentStore, setCurrentStore }) {
  const [subTab, setSubTab] = React.useState('store'); 

  // 根據順序取得副標題：第一間是中壢，其餘（第二間）是 2
  const getSubTitle = (store) => {
    if (!store || stores.length === 0) return "";
    return store.id === stores[0].id ? "中壢" : "分店";
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden text-slate-800">
      {/* 頂部標題 */}
      <header className="h-20 bg-white border-b px-8 flex items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner">⚙️</div>
          <h2 className="text-2xl font-black text-slate-800">系統設定中心</h2>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 左側選單 */}
        <aside className="w-64 bg-white border-r p-6 flex flex-col gap-2">
          <button 
            onClick={() => setSubTab('store')}
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black transition-all ${
              subTab === 'store' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span className="text-xl">🏢</span> 分店切換
          </button>
          
          <div className="mt-4 px-6 text-xs font-black text-slate-300 tracking-widest text-left">系統擴充</div>
          <button className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-slate-200 cursor-not-allowed">
            <span>👤</span> 員工帳號
          </button>
          <button className="flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-slate-200 cursor-not-allowed">
            <span>🖨️</span> 印表機設定
          </button>
        </aside>

        {/* 內容區 */}
        <main className="flex-1 overflow-y-auto p-12">
          {subTab === 'store' && (
            <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="mb-10 text-left">
                <h3 className="text-4xl font-black text-slate-800 mb-2">分店管理</h3>
                <p className="text-slate-400 font-bold text-lg">
                  當前登入點：
                  <span className="text-blue-600 ml-2 font-black">
                    {currentStore?.name} <span className="text-slate-300 mx-1">/</span> {getSubTitle(currentStore)}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {stores.map((store) => {
                  const isActive = currentStore?.id === store.id;
                  const subTitle = getSubTitle(store);

                  return (
                    <button
                      key={store.id}
                      onClick={() => setCurrentStore(store)}
                      className={`p-10 rounded-[3rem] border-4 text-left transition-all relative overflow-hidden group ${
                        isActive
                        ? 'border-blue-600 bg-white shadow-2xl scale-[1.02]'
                        : 'border-white bg-white hover:border-slate-200 shadow-md'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-6">
                        {/* 狀態燈號 */}
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-200'}`}></div>
                          <span className={`text-sm font-black ${isActive ? 'text-green-600' : 'text-slate-300'}`}>
                            {isActive ? '連線中' : '待命'}
                          </span>
                        </div>
                      </div>
                      
                      {/* 完整店名 (水博館水族) */}
                      <div className="text-3xl font-black text-slate-800 mb-2 leading-none">
                         {store.name}
                      </div>
                      
                      {/* 副標題 (中壢 / 分店) */}
                      <div className="text-6xl font-black text-blue-600/20 group-hover:text-blue-600/40 transition-colors">
                        {subTitle}
                      </div>
                      
                      <div className="mt-8 text-slate-300 font-mono text-[10px] tracking-widest">
                        系統識別碼: {store.id.slice(0, 13)}
                      </div>
                      
                      {/* 背景裝飾 */}
                      <div className="absolute -right-6 -bottom-6 text-[10rem] opacity-[0.02] group-hover:opacity-[0.05] transition-all pointer-events-none">
                        🐟
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}