export default function InventoryList({
  filteredProducts,
  selectedProduct,
  handleEdit,
  handleAddNew,
  handleImportToStore,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  currentStore,
  onOpenCategoryManager
}) {
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '未分類'

  // 計算統計數字
  const totalItems = filteredProducts.length;
  const totalStock = filteredProducts.reduce((sum, p) => sum + (p.is_in_current_store ? (p.stock || 0) : 0), 0);

  return (
    <div className="w-[600px] bg-white border-r flex flex-col shadow-2xl z-10">
      <div className="p-6 border-b-4 border-slate-50 space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${viewMode === 'current' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
            <span className="text-sm font-black text-slate-500 uppercase tracking-widest">
              {viewMode === 'current' ? `${currentStore?.name} 庫存` : '全公司總表'}
            </span>
          </div>
          <button onClick={handleAddNew} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 flex items-center gap-2">
            <span className="text-xl">＋</span> 新增商品
          </button>
        </div>

        {/* 統計面板 */}
        <div className="flex gap-4 mb-2">
          <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100 flex justify-between items-center text-sm">
            <span className="text-slate-500 font-black">顯示品項</span>
            <span className="text-slate-800 font-black font-mono text-xl">{totalItems} <span className="text-xs text-slate-400">項</span></span>
          </div>
          {viewMode === 'current' && (
            <div className="flex-1 bg-emerald-50 rounded-xl p-3 border border-emerald-100 flex justify-between items-center text-sm">
              <span className="text-emerald-700 font-black">總庫存量</span>
              <span className="text-emerald-800 font-black font-mono text-xl">{totalStock} <span className="text-xs text-emerald-600/60">件</span></span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <button onClick={() => setSelectedCategoryId('all')} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedCategoryId === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>全部</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedCategoryId === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat.name}</button>
            ))}
            <button
              onClick={onOpenCategoryManager}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all font-black text-lg ml-1"
              title="管理分類"
            >
              ⚙️
            </button>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button onClick={() => setViewMode('current')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'current' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>本店</button>
            <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>全區</button>
          </div>
        </div>

        <div className="relative">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 font-bold text-slate-900 shadow-inner"
            placeholder="快速搜尋商品或條碼..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        {filteredProducts.map(p => (
          <div key={p.id} onClick={() => handleEdit(p)}
            className={`p-6 border-b cursor-pointer flex justify-between items-center transition-all 
            ${selectedProduct?.id === p.id ? 'bg-slate-900 text-white shadow-inner scale-[0.98] rounded-2xl mx-2 my-1' : 'hover:bg-blue-50 bg-white'}
            ${!p.is_in_current_store ? 'opacity-60 bg-slate-50' : ''}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-black text-2xl tracking-tight ${selectedProduct?.id === p.id ? 'text-white' : 'text-slate-800'}`}>{p.name}</span>
                {!p.is_in_current_store && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-black">未上架</span>}
              </div>
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-1 rounded font-bold ${selectedProduct?.id === p.id ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{getCategoryName(p.category_id)}</span>
              </div>
            </div>
            <div className="text-right">
              {p.is_in_current_store ? (
                <div>
                  <div className={`text-4xl font-black font-mono leading-none ${p.stock <= 0 ? 'text-red-500' : selectedProduct?.id === p.id ? 'text-emerald-400' : 'text-slate-800'}`}>{p.stock}</div>
                  <div className={`text-sm font-bold opacity-60 mt-2 ${selectedProduct?.id === p.id ? 'text-white' : ''}`}>${p.price}</div>
                </div>
              ) : (
                <button onClick={(e) => handleImportToStore(e, p)} className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-black shadow-lg">＋ 引入</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}