// components/CheckoutPanel.jsx
import React from 'react';

export default function CheckoutPanel({ 
  finalTotal, 
  receivedAmount, 
  setReceivedAmount, 
  change, 
  paymentMethod, 
  setPaymentMethod, 
  discountAmount, 
  discountPercent, 
  onOpenNumpad, 
  onCheckout, 
  onOpenCashDrawer,
  cartLength
}) {
  return (
    <div className="w-[450px] flex flex-col bg-white shadow-2xl z-10">
      {/* 頂部功能按鈕 */}
      <div className="h-24 p-4 bg-white border-b flex gap-3 items-center">
        <button 
          onClick={() => onOpenNumpad('雜支支出', 0, (v, r) => console.log("支出:", v, r))} 
          className="flex-1 h-14 bg-rose-50 text-rose-600 rounded-xl font-black text-lg border border-rose-100 active:scale-95 transition-transform"
        >
          💸 支出
        </button>
        <button 
          onClick={onOpenCashDrawer} 
          className="flex-1 h-14 bg-amber-50 text-amber-600 rounded-xl font-black text-lg border border-amber-100 active:scale-95 transition-transform"
        >
          🔓 開錢箱
        </button>
      </div>

      {/* 應付金額與找零顯示 */}
      <div className="p-6 space-y-4 text-right">
        <div className="flex flex-col">
          <span className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">Payable Amount</span>
          <span className="text-7xl font-black text-slate-900 font-mono tracking-tighter leading-none">
            ${finalTotal.toLocaleString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-lg text-left border-b-4 border-blue-500">
            <div className="text-[10px] font-black text-blue-400 mb-1 uppercase">Received</div>
            <div className="text-4xl font-black font-mono">${receivedAmount || '0'}</div>
          </div>
          <div className="p-4 bg-white rounded-2xl text-slate-800 shadow-md text-right border-2 border-slate-100">
            <div className="text-[10px] font-black text-slate-400 mb-1 uppercase">Change</div>
            <div className="text-4xl font-black font-mono text-green-600">
              ${change >= 0 ? change.toLocaleString() : 0}
            </div>
          </div>
        </div>

        {/* 支付方式切換 */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          {['現金', '轉帳', '刷卡'].map(m => (
            <button 
              key={m} 
              onClick={() => setPaymentMethod(m)} 
              className={`py-3 rounded-xl font-black text-lg border-2 transition-all ${
                paymentMethod === m 
                  ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105' 
                  : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 數字輸入鍵盤 */}
      <div className="flex-1 bg-slate-50 border-y border-slate-200 p-4">
        <div className="grid grid-cols-3 gap-2 h-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '0', '00'].map(num => (
            <button 
              key={num} 
              onClick={() => setReceivedAmount(prev => prev + num)} 
              className="bg-white rounded-2xl text-3xl font-black text-slate-700 shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 transition-all"
            >
              {num}
            </button>
          ))}
          <button 
            onClick={() => setReceivedAmount('')} 
            className="bg-rose-100 text-rose-600 rounded-2xl text-xl font-black active:translate-y-1 shadow-sm"
          >
            清空
          </button>
        </div>
      </div>

      {/* 底部折扣與結帳 */}
      <div className="p-6 bg-white space-y-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          <button 
            onClick={() => onOpenNumpad('折讓金額', discountAmount, v => console.log("折讓:", v))} 
            className="py-3 bg-white text-rose-600 rounded-xl font-black border border-rose-100 shadow-sm hover:bg-rose-50"
          >
            折讓 -${discountAmount}
          </button>
          <button 
            onClick={() => onOpenNumpad('折扣比例', discountPercent, v => console.log("折扣:", v))} 
            className="py-3 bg-white text-orange-600 rounded-xl font-black border border-orange-100 shadow-sm hover:bg-orange-50"
          >
            折扣 {discountPercent}%
          </button>
        </div>
        <button 
          onClick={onCheckout} 
          disabled={cartLength === 0 || change < 0} 
          className={`w-full py-7 rounded-[2rem] font-black text-5xl shadow-2xl transition-all ${
            change >= 0 && cartLength > 0 
              ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
          }`}
        >
          結 帳
        </button>
      </div>
    </div>
  );
}