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

  // 1. 即時搜尋會員
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (memberSearch.length >= 1) {
        const { data } = await supabase
          .from('members')
          .select('*')
          .or(`name.ilike.%${memberSearch}%,phone.ilike.%${memberSearch}%`)
          .limit(5);
        setSearchResults(data || []);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearch]);

  // 2. 選中會員後抓取歷史並自動切換
  useEffect(() => {
    if (selectedMember) {
      fetchMemberHistory(selectedMember.id);
      setShowHistory(true); 
    } else {
      setShowHistory(false);
      setMemberHistory([]);
    }
  }, [selectedMember]);

  async function fetchMemberHistory(memberId) {
    const { data } = await supabase
      .from('orders')
      .select(`
        id, created_at, total_amount,
        order_items ( product_id, quantity, price, products ( name ) )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(10);
    setMemberHistory(data || []);
  }

  const sortedProducts = [...products]
    .filter(p => currentCategoryId === 'all' || p.category_id === currentCategoryId)
    .sort((a, b) => {
      const priceA = selectedMember ? (a.member_price || a.price) : a.price;
      const priceB = selectedMember ? (b.member_price || b.price) : b.price;
      return (!priceA || priceA === 0) ? -1 : 1;
    });

  return (
    <div className="flex-[1.2] flex flex-col border-r bg-slate-50 min-w-[500px] relative font-sans">
      
      {/* 頂部搜尋列 */}
      <div className="h-20 p-4 bg-white border-b flex gap-3 shadow-sm items-center z-[60]">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="🔍 搜尋會員姓名或電話..." 
            className="w-full bg-slate-100 border-none rounded-xl px-4 py-2 text-base font-bold focus:ring-2 focus:ring-blue-500" 
            value={memberSearch} 
            onChange={e => setMemberSearch(e.target.value)} 
          />
          
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white shadow-2xl rounded-2xl border border-slate-100 overflow-hidden z-[70]">
              {searchResults.map(m => (
                <button 
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setSearchResults([]); setMemberSearch(''); }}
                  className="w-full p-4 text-left hover:bg-blue-50 border-b border-slate-50 last:border-none flex justify-between items-center"
                >
                  <span className="font-black text-slate-700">{m.name}</span>
                  <span className="text-sm font-mono text-slate-400">{m.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedMember ? (
          <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl h-11 shadow-lg">
            <div className="flex flex-col leading-none text-left">
              <span className="text-[9px] opacity-70 font-bold">會員選中</span>
              <span className="text-sm font-black">{selectedMember.name}</span>
            </div>
            <button onClick={() => setSelectedMember(null)} className="hover:text-red-200 text-xl font-bold ml-1">✕</button>
          </div>
        ) : (
          <div className="bg-slate-200 text-slate-400 px-5 h-11 rounded-xl font-black flex items-center text-sm">未選中會員</div>
        )}

        {selectedMember && (
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className={`h-11 px-4 rounded-xl font-black transition-all shadow-md ${showHistory ? 'bg-orange-500 text-white' : 'bg-white border border-slate-200 text-slate-500'}`}
          >
            {showHistory ? '📦 顯示商品' : '🕒 歷史紀錄'}
          </button>
        )}
      </div>

      {/* 主要內容區 */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        
        {showHistory ? (
          /* --- 視圖 A: 會員歷史紀錄 --- */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xl font-black text-slate-800 px-2 tracking-tighter">🕒 最近購買紀錄</h3>
            
            {memberHistory.length === 0 ? (
              <div className="text-center py-24 text-slate-300 font-bold">目前尚無交易紀錄</div>
            ) : (
              memberHistory.map(order => {
                const dateObj = new Date(order.created_at);
                const dateString = `${dateObj.getFullYear()}/${(dateObj.getMonth()+1).toString().padStart(2,'0')}/${dateObj.getDate().toString().padStart(2,'0')}`;
                const timeString = dateObj.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

                return (
                  <div key={order.id} className="bg-white rounded-[1.5rem] p-5 shadow-sm border-l-4 border-l-blue-500 border border-slate-100">
                    {/* 紀錄標題欄：日期與總額 */}
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-slate-800 text-lg tracking-tight bg-slate-100 px-2 py-1 rounded-lg">
                          {dateString}
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-400">
                          {timeString}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-300 block leading-none">實付總計</span>
                        <span className="font-mono font-black text-blue-600 text-2xl tracking-tighter">${order.total_amount}</span>
                      </div>
                    </div>

                    {/* 商品明細卡片 */}
                    <div className="space-y-2">
                      {order.order_items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-700">{item.products?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">單價 ${item.price}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-white px-2 py-1 rounded-md text-xs font-black text-slate-500 border border-slate-200">
                              x{item.quantity}
                            </span>
                            <span className="font-mono font-black text-slate-900 w-16 text-right">
                              ${(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* --- 視圖 B: 商品網格 --- */
          <>
            <div className="flex items-center h-16 mb-2">
              <div className="flex gap-2 overflow-x-auto py-2 px-1 no-scrollbar">
                {categories.map(cat => (
                  <button 
                    key={cat.id} 
                    onClick={() => setCurrentCategoryId(cat.id)} 
                    className={`px-5 py-2 rounded-lg font-black whitespace-nowrap transition-all duration-200 ${
                      currentCategoryId === cat.id 
                        ? 'bg-slate-900 text-white scale-105 shadow-md ring-2 ring-slate-900' 
                        : 'bg-slate-200/60 text-slate-600 border border-slate-300 hover:border-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pb-10">
              {sortedProducts.map(p => {
                const currentPrice = selectedMember ? (p.member_price || p.price) : p.price;
                const isNoPrice = !currentPrice || currentPrice === 0;
                return (
                  <button 
                    key={p.id} 
                    onClick={() => onAddToCart(p)} 
                    className={`group relative p-4 rounded-[1.2rem] border-2 text-left flex flex-col justify-between h-32 transition-all duration-300 ${
                      isNoPrice ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-slate-100 shadow-sm'
                    } hover:-translate-y-0.5`}
                  >
                    <span className={`font-black text-base line-clamp-2 leading-tight ${isNoPrice ? 'text-amber-900' : 'text-slate-700'}`}>
                      {p.name}
                    </span>
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-slate-400">
                        {selectedMember && p.member_price ? '會員價' : '單價'}
                      </div>
                      <div className={`text-2xl font-black font-mono tracking-tighter ${isNoPrice ? 'text-amber-600' : 'text-slate-900'}`}>
                        ${currentPrice || 0}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}