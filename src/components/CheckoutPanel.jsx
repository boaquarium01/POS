import React, { useEffect, useCallback } from 'react';

/**
 * CheckoutPanel — 1500×900 設計基準，上下 RWD 無留白，淺色明亮主題
 */
export default function CheckoutPanel({
  subtotal,
  finalTotal,
  receivedAmount,
  setReceivedAmount,
  change,
  paymentMethod,
  setPaymentMethod,
  discountAmount,
  setDiscountAmount,
  discountPercent,
  setDiscountPercent,
  onOpenNumpad,
  onOpenExpenseModal,
  onCheckout,
  onOpenCashDrawer,
  cartLength,
  isModalOpen
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
    <div className="w-[360px] md:w-[400px] lg:w-[440px] flex flex-col bg-slate-50 border-l border-slate-200 select-none h-full overflow-hidden">

      {/* ── 1. 工具列 ── */}
      <div className="h-[72px] px-4 bg-white border-b border-slate-200 flex gap-3 items-center shrink-0">
        <button onClick={onOpenExpenseModal}
          className="flex-1 h-10 rounded-xl text-sm font-black border border-slate-200 text-slate-600 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all shadow-sm">
          💸 支出登記
        </button>
        <button onClick={onOpenCashDrawer}
          className="flex-1 h-10 rounded-xl text-sm font-black border border-slate-200 text-slate-600 bg-slate-50 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all shadow-sm">
          🔓 開錢箱
        </button>
      </div>

      {/* ── 2. 摘要區 (白底, shrink-0) ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-5 pt-4 pb-4">

        {/* 商品小計 — 獨立醒目大區塊 */}
        <div className="flex flex-col items-center justify-center bg-blue-50/50 rounded-2xl py-4 border border-blue-100 mb-3 shadow-sm">
          <span className="text-sm font-black text-blue-500/80 mb-1 tracking-widest uppercase">商品小計 Subtotal</span>
          <span className="text-4xl font-black font-mono text-blue-700 tracking-tight">
            ${(subtotal || 0).toLocaleString()}
          </span>
        </div>

        {/* 折讓 / 折扣 */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onOpenNumpad("設定折讓", discountAmount, v => setDiscountAmount(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all shadow-sm ${hasDiscountAmt ? 'border-rose-300 bg-rose-50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
            <span className={`text-xs font-black uppercase tracking-widest ${hasDiscountAmt ? 'text-rose-500' : 'text-slate-400'}`}>折讓</span>
            <span className={`text-xl font-black font-mono ${hasDiscountAmt ? 'text-rose-600' : 'text-slate-600'}`}>-${discountAmount}</span>
          </button>
          <button onClick={() => onOpenNumpad("設定折扣%", discountPercent, v => setDiscountPercent(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 transition-all shadow-sm ${hasDiscountPct ? 'border-orange-300 bg-orange-50' : 'border-slate-100 bg-white hover:border-blue-300'}`}>
            <span className={`text-xs font-black uppercase tracking-widest ${hasDiscountPct ? 'text-orange-500' : 'text-slate-400'}`}>折扣</span>
            <span className={`text-xl font-black font-mono ${hasDiscountPct ? 'text-orange-600' : 'text-slate-600'}`}>{discountPercent}%</span>
          </button>
        </div>
      </div>

      {/* ── 3. 收銀區 (淺色, flex-1 填滿垂直剩餘空間) ── */}
      <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">

        {/* 應收金額 Banner */}
        <div className="bg-slate-800 px-5 py-4 flex items-center justify-between shrink-0 shadow-md relative z-10">
          <span className="text-slate-300 font-black text-sm uppercase tracking-widest">應收金額 TOTAL</span>
          <span className="text-5xl font-black font-mono tracking-tight text-white">
            ${(finalTotal || 0).toLocaleString()}
          </span>
        </div>

        {/* 實收 / 找零 */}
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

        {/* 數字鍵盤 — flex-1 + h-full 使其完全延展填滿空白 */}
        <div className="flex-1 grid grid-rows-4 grid-cols-3 gap-2 min-h-0 p-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '00'].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (num === 'C') setReceivedAmount('');
                else setReceivedAmount(prev => prev.toString() + num.toString());
              }}
              className={`h-full w-full rounded-2xl font-black text-2xl transition-all shadow-sm active:scale-95 ${num === 'C'
                ? 'bg-rose-50 text-rose-500 border-2 border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* 支付方式 */}
        <div className="shrink-0 grid grid-cols-3 gap-2 px-4 pb-2">
          {[
            { label: '現金', full: '現金支付', icon: '💵', color: 'text-emerald-600', active: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200' },
            { label: '轉帳', full: '銀行轉帳', icon: '🏦', color: 'text-blue-600', active: 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' },
            { label: '刷卡', full: '信用卡', icon: '💳', color: 'text-violet-600', active: 'border-violet-500 bg-violet-50 ring-2 ring-violet-200' },
          ].map(({ label, full, icon, color, active }) => {
            const isSelected = paymentMethod === full;
            return (
              <button key={label} onClick={() => setPaymentMethod(full)}
                className={`py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all outline-none border-2 shadow-sm ${isSelected
                  ? active
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                <span className="text-lg">{icon}</span>
                <span className={isSelected ? color : ''}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* 快捷金額 */}
        <div className="shrink-0 grid grid-cols-4 gap-2 px-4 pb-4">
          {[100, 500, 1000, 5000].map(amt => (
            <button key={amt} onClick={() => setReceivedAmount(String(amt))}
              className="h-10 rounded-xl bg-white border-2 border-slate-200 text-slate-500 text-sm font-black hover:border-blue-300 hover:text-blue-600 shadow-sm transition-all active:scale-95">
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. 結帳按鈕 ── */}
      <div className="shrink-0 px-4 py-4 bg-white border-t border-slate-200">
        <button
          onClick={onCheckout}
          disabled={!canCheckout}
          className={`w-full py-5 rounded-2xl font-black text-xl transition-all active:scale-[0.98] ${canCheckout
            ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700 shadow-blue-200'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200'
            }`}
        >
          {change < 0 ? `還差 $${Math.abs(change).toLocaleString()}` : '確認結帳 (Enter)'}
        </button>
      </div>
    </div>
  );
}