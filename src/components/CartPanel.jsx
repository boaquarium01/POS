import React, { useState, useEffect } from 'react';

export default function CartPanel({ 
  cart, 
  onRemoveItem, 
  onClearCart, 
  updateCartItem 
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [activeField, setActiveField] = useState('price'); 
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const openEditModal = (item, index) => {
    if (isDeleteMode) return;
    setEditingData({ ...item, index });
    setActiveField('price');
    setIsFirstInput(true);
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingData(null);
  };

  const saveEdit = () => {
    if (editingData && updateCartItem) {
      updateCartItem(editingData.index, { 
        quantity: Math.max(1, Number(editingData.quantity)), 
        price: Number(editingData.price) 
      });
      closeModal();
    }
  };

  const handleInput = (val) => {
    setEditingData(prev => {
      if (!prev) return null;
      let 當前值 = prev[activeField].toString();
      let 新值;
      if (val === 'clear') 新值 = '0';
      else if (val === 'backspace') 新值 = 當前值.length > 1 ? 當前值.slice(0, -1) : '0';
      else {
        if (isFirstInput) { 新值 = val; setIsFirstInput(false); }
        else { 新值 = 當前值 === '0' ? val : 當前值 + val; }
      }
      return { ...prev, [activeField]: parseFloat(新值) || 0 };
    });
  };

  const adjustQuantity = (delta) => {
    setEditingData(prev => ({
      ...prev,
      quantity: Math.max(1, (Number(prev.quantity) || 0) + delta)
    }));
  };

  const handleClearButtonClick = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
    } else {
      onClearCart();
      setIsDeleteMode(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditModalOpen) return;
      e.stopPropagation(); 
      if ((e.key >= '0' && e.key <= '9')) { e.preventDefault(); handleInput(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleInput('backspace'); }
      else if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEditModalOpen, activeField, isFirstInput, editingData]);

  return (
    <div className="w-96 flex flex-col bg-slate-200 border-r shadow-xl relative h-full">
      
      {/* 1. 控制區 */}
      <div className="h-20 p-4 bg-white border-b flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 tracking-widest leading-none">清單內容</span>
          <span className="text-2xl font-black text-slate-900">🛒 {cart.length} 件</span>
        </div>
        
        {cart.length > 0 && (
          <div className="flex gap-2">
            {isDeleteMode && (
              <button 
                onClick={() => setIsDeleteMode(false)}
                className="h-12 px-4 rounded-xl bg-white border-2 border-slate-300 text-slate-700 font-black text-base"
              >
                取消
              </button>
            )}
            <button 
              onClick={handleClearButtonClick}
              className={`h-12 px-4 rounded-xl transition-all font-black text-base shadow-md flex items-center gap-2 ${
                isDeleteMode 
                  ? "bg-rose-600 text-white ring-4 ring-rose-200" 
                  : "bg-slate-800 text-white hover:bg-black"
              }`}
            >
              {isDeleteMode ? "⚠️ 確認全清" : "🗑️ 刪除/清空"}
            </button>
          </div>
        )}
      </div>

      {/* 2. 卡片清單 - 高度壓縮，文字放大 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar pb-10">
        {cart.map((品項, 索引) => (
          <div 
            key={索引} 
            onClick={() => openEditModal(品項, 索引)} 
            className={`group relative rounded-xl p-3 shadow-sm border-2 transition-all ${
              isDeleteMode 
                ? "border-rose-400 bg-rose-50" 
                : "border-white bg-white hover:border-blue-500 active:scale-95"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              {/* 品名區域 - 放大且限制行數 */}
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-900 text-xl leading-tight truncate">
                  {品項.name}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-base font-black text-slate-400">單價 ${品項.price}</span>
                  <span className="text-xl font-black text-blue-600 bg-blue-50 px-2 rounded">x{品項.quantity}</span>
                </div>
              </div>

              {/* 小計金額 - 特大強調 */}
              <div className="text-right shrink-0">
                {isDeleteMode ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onRemoveItem(索引); }}
                    className="bg-rose-600 text-white px-4 py-2 rounded-lg text-lg font-black shadow-lg"
                  >
                    刪除
                  </button>
                ) : (
                  <div className="flex flex-col items-end">
                    <span className="text-2xl font-black font-mono text-slate-900 leading-none">
                      ${(品項.price * 品項.quantity).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. 彈窗優化 */}
      {isEditModalOpen && editingData && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4" onClick={closeModal}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-[400px] overflow-hidden border-none" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black truncate">{editingData.name}</h3>
              <button onClick={closeModal} className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-full text-2xl">✕</button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border-2 transition-all ${activeField === 'quantity' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                   <label className="text-xs font-black text-slate-400 block mb-2">數量</label>
                   <div className="flex items-center justify-between">
                     <button onClick={() => adjustQuantity(-1)} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90">-</button>
                     <button onClick={() => { setActiveField('quantity'); setIsFirstInput(true); }} className="text-5xl font-mono font-black text-slate-900 flex-1 text-center">
                       {editingData.quantity}
                     </button>
                     <button onClick={() => adjustQuantity(1)} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90">+</button>
                   </div>
                </div>

                <button 
                  onClick={() => { setActiveField('price'); setIsFirstInput(true); }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${activeField === 'price' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                >
                  <label className="text-xs font-black text-slate-400 block mb-2">單價</label>
                  <div className="text-5xl font-mono font-black text-slate-900 text-center">${editingData.price}</div>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, '00'].map((鍵) => (
                  <button
                    key={鍵}
                    onClick={() => 鍵 === 'clear' ? handleInput('clear') : handleInput(鍵.toString())}
                    className={`h-16 rounded-xl text-3xl font-black transition-all active:scale-95 ${
                      鍵 === 'clear' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {鍵 === 'clear' ? '清除' : 鍵}
                  </button>
                ))}
              </div>

              <button onClick={saveEdit} className="w-full py-6 bg-blue-600 text-white rounded-2xl text-2xl font-black shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                確認完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}