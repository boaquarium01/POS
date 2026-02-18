import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { formatTWDate } from '../lib/utils'

export default function MemberView() {
  const [members, setMembers] = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberOrders, setMemberOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [newMember, setNewMember] = useState({ name: '', phone: '', note: '' })

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    if (data) setMembers(data)
  }

  async function fetchMemberOrderDetails(memberId) {
    const { data } = await supabase
      .from('orders')
      .select(`*, order_items ( quantity, price, products ( name ) )`)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
    if (data) setMemberOrders(data)
  }

  // --- 統計數據邏輯 ---
  const stats = useMemo(() => {
    if (!memberOrders.length) return { total: 0, count: 0, avg: 0, frequency: '無紀錄' };
    const total = memberOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const avg = Math.round(total / memberOrders.length);
    
    // 計算回訪週期
    const dates = memberOrders.map(o => new Date(o.created_at)).sort((a,b) => a-b);
    let frequency = '首次消費';
    if (dates.length > 1) {
      const daysDiff = Math.ceil((dates[dates.length-1] - dates[0]) / (1000 * 60 * 60 * 24));
      frequency = `${Math.round(daysDiff / (dates.length - 1))} 天`;
    }
    return { total, count: memberOrders.length, avg, frequency };
  }, [memberOrders]);

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setIsAdding(false);
    setIsEditing(false);
    fetchMemberOrderDetails(member.id);
  }

  async function handleUpdateMember() {
    const { error } = await supabase
      .from('members')
      .update({ name: selectedMember.name, phone: selectedMember.phone, note: selectedMember.note })
      .eq('id', selectedMember.id)
    
    if (error) return alert("更新失敗");
    alert("✅ 會員資料已更新");
    setIsEditing(false);
    fetchMembers();
  }

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {/* --- 左側列表 --- */}
      <div className="w-72 bg-white border-r flex flex-col shadow-lg z-10">
        <div className="p-4 border-b space-y-3">
          <button onClick={() => { setIsAdding(true); setSelectedMember(null); }} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-all text-lg">＋ 新增會員</button>
          <input className="w-full bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="搜尋姓名/電話..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {members.filter(m => m.name.includes(searchTerm) || m.phone.includes(searchTerm)).map(m => (
            <div key={m.id} onClick={() => handleSelectMember(m)} className={`p-4 border-b cursor-pointer transition-all ${selectedMember?.id === m.id ? 'bg-slate-800 text-white shadow-xl' : 'hover:bg-blue-50'}`}>
              <div className="font-black text-lg">{m.name}</div>
              <div className={`font-mono text-xs ${selectedMember?.id === m.id ? 'opacity-70' : 'text-slate-400'}`}>{m.phone}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- 右側內容 (優化縮窄 30%) --- */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 no-scrollbar">
        {selectedMember ? (
          <div className="max-w-5xl mx-auto space-y-4">
            
            {/* 1. 會員基本資訊與備註 (縮減高度) */}
            <div className="bg-white px-8 py-5 rounded-[1.5rem] shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-baseline gap-4">
                  {isEditing ? (
                    <input className="text-3xl font-black border-b-2 border-blue-600 outline-none bg-blue-50 px-2" value={selectedMember.name} onChange={e=>setSelectedMember({...selectedMember, name: e.target.value})} />
                  ) : (
                    <h1 className="text-4xl font-black text-slate-800">{selectedMember.name}</h1>
                  )}
                  {isEditing ? (
                    <input className="text-xl font-mono text-blue-600 border-b-2 border-blue-200 outline-none bg-blue-50 px-2" value={selectedMember.phone} onChange={e=>setSelectedMember({...selectedMember, phone: e.target.value})} />
                  ) : (
                    <p className="text-blue-600 text-xl font-mono font-bold">{selectedMember.phone}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isEditing ? (
                    <button onClick={handleUpdateMember} className="bg-green-600 text-white px-5 py-2 rounded-xl font-black shadow-md">儲存變更</button>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="bg-slate-800 text-white px-5 py-2 rounded-xl font-black shadow-md">編輯資料</button>
                  )}
                </div>
              </div>
              
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded-r-xl">
                <div className="flex gap-4 items-center">
                  <span className="text-xs font-black text-amber-600 whitespace-nowrap">會員備註：</span>
                  {isEditing ? (
                    <textarea className="flex-1 bg-white p-2 rounded border border-amber-200 text-lg font-bold outline-none" rows="1" value={selectedMember.note} onChange={e=>setSelectedMember({...selectedMember, note: e.target.value})} />
                  ) : (
                    <p className="text-slate-700 text-lg font-bold truncate">{selectedMember.note || "無備註"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 統計數據區 (橫向縮窄) */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-900 p-5 rounded-[1.5rem] shadow-md border-t-4 border-amber-400">
                <div className="text-amber-400 font-black text-xs uppercase tracking-widest mb-1">累計消費總額</div>
                <div className="text-3xl font-black text-white font-mono tracking-tighter">${stats.total}</div>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200">
                <div className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">消費次數</div>
                <div className="text-3xl font-black text-slate-800 font-mono">{stats.count} <span className="text-sm">次</span></div>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200">
                <div className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">平均客單價</div>
                <div className="text-3xl font-black text-slate-800 font-mono">${stats.avg}</div>
              </div>
              <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-200">
                <div className="text-slate-400 font-black text-xs uppercase tracking-widest mb-1">回訪週期</div>
                <div className="text-2xl font-black text-blue-600">{stats.frequency}</div>
              </div>
            </div>

            {/* 3. 歷史訂單清單 */}
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-2">歷史消費明細</h3>
              {memberOrders.map(order => (
                <div key={order.id} className="bg-white p-5 rounded-[1.5rem] border-2 border-transparent hover:border-blue-500 shadow-sm transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-mono font-bold text-sm">
                        {formatTWDate(order.created_at)}
                      </div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-tight">單號 #{order.id.slice(0,8).toUpperCase()}</div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 font-mono tracking-tight">${order.total_amount}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="font-black text-slate-700">🛒 {item.products?.name}</span>
                        <span className="text-slate-500 font-bold">
                          ${item.price} × {item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <div className="text-[10rem] opacity-20 mb-4">👤</div>
            <p className="text-2xl font-black tracking-widest">請從左側列表選擇會員</p>
          </div>
        )}
      </div>
    </div>
  )
}
