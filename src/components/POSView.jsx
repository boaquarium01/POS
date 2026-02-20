import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ProductPanel from "./ProductPanel";
import CartPanel from "./CartPanel";
import CheckoutPanel from "./CheckoutPanel";

export default function POSView({ products = [], fetchProducts, fetchOrders }) {
  // --- 1. 基礎狀態 ---
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: '全部' }]);
  const [currentCategoryId, setCurrentCategoryId] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('現金支付');
  const [receivedAmount, setReceivedAmount] = useState('');
  
  // --- 2. 會員與折扣狀態 ---
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(100); 

  // --- 3. 彈窗控制 (Numpad) ---
  const [modalType, setModalType] = useState(null); 
  const [numpadTitle, setNumpadTitle] = useState('');
  const [numpadValue, setNumpadValue] = useState('');
  const [numpadUnit, setNumpadUnit] = useState(''); 
  const [numpadCallback, setNumpadCallback] = useState(null);
  const numpadInputRef = useRef(null); 

  // --- 4. 初始化：抓取分類資料 ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('id');
        if (!error && data) setCategories([{ id: 'all', name: '全部' }, ...data]);
      } catch (err) { console.error("分類載入失敗:", err); }
    };
    fetchCategories();
  }, []);

  // --- 5. Numpad 控制邏輯 ---
  const openNumpad = (title, initialValue, callback) => {
    setNumpadTitle(title);
    setNumpadValue(initialValue?.toString() || '0');
    setNumpadUnit(title.includes('%') ? '%' : '$');
    setNumpadCallback(() => callback);
    setModalType('numpad');

    // 延遲自動全選
    setTimeout(() => {
      if (numpadInputRef.current) {
        numpadInputRef.current.focus();
        numpadInputRef.current.select(); 
      }
    }, 100);
  };

  // 處理彈窗內的鍵盤事件
  const handleModalKeyboard = useCallback((e) => {
    if (modalType !== 'numpad') return;

    if (e.key === 'Enter') {
      numpadCallback(numpadValue);
      setModalType(null);
    } else if (e.key === 'Escape') {
      setModalType(null);
    }
  }, [modalType, numpadValue, numpadCallback]);

  useEffect(() => {
    window.addEventListener('keydown', handleModalKeyboard);
    return () => window.removeEventListener('keydown', handleModalKeyboard);
  }, [handleModalKeyboard]);

  // --- 6. 金額計算 ---
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const finalTotal = Math.max(0, Math.round(subtotal * (discountPercent / 100)) - discountAmount);
  const change = receivedAmount ? parseFloat(receivedAmount) - finalTotal : 0;

  // --- 7. 購物車與結帳動作 ---
  const addToCart = (p) => {
    const price = selectedMember ? (p.member_price || p.price) : p.price;
    setCart(prev => {
      const idx = prev.findIndex(item => item.id === p.id);
      if (idx > -1) {
        const nc = [...prev];
        nc[idx].quantity += 1;
        return nc;
      }
      return [...prev, { ...p, quantity: 1, price: price || 0 }];
    });
  };

  const checkout = async () => {
    if (cart.length === 0 || change < 0) return;
    try {
      const { error } = await supabase.from('orders').insert([{
        total_amount: finalTotal,
        payment_method: paymentMethod,
        member_id: selectedMember?.id || null,
        items: cart,
        discount_amount: discountAmount,
        discount_percent: discountPercent
      }]);
      if (error) throw error;
      alert("結帳完成");
      setCart([]); setReceivedAmount(''); setSelectedMember(null); setDiscountAmount(0); setDiscountPercent(100);
    } catch (err) { alert("失敗: " + err.message); }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* Numpad 彈窗：移除上下鍵，支援直接鍵盤輸入 + 虛擬小鍵盤 */}
{modalType === 'numpad' && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-[400px] border border-slate-200 animate-in fade-in zoom-in duration-200">
      <h3 className="text-xl font-black mb-6 text-slate-700 flex items-center gap-2">
        <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
        {numpadTitle}
      </h3>
      
      <div className="relative mb-6">
        {/* 單位顯示 */}
        <span className={`absolute ${numpadUnit === '$' ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-3xl font-black text-slate-400`}>
          {numpadUnit}
        </span>
        
        <input 
          ref={numpadInputRef}
          type="text" 
          inputMode="decimal"
          className={`w-full text-5xl font-mono font-black p-6 bg-slate-50 border-2 border-slate-200 rounded-2xl text-right focus:border-blue-500 outline-none transition-all ${numpadUnit === '$' ? 'pl-12' : 'pr-12'}`}
          value={numpadValue}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9.]/g, '');
            setNumpadValue(val);
          }}
        />
      </div>

      {/* --- 虛擬小鍵盤區 --- */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '00', 0, 'C'].map((btn) => (
          <button
            key={btn}
            type="button"
            onClick={() => {
              if (btn === 'C') {
                setNumpadValue('');
              } else {
                // 如果目前是選取狀態（剛開啟時），第一個點擊應替換數值
                setNumpadValue(prev => prev === '0' ? btn.toString() : prev + btn.toString());
              }
              // 點擊後重新聚焦到 input 方便實體鍵盤繼續打字
              numpadInputRef.current?.focus();
            }}
            className="h-16 rounded-2xl text-2xl font-black bg-slate-100 text-slate-700 border-b-4 border-slate-300 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center hover:bg-slate-200"
          >
            {btn}
          </button>
        ))}
      </div>

      {/* --- 底部控制鈕 --- */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setModalType(null)} 
          className="py-5 bg-slate-100 text-slate-500 rounded-2xl font-black hover:bg-slate-200"
        >
          取消 (Esc)
        </button>
        <button 
          onClick={() => { numpadCallback(numpadValue); setModalType(null); }} 
          className="py-5 bg-blue-600 text-white rounded-2xl font-black shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
        >
          確認 (Enter)
        </button>
      </div>
    </div>
  </div>
)}

      {/* --- 面板組件傳遞 --- */}
      <ProductPanel 
        categories={categories} products={products} currentCategoryId={currentCategoryId}
        setCurrentCategoryId={setCurrentCategoryId} onAddToCart={addToCart}
        memberSearch={memberSearch} setMemberSearch={setMemberSearch}
        selectedMember={selectedMember} setSelectedMember={setSelectedMember}
      />

      <CartPanel 
        cart={cart} subtotal={subtotal} finalTotal={finalTotal}
        onRemoveItem={(idx) => { const nc = [...cart]; nc.splice(idx, 1); setCart(nc); }}
        onClearCart={() => setCart([])}
        updateCartItem={(idx, data) => setCart(prev => prev.map((item, i) => i === idx ? {...item, ...data} : item))}
      />

      <CheckoutPanel 
        subtotal={subtotal}               // 確保名稱是 subtotal
  finalTotal={finalTotal} 
  receivedAmount={receivedAmount} 
  setReceivedAmount={setReceivedAmount}
  change={change} 
  paymentMethod={paymentMethod} 
  setPaymentMethod={setPaymentMethod}
  discountAmount={discountAmount} 
  setDiscountAmount={setDiscountAmount}
  discountPercent={discountPercent} 
  setDiscountPercent={setDiscountPercent}
  onOpenNumpad={openNumpad} 
  onCheckout={checkout}             // 確保這裡傳的是你在 POSView 定義的 checkout function
  onOpenCashDrawer={() => console.log("開錢箱")}
  cartLength={cart.length}
  isModalOpen={!!modalType}
      />
    </div>
  );
}