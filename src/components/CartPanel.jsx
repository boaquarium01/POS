import React, { useState, useEffect } from 'react';

export default function CartPanel({ 
  cart, 
  onRemoveItem, 
  onClearCart, // 新增：清除購物車的 props
  originalSubtotal, 
  subtotal, 
  finalTotal,
  updateCartItem 
}) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);
  const [activeField, setActiveField] = useState('quantity'); 
  const [isFirstInput, setIsFirstInput] = useState(true);

  const saveEdit = () => {
    if (editingData && updateCartItem) {
      updateCartItem(editingData.index, { 
        quantity: Number(editingData.quantity), 
        price: Number(editingData.price) 
      });
      closeModal();
    }
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setEditingData(null);
  };

  const openEditModal = (item, index) => {
    setEditingData({ ...item, index });
    setActiveField('quantity');
    setIsFirstInput(true);
    setIsEditModalOpen(true);
  };

  const handleInput = (val) => {
    setEditingData(prev => {
      if (!prev) return null;
      const currentVal = prev[activeField].toString();
      let newVal;
      if (val === 'clear') newVal = '0';
      else if (val === 'backspace') newVal = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
      else {
        if (isFirstInput) { newVal = val; setIsFirstInput(false); }
        else { newVal = currentVal === '0' ? val : currentVal + val; }
      }
      return { ...prev, [activeField]: parseFloat(newVal) || 0 };
    });
  };
  const [clearStage, setClearStage] = useState(0); // 0: 初始, 1: 待確認

// 2. 新增處理函式
const handleClearClick = () => {
  if (clearStage === 0) {
    setClearStage(1);
    // 2秒後自動重置狀態，防止過久之後誤觸
    setTimeout(() => setClearStage(0), 2000);
  } else {
    onClearCart();
    setClearStage(0);
  }
};
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isEditModalOpen) return;
      if ((e.key >= '0' && e.key <= '9')) { e.preventDefault(); handleInput(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleInput('backspace'); }
      else if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
      else if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        setActiveField(prev => prev === 'quantity' ? 'price' : 'quantity');
        setIsFirstInput(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, activeField, isFirstInput, editingData]);

  return (
    <div className="w-96 flex flex-col bg-slate-100 border-r shadow-2xl relative h-full">
      {/* 標題區 */}
      <div className="h-24 p-6 bg-slate-900 text-white font-black flex items-center justify-between shadow-lg z-20">
        <div className="flex flex-col">
          <div className="text-xl tracking-widest font-black">🛒 購物車</div>
          <div className="text-xs opacity-60 font-bold tracking-widest">統計品項：{cart.length} 件</div>
        </div>
        
        {/* 清除購物車按鈕 */}
        {cart.length > 0 && (
  <button 
    onClick={handleClearClick}
    className={`p-2 px-4 rounded-2xl transition-all flex flex-col items-center gap-1 shadow-md ${
      clearStage === 1 
        ? "bg-orange-500 scale-110 animate-pulse ring-4 ring-orange-200" // 待確認狀態
        : "bg-rose-600 hover:bg-rose-500"                               // 初始狀態
    }`}
  >
    <span className="text-xl">
      {clearStage === 1 ? "⚠️" : "🗑️"}
    </span>
    <span className="text-xs font-black tracking-widest text-white">
      {clearStage === 1 ? "點擊確認" : "清空"}
    </span>
  </button>
)}
      </div>

      {/* 滾動清單區 */}
<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-200/50 no-scrollbar">
  {cart.map((item, idx) => (
    <div 
      key={idx} 
      onClick={() => openEditModal(item, idx)} 
      className="group relative bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95 min-h-[100px]"
    >
      {/* 左側切割裝飾條 */}
      <div className="absolute left-0 top-0 bottom-0 w-3 bg-blue-600"></div>

      <button 
        onClick={(e) => { e.stopPropagation(); onRemoveItem(idx); }} 
        className="absolute top-2 right-2 bg-rose-500 text-white w-8 h-8 rounded-xl font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md z-10"
      >✕</button>
      
      {/* 內距從 py-8 縮小至 py-3，減少上下空間 */}
      <div className="py-3 px-6 pl-8 flex flex-col justify-center">
        {/* 品名下方間距縮小 mb-1 */}
        <div className="font-black text-slate-800 text-xl mb-1 truncate leading-tight">
          {item.name}
        </div>

        <div className="flex justify-between items-end">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black font-mono text-blue-600">${item.price}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500">× {item.quantity}</span>
            </div>
          </div>
          {/* 總額稍微縮小至 3xl 讓整體比例更平衡 */}
          <div className="text-3xl font-black font-mono text-slate-900 tracking-tighter">
            ${(item.price * item.quantity).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  ))}
</div>

      {/* 底部總計區 */}
      <div className="p-6 bg-white border-t-4 border-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.15)]">
        <div className="flex justify-between text-rose-600 text-4xl font-black font-mono">
          <span className="text-xl self-center font-black bg-rose-50 px-3 py-1 rounded-xl">應收總計</span>
          <span>${finalTotal.toLocaleString()}</span>
        </div>
      </div>

      {/* --- 編輯 Modal --- */}
      {isEditModalOpen && editingData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4" onClick={closeModal}>
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="text-2xl font-black truncate">{editingData.name}</h3>
              <button onClick={closeModal} className="text-3xl p-2">✕</button>
            </div>

            <div className="p-8 space-y-6 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { setActiveField('quantity'); setIsFirstInput(true); }}
                  className={`p-6 rounded-3xl border-4 text-left transition-all ${activeField === 'quantity' ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-slate-50'}`}
                >
                  <label className="text-xs font-black text-slate-400 block mb-1">數量</label>
                  <div className="text-5xl font-mono font-black text-slate-800">{editingData.quantity}</div>
                </button>
                <button 
                  onClick={() => { setActiveField('price'); setIsFirstInput(true); }}
                  className={`p-6 rounded-3xl border-4 text-left transition-all ${activeField === 'price' ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-100 bg-slate-50'}`}
                >
                  <label className="text-xs font-black text-slate-400 block mb-1">單價</label>
                  <div className="text-5xl font-mono font-black text-slate-800">${editingData.price}</div>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0, '00', 'clear'].map((btn) => (
                  <button
                    key={btn}
                    onClick={() => btn === 'clear' ? handleInput('clear') : handleInput(btn.toString())}
                    className="h-20 rounded-2xl text-3xl font-black bg-slate-100 text-slate-700 border-b-8 border-slate-300 active:border-b-0 active:translate-y-2 transition-all flex items-center justify-center"
                  >
                    {btn === 'clear' ? 'C' : btn}
                  </button>
                ))}
              </div>

              <button 
                onClick={saveEdit}
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-3xl font-black shadow-[0_8px_0_rgb(30,64,175)] active:translate-y-1 active:shadow-none transition-all mt-4"
              >
                確認更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}