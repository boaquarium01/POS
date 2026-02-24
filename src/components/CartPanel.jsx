import React, { useState } from 'react';

export default function CartPanel({
  cart,
  onRemoveItem,
  onClearCart,
  updateCartItem,
  onOpenNumpad
}) {
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  const openEdit = (item, index) => {
    if (isDeleteMode) return;
    onOpenNumpad(
      'cart_edit',
      `${item.name}`,
      { price: item.price, quantity: item.quantity },
      (newVal) => {
        updateCartItem(index, {
          price: parseFloat(newVal.price) || 0,
          quantity: Math.max(1, parseInt(newVal.quantity) || 1)
        });
      }
    );
  };

  const handleClearButtonClick = () => {
    if (!isDeleteMode) {
      setIsDeleteMode(true);
    } else {
      onClearCart();
      setIsDeleteMode(false);
    }
  };

  return (
    /* 使用淺灰背景來襯托白色卡片的邊框 */
    <div className="w-80 lg:w-96 flex flex-col bg-slate-100 border-r border-slate-200 relative h-full">

      {/* ── 標題列 ── */}
      <div className="h-[72px] px-5 bg-white border-b-2 border-slate-200 flex items-center justify-between shrink-0">
        <span className="text-xl font-black text-slate-800">
          🛒 購物車 <span className="text-slate-400 font-bold">({cart.length})</span>
        </span>
        
        {cart.length > 0 && (
          <div className="flex items-center gap-2">
            {isDeleteMode && (
              <button
                onClick={() => setIsDeleteMode(false)}
                className="h-11 px-4 rounded-xl text-slate-500 font-black text-sm border-2 border-slate-300 bg-white hover:bg-slate-50 transition-all"
              >
                取消
              </button>
            )}
            <button
              onClick={handleClearButtonClick}
              className={`h-11 flex items-center justify-center rounded-xl transition-all duration-300 ${
                isDeleteMode
                ? "px-4 bg-rose-600 text-white ring-4 ring-rose-100 shadow-lg"
                : "w-11 bg-slate-800 text-white hover:bg-slate-700 shadow-md"
              }`}
            >
              <span className="text-xl mr-1">{isDeleteMode ? "⚠️" : "🗑"}</span>
              {isDeleteMode && <span className="font-black text-base whitespace-nowrap">清空</span>}
            </button>
          </div>
        )}
      </div>

      {/* ── 購物車列表 ── */}
      <div className="flex-1 overflow-y-auto py-2 px-3 space-y-2 no-scrollbar">

        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-10">
            <div className="text-7xl mb-4 opacity-20">🛒</div>
            <span className="font-black text-xl">購物車是空的</span>
          </div>
        )}

        {cart.map((品項, 索引) => (
          <div
            key={索引}
            className={`rounded-2xl border-[3px] transition-all duration-200 ${
              isDeleteMode
              ? "border-rose-500 bg-rose-50 shadow-none scale-[0.98]" 
              : "bg-white border-slate-200 shadow-md hover:border-blue-500 hover:shadow-xl active:scale-[0.98] cursor-pointer"
            }`}
            onClick={() => !isDeleteMode && openEdit(品項, 索引)}
          >
            <div className="flex items-start px-4 py-3 gap-3"> 
              <div className="flex-1 min-w-0">
                <div className={`font-black text-xl leading-tight break-words ${isDeleteMode ? "text-rose-900" : "text-slate-900"}`}>
                  {品項.name}
                </div>
                
                <div className="flex items-center gap-2.5 mt-1.5">
                  <span className={`text-base font-bold ${isDeleteMode ? "text-rose-400" : "text-slate-400"}`}>
                    ${品項.price.toLocaleString()}
                  </span>
                  <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg border ${
                    isDeleteMode 
                    ? "text-rose-600 bg-rose-100 border-rose-200" 
                    : "text-blue-600 bg-blue-50 border-blue-100"
                  }`}>
                    × {品項.quantity}
                  </span>
                </div>
              </div>

              {/* 右側金額或刪除按鈕 */}
              {isDeleteMode ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveItem(索引); }}
                  className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-base font-black active:scale-90 shrink-0 self-center shadow-md border-2 border-rose-700"
                >
                  刪除
                </button>
              ) : (
                <div className="shrink-0 self-center">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    ${(品項.price * 品項.quantity).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}