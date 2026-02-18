import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import ProductPanel from "./ProductPanel";
import CartPanel from "./CartPanel";
import CheckoutPanel from "./CheckoutPanel";

export default function POSView({ products = [], fetchProducts, fetchOrders }) {
  // --- 基礎狀態 ---
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState([{ id: 'all', name: '全部' }]);
  const [currentCategoryId, setCurrentCategoryId] = useState('all'); 
  const [paymentMethod, setPaymentMethod] = useState('現金')
  const [receivedAmount, setReceivedAmount] = useState('') 
  
  // --- 會員與搜尋 ---
  const [memberSearch, setMemberSearch] = useState('') 
  const [selectedMember, setSelectedMember] = useState(null)
  
  // --- 內建彈窗邏輯 ---
  const [modalType, setModalType] = useState(null); // 'numpad' | 'edit_choice'
  const [editingItem, setEditingItem] = useState(null);
  const [numpadTitle, setNumpadTitle] = useState('');
  const [numpadValue, setNumpadValue] = useState('');
  const [numpadCallback, setNumpadCallback] = useState(null);
  const [expenseReason, setExpenseReason] = useState(''); 

  // --- 折扣與折讓 ---
  const [discountAmount, setDiscountAmount] = useState(0) 
  const [discountPercent, setDiscountPercent] = useState(100) 

  // --- 計算邏輯 ---
  const originalSubtotal = cart.reduce((sum, item) => sum + ((Number(item?.originalPrice || item?.price) || 0) * (Number(item?.quantity) || 0)), 0);
  const subtotal = cart.reduce((sum, item) => sum + ((Number(item?.price) || 0) * (Number(item?.quantity) || 0)), 0);
  const finalTotal = Math.max(0, Math.round(subtotal * (discountPercent / 100)) - discountAmount);
  const change = receivedAmount ? parseFloat(receivedAmount) - finalTotal : 0;
  const updateCartItem = (index, newData) => {
  setCart(prev => prev.map((item, i) => 
    i === index ? { ...item, ...newData } : item
  ));
};
const clearCart = () => setCart([]);
  // 初始化分類
  useEffect(() => {
    async function fetchCategoriesData() {
      const { data } = await supabase.from('categories').select('id, name').order('id', { ascending: false });
      if (data) setCategories([{ id: 'all', name: '全部' }, ...data]);
    }
    fetchCategoriesData();
  }, []);

  // 開啟通用數字鍵盤
  const openNumpad = (title, initialValue, callback, reason = '') => {
    setNumpadTitle(title);
    setNumpadValue(initialValue ? initialValue.toString() : '');
    setNumpadCallback(() => callback);
    setExpenseReason(reason);
    setModalType('numpad');
  };

  // 點擊購物車品項（修改單價或數量）
  const handleItemClick = (item, index) => {
    setEditingItem({ ...item, index });
    setModalType('edit_choice');
  };

  // --- 核心修正：加入購物車邏輯 ---
  const addToCart = (product) => {
    // 判定當前價格（會員價優先）
    let price = (selectedMember ? (product.member_price || product.price) : product.price) || 0;
    
    // 如果價格為 0 或未定義，強制開啟鍵盤輸入
    if (!price || price === 0) {
      openNumpad(`輸入 [${product.name}] 售價`, 0, (val) => {
        const customPrice = parseFloat(val) || 0;
        setCart(prev => [...prev, { ...product, price: customPrice, quantity: 1 }]);
      });
    } else {
      // 正常加入或累加數量
      setCart(prev => {
        const exist = prev.find(i => i.id === product.id && i.price === price);
        if (exist) {
          return prev.map(i => (i.id === product.id && i.price === price) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i);
        }
        return [...prev, { ...product, price, quantity: 1 }];
      });
    }
  };

  // 結帳邏輯
  async function checkout() {
    if (cart.length === 0 || change < 0) return;
    const { data: order, error } = await supabase.from('orders').insert([{ 
      total_amount: finalTotal, 
      payment_method: paymentMethod, 
      member_id: selectedMember ? selectedMember.id : null 
    }]).select().single();
    
    if (error) {
      alert("結帳失敗: " + error.message);
      return;
    }

    for (let item of cart) {
      await supabase.from('order_items').insert([{ 
        order_id: order.id, 
        product_id: item.id, 
        quantity: item.quantity, 
        price: item.price 
      }]);
      // 更新庫存
      if (item.stock !== null) {
        await supabase.from('products').update({ stock: item.stock - item.quantity }).eq('id', item.id);
      }
    }

    // 重置狀態
    setCart([]);
    setReceivedAmount('');
    setDiscountAmount(0);
    setDiscountPercent(100);
    setSelectedMember(null);
    if (fetchProducts) fetchProducts();
    if (fetchOrders) fetchOrders();
    alert("結帳成功！");
  }

  // 會員搜尋
  async function handleSearchMember() {
    if (!memberSearch) return;
    const { data } = await supabase.from('members')
      .select('*')
      .or(`name.ilike.%${memberSearch}%,phone.ilike.%${memberSearch}%`)
      .single();
    if (data) {
      setSelectedMember(data);
      setMemberSearch('');
    } else {
      alert("找不到該會員");
    }
  }

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-900">
      
      {/* 彈窗 Modal 層 */}
      {modalType && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          
          {/* 修改選擇：數量或單價 */}
          {modalType === 'edit_choice' && (
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center">
              <h3 className="text-xl font-black mb-6">編輯項目：{editingItem?.name}</h3>
              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => openNumpad(`修改數量`, editingItem.quantity, (v) => 
                    setCart(prev => prev.map((it, i) => i === editingItem.index ? { ...it, quantity: parseInt(v) || 1 } : it))
                  )} 
                  className="py-6 bg-blue-50 text-blue-600 rounded-3xl font-black text-2xl border-2 border-blue-100 active:scale-95 transition-all"
                >
                  🔢 修改數量
                </button>
                <button 
                  onClick={() => openNumpad(`修改單價`, editingItem.price, (v) => 
                    setCart(prev => prev.map((it, i) => i === editingItem.index ? { ...it, price: parseFloat(v) || 0, originalPrice: it.originalPrice || it.price } : it))
                  )} 
                  className="py-6 bg-amber-50 text-amber-600 rounded-3xl font-black text-2xl border-2 border-amber-100 active:scale-95 transition-all"
                >
                  💰 修改單價
                </button>
                <button onClick={() => setModalType(null)} className="mt-4 py-4 text-slate-400 font-bold">取消</button>
              </div>
            </div>
          )}

          {/* 數字鍵盤彈窗 */}
          {modalType === 'numpad' && (
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 bg-slate-800 text-white text-center">
                <h2 className="text-xl font-bold mb-4 opacity-60">{numpadTitle}</h2>
                {numpadTitle.includes('支出') && (
                  <input 
                    type="text" 
                    placeholder="原因..." 
                    className="w-full mb-4 p-4 rounded-2xl bg-slate-700 text-white text-center font-black" 
                    value={expenseReason} 
                    onChange={e=>setExpenseReason(e.target.value)} 
                  />
                )}
                <div className="text-7xl font-mono font-black text-blue-400">${numpadValue || '0'}</div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-3 bg-slate-50 font-black">
                {[1,2,3,4,5,6,7,8,9,'0','00'].map(n => (
                  <button key={n} onClick={() => setNumpadValue(p=>p+n)} className="h-16 bg-white rounded-2xl text-2xl shadow-sm active:bg-blue-50">{n}</button>
                ))}
                <button onClick={() => setNumpadValue('')} className="h-16 bg-red-50 text-red-500 rounded-2xl">清空</button>
                <button onClick={() => setModalType(null)} className="h-16 bg-slate-200 rounded-2xl">返回</button>
                <button 
                  onClick={() => { numpadCallback(numpadValue, expenseReason); setModalType(null); }} 
                  className="col-span-2 h-16 bg-blue-600 text-white rounded-2xl shadow-lg active:bg-blue-700"
                >
                  確認
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- 左側：商品區 --- */}
      <ProductPanel 
        memberSearch={memberSearch} 
        setMemberSearch={setMemberSearch} 
        handleSearchMember={handleSearchMember}
        selectedMember={selectedMember} 
        setSelectedMember={setSelectedMember} 
        categories={categories}
        currentCategoryId={currentCategoryId} 
        setCurrentCategoryId={setCurrentCategoryId}
        products={products} 
        onAddToCart={addToCart}
      />

      {/* --- 中間：購物清單 --- */}
      <CartPanel 
  cart={cart}
  onRemoveItem={(idx) => {
    const nc = [...cart];
    nc.splice(idx, 1);
    setCart(nc);
  }}
  onClearCart={clearCart} // 務必加入這行
  originalSubtotal={originalSubtotal}
  subtotal={subtotal}
  finalTotal={finalTotal}
  updateCartItem={updateCartItem} // 務必傳入這行，Enter 功能才會生效
/>

      {/* --- 右側：收銀區 --- */}
      <CheckoutPanel 
        finalTotal={finalTotal} 
        receivedAmount={receivedAmount} 
        setReceivedAmount={setReceivedAmount}
        change={change} 
        paymentMethod={paymentMethod} 
        setPaymentMethod={setPaymentMethod}
        discountAmount={discountAmount} 
        discountPercent={discountPercent}
        onOpenNumpad={openNumpad} 
        onCheckout={checkout} 
        cartLength={cart.length}
        // 如果 CheckoutPanel 需要修改折扣，記得傳入 set 函式
        setDiscountAmount={setDiscountAmount}
        setDiscountPercent={setDiscountPercent}
      />
    </div>
  )
}