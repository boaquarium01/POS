// src/components/CheckoutPanel.jsx
import React, { useEffect, useCallback } from 'react';

export default function CheckoutPanel({
  subtotal, finalTotal, receivedAmount, setReceivedAmount, change,
  paymentMethod, setPaymentMethod, discountAmount, setDiscountAmount,
  discountPercent, setDiscountPercent, onOpenNumpad, onOpenExpenseModal,
  onCheckout, onOpenCashDrawer, cartLength, isModalOpen, onSwitchToCart, isTabletMode
}) {

  const handlePhysicalKeyboard = useCallback((e) => {
    if (isModalOpen || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key;
    if (/[0-9]/.test(key)) setReceivedAmount(prev => prev + key);
    if (key === 'Backspace') setReceivedAmount(prev => prev.toString().slice(0, -1));
    if (key === 'Escape') setReceivedAmount('');
    if (key === 'Enter' && change >= 0 && cartLength > 0 && onCheckout) onCheckout();
  }, [isModalOpen, change, cartLength, onCheckout, setReceivedAmount]);

  useEffect(() => {
    window.addEventListener('keydown', handlePhysicalKeyboard);
    return () => window.removeEventListener('keydown', handlePhysicalKeyboard);
  }, [handlePhysicalKeyboard]);

  const hasDiscountAmt = discountAmount > 0;
  const hasDiscountPct = discountPercent < 100;
  const canCheckout = cartLength > 0 && change >= 0;

  return (
    <div className="w-full lg:w-[360px] xl:w-[440px] flex flex-col bg-slate-50 lg:border-l border-slate-200 select-none h-full overflow-hidden">

      {/* ── 1. 工具列 ── */}
      <div className="h-[72px] px-4 bg-white border-b border-slate-200 flex gap-3 items-center shrink-0">
        {onSwitchToCart && (
          <button
            onClick={onSwitchToCart}
            className="xl:hidden flex items-center justify-center w-10 h-10 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 active:scale-90 transition-all font-black"
          >
            ←
          </button>
        )}
        <div className="flex flex-col">
          <span className="text-[17px] font-black text-slate-700">💰 結帳收銀</span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-0.5">Payment</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={onOpenExpenseModal}
            className="px-3 h-10 rounded-xl text-xs font-black border border-slate-200 text-slate-600 bg-slate-50 hover:bg-rose-50 transition-all shadow-sm">
            💸 支出
          </button>
          <button onClick={onOpenCashDrawer}
            className="px-3 h-10 rounded-xl text-xs font-black border border-slate-200 text-slate-600 bg-slate-50 hover:bg-amber-50 transition-all shadow-sm">
            🔓 錢箱
          </button>
        </div>
      </div>

      {/* ── 2. 摘要區 ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 pt-4 pb-4">
        <div className="flex flex-col items-center justify-center bg-blue-50/50 rounded-2xl py-4 border border-blue-100 mb-3 shadow-sm">
          <span className="text-[10px] font-black text-blue-500/80 mb-1 tracking-widest uppercase">Subtotal</span>
          <span className="text-4xl font-black font-mono text-blue-700 tracking-tight">
            ${(subtotal || 0).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onOpenNumpad("設定折讓", discountAmount, v => setDiscountAmount(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all shadow-sm ${hasDiscountAmt ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${hasDiscountAmt ? 'text-rose-500' : 'text-slate-400'}`}>折讓</span>
            <span className={`text-xl font-black font-mono ${hasDiscountAmt ? 'text-rose-600' : 'text-slate-600'}`}>-${discountAmount}</span>
          </button>
          <button onClick={() => onOpenNumpad("設定折扣%", discountPercent, v => setDiscountPercent(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all shadow-sm ${hasDiscountPct ? 'border-orange-300 bg-orange-50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${hasDiscountPct ? 'text-orange-500' : 'text-slate-400'}`}>折扣</span>
            <span className={`text-xl font-black font-mono ${hasDiscountPct ? 'text-orange-600' : 'text-slate-600'}`}>{discountPercent}%</span>
          </button>
        </div>
      </div>

      {/* ── 3. 收銀區 ── */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0 shadow-md relative z-10">
          <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">應收金額 TOTAL</span>
          <span className="text-5xl font-black font-mono tracking-tight text-white">
            ${(finalTotal || 0).toLocaleString()}
          </span>
        </div>

        <div className="grid grid-cols-2 shrink-0 bg-white border-b border-slate-200">
          <div className="px-5 py-3 border-r border-slate-100">
            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">實收 Received</div>
            <div className="text-3xl font-black font-mono text-emerald-600 tracking-tight leading-none">
              ${receivedAmount || '0'}
            </div>
          </div>
          <div className="px-5 py-3">
            <div className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-0.5">找零 Change</div>
            <div className={`text-3xl font-black font-mono tracking-tight leading-none ${change < 0 ? 'text-slate-300' : 'text-orange-600'}`}>
              ${change >= 0 ? change.toLocaleString() : '---'}
            </div>
          </div>
        </div>

        <div className="flex-1 grid grid-rows-4 grid-cols-3 gap-2 min-h-0 p-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '00'].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (num === 'C') setReceivedAmount('');
                else setReceivedAmount(prev => prev.toString() + num.toString());
              }}
              className={`h-full w-full rounded-2xl font-black text-2xl transition-all shadow-sm active:scale-95 ${num === 'C'
                  ? 'bg-rose-50 text-rose-500 border-2 border-rose-200'
                  : 'bg-white text-slate-700 border-2 border-slate-200'
                }`}
            >
              {num}
            </button>
          ))}
        </div>

        <div className="shrink-0 grid grid-cols-3 gap-2 px-4 pb-2">
          {[
            { label: '現金', full: '現金支付', icon: '💵', color: 'text-emerald-600' },
            { label: '轉帳', full: '銀行轉帳', icon: '🏦', color: 'text-blue-600' },
            { label: '刷卡', full: '信用卡', icon: '💳', color: 'text-violet-600' },
          ].map(({ label, full, icon, color }) => {
            const isSelected = paymentMethod === full;
            return (
              <button key={label} onClick={() => setPaymentMethod(full)}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all border-2 shadow-sm ${isSelected ? 'border-blue-500 bg-blue-50' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                <span className="text-lg">{icon}</span>
                <span className={isSelected ? color : ''}>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="shrink-0 grid grid-cols-4 gap-2 px-4 pb-4">
          {[100, 500, 1000, 5000].map(amt => (
            <button key={amt} onClick={() => setReceivedAmount(String(amt))}
              className="h-10 rounded-xl bg-white border-2 border-slate-200 text-slate-500 text-sm font-black shadow-sm transition-all active:scale-95">
              ${amt}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 px-4 py-4 bg-white border-t border-slate-200">
        <button
          onClick={onCheckout}
          disabled={!canCheckout}
          className={`w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-[0.98] ${canCheckout
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
            }`}
        >
          {change < 0 ? `還差 $${Math.abs(change).toLocaleString()}` : '確認結帳 (Enter)'}
        </button>
      </div>
    </div>
  );
}