import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function InventoryView({ products, fetchProducts, currentStore, stores }) {
  const [categories, setCategories] = useState([])
  const [selectedCategoryId, setSelectedCategoryId] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState('current')
  
  // 彈窗與通知狀態
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, mode: 'local' });
  const [importConfirm, setImportConfirm] = useState({ show: false, product: null });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [formData, setFormData] = useState({
    name: '',
    suggested_price: '',
    store_price: '',
    stock: '',
    category_id: '',
    barcode: '',
    cost: '',
    sync_store_ids: []
  })

  // --- 【修正：統一 showToast 宣告，全組件只留這一個】 ---
  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [])

  // 核心過濾邏輯
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    if (viewMode === 'current') {
      list = list.filter(p => p.is_in_current_store);
    }
    return list.filter(p => {
      const matchCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId
      const matchSearch = p.name.includes(searchTerm) || (p.barcode && p.barcode.includes(searchTerm))
      return matchCategory && matchSearch
    })
  }, [products, viewMode, selectedCategoryId, searchTerm])

  const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '未分類'

  // --- 【修正：移除此處的 alert，改用 showToast】 ---
  const handleImportToStore = async (e, product) => {
    e.stopPropagation(); 
    try {
      const { error } = await supabase.from('store_inventory').insert([{
        store_id: currentStore.id,
        product_id: product.id,
        stock: 0,
        is_active: true
      }]);
      if (error) throw error;
      showToast(`✅ ${product.name} 已成功引入 ${currentStore.name}`);
      fetchProducts(); 
    } catch (err) {
      showToast("入庫失敗：" + err.message, 'error');
    }
  };

  const handleEdit = (product) => {
    if (!product.is_in_current_store && viewMode === 'all') {
      setImportConfirm({ show: true, product: product });
      return;
    }
    setSelectedProduct(product);
    setIsAdding(false);
    setFormData({
      name: product.name,
      suggested_price: product.suggested_price || product.price,
      store_price: product.is_custom_price ? product.price : '',
      stock: product.stock || 0,
      category_id: product.category_id || '', 
      barcode: product.barcode || '',
      cost: product.cost || 0,
      sync_store_ids: [currentStore.id]
    });
  };

  const executeImport = async () => {
    const product = importConfirm.product;
    try {
      const { error } = await supabase.from('store_inventory').insert([{
        store_id: currentStore.id,
        product_id: product.id,
        stock: 0,
        is_active: true
      }]);
      if (error) throw error;
      showToast(`✅ ${product.name} 已成功引入 ${currentStore.name}`);
      setImportConfirm({ show: false, product: null });
      fetchProducts();
    } catch (err) {
      showToast("入庫失敗：" + err.message, 'error');
    }
  };

  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsAdding(true);
    setFormData({
      name: '', suggested_price: '', store_price: '', stock: '0',
      category_id: categories[0]?.id || '', barcode: '', cost: '', 
      sync_store_ids: [currentStore.id]
    });
  };

  async function handleSave(e) {
    e.preventDefault();
    try {
      let productId = selectedProduct?.id;
      const productPayload = {
        name: formData.name,
        barcode: formData.barcode.trim() || null,
        suggested_price: parseFloat(formData.suggested_price),
        cost: parseFloat(formData.cost),
        category_id: formData.category_id
      };

      if (isAdding) {
        const { data, error } = await supabase.from('products').insert([productPayload]).select().single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await supabase.from('products').update(productPayload).eq('id', productId);
        if (error) throw error;
      }

      if (isAdding) {
        const inventoryPayload = formData.sync_store_ids.map(storeId => ({
          store_id: storeId,
          product_id: productId,
          stock: parseInt(formData.stock),
          store_price: formData.store_price ? parseFloat(formData.store_price) : null,
          is_active: true
        }));
        const { error: invError } = await supabase.from('store_inventory').insert(inventoryPayload);
        if (invError) throw invError;
      } else {
        const { error: invError } = await supabase
          .from('store_inventory')
          .update({
            stock: parseInt(formData.stock),
            store_price: formData.store_price ? parseFloat(formData.store_price) : null
          })
          .eq('store_id', currentStore.id)
          .eq('product_id', productId);
        if (invError) throw invError;
      }

      showToast(`✅ ${isAdding ? '商品已建立' : '商品已更新'}`);
      setIsAdding(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      showToast("儲存失敗：" + err.message, 'error');
    }
  }

  const triggerDelete = () => {
    if (!selectedProduct) return;
    setDeleteConfirm({ show: true, mode: 'local' });
  };

  const executeDelete = async () => {
    try {
      if (deleteConfirm.mode === 'global') {
        const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id);
        if (error) throw error;
        showToast(`已從全系統徹底移除「${selectedProduct.name}」`, 'success');
      } else {
        const { error } = await supabase
          .from('store_inventory')
          .delete()
          .eq('product_id', selectedProduct.id)
          .eq('store_id', currentStore.id);
        if (error) throw error;
        showToast(`已從 ${currentStore.name} 下架「${selectedProduct.name}」`, 'success');
      }
      setDeleteConfirm({ show: false, mode: 'local' });
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      showToast("下架失敗：" + err.message, 'error');
    }
  };

  if (!products || !Array.isArray(products)) return <div className="p-10 text-center">正在準備商品資料...</div>;
  if (!currentStore || !stores || stores.length === 0) return <div className="p-10 text-center font-bold">正在讀取分店資訊...</div>;

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden text-slate-900 font-sans relative">
      
      {/* --- 浮動通知 --- */}
      {notification.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top duration-300">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 border-4 bg-white ${
            notification.type === 'success' ? 'border-emerald-500 text-emerald-600' : 'border-red-500 text-red-600'
          }`}>
            <span className="text-2xl">{notification.type === 'success' ? '✨' : '⚠️'}</span>
            {notification.message}
          </div>
        </div>
      )}

      {/* --- 左側列表 --- */}
      <div className="w-[650px] bg-white border-r flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b-4 border-slate-50 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full ${viewMode === 'current' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {viewMode === 'current' ? `${currentStore?.name} 庫存中` : '全公司總表'}
                </span>
              </div>
              <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic leading-none">庫存管理</h2>
            </div>
            <button onClick={handleAddNew} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
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
              placeholder={viewMode === 'current' ? `在 ${currentStore?.name} 搜尋...` : "搜尋全公司商品庫..."} value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/30">
          {filteredProducts.map(p => (
            <div key={p.id} onClick={() => handleEdit(p)} 
              className={`p-6 border-b cursor-pointer flex justify-between items-center transition-all 
              ${selectedProduct?.id === p.id ? 'bg-slate-900 text-white shadow-inner' : 'hover:bg-blue-50 bg-white'}
              ${!p.is_in_current_store ? 'opacity-60 bg-slate-50' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-black text-2xl tracking-tight ${selectedProduct?.id === p.id ? 'text-white' : 'text-slate-800'}`}>{p.name}</span>
                  {!p.is_in_current_store && <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-black uppercase">未上架</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold ${selectedProduct?.id === p.id ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{getCategoryName(p.category_id)}</span>
                </div>
              </div>
              <div className="text-right flex items-center gap-6">
                {p.is_in_current_store ? (
                  <div>
                    <div className={`text-4xl font-black font-mono leading-none ${p.stock <= 0 ? 'text-red-500' : selectedProduct?.id === p.id ? 'text-emerald-400' : 'text-slate-800'}`}>{p.stock}</div>
                    <div className={`text-sm font-bold opacity-60 mt-2 ${selectedProduct?.id === p.id ? 'text-white' : ''}`}>${p.price}</div>
                  </div>
                ) : (
                  <button onClick={(e) => handleImportToStore(e, p)} className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-black shadow-lg hover:bg-blue-700 active:scale-95 whitespace-nowrap">＋ 引入本店</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 右側面板 --- */}
      <div className="flex-1 p-5 bg-slate-100 overflow-hidden flex justify-center">
        {(isAdding || selectedProduct) ? (
          <form onSubmit={handleSave} className="w-full max-w-4xl bg-white p-7 rounded-[1.8rem] shadow-xl flex flex-col h-full border-2 border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b-2 border-slate-100">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{isAdding ? '✨ 新增商品入庫' : '📝 編輯商品資訊'}</h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 no-scrollbar space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-black text-slate-700 ml-1">商品名稱</label>
                    <input required className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none font-black text-lg text-slate-900" 
                      value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-slate-700 ml-1">分類目錄</label>
                    <select className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-200 focus:border-blue-600 outline-none font-black text-lg text-slate-900 cursor-pointer" 
                      value={formData.category_id} onChange={e=>setFormData({...formData, category_id: e.target.value})}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-slate-700 ml-1">條碼</label>
                    <input className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-200 outline-none font-black text-lg text-slate-900" 
                      value={formData.barcode} onChange={e=>setFormData({...formData, barcode: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-slate-700 ml-1">建議售價</label>
                    <input required type="number" className="w-full p-3 bg-blue-50/30 rounded-xl border-2 border-blue-100 outline-none font-black text-xl text-blue-700" 
                      value={formData.suggested_price} onChange={e=>setFormData({...formData, suggested_price: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-slate-700 ml-1">進貨成本</label>
                    <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-2 border-slate-200 outline-none font-black text-xl text-slate-700" 
                      value={formData.cost} onChange={e=>setFormData({...formData, cost: e.target.value})} />
                  </div>
                </div>
                
              </div>

              <div className="p-6 bg-amber-50 rounded-[1.5rem] border-2 border-amber-100 space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-amber-800 ml-1">本店售價</label>
                    <input type="number" placeholder="跟隨建議價" className="w-full p-4 bg-white rounded-xl border-2 border-amber-200 outline-none font-black text-2xl text-amber-600" 
                      value={formData.store_price} onChange={e=>setFormData({...formData, store_price: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-black text-emerald-800 ml-1">本店庫存</label>
                    <input required type="number" className="w-full p-4 bg-white rounded-xl border-2 border-emerald-200 outline-none font-black text-2xl text-emerald-600 text-center" 
                      value={formData.stock} onChange={e=>setFormData({...formData, stock: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border-2 border-slate-200 mt-6">
  <label className="text-xs font-black text-slate-800 mb-3 block ml-1 uppercase">
    {isAdding ? '🚀 同步上架至以下分店：' : '📍 其他分店上架狀況：'}
  </label>
  <div className="grid grid-cols-2 gap-3">
    {stores.map(s => {
      const isChecked = isAdding 
        ? formData.sync_store_ids.includes(s.id) 
        : selectedProduct?.available_in_stores?.includes(s.id);

      return (
        <div 
          key={s.id} 
          className={`flex items-center justify-center gap-2 p-3 rounded-xl border-4 transition-all font-black text-lg 
            ${isChecked 
              ? 'bg-blue-600 border-blue-800 text-white shadow-md' 
              : 'bg-white border-slate-200 text-slate-300'
            } ${isAdding ? 'cursor-pointer hover:border-blue-400' : 'cursor-default opacity-80'}`}
          onClick={() => {
            if (!isAdding) return;
            const ids = formData.sync_store_ids.includes(s.id) 
              ? formData.sync_store_ids.filter(id => id !== s.id)
              : [...formData.sync_store_ids, s.id];
            setFormData({ ...formData, sync_store_ids: ids });
          }}
        >
          <span>{s.name}</span>
          {isChecked && <span>✓</span>}
        </div>
      );
    })}
  </div>
</div>
            </div>

            <div className="flex gap-4 mt-5">
              {!isAdding && selectedProduct && (
                <button type="button" onClick={triggerDelete} className="flex-none px-6 bg-red-50 text-red-500 rounded-xl border-2 border-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
              <button type="submit" className="flex-[3] py-4 bg-slate-900 text-white font-black rounded-xl text-xl hover:bg-black transition-all">儲存設定</button>
              <button type="button" onClick={() => { setIsAdding(false); setSelectedProduct(null); }} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-xl text-xl">取消</button>
            </div>
          </form>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200">
            <div className="text-[10rem] mb-2 opacity-40">📦</div>
            <p className="text-xl font-black tracking-widest text-slate-300">請選取商品</p>
          </div>
        )}
      </div>

      {/* --- 確認彈窗 --- */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-center border-4 border-white">
            <h3 className="text-2xl font-black mb-2">{deleteConfirm.mode === 'global' ? '徹底刪除？' : '下架商品？'}</h3>
            <p className="text-slate-500 mb-8">{deleteConfirm.mode === 'global' ? '將從全系統移除，不可復原。' : `將從 ${currentStore.name} 移除。`}</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, mode: 'local' })} className="flex-1 py-4 bg-slate-100 rounded-2xl">取消</button>
              <button onClick={executeDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl">確認執行</button>
            </div>
          </div>
        </div>
      )}

      {importConfirm.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border-4 border-white">
            <h3 className="text-2xl font-black mb-2">引入商品？</h3>
            <p className="text-slate-500 mb-8">「{importConfirm.product?.name}」尚未在本店上架，是否引入？</p>
            <div className="flex gap-3">
              <button onClick={() => setImportConfirm({ show: false, product: null })} className="flex-1 py-4 bg-slate-100 rounded-2xl">取消</button>
              <button onClick={executeImport} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl">現在引入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}