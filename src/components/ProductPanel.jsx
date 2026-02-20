import React, { useState, useEffect } from 'react';
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
  const [activeField, setActiveField] = useState('price'); 
  const [isFirstInput, setIsFirstInput] = useState(true);

  // 1. 搜尋會員
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

  // 2. 修復閃爍：直接在選中會員時強制進入歷史模式
  const handleSelectMember = (m) => {
    setSelectedMember(m);
    setSearchResults([]);
    setMemberSearch('');
    setShowHistory(true); // 立即設為 true，避免 useEffect 延遲導致按鈕閃橘色
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
    setEditingProduct({ ...product, quantity: 1, tempPrice: currentPrice || 0 });
    setActiveField('price');
    setIsFirstInput(true);
    setIsEditModalOpen(true);
  };

  const confirmAddToCart = () => {
    onAddToCart({ ...editingProduct, price: editingProduct.tempPrice, quantity: editingProduct.quantity });
    setIsEditModalOpen(false);
  };

  const handleInput = (val) => {
    setEditingProduct(prev => {
      if (!prev) return null;
      let field = activeField === 'price' ? 'tempPrice' : 'quantity';
      let currentVal = prev[field].toString();
      let newVal = (val === 'clear') ? '0' : (val === 'backspace') ? (currentVal.length > 1 ? currentVal.slice(0, -1) : '0') : (isFirstInput ? val : currentVal + val);
      if (val !== 'clear' && val !== 'backspace') setIsFirstInput(false);
      return { ...prev, [field]: parseFloat(newVal) || 0 };
    });
  };

  // 時間格式化工具：2026/02/17 18:15
  const formatDateTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(/\//g, '/');
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
            <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl h-12 shadow-lg transition-all">
              <span className="text-base font-black whitespace-nowrap">{selectedMember.name}</span>
              <button onClick={() => { setSelectedMember(null); setShowHistory(false); }} className="hover:bg-emerald-700 rounded-full p-1 transition-colors">✕</button>
            </div>
          ) : (
            <div className="bg-slate-300 text-slate-600 px-5 h-12 rounded-xl font-black flex items-center text-base whitespace-nowrap">一般散客</div>
          )}

          {/* 按鈕顏色邏輯修正：確保選中會員後直接對應正確顏色 */}
          {selectedMember && (
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className={`h-12 px-6 rounded-xl font-black transition-all shadow-md flex items-center gap-2 ${
                showHistory ? "bg-slate-800 text-white" : "bg-orange-500 text-white"
              }`}
            >
              {showHistory ? "⬅️ 返回商品" : "🕒 歷史紀錄"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {showHistory ? (
          /* --- 消費紀錄：包含精確時間 --- */
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {memberHistory.length === 0 && !isLoadingHistory ? (
              <div className="bg-white rounded-2xl py-20 text-center text-slate-400 font-black">無歷史交易紀錄</div>
            ) : (
              memberHistory.map(order => (
                <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-8 border-l-blue-600 border border-slate-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">消費時間</span>
                      <span className="font-black text-slate-700 text-lg leading-none mt-1">
                        {formatDateTime(order.created_at)}
                      </span>
                    </div>
                    <span className="font-black text-blue-600 text-3xl tracking-tighter">${order.total_amount?.toLocaleString()}</span>
                  </div>
                  <div className="space-y-1 border-t border-slate-50 pt-2 font-black text-slate-500">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-base">
                        <span className="flex-1 truncate mr-4">• {item.products?.name}</span>
                        <span className="font-mono shrink-0">${item.price} x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* --- 商品網格：適應長字數 --- */
          <>
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 py-1">
              {categories?.map(cat => (
                <button key={cat.id} onClick={() => setCurrentCategoryId(cat.id)} className={`px-6 py-2 rounded-xl font-black whitespace-nowrap transition-all ${currentCategoryId === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-300'}`}>
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 pb-10">
              {products
                .filter(p => currentCategoryId === 'all' || p.category_id === currentCategoryId)
                .map(p => {
                  const currentPrice = selectedMember ? (p.member_price || p.price) : p.price;
                  return (
                    <button 
                      key={p.id} 
                      onClick={() => handleProductClick(p)} 
                      className="group relative p-3 rounded-2xl bg-white border-2 border-transparent hover:border-blue-500 shadow-sm flex flex-col min-h-[130px] transition-all active:scale-95 text-left"
                    >
                      {/* 長字數優化：最多顯示三行，自動斷行 */}
                      <span className="font-black text-xl text-slate-800 leading-[1.2] break-words mb-2 flex-1">
                        {p.name}
                      </span>
                      <div className="text-right mt-auto">
                        <span className="text-3xl font-black font-mono text-slate-900 tracking-tighter">${currentPrice || 0}</span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </>
        )}
      </div>

      {/* --- 商品彈窗 --- */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-md px-4" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-[400px] overflow-hidden border-none" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-slate-900 text-white">
              <h3 className="text-2xl font-black leading-tight">{editingProduct.name}</h3>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => { setActiveField('price'); setIsFirstInput(true); }} className={`p-4 rounded-2xl border-2 transition-all ${activeField === 'price' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                  <label className="text-xs font-black text-slate-400 block mb-1">單價金額</label>
                  <div className="text-4xl font-mono font-black text-slate-900">${editingProduct.tempPrice}</div>
                </button>
                <button onClick={() => { setActiveField('quantity'); setIsFirstInput(true); }} className={`p-4 rounded-2xl border-2 transition-all ${activeField === 'quantity' ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                  <label className="text-xs font-black text-slate-400 block mb-1">數量修改</label>
                  <div className="text-4xl font-mono font-black text-slate-900">x{editingProduct.quantity}</div>
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, '00'].map(鍵 => (
                  <button key={鍵} onClick={() => 鍵 === 'clear' ? handleInput('clear') : handleInput(鍵.toString())} className={`h-16 rounded-xl text-3xl font-black transition-all active:scale-95 ${鍵 === 'clear' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-800 border-b-4 border-slate-200 active:border-b-0'}`}>
                    {鍵 === 'clear' ? '清除' : 鍵}
                  </button>
                ))}
              </div>
              <button onClick={confirmAddToCart} className="w-full py-6 bg-blue-600 text-white rounded-2xl text-2xl font-black shadow-xl active:scale-95">
                確認加入清單
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}