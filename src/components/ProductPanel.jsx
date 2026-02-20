import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function ProductPanel({ 
  memberSearch, setMemberSearch, handleSearchMember, 
  selectedMember, setSelectedMember, categories,
  currentCategoryId, setCurrentCategoryId, products, onAddToCart
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [memberHistory, setMemberHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFirstInput, setIsFirstInput] = useState(true);

  // --- 處理輸入邏輯 (直接取代邏輯) ---
  const handleInput = useCallback((val) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      let currentVal = prev.tempPrice.toString();
      let newVal;
      
      if (val === 'clear') {
        newVal = '0';
        setIsFirstInput(true);
      } else if (val === 'backspace') {
        newVal = currentVal.length > 1 ? currentVal.slice(0, -1) : '0';
      } else {
        // 核心修改：如果是第一次輸入，直接取代數字
        if (isFirstInput) {
          newVal = val; 
          setIsFirstInput(false); // 取代後關閉第一次輸入狀態
        } else {
          newVal = currentVal === '0' ? val : currentVal + val;
        }
      }
      return { ...prev, tempPrice: parseFloat(newVal) || 0 };
    });
  }, [isFirstInput]);

  const confirmAddToCart = useCallback(() => {
    if (!editingProduct || editingProduct.tempPrice <= 0) return;
    onAddToCart({ ...editingProduct, price: editingProduct.tempPrice, quantity: 1 });
    setIsEditModalOpen(false);
    setEditingProduct(null);
    setIsFirstInput(true);
  }, [editingProduct, onAddToCart]);

  // --- 關鍵修改：嚴格限制鍵盤範圍 ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 如果彈窗沒開啟，完全不執行任何邏輯，讓事件流回背景
      if (!isEditModalOpen) return;

      // 攔截所有按鍵，防止背景組件（如搜尋框或結帳鈕）被觸發
      e.stopImmediatePropagation();

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleInput(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleInput('backspace');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsEditModalOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        confirmAddToCart();
      }
    };

    // 使用 capture 模式確保優先攔截事件
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isEditModalOpen, handleInput, confirmAddToCart]);

  // --- 搜尋會員 (略) ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (memberSearch.trim().length >= 1) {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .or(`name.ilike.%${memberSearch}%,phone.ilike.%${memberSearch}%`)
          .limit(5);
        if (!error) setSearchResults(data || []);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setSearchResults([]);
    setMemberSearch('');
    setShowHistory(true); 
    fetchMemberHistory(m.id);
  };

  async function fetchMemberHistory(memberId) {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`id, created_at, total_amount, order_items (quantity, price, products:product_id ( name ))`)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!error) setMemberHistory(data || []);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const handleProductClick = (product) => {
    const currentPrice = selectedMember ? (product.member_price || product.price) : product.price;
    if (!currentPrice || currentPrice === 0) {
      setEditingProduct({ ...product, tempPrice: 0 });
      setIsFirstInput(true); // 標記為第一次輸入，等待取代
      setIsEditModalOpen(true);
    } else {
      onAddToCart({ ...product, price: currentPrice, quantity: 1 });
    }
  };

  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  };

  return (
    <div className="flex-[1.2] flex flex-col border-r bg-slate-200 min-w-[500px] relative font-sans">
      
      {/* 頂部導覽列 */}
      <div className="h-20 p-4 bg-white border-b flex gap-3 shadow-sm items-center z-[60]">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="🔍 搜尋會員姓名或電話..." 
            className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-lg font-black focus:ring-2 focus:ring-blue-500" 
            value={memberSearch} 
            onChange={e => setMemberSearch(e.target.value)} 
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden z-[70]">
              {searchResults.map(m => (
                <button key={m.id} onClick={() => handleSelectMember(m)} className="w-full p-4 text-left hover:bg-blue-50 border-b flex justify-between items-center transition-colors">
                  <span className="font-black text-slate-700">{m.name}</span>
                  <span className="text-sm font-mono text-slate-400">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedMember ? (
            <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl h-12 shadow-lg">
              <span className="text-base font-black">{selectedMember.name}</span>
              <button onClick={() => { setSelectedMember(null); setShowHistory(false); }} className="hover:bg-emerald-700 rounded-full p-1">✕</button>
            </div>
          ) : (
            <div className="bg-slate-300 text-slate-600 px-5 h-12 rounded-xl font-black flex items-center text-base">一般散客</div>
          )}
          {selectedMember && (
            <button onClick={() => setShowHistory(!showHistory)} className={`h-12 px-6 rounded-xl font-black transition-all shadow-md ${showHistory ? "bg-slate-800 text-white" : "bg-orange-500 text-white"}`}>
              {showHistory ? "⬅️ 返回商品" : "🕒 歷史紀錄"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {showHistory ? (
          <div className="space-y-3">
             {memberHistory.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-8 border-l-blue-600">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col text-left">
                      <span className="text-[10px] font-black text-slate-400 uppercase">消費時間</span>
                      <span className="font-black text-slate-700 text-lg">{formatDateTime(order.created_at)}</span>
                    </div>
                    <span className="font-black text-blue-600 text-3xl">${order.total_amount?.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-t pt-2 font-black text-slate-500 text-left">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="flex-1 truncate">• {item.products?.name}</span>
                        <span className="font-mono">${item.price} x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          /* 商品清單：時價排序與顏色 */
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-10 mt-2">
            {[...products]
              .filter(p => currentCategoryId === 'all' || p.category_id === currentCategoryId)
              .sort((a, b) => {
                const priceA = selectedMember ? (a.member_price || a.price) : a.price;
                const priceB = selectedMember ? (b.member_price || b.price) : b.price;
                const isNoPriceA = !priceA || priceA === 0;
                const isNoPriceB = !priceB || priceB === 0;
                if (isNoPriceA && !isNoPriceB) return -1;
                if (!isNoPriceA && isNoPriceB) return 1;
                return 0;
              })
              .map(p => {
                const currentPrice = selectedMember ? (p.member_price || p.price) : p.price;
                const isNoPrice = !currentPrice || currentPrice === 0;
                return (
                  <button 
                    key={p.id} 
                    onClick={() => handleProductClick(p)} 
                    className={`group p-3 rounded-2xl border-2 transition-all active:scale-95 text-left flex flex-col min-h-[130px] shadow-sm ${
                      isNoPrice ? 'bg-amber-50 border-amber-300 shadow-amber-100 hover:border-amber-500' : 'bg-white border-transparent hover:border-blue-500'
                    }`}
                  >
                    <span className={`font-black text-xl leading-[1.2] break-words mb-2 flex-1 ${isNoPrice ? 'text-amber-900' : 'text-slate-800'}`}>
                      {p.name}
                    </span>
                    <div className="text-right mt-auto">
                      <span className={`text-3xl font-black font-mono tracking-tighter ${isNoPrice ? 'text-amber-600' : 'text-slate-900'}`}>
                        {isNoPrice ? "時價" : `$${currentPrice}`}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {/* --- 時價彈窗 --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-[400px] overflow-hidden border-none animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black opacity-80 uppercase tracking-widest">時價商品錄入</span>
                <h3 className="text-2xl font-black leading-tight mt-1">{editingProduct.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-2xl">✕</button>
            </div>
            <div className="p-8 space-y-6">
              <div className="p-5 rounded-3xl border-2 border-blue-600 bg-blue-50 shadow-inner text-center">
                <label className="text-xs font-black text-slate-400 block mb-1">請輸入單價 (取代模式)</label>
                <div className="text-6xl font-mono font-black text-blue-700">${editingProduct.tempPrice}</div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, 'backspace'].map(鍵 => (
                  <button key={鍵} onClick={() => handleInput(鍵)} className={`h-16 rounded-xl text-2xl font-black transition-all active:scale-95 ${鍵 === 'clear' ? 'bg-rose-100 text-rose-600' : 鍵 === 'backspace' ? 'bg-slate-200 text-slate-600' : 'bg-slate-100 text-slate-800 border-b-4 border-slate-200 active:border-b-0'}`}>
                    {鍵 === 'clear' ? '清除' : 鍵 === 'backspace' ? '←' : 鍵}
                  </button>
                ))}
              </div>

              <button onClick={confirmAddToCart} className="w-full py-6 bg-amber-600 text-white rounded-2xl text-2xl font-black shadow-xl active:scale-95 hover:bg-amber-700 transition-colors">
                確認並加入 (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}