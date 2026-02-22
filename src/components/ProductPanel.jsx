import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ProductPanel({
  memberSearch, setMemberSearch,
  selectedMember, setSelectedMember, categories,
  currentCategoryId, setCurrentCategoryId, products, onAddToCart,
  onOpenNumpad
}) {
  const [searchResults, setSearchResults] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [memberHistory, setMemberHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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
      onOpenNumpad(`${product.name} - 請輸入單價`, 0, (newPrice) => {
        onAddToCart({ ...product, price: parseFloat(newPrice) || 0, quantity: 1 });
      });
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
    <div className="flex-[1.2] flex flex-col border-r bg-slate-50 min-w-0 relative font-sans">

      {/* ── 頂部導覽列 h-[72px] (原 h-16 放大10%) ── */}
      <div className="h-[72px] px-5 bg-white border-b flex gap-4 items-center z-[60] shrink-0">
        {/* 搜尋欄：使用 padding 定位，避免圖示錯位 */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="🔍 搜尋會員姓名或電話..."
            className="w-full bg-slate-100 border-2 border-transparent rounded-xl px-4 py-2.5 text-[15px] font-bold focus:border-blue-400 focus:bg-white outline-none transition-all"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden z-[70]">
              {searchResults.map(m => (
                <button key={m.id} onClick={() => handleSelectMember(m)}
                  className="w-full px-4 py-3.5 text-left hover:bg-blue-50 border-b last:border-0 flex justify-between items-center transition-colors">
                  <span className="font-black text-slate-700 text-base">{m.name}</span>
                  <span className="text-sm font-mono text-slate-400">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 會員狀態 */}
        {selectedMember ? (
          <div className="flex items-center gap-2 bg-emerald-500 text-white pl-4 pr-2 py-2 rounded-xl shadow-md shrink-0">
            <span className="text-sm font-black">👤 {selectedMember.name}</span>
            <button onClick={() => { setSelectedMember(null); setShowHistory(false); }}
              className="hover:bg-emerald-600 rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors ml-1">✕</button>
          </div>
        ) : (
          <div className="bg-slate-100 text-slate-500 px-4 h-10 rounded-xl font-bold flex items-center text-sm shrink-0">散客</div>
        )}
        {selectedMember && (
          <button onClick={() => setShowHistory(!showHistory)}
            className={`h-10 px-4 rounded-xl font-black text-sm shrink-0 ${showHistory ? "bg-slate-700 text-white" : "bg-amber-500 text-white hover:bg-amber-600"}`}>
            {showHistory ? "← 商品" : "🕒 紀錄"}
          </button>
        )}
      </div>

      {/* ── 分類列 ── */}
      {!showHistory && (
        <div className="bg-white px-4 py-3 border-b flex gap-2 overflow-x-auto no-scrollbar z-[50] shrink-0">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCurrentCategoryId(cat.id)}
              className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[15px] font-black transition-all ${currentCategoryId === cat.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* ── 商品 / 歷史區 ── */}
      <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
        {showHistory ? (
          <div className="space-y-3">
            {memberHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="text-5xl mb-3">📋</div>
                <span className="font-black text-base">尚無消費紀錄</span>
              </div>
            )}
            {memberHistory.map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-[6px] border-l-blue-500">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">消費時間</div>
                    <div className="font-black text-slate-700 text-base">{formatDateTime(order.created_at)}</div>
                  </div>
                  <span className="font-black text-blue-600 text-2xl">${order.total_amount?.toLocaleString()}</span>
                </div>
                <div className="space-y-0.5 border-t pt-2 text-sm text-slate-500">
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between font-bold">
                      <span className="flex-1 truncate">· {item.products?.name}</span>
                      <span className="font-mono ml-3">${item.price} ×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* RWD: 小螢幕2欄，中型3欄，大螢幕4欄 */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-4">
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-300">
                <div className="text-5xl mb-3">📦</div>
                <span className="font-black text-base">此分類沒有商品</span>
              </div>
            )}
            {[...products]
              .filter(p => currentCategoryId === 'all' || p.category_id === currentCategoryId)
              .sort((a, b) => {
                const isNoPriceA = !((selectedMember ? (a.member_price || a.price) : a.price));
                const isNoPriceB = !((selectedMember ? (b.member_price || b.price) : b.price));
                return isNoPriceA === isNoPriceB ? 0 : isNoPriceA ? -1 : 1;
              })
              .map(p => {
                const currentPrice = selectedMember ? (p.member_price || p.price) : p.price;
                const isNoPrice = !currentPrice || currentPrice === 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`group p-4 rounded-2xl border-2 transition-all active:scale-[0.97] text-left flex flex-col h-[120px] ${isNoPrice
                      ? 'bg-amber-50 border-amber-200 hover:border-amber-400 hover:shadow-md hover:shadow-amber-100'
                      : 'bg-white border-slate-100 hover:border-blue-400 hover:shadow-md hover:shadow-blue-100'
                      }`}
                  >
                    <span className={`font-black text-[15px] leading-snug flex-1 ${isNoPrice ? 'text-amber-800' : 'text-slate-800'}`}>
                      {p.name}
                    </span>
                    <div className="mt-auto">
                      {isNoPrice ? (
                        <span className="text-xl font-black text-amber-500">時價</span>
                      ) : (
                        <span className="text-2xl font-black font-mono text-slate-900 group-hover:text-blue-600 transition-colors">
                          ${currentPrice}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}