import React, { useEffect, useCallback } from 'react';

/**
 * CheckoutPanel — designed for 1500×900 viewport, no internal scrolling.
 * Layout (top→bottom, total ≈ 900px):
 *   Header           64px
 *   Summary (gray)   ~210px  ← shrink-0, no bottom gap
 *   Dark cashier     flex-1  ← fills remaining space
 *   Checkout btn     ~80px
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
  const hasAnyDiscount = hasDiscountAmt || hasDiscountPct;
  const canCheckout = cartLength > 0 && change >= 0;

  return (
    /* RWD 寬度：小螢幕 360px，中 400px，大 440px */
    <div className="w-[360px] md:w-[400px] lg:w-[440px] flex flex-col bg-white border-l border-slate-200 select-none h-full overflow-hidden">

      {/* ══════════════════════════════════════════
          1. 頂部工具列  64px
      ══════════════════════════════════════════ */}
      <div className="h-16 px-4 border-b border-slate-100 flex gap-2.5 items-center shrink-0">
        <button onClick={onOpenExpenseModal}
          className="flex-1 h-10 rounded-xl text-[13px] font-black border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5">
          💸 支出登記
        </button>
        <button onClick={onOpenCashDrawer}
          className="flex-1 h-10 rounded-xl text-[13px] font-black border border-slate-200 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-all flex items-center justify-center gap-1.5">
          🔓 開錢箱
        </button>
      </div>

      {/* ══════════════════════════════════════════
          2. 金額摘要 (白底, shrink-0, 無下方留白)
      ══════════════════════════════════════════ */}
      <div className="shrink-0 px-4 pt-3 pb-3 bg-white border-b border-slate-100">
        {/* 小計行 */}
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-sm text-slate-400 font-bold">商品小計</span>
          <span className="text-sm font-mono font-bold text-slate-400">${(subtotal || 0).toLocaleString()}</span>
        </div>

        {/* 折讓 / 折扣按鈕 */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onOpenNumpad("設定折讓", discountAmount, v => setDiscountAmount(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${hasDiscountAmt ? 'border-rose-200 bg-rose-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">折讓</span>
            <span className={`text-base font-black font-mono ${hasDiscountAmt ? 'text-rose-600' : 'text-slate-600'}`}>-${discountAmount}</span>
          </button>
          <button onClick={() => onOpenNumpad("設定折扣%", discountPercent, v => setDiscountPercent(Number(v)))}
            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${hasDiscountPct ? 'border-orange-200 bg-orange-50' : 'border-slate-100 bg-slate-50 hover:border-blue-200'}`}>
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wide">折扣</span>
            <span className={`text-base font-black font-mono ${hasDiscountPct ? 'text-orange-600' : 'text-slate-600'}`}>{discountPercent}%</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          3. 收銀操作區 (深色, flex-1 填滿剩餘)
          應收金額 作為深色區頂部 Banner
      ══════════════════════════════════════════ */}
      <div className="flex-1 bg-[#111827] flex flex-col overflow-hidden px-4 gap-3 pb-4">

        {/* 應收金額 Banner — 緊貼白底，無縫連接 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 flex items-center justify-between shrink-0">
          <span className="text-white/70 font-black text-sm uppercase tracking-widest">應收金額</span>
          <span className={`text-5xl font-black font-mono tracking-tight text-white ${hasAnyDiscount ? 'opacity-90' : ''}`}>
            ${(finalTotal || 0).toLocaleString()}
          </span>
        </div>

        {/* 實收 / 找零 (與藍色漸層無縫接合) */}
        <div className="grid grid-cols-2 gap-0 rounded-b-2xl overflow-hidden shrink-0">
          <div className="bg-emerald-500/10 border-t border-emerald-500/20 px-4 py-3">
            <div className="text-[10px] font-black text-emerald-400/70 uppercase tracking-widest mb-0.5">實收</div>
            <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight leading-none">
              ${receivedAmount || '0'}
            </div>
          </div>
          <div className="bg-amber-500/10 border-t border-l border-amber-500/20 px-4 py-3">
            <div className="text-[10px] font-black text-amber-400/70 uppercase tracking-widest mb-0.5">找零</div>
            <div className={`text-3xl font-black font-mono tracking-tight leading-none ${change < 0 ? 'text-white/15' : 'text-amber-400'}`}>
              ${change >= 0 ? change.toLocaleString() : '---'}
            </div>
          </div>
        </div>

        {/* 數字鍵盤 */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '00'].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (num === 'C') setReceivedAmount('');
                else setReceivedAmount(prev => prev.toString() + num.toString());
              }}
              className={`h-12 rounded-xl font-black text-lg transition-all active:scale-90 ${num === 'C'
                ? 'bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30 hover:bg-rose-500/25'
                : 'bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/15'
                }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* 支付方式 */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {[
            { label: '現金', full: '現金支付', icon: '💵', activeColor: 'from-emerald-600 to-teal-600' },
            { label: '轉帳', full: '銀行轉帳', icon: '🏦', activeColor: 'from-blue-600 to-cyan-600' },
            { label: '刷卡', full: '信用卡', icon: '💳', activeColor: 'from-violet-600 to-purple-600' },
          ].map(({ label, full, icon, activeColor }) => (
            <button
              key={label}
              onClick={() => setPaymentMethod(full)}
              className={`py-3 rounded-xl font-black text-xs flex flex-col items-center gap-1.5 transition-all ${paymentMethod === full
                ? `bg-gradient-to-b ${activeColor} text-white shadow-lg scale-[1.03]`
                : 'bg-white/5 text-slate-500 ring-1 ring-white/10 hover:bg-white/10 hover:text-slate-300'
                }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              <span className="text-[12px] font-black">{label}</span>
            </button>
          ))}
        </div>

        {/* 快捷金額列 */}
        <div className="grid grid-cols-4 gap-1.5 shrink-0">
          {[100, 500, 1000, 5000].map(amt => (
            <button
              key={amt}
              onClick={() => setReceivedAmount(String(amt))}
              className="h-9 rounded-lg bg-white/5 ring-1 ring-white/10 text-slate-400 text-[12px] font-black hover:bg-white/12 hover:text-slate-200 transition-all active:scale-95"
            >
              ${amt}
            </button>
          ))}
        </div>

        {/* 彈性撐開 */}
        <div className="flex-1 min-h-0" />
      </div>

      {/* ══════════════════════════════════════════
          4. 確認結帳 按鈕
      ══════════════════════════════════════════ */}
      <div className="px-4 py-3 bg-[#111827] border-t border-white/5 shrink-0">
        <button
          onClick={onCheckout}
          disabled={!canCheckout}
          className={`w-full py-4 rounded-2xl font-black text-xl transition-all active:scale-[0.98] ${canCheckout
            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-900/50 hover:shadow-xl hover:from-blue-600 hover:to-indigo-700'
            : 'bg-white/5 text-white/20 cursor-not-allowed ring-1 ring-white/10'
            }`}
        >
          {change < 0 ? `還差 $${Math.abs(change).toLocaleString()}` : '確認結帳 (Enter)'}
        </button>
      </div>
    </div>
  );
}