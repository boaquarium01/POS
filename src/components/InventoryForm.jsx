export default function InventoryForm({ isAdding, selectedProduct, formData, setFormData, categories, stores, onSave, onCancel, onDelete }) {
  return (
    <form onSubmit={onSave} className="w-full max-w-4xl bg-white p-5 rounded-[2rem] shadow-2xl flex flex-col h-[94vh] border-2 border-slate-200">
      
      {/* 標題區 */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-2xl font-black text-slate-950 tracking-tighter">
          {isAdding ? '✨ 新增商品檔案' : '📝 編輯商品資訊'}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-3">
        
        {/* 卡片 1：商品基本資料 */}
        <div className="bg-slate-50 p-4 rounded-[1.5rem] border-2 border-slate-200 space-y-3 shadow-sm">
          <div className="space-y-1">
            <label className="text-xs font-black text-slate-900 tracking-widest ml-1">商品名稱</label>
            <input 
              required 
              className="w-full p-3 bg-white rounded-xl border-2 border-slate-400 focus:border-blue-600 outline-none font-black text-xl text-slate-950 shadow-sm" 
              placeholder="請輸入商品完整名稱"
              value={formData.name} 
              onChange={e=>setFormData({...formData, name: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-900 tracking-widest ml-1">所屬分類</label>
              <select className="w-full p-3 bg-white rounded-xl border-2 border-slate-400 outline-none font-black text-lg text-slate-950 cursor-pointer" 
                value={formData.category_id} onChange={e=>setFormData({...formData, category_id: e.target.value})}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-900 tracking-widest ml-1">國際條碼</label>
              <input className="w-full p-3 bg-white rounded-xl border-2 border-slate-400 outline-none font-black text-lg text-slate-950" 
                placeholder="掃描或輸入條碼"
                value={formData.barcode} onChange={e=>setFormData({...formData, barcode: e.target.value})} />
            </div>
          </div>
        </div>

        {/* 卡片 2：全區定價與成本 */}
        <div className="p-4 bg-blue-50/50 rounded-[1.5rem] border-2 border-blue-200 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-blue-900 tracking-widest ml-1">全區建議售價</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-blue-950">$</span>
                <input required type="number" className="w-full p-3 pl-10 bg-white rounded-xl border-2 border-blue-300 outline-none font-black text-3xl text-blue-800 shadow-inner" 
                  value={formData.suggested_price} onChange={e=>setFormData({...formData, suggested_price: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-900 tracking-widest ml-1">進貨成本</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-slate-600">$</span>
                <input type="number" className="w-full p-3 pl-10 bg-white rounded-xl border-2 border-slate-400 outline-none font-black text-2xl text-slate-950" 
                  value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* 卡片 3：本店設定 */}
        <div className="p-4 bg-amber-50 rounded-[1.5rem] border-2 border-amber-300 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-amber-950 tracking-widest ml-1">本店實際售價</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-amber-950">$</span>
                <input 
                  type="number" 
                  placeholder="留空採用建議價" 
                  className="w-full p-3 pl-10 bg-white rounded-xl border-2 border-amber-400 outline-none font-black text-3xl text-amber-800 placeholder:text-sm placeholder:text-slate-500 placeholder:font-bold" 
                  value={formData.store_price} 
                  onChange={e=>setFormData({...formData, store_price: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black text-emerald-950 tracking-widest ml-1">本店目前庫存</label>
              <input required type="number" className="w-full p-3 bg-emerald-700 rounded-xl border-2 border-emerald-900 outline-none font-black text-4xl text-white text-center shadow-lg focus:ring-4 ring-emerald-100" 
                value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})} />
            </div>
          </div>
        </div>

        {/* 卡片 4：分店同步 (滿版兩欄設計) */}
        <div className="p-4 bg-slate-100 rounded-[1.5rem] border-2 border-slate-300 shadow-sm">
          <label className="text-xs font-black text-slate-950 tracking-widest mb-3 block italic">📍 快速上架至分店</label>
          <div className="grid grid-cols-2 gap-3">
            {stores.map(s => {
              const isChecked = isAdding ? formData.sync_store_ids.includes(s.id) : selectedProduct?.available_in_stores?.includes(s.id);
              return (
                <div key={s.id} onClick={() => { if(isAdding){ const ids = formData.sync_store_ids.includes(s.id) ? formData.sync_store_ids.filter(id => id !== s.id) : [...formData.sync_store_ids, s.id]; setFormData({ ...formData, sync_store_ids: ids }); } }}
                  className={`py-4 rounded-xl border-4 font-black text-lg text-center transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isChecked 
                    ? 'bg-slate-950 border-slate-950 text-white shadow-xl scale-[1.02]' 
                    : 'bg-white border-slate-300 text-slate-400 hover:border-slate-400'
                  } ${!isAdding && 'opacity-60 cursor-default shadow-none scale-100'}`}>
                  {s.name} {isChecked ? '✓' : ''}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 操作按鈕 */}
      <div className="flex gap-3 mt-4 pt-3 border-t-2 border-slate-200">
        {!isAdding && (
          <button type="button" onClick={onDelete} className="px-5 bg-white text-red-700 rounded-xl border-2 border-red-200 hover:bg-red-700 hover:text-white transition-all font-black text-sm">
            移除商品
          </button>
        )}
        <button type="submit" className="flex-1 py-4 bg-slate-950 text-white font-black rounded-xl text-2xl hover:bg-black shadow-2xl transform active:scale-[0.98] transition-all">
          儲存設定
        </button>
        <button type="button" onClick={onCancel} className="px-8 py-4 bg-slate-200 text-slate-700 font-black rounded-xl text-lg hover:bg-slate-300">
          取消
        </button>
      </div>
    </form>
  )
}