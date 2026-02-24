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

  // --- 2b. 結帳完成摘要視窗 ---
  const [checkoutSummary, setCheckoutSummary] = useState(null);

  // 任意鍵關閉結帳摘要視窗
  useEffect(() => {
    if (!checkoutSummary) return;
    const handleKey = () => setCheckoutSummary(null);
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [checkoutSummary]);

  // 結帳摘要清單動態佈局：品項越多字越小、間隔越扁
  const summaryItemCount = checkoutSummary?.items?.length || 0;
  const baseRowFont = 14;
  let summaryRowFontScale = 1;
  if (summaryItemCount > 0 && summaryItemCount <= 12) {
    summaryRowFontScale = 1 + ((12 - summaryItemCount) / 12) * 1.0;
  } else if (summaryItemCount > 12) {
    summaryRowFontScale = 1 - Math.min(0.4, ((summaryItemCount - 12) / 12) * 0.4);
  }
  const summaryRowFontSize = baseRowFont * summaryRowFontScale;
  // 品項越多壓縮上下空間 (從 py-3.5 壓縮至 py-0.5)
  const summaryRowPadding = summaryItemCount > 20 ? 'py-0.5' : summaryItemCount > 12 ? 'py-1' : summaryItemCount > 8 ? 'py-1.5' : 'py-2';

  // --- 3. 彈窗控制 (中控式 Numpad) ---
  const [modalType, setModalType] = useState(null); // 'numpad' | 'expense' | 'cart_edit'
  const [numpadTitle, setNumpadTitle] = useState('');
  const [numpadValue, setNumpadValue] = useState(''); // 共用或作為單一數值
  const [numpadUnit, setNumpadUnit] = useState('');
  const [numpadCallback, setNumpadCallback] = useState(null);

  // 專門用於 cart_edit 模式的狀態
  const [cartEditData, setCartEditData] = useState({ price: 0, qty: 1 });
  const [activeField, setActiveField] = useState('price'); // 'price' | 'qty'
  const [isFirstInput, setIsFirstInput] = useState(true);

  const [expenseReason, setExpenseReason] = useState('');
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

  // --- 5. 統一彈窗邏輯 (支援實體鍵盤) ---
  // 修改 openNumpad 以支援 cart_edit 傳入物件
  const openNumpad = (type, title, initialValue, callback, extra = '') => {
    setModalType(type);
    setNumpadTitle(title);
    setNumpadCallback(() => callback);

    if (type === 'expense') {
      setExpenseReason(extra || '');
      setNumpadValue(initialValue?.toString() || '0');
      setNumpadUnit('$');
    } else if (type === 'cart_edit') {
      // initialValue 為 { price, quantity }
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

  // 鍵盤監聽
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
      // 處理 cart_edit 的實體鍵盤輸入
      if ((e.key >= '0' && e.key <= '9')) { e.preventDefault(); handleCartEditInput(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleCartEditInput('backspace'); }
    }
  }, [modalType, numpadValue, numpadCallback, expenseReason, cartEditData, activeField, isFirstInput]);

  useEffect(() => {
    window.addEventListener('keydown', handleModalKeyboard);
    return () => window.removeEventListener('keydown', handleModalKeyboard);
  }, [handleModalKeyboard]);

  // --- 6. 金額計算 ---
  const subtotal = cart.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
  const finalTotal = Math.max(0, Math.round(subtotal * (discountPercent / 100)) - discountAmount);
  const change = receivedAmount ? parseFloat(receivedAmount) - finalTotal : 0;

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

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

    // 先拍一份快照，避免之後清空購物車後看不到本次內容
    const cartSnapshot = cart.map(item => ({ ...item }));
    const memberSnapshot = selectedMember;

    try {
      // 1. 先建立訂單主檔
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        total_amount: finalTotal,
        payment_method: paymentMethod,
        member_id: memberSnapshot?.id || null,
        discount_info: `折扣: $${discountAmount} / ${discountPercent}%`
      }]).select().single();

      if (orderError) throw orderError;

      // 2. 準備明細陣列並寫入 order_items (Schema 要求欄位：order_id, product_id, quantity, price)
      const orderItemsToInsert = cartSnapshot.map(item => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);

      if (itemsError) throw itemsError;

      // 3. 顯示結帳完成摘要視窗
      setCheckoutSummary({
        createdAt: orderData.created_at,
        memberName: memberSnapshot?.name || '一般散客',
        memberPhone: memberSnapshot?.phone || '',
        items: cartSnapshot.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: Number(item.price) * item.quantity,
        })),
        subtotal,
        discountAmount,
        finalTotal,
        paymentMethod,
      });

      setCart([]);
      setReceivedAmount('');
      setSelectedMember(null);
      setDiscountAmount(0);
      setDiscountPercent(100);
      if (typeof fetchOrders === 'function') fetchOrders();
    } catch (err) {
      alert("失敗: " + err.message);
    }
  };

  return (
    <div className="relative flex h-full bg-slate-100 overflow-hidden font-sans">

      {/* 統一中控彈窗 */}
      {modalType && (
        <div
          className="absolute inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-[420px] border border-white animate-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-black mb-6 text-slate-800 flex items-center gap-3">
              <span className="w-2.5 h-8 bg-blue-600 rounded-full"></span>
              {numpadTitle}
            </h3>

            <div className="space-y-6">

              {/* cart_edit 專屬合併介面 */}
              {modalType === 'cart_edit' && (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className={`p-4 rounded-2xl border-2 transition-all ${activeField === 'qty' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                    <label className="text-xs font-black text-slate-400 block mb-2">數量</label>
                    <div className="flex items-center justify-between">
                      <button onClick={(e) => { e.preventDefault(); adjustQty(-1); }} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90 flex items-center justify-center pb-1">-</button>
                      <button onClick={() => { setActiveField('qty'); setIsFirstInput(true); }} className="text-4xl font-mono font-black text-slate-900 flex-1 text-center truncate">
                        {cartEditData.qty}
                      </button>
                      <button onClick={(e) => { e.preventDefault(); adjustQty(1); }} className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 font-black text-2xl active:scale-90 flex items-center justify-center pb-1">+</button>
                    </div>
                  </div>

                  <button
                    onClick={() => { setActiveField('price'); setIsFirstInput(true); }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${activeField === 'price' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}
                  >
                    <label className="text-xs font-black text-slate-400 block mb-2">單價</label>
                    <div className="text-4xl font-mono font-black text-slate-900 text-center truncate">${cartEditData.price}</div>
                  </button>
                </div>
              )}

              {modalType === 'expense' && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 tracking-widest uppercase">支出原因</label>
                  <input
                    type="text"
                    className="w-full text-xl font-bold p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-blue-500 outline-none transition-all"
                    placeholder="請輸入支出項目..."
                    value={expenseReason}
                    onChange={(e) => setExpenseReason(e.target.value)}
                  />
                </div>
              )}

              {/* 傳統單一欄位錄入 */}
              {(modalType === 'numpad' || modalType === 'expense') && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 ml-1 tracking-widest uppercase">金額錄入</label>
                  <div className="relative">
                    <span className={`absolute ${numpadUnit === '$' ? 'left-5' : 'right-5'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400`}>
                      {numpadUnit}
                    </span>
                    <input
                      ref={numpadInputRef}
                      type="text"
                      className={`w-full text-5xl font-mono font-black p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-right focus:border-blue-500 outline-none transition-all ${numpadUnit === '$' ? 'pl-12' : 'pr-12'}`}
                      value={numpadValue}
                      onChange={(e) => setNumpadValue(e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              )}

              {/* 共用小鍵盤 */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'backspace'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => {
                      if (modalType === 'cart_edit') {
                        if (btn === 'C') handleCartEditInput('clear');
                        else if (btn === 'backspace') handleCartEditInput('backspace');
                        else handleCartEditInput(btn.toString());
                      } else {
                        if (btn === 'C') setNumpadValue('0');
                        else if (btn === 'backspace') setNumpadValue(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
                        else setNumpadValue(prev => (prev === '0' || prev === '') ? btn.toString() : prev + btn.toString());
                      }
                    }}
                    className={`h-14 rounded-2xl text-2xl font-black transition-all flex items-center justify-center ${btn === 'C' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {btn === 'backspace' ? '←' : btn}
                  </button>
                ))}
              </div>

              {/* 控制鈕 */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <button onClick={() => setModalType(null)} className="py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-lg">取消 (Esc)</button>
                <button
                  onClick={() => {
                    if (modalType === 'expense') handleSaveExpense();
                    else if (modalType === 'cart_edit') {
                      if (numpadCallback) numpadCallback({ price: cartEditData.price, quantity: cartEditData.qty });
                      setModalType(null);
                    }
                    else { if (numpadCallback) numpadCallback(numpadValue); setModalType(null); }
                  }}
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg active:scale-95"
                >
                  確認 (Enter)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 結帳完成摘要彈窗 */}
      {checkoutSummary && (
        <div
          className="absolute inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setCheckoutSummary(null)}
        >
          <div
            className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
            style={{ width: 720, height: 800 }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* ── 頂部：質感標題列 + 壓縮資訊卡 ── */}
            <div className="shrink-0 bg-white px-8 pt-5 pb-4 border-b border-slate-100">
              {/* 標題行 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl shadow-sm text-emerald-500">
                    <span className="mb-1">✓</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">結帳完成</h2>
                    <p className="text-xs font-bold text-slate-400">交易已成功處理</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-black text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    {checkoutSummary.createdAt
                      ? formatDateTime(checkoutSummary.createdAt)
                      : formatDateTime(new Date().toISOString())}
                  </div>
                </div>
              </div>

              {/* 三格資訊卡 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '客戶名稱', value: checkoutSummary.memberName || '一般散客', icon: '👤', color: 'text-blue-500' },
                  { label: '連絡電話', value: checkoutSummary.memberPhone || '無紀錄', icon: '📱', color: 'text-emerald-500' },
                  { label: '支付方式', value: checkoutSummary.paymentMethod, icon: '💳', color: 'text-amber-500' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-sm">{icon}</span>
                      <span className="text-xs font-black text-slate-400 tracking-wider font-sans uppercase">{label}</span>
                    </div>
                    <div className={`text-xl font-black text-slate-800 break-all leading-tight font-sans`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 中間：購物清單（可捲動） ── */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-white px-2">
              {/* 表頭 (與內容對齊並放大文字) */}
              <div className="px-6 py-1 flex shrink-0 items-center gap-2 border-b border-slate-50">
                <div className="w-6 shrink-0" /> {/* 序號佔位 */}
                <div className="flex-1 text-sm font-black text-slate-500 uppercase tracking-widest">商品品名 / 規格</div>
                <div className="w-16 text-center text-sm font-black text-slate-500 uppercase tracking-widest">數量</div>
                <div className="w-32 text-left text-sm font-black text-slate-500 uppercase tracking-widest pl-2">單價</div>
                <div className="w-36 text-left text-sm font-black text-slate-500 uppercase tracking-widest pl-2">總額</div>
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-100 to-transparent mx-auto" />

              {/* 清單內容 */}
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-200/50 no-scrollbar px-6 py-2">
                {checkoutSummary.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`font-bold flex items-center gap-2 hover:bg-emerald-50/50 rounded-lg px-2 -mx-2 transition-colors ${summaryRowPadding} ${idx % 2 === 0 ? 'bg-slate-100/80' : 'bg-white'}`}
                    style={{ fontSize: `${summaryRowFontSize}px` }}
                  >
                    <div className="w-6 shrink-0 text-slate-600 font-mono text-[11px] font-black tracking-tighter">{String(idx + 1).padStart(2, '0')}</div>
                    <div className="flex-1 break-words leading-snug pr-2 text-slate-900">{item.name}</div>
                    <div className="w-16 text-center font-mono shrink-0 text-slate-600 font-black" style={{ fontSize: `${summaryRowFontSize * 1.3}px` }}>{item.quantity}</div>
                    <div className="w-32 text-left pl-2 font-mono shrink-0 text-slate-600 font-black tabular-nums" style={{ fontSize: `${summaryRowFontSize * 1.3}px` }}>${Number(item.price).toLocaleString()}</div>
                    <div className="w-36 text-left pl-2 font-mono font-black text-slate-900 shrink-0 tabular-nums" style={{ fontSize: `${summaryRowFontSize * 1.3}px` }}>${Number(item.total).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 底部：金額摘要 + 離開按鈕 ── */}
            <div className="shrink-0 border-t border-slate-100 bg-white py-4 px-8">
              <div className="flex items-center justify-between gap-8">
                <div className="flex items-center gap-8">
                  {/* 小計 */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">商品小計</span>
                    <span className="text-xl font-mono font-black text-slate-400">${checkoutSummary.subtotal?.toLocaleString()}</span>
                  </div>

                  {/* 分隔線 */}
                  <div className="w-px h-8 bg-slate-100" />

                  {/* 應收（主要） */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">應收總計</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-black text-emerald-600 font-mono">$</span>
                      <span className="text-5xl font-black font-mono text-emerald-600 leading-none tracking-tighter">
                        {checkoutSummary.finalTotal?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 離開按鈕 */}
                <button
                  type="button"
                  onClick={() => setCheckoutSummary(null)}
                  className="px-10 py-5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-lg shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-3 shrink-0"
                >
                  <span className="text-xl opacity-50">✕</span>
                  <span>離開視窗</span>
                </button>
              </div>
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
        onOpenNumpad={(title, initialValue, callback) => openNumpad('numpad', title, initialValue, callback)}
      />

      <CartPanel
        cart={cart} subtotal={subtotal} finalTotal={finalTotal}
        onRemoveItem={(idx) => { const nc = [...cart]; nc.splice(idx, 1); setCart(nc); }}
        onClearCart={() => setCart([])}
        updateCartItem={(idx, data) => setCart(prev => prev.map((item, i) => i === idx ? { ...item, ...data } : item))}
        onOpenNumpad={openNumpad}
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
        onOpenNumpad={(title, initialValue, callback) => openNumpad('numpad', title, initialValue, callback)}
        onOpenExpenseModal={() => openNumpad('expense', '雜支支出', 0, null)}
        onCheckout={checkout}             // 確保這裡傳的是你在 POSView 定義的 checkout function
        onOpenCashDrawer={() => console.log("開錢箱")}
        cartLength={cart.length}
        isModalOpen={!!modalType}
      />
    </div>
  );
}