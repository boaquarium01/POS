// src/components/CartPanel.jsx
import React, { useState } from 'react';

export default function CartPanel({ cart, subtotal, finalTotal, onRemoveItem, onClearCart, updateCartItem, onOpenNumpad, onSwitchToCheckout, isTabletMode }) {
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
    <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-slate-100 lg:border-r border-slate-200 relative h-full">

      {/* ── 標題列 h-[72px] (放大10%) ── */}
      <div className="h-[72px] px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 h-full">
          <div className="flex flex-col">
            <span className="text-[17px] font-black text-slate-700">🛒 購物清單</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cart.length} ITEMS</span>
          </div>

          {/* Tablet Toggle Button: Only show if onSwitchToCheckout is provided and screens < xl */}
          {onSwitchToCheckout && (
            <button
              onClick={onSwitchToCheckout}
              className="xl:hidden flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-sm active:scale-95 transition-all shadow-md shadow-blue-200"
            >
              結帳 ➔
            </button>
          )}
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-2">
            {isDeleteMode && (
              <button
                onClick={() => setIsDeleteMode(false)}
                className="h-9 px-3 rounded-xl text-slate-500 font-black text-sm border-2 border-slate-200 hover:bg-slate-100"
              >
                取消
              </button>
            )}
            <button
              onClick={handleClearButtonClick}
              className={`h-9 px-4 rounded-xl font-black text-sm transition-all ${isDeleteMode
                  ? "bg-rose-600 text-white ring-4 ring-rose-100"
                  : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
            >
              {isDeleteMode ? "⚠️ 確認清空" : "🗑 編輯"}
            </button>
          </div>
        )}
      </div>

      {/* ── 購物車列表 ── */}
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5 no-scrollbar">

        {/* 空狀態 */}
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-10">
            <div className="text-6xl mb-3 opacity-40">🛒</div>
            <span className="font-black text-base">購物車是空的</span>
            <span className="text-sm mt-1">點擊左方商品加入</span>
          </div>
        )}

        {cart.map((item, index) => (
          <div
            key={index}
            className={`rounded-xl border-2 transition-all ${isDeleteMode
                ? "border-rose-300 bg-rose-50"
                : "border-white bg-white hover:border-blue-400 active:scale-[0.98] cursor-pointer shadow-sm"
              }`}
            onClick={() => !isDeleteMode && openEdit(item, index)}
          >
            <div className="flex items-center px-3 py-3 gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-black text-slate-800 text-[15px] leading-tight truncate">{item.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[13px] font-bold text-slate-400">${item.price}</span>
                  <span className="text-[13px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">×{item.quantity}</span>
                </div>
              </div>

              {isDeleteMode ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveItem(index); }}
                  className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-sm font-black active:scale-95 shrink-0"
                >
                  刪除
                </button>
              ) : (
                <span className="text-[17px] font-black font-mono text-slate-800 shrink-0">
                  ${(item.price * item.quantity).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}