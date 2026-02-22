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

  // --- 3. 彈窗控制 ---
  const [modalType, setModalType] = useState(null);
  const [numpadTitle, setNumpadTitle] = useState('');
  const [numpadValue, setNumpadValue] = useState('');
  const [numpadUnit, setNumpadUnit] = useState('');
  const [numpadCallback, setNumpadCallback] = useState(null);

  const [cartEditData, setCartEditData] = useState({ price: 0, qty: 1 });
  const [activeField, setActiveField] = useState('price');
  const [isFirstInput, setIsFirstInput] = useState(true);
  const [expenseReason, setExpenseReason] = useState('');

  // Tablet RWD State: 在 1440px (或平板尺寸) 以下，購物車與結帳區合併切換
  const [tabletActivePanel, setTabletActivePanel] = useState('cart'); // 'cart' | 'checkout'

  const numpadInputRef = useRef(null);

  // --- 4. 初始化：抓取分類資料 ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (!error && data) {
          const sortConfigRow = data.find(c => c.name.startsWith('[SORT_ORDER]'));
          const realCategories = data.filter(c => c.id !== sortConfigRow?.id);
          let sortOrder = [];
          if (sortConfigRow) {
            try { sortOrder = JSON.parse(sortConfigRow.name.replace('[SORT_ORDER]', '')); } catch (e) { }
          }
          if (sortOrder.length > 0) {
            realCategories.sort((a, b) => {
              const idxA = sortOrder.indexOf(a.id);
              const idxB = sortOrder.indexOf(b.id);
              if (idxA === -1 && idxB === -1) return 0;
              if (idxA === -1) return 1;
              if (idxB === -1) return -1;
              return idxA - idxB;
            });
          }
          setCategories([{ id: 'all', name: '全部' }, ...realCategories]);
        }
      } catch (err) { console.error("分類載入失敗:", err); }
    };
    fetchCategories();
  }, []);

  // --- 5. 統一彈窗邏輯 ---
  const openNumpad = (type, title, initialValue, callback, extra = '') => {
    setModalType(type);
    setNumpadTitle(title);
    setNumpadCallback(() => callback);
    if (type === 'expense') {
      setExpenseReason(extra || '');
      setNumpadValue(initialValue?.toString() || '0');
      setNumpadUnit('$');
    } else if (type === 'cart_edit') {
      setCartEditData({ price: initialValue.price || 0, qty: initialValue.quantity || 1 });
      setActiveField('price');
      setIsFirstInput(true);
    } else {
      setNumpadValue(initialValue?.toString() || '0');
      setNumpadUnit(title.includes('%') ? '%' : '$');
    }
    setTimeout(() => {
      if (modalType !== 'cart_edit' && numpadInputRef.current) {
        numpadInputRef.current.focus();
        numpadInputRef.current.select();
      }
    }, 150);
  };

  const handleSaveExpense = async () => {
    if (!expenseReason.trim() || !numpadValue) return alert("請填寫原因及金額");
    try {
      const { error } = await supabase.from('expenses').insert([{
        reason: expenseReason,
        amount: parseFloat(numpadValue),
        store_id: '中壢店'
      }]);
      if (error) throw error;
      alert("支出已登記");
      setModalType(null);
    } catch (err) { alert("支出登記失敗: " + err.message); }
  };

  const handleCartEditInput = (val) => {
    setCartEditData(prev => {
      let currentVal = prev[activeField].toString();
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

  const adjustQty = (delta) => {
    setCartEditData(prev => ({
      ...prev,
      qty: Math.max(1, (Number(prev.qty) || 0) + delta)
    }));
  };

  const handleModalKeyboard = useCallback((e) => {
    if (!modalType) return;
    if (e.target.tagName === 'INPUT' && e.target !== numpadInputRef.current && modalType !== 'cart_edit') return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (modalType === 'expense') handleSaveExpense();
      else if (modalType === 'cart_edit') {
        if (numpadCallback) numpadCallback({ price: cartEditData.price, quantity: cartEditData.qty });
        setModalType(null);
      }
      else if (numpadCallback) { numpadCallback(numpadValue); setModalType(null); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setModalType(null);
    } else if (modalType === 'cart_edit') {
      if ((e.key >= '0' && e.key <= '9')) { e.preventDefault(); handleCartEditInput(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleCartEditInput('backspace'); }
    }
  }, [modalType, numpadValue, numpadCallback, cartEditData, activeField, isFirstInput]);

  useEffect(() => {
    window.addEventListener('keydown', handleModalKeyboard);
    return () => window.removeEventListener('keydown', handleModalKeyboard);
  }, [handleModalKeyboard]);

  // --- 6. 金額計算 ---
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const finalTotal = Math.max(0, Math.round(subtotal * (discountPercent / 100)) - discountAmount);
  const change = receivedAmount ? parseFloat(receivedAmount) - finalTotal : 0;

  // --- 7. 動作 ---
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
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        total_amount: finalTotal,
        payment_method: paymentMethod,
        member_id: selectedMember?.id || null,
        discount_info: `折扣: $${discountAmount} / ${discountPercent}%`
      }]).select().single();
      if (orderError) throw orderError;
      const orderItemsToInsert = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;
      alert("結帳完成");
      setCart([]); setReceivedAmount(''); setSelectedMember(null); setDiscountAmount(0); setDiscountPercent(100);
      if (typeof fetchOrders === 'function') fetchOrders();
    } catch (err) { alert("失敗: " + err.message); }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans relative">

      {/* 統一中控彈窗 */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setModalType(null)}>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-[420px] border border-white animate-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-3">
              <span className="w-2.5 h-8 bg-blue-600 rounded-full"></span>
              {numpadTitle}
            </h3>
            <div className="space-y-6">
              {modalType === 'cart_edit' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className={`p-4 rounded-2xl border-2 transition-all ${activeField === 'qty' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                    <label className="text-xs font-black text-slate-400 block mb-2">數量</label>
                    <div className="flex items-center justify-between">
                      <button onClick={(e) => { e.preventDefault(); adjustQty(-1); }} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90 flex items-center justify-center pb-1">-</button>
                      <button onClick={() => { setActiveField('qty'); setIsFirstInput(true); }} className="text-4xl font-mono font-black text-slate-900 flex-1 text-center truncate">{cartEditData.qty}</button>
                      <button onClick={(e) => { e.preventDefault(); adjustQty(1); }} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90 flex items-center justify-center pb-1">+</button>
                    </div>
                  </div>
                  <button onClick={() => { setActiveField('price'); setIsFirstInput(true); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${activeField === 'price' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                    <label className="text-xs font-black text-slate-400 block mb-2">單價</label>
                    <div className="text-4xl font-mono font-black text-slate-900 text-center truncate">${cartEditData.price}</div>
                  </button>
                </div>
              )}
              {/* ...其餘彈窗內容保持不變... */}
              {modalType === 'expense' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 tracking-widest uppercase">支出原因</label>
                  <input type="text" className="w-full text-xl font-bold p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all" placeholder="請輸入支出項目..." value={expenseReason} onChange={(e) => setExpenseReason(e.target.value)} />
                </div>
              )}
              {(modalType === 'numpad' || modalType === 'expense') && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 tracking-widest uppercase">金額錄入</label>
                  <div className="relative">
                    <span className={`absolute ${numpadUnit === '$' ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400`}>{numpadUnit}</span>
                    <input ref={numpadInputRef} type="text" className={`w-full text-5xl font-mono font-black p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-right focus:border-blue-500 outline-none transition-all ${numpadUnit === '$' ? 'pl-12' : 'pr-12'}`} value={numpadValue} onChange={(e) => setNumpadValue(e.target.value.replace(/[^0-9.]/g, ''))} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'backspace'].map((btn) => (
                  <button key={btn} type="button" onClick={() => {
                    if (modalType === 'cart_edit') {
                      if (btn === 'C') handleCartEditInput('clear');
                      else if (btn === 'backspace') handleCartEditInput('backspace');
                      else handleCartEditInput(btn.toString());
                    } else {
                      if (btn === 'C') setNumpadValue('0');
                      else if (btn === 'backspace') setNumpadValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                      else setNumpadValue(prev => (prev === '0' || prev === '') ? btn.toString() : prev + btn.toString());
                    }
                  }} className={`h-14 rounded-2xl text-2xl font-black transition-all flex items-center justify-center ${btn === 'C' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{btn === 'backspace' ? '←' : btn}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => setModalType(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-lg">取消 (Esc)</button>
                <button onClick={() => {
                  if (modalType === 'expense') handleSaveExpense();
                  else if (modalType === 'cart_edit') {
                    if (numpadCallback) numpadCallback({ price: cartEditData.price, quantity: cartEditData.qty });
                    setModalType(null);
                  }
                  else { if (numpadCallback) numpadCallback(numpadValue); setModalType(null); }
                }} className="py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95">確認 (Enter)</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 面板佈局 --- */}
      {/* 產品區: 在 iPad (Portrait) 以上始終顯示，佔比增大 */}
      <div className="flex-1 min-w-0">
        <ProductPanel
          categories={categories} products={products} currentCategoryId={currentCategoryId}
          setCurrentCategoryId={setCurrentCategoryId} onAddToCart={addToCart}
          memberSearch={memberSearch} setMemberSearch={setMemberSearch}
          selectedMember={selectedMember} setSelectedMember={setSelectedMember}
          onOpenNumpad={(title, initialValue, callback) => openNumpad('numpad', title, initialValue, callback)}
        />
      </div>

      {/* 右側資訊區:  
          1. 寬螢幕 (xl: 1440px+): 顯示兩欄 (Cart + Checkout)
          2. 中螢幕 (md: 768px+): 顯示一欄，透過 Tab 切換 
      */}
      <div className="flex flex-row shrink-0">

        {/* 購物清單 */}
        <div className={`transition-all duration-300 ${
          // 桌面版 (xl): 始終顯示
          // 平板版: 依據 tabletActivePanel 顯示
          "xl:flex xl:w-80 2xl:w-96 " +
          (tabletActivePanel === 'cart' ? 'flex w-80' : 'hidden md:hidden xl:flex')
          }`}>
          <CartPanel
            cart={cart} subtotal={subtotal} finalTotal={finalTotal}
            onRemoveItem={(idx) => { const nc = [...cart]; nc.splice(idx, 1); setCart(nc); }}
            onClearCart={() => setCart([])}
            updateCartItem={(idx, data) => setCart(prev => prev.map((item, i) => i === idx ? { ...item, ...data } : item))}
            onOpenNumpad={openNumpad}
            // 傳入切換按鈕 (只在平板且寬度不足三欄時顯示)
            onSwitchToCheckout={() => setTabletActivePanel('checkout')}
            isTabletMode={true}
          />
        </div>

        {/* 結帳收銀 */}
        <div className={`transition-all duration-300 ${
          // 桌面版 (xl): 始終顯示
          // 平板版: 依據 tabletActivePanel 顯示
          "xl:flex xl:w-[380px] 2xl:w-[440px] " +
          (tabletActivePanel === 'checkout' ? 'flex w-full md:w-[400px]' : 'hidden xl:flex')
          }`}>
          <CheckoutPanel
            subtotal={subtotal}
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
            onOpenNumpad={(title, initialValue, callback) => openNumpad('numpad', title, initialValue, callback)}
            onOpenExpenseModal={() => openNumpad('expense', '雜支支出', 0, null)}
            onCheckout={checkout}
            onOpenCashDrawer={() => console.log("開錢箱")}
            cartLength={cart.length}
            isModalOpen={!!modalType}
            onSwitchToCart={() => setTabletActivePanel('cart')}
            isTabletMode={true}
          />
        </div>
      </div>
    </div>
  );
}