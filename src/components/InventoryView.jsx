import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import InventoryList from './InventoryList'
import InventoryForm from './InventoryForm'

export default function InventoryView({ products, fetchProducts, currentStore, stores }) {
  // --- 狀態管理 ---
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

  // --- 初始化資料 ---
  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('id, name').order('name')
      if (data) setCategories(data)
    }
    fetchCategories()
  }, [])

  // --- 通用通知函數 ---
  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  // --- 核心過濾邏輯 ---
  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? products : [];
    if (viewMode === 'current') {
      list = list.filter(p => p.is_in_current_store);
    }
    return list.filter(p => {
      const matchCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.barcode && p.barcode.includes(searchTerm))
      return matchCategory && matchSearch
    })
  }, [products, viewMode, selectedCategoryId, searchTerm])

  // --- 事件處理邏輯 ---

  // 1. 處理編輯選取
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

  // 2. 處理新增按鈕
  const handleAddNew = () => {
    setSelectedProduct(null);
    setIsAdding(true);
    setFormData({
      name: '', suggested_price: '', store_price: '', stock: '0',
      category_id: categories[0]?.id || '', barcode: '', cost: '', 
      sync_store_ids: [currentStore.id]
    });
  };

  // 3. 處理儲存 (新增 & 更新)
  const handleSave = async (e) => {
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
  };

  // 4. 刪除邏輯
  const executeDelete = async () => {
    try {
      if (deleteConfirm.mode === 'global') {
        const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id);
        if (error) throw error;
        showToast(`已徹底刪除「${selectedProduct.name}」`, 'success');
      } else {
        const { error } = await supabase
          .from('store_inventory')
          .delete()
          .eq('product_id', selectedProduct.id)
          .eq('store_id', currentStore.id);
        if (error) throw error;
        showToast(`已從 ${currentStore.name} 下架`, 'success');
      }
      setDeleteConfirm({ show: false, mode: 'local' });
      setSelectedProduct(null);
      fetchProducts();
    } catch (err) {
      showToast("操作失敗：" + err.message, 'error');
    }
  };

  // 5. 快速引入本店
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
      showToast(`✅ ${product.name} 已引入`);
      fetchProducts(); 
    } catch (err) {
      showToast("引入失敗：" + err.message, 'error');
    }
  };

  if (!products) return <div className="p-10 text-center font-black animate-pulse text-slate-400">LOADING DATA...</div>;

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden text-slate-900 font-sans relative">
      
      {/* 浮動通知組件 */}
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

      {/* --- 左欄：商品清單 --- */}
      <InventoryList 
        filteredProducts={filteredProducts}
        selectedProduct={selectedProduct}
        handleEdit={handleEdit}
        handleAddNew={handleAddNew}
        handleImportToStore={handleImportToStore}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        viewMode={viewMode}
        setViewMode={setViewMode}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentStore={currentStore}
      />

      {/* --- 右欄：編輯區域 --- */}
      <div className="flex-1 p-5 bg-slate-100 overflow-hidden flex justify-center items-center">
        {(isAdding || selectedProduct) ? (
          <InventoryForm 
            isAdding={isAdding}
            selectedProduct={selectedProduct}
            formData={formData}
            setFormData={setFormData}
            categories={categories}
            stores={stores}
            onSave={handleSave}
            onCancel={() => { setIsAdding(false); setSelectedProduct(null); }}
            onDelete={() => setDeleteConfirm({ show: true, mode: 'local' })}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-200 select-none">
            <div className="text-[12rem] mb-2 opacity-20">📦</div>
            <p className="text-2xl font-black tracking-[1rem] text-slate-300">SELECT ITEM</p>
          </div>
        )}
      </div>

      {/* --- 確認彈窗 (刪除/引入) --- */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8 text-center border-4 border-white">
            <h3 className="text-2xl font-black mb-2">{deleteConfirm.mode === 'global' ? '徹底刪除？' : '下架商品？'}</h3>
            <p className="text-slate-500 mb-8">{deleteConfirm.mode === 'global' ? '將從全系統移除，不可復原。' : `將從 ${currentStore.name} 移除此庫存項目。`}</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, mode: 'local' })} className="flex-1 py-4 bg-slate-100 font-black rounded-2xl">取消</button>
              <button onClick={executeDelete} className="flex-1 py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-200">確認執行</button>
            </div>
          </div>
        </div>
      )}

      {importConfirm.show && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center border-4 border-white">
            <h3 className="text-2xl font-black mb-2">引入商品？</h3>
            <p className="text-slate-500 mb-8">「{importConfirm.product?.name}」尚未在本店上架，是否引入？</p>
            <div className="flex gap-3">
              <button onClick={() => setImportConfirm({ show: false, product: null })} className="flex-1 py-4 bg-slate-100 font-black rounded-2xl">取消</button>
              <button onClick={async () => {
                await handleImportToStore({ stopPropagation: () => {} }, importConfirm.product);
                setImportConfirm({ show: false, product: null });
              }} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200">現在引入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}