import React, { useEffect, useCallback } from 'react';

export default function CheckoutPanel({ 
  subtotal,           // 確保名稱為 subtotal
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
  onCheckout,         // 確保有接收此 function
  onOpenCashDrawer,
  cartLength,
  isModalOpen 
}) {

  // --- 實體鍵盤邏輯處理 ---
  const handlePhysicalKeyboard = useCallback((e) => {
    if (isModalOpen || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const key = e.key;

    if (/[0-9]/.test(key)) {
      setReceivedAmount(prev => prev + key);
    }
    
    if (key === 'Backspace') {
      setReceivedAmount(prev => prev.toString().slice(0, -1));
    }

    if (key === 'Escape') {
      setReceivedAmount('');
    }

    if (key === 'Enter') {
      if (change >= 0 && cartLength > 0 && onCheckout) {
        onCheckout();
      }
    }
  }, [isModalOpen, change, cartLength, onCheckout, setReceivedAmount]);

  useEffect(() => {
    window.addEventListener('keydown', handlePhysicalKeyboard);
    return () => window.removeEventListener('keydown', handlePhysicalKeyboard);
  }, [handlePhysicalKeyboard]);


  return (
    <div className="w-[450px] flex flex-col bg-white shadow-2xl z-10 border-l border-slate-200 select-none">
      
      {/* 1. 頂部管理功能 */}
      <div className="h-20 p-4 bg-white border-b flex gap-3 items-center shrink-0">
        <button 
          onClick={() => onOpenNumpad('雜支支出', 0, (v) => console.log("支出:", v))} 
          className="flex-1 h-12 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all"
        >
          💸 支出登記
        </button>
        <button 
          onClick={onOpenCashDrawer} 
          className="flex-1 h-12 bg-slate-50 text-slate-500 rounded-xl font-bold text-sm border border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all"
        >
          🔓 開錢箱
        </button>
      </div>

      {/* 2. 金額計算與優惠 (層次化佈局) */}
      <div className="bg-slate-50 p-6 border-b space-y-4">
        {/* 第一層：商品小計 */}
        <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
          <span>商品小計:</span>
          <span className="font-mono text-base">${(subtotal || 0).toLocaleString()}</span>
        </div>

        {/* 第二層：折扣/折讓按鈕 */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onOpenNumpad("設定折讓", discountAmount, (v) => setDiscountAmount(Number(v)))} 
            className="flex flex-col items-center justify-center py-2 px-4 border-2 border-slate-200 rounded-2xl bg-white hover:border-blue-400 transition-all group"
          >
            <span className="text-[10px] text-slate-400 group-hover:text-blue-500 font-black uppercase tracking-widest">Discount / 折讓</span>
            <span className="text-lg font-black text-slate-700">-${discountAmount}</span>
          </button>
          <button 
            onClick={() => onOpenNumpad("設定折扣%", discountPercent, (v) => setDiscountPercent(Number(v)))} 
            className="flex flex-col items-center justify-center py-2 px-4 border-2 border-slate-200 rounded-2xl bg-white hover:border-blue-400 transition-all group"
          >
            <span className="text-[10px] text-slate-400 group-hover:text-blue-500 font-black uppercase tracking-widest">Percent / 折扣</span>
            <span className="text-lg font-black text-slate-700">{discountPercent}%</span>
          </button>
        </div>

        {/* 第三層：最終應收 (醒目顯示) */}
        <div className="flex justify-between items-end pt-2 border-t border-slate-200">
          <span className="text-slate-600 font-black text-lg">應收金額:</span>
          <span className="text-4xl font-black text-blue-600 font-mono tracking-tighter">
            ${(finalTotal || 0).toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* 3. 收銀核心區 (實收、找零、虛擬鍵盤) */}
      <div className="p-6 bg-slate-900 text-white space-y-6 shadow-inner flex-1 overflow-y-auto">
        {/* 金額顯示 */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-500 tracking-widest block uppercase">Received / 實收</span>
            <div className="text-5xl font-black font-mono text-emerald-400 tracking-tighter">
              ${receivedAmount || '0'}
            </div>
          </div>
          <div className="space-y-1 text-right border-l border-slate-800 pl-6">
            <span className="text-[10px] font-black text-slate-500 tracking-widest block uppercase">Change / 找零</span>
            <div className={`text-5xl font-black font-mono tracking-tighter ${change < 0 ? 'text-rose-500/30' : 'text-amber-400'}`}>
              ${change >= 0 ? change.toLocaleString() : '0'}
            </div>
          </div>
        </div>

        {/* 虛擬小鍵盤區 (新增) */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '00'].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (num === 'C') setReceivedAmount('');
                else setReceivedAmount(prev => prev.toString() + num.toString());
              }}
              className={`h-14 rounded-xl font-black text-xl transition-all active:scale-95 ${
                num === 'C' 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                : 'bg-white/10 text-white border border-white/10 hover:bg-white/20'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* 支付方式 */}
        <div className="grid grid-cols-3 gap-2 py-2 border-t border-white/10 pt-4">
          {['現金支付', '銀行轉帳', '信用卡'].map((m) => (
            <button 
              key={m} 
              onClick={() => setPaymentMethod(m)} 
              className={`py-4 rounded-xl font-black text-xs border-2 transition-all ${
                paymentMethod === m 
                  ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.4)]' 
                  : 'bg-slate-800 text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 底部結帳按鈕 */}
      <div className="p-4 bg-white border-t">
        <button 
          onClick={onCheckout}
          disabled={cartLength === 0 || change < 0}
          className={`w-full py-6 rounded-[2rem] font-black text-2xl shadow-xl transition-all active:scale-95 ${
            cartLength > 0 && change >= 0
              ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed'
          }`}
        >
          {change < 0 ? `還差 $${Math.abs(change)}` : '確認結帳 (Enter)'}
        </button>
      </div>
    </div>
  );
}