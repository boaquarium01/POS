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
  currentStore
}) {
  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '未分類'

  return (
    <div className="w-[600px] bg-white border-r flex flex-col shadow-2xl z-10">
      <div className="p-6 border-b-4 border-slate-50 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'current' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                {viewMode === 'current' ? `${currentStore?.name} 庫存` : '全公司總表'}
              </span>
            </div>
            <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic leading-none">庫存管理</h2>
          </div>
          <button onClick={handleAddNew} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 flex items-center gap-2">
            <span className="text-xl">＋</span> 新增商品
          </button>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2 flex-1">
            <button onClick={() => setSelectedCategoryId('all')} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedCategoryId === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>全部</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategoryId(cat.id)} className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${selectedCategoryId === cat.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{cat.name}</button>
            ))}
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button onClick={() => setViewMode('current')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'current' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>本店</button>
            <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>全區</button>
          </div>
        </div>

        <div className="relative">
          <input className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 font-bold text-slate-900 shadow-inner" 
            placeholder="快速搜尋商品或條碼..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
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