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
    const dates = memberOrders.map(o => new Date(o.created_at)).sort((a, b) => a - b);
    let frequency = '首次消費';
    if (dates.length > 1) {
      const daysDiff = Math.ceil((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));
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

  async function handleDeleteMember() {
    if (!window.confirm(`確定要刪除會員「${selectedMember.name}」嗎？此操作無法復原。`)) {
      return;
    }
    const { error } = await supabase.from('members').delete().eq('id', selectedMember.id);
    if (error) {
      alert("刪除失敗：" + error.message);
    } else {
      alert("✅ 會員已刪除");
      setSelectedMember(null);
      setIsEditing(false);
      fetchMembers();
    }
  }

  async function handleAddMember() {
    if (!newMember.name || !newMember.phone) {
      return alert("姓名與電話為必填欄位");
    }

    const { data, error } = await supabase
      .from('members')
      .insert([{ name: newMember.name, phone: newMember.phone, note: newMember.note }])
      .select()

    if (error) {
      return alert("新增失敗：" + error.message);
    }

    alert("✅ 會員新增成功");
    setNewMember({ name: '', phone: '', note: '' });
    setIsAdding(false);
    fetchMembers();
    if (data && data.length > 0) {
      handleSelectMember(data[0]);
    }
  }

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden text-slate-900 font-sans">
      {/* --- 左側列表 --- */}
      <div className="w-72 bg-white border-r flex flex-col shadow-lg z-10">
        <div className="p-4 border-b space-y-3">
          <button onClick={() => { setIsAdding(true); setSelectedMember(null); }} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-all text-lg">＋ 新增會員</button>
          <input className="w-full bg-slate-100 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 font-bold" placeholder="搜尋姓名/電話..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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

      {/* --- 右側內容 --- */}
      <div className="flex-1 p-6 overflow-y-auto bg-slate-50 no-scrollbar">
        {isAdding ? (
          <div className="max-w-2xl mx-auto mt-6 bg-white p-6 sm:p-8 rounded-[2rem] shadow-xl border w-full">
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
              <span className="text-blue-600">👤</span> 新增會員資料
            </h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-black text-slate-500 ml-1">會員姓名 <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-bold focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="輸入姓名"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-black text-slate-500 ml-1">聯絡電話 <span className="text-rose-500">*</span></label>
                <input
                  type="tel"
                  className="w-full p-3 sm:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-lg font-mono font-bold focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="09xx-xxx-xxx"
                  value={newMember.phone}
                  onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-black text-slate-500 ml-1">會員備註</label>
                <textarea
                  rows="3"
                  className="w-full p-3 sm:p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-base focus:border-blue-500 focus:bg-white outline-none transition-all"
                  placeholder="輸入備註資訊..."
                  value={newMember.note}
                  onChange={(e) => setNewMember({ ...newMember, note: e.target.value })}
                ></textarea>
              </div>
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddMember}
                  className="flex-1 bg-blue-600 text-white py-3 sm:py-4 rounded-xl text-lg font-black shadow-md hover:bg-blue-700 active:scale-95 transition-all"
                >
                  確認新增
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 sm:py-4 rounded-xl text-lg font-black hover:bg-slate-200 active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        ) : selectedMember ? (
          <div className="w-full max-w-6xl mx-auto space-y-4 lg:space-y-6">

            {/* 1. 會員基本資訊與備註 (自適應排列) */}
            <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] shadow-sm border border-slate-200">
              <div className={`flex flex-col lg:flex-row justify-between items-start ${isEditing ? 'lg:items-end' : 'lg:items-center'} gap-6 mb-6`}>

                {/* 姓名與電話群組 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 w-full lg:w-auto">
                  {isEditing ? (
                    <div className="w-full sm:w-auto">
                      <div className="text-xs font-black text-slate-400 mb-1 ml-1 tracking-widest">會員姓名</div>
                      <input className="w-full sm:w-44 xl:w-48 text-2xl font-black border-2 border-slate-200 focus:border-blue-600 bg-slate-50 outline-none px-4 py-2 rounded-xl transition-all" value={selectedMember.name} onChange={e => setSelectedMember({ ...selectedMember, name: e.target.value })} />
                    </div>
                  ) : (
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-800 break-words line-clamp-2">{selectedMember.name}</h1>
                  )}
                  {isEditing ? (
                    <div className="w-full sm:w-auto">
                      <div className="text-xs font-black text-slate-400 mb-1 ml-1 tracking-widest">聯絡電話</div>
                      <input className="w-full sm:w-44 xl:w-48 text-xl font-mono text-blue-600 border-2 border-slate-200 focus:border-blue-600 bg-slate-50 outline-none px-4 py-2 rounded-xl transition-all" value={selectedMember.phone} onChange={e => setSelectedMember({ ...selectedMember, phone: e.target.value })} />
                    </div>
                  ) : (
                    <p className="text-blue-600 text-lg sm:text-xl font-mono font-bold break-words sm:pb-1 xl:pb-2">{selectedMember.phone}</p>
                  )}
                </div>

                {/* 按鈕群組 (若空間不足會換行並撐滿剩餘空間) */}
                <div className="flex flex-wrap gap-3 w-full lg:w-auto mt-2 lg:mt-0">
                  {isEditing ? (
                    <>
                      <button onClick={handleDeleteMember} className="flex-1 sm:flex-none bg-rose-100 text-rose-600 border-2 border-rose-200 py-3 px-5 sm:px-6 rounded-xl font-black shadow-sm hover:bg-rose-200 hover:border-rose-300 transition-all text-center">🗑️ 刪除</button>
                      <button onClick={handleUpdateMember} className="flex-2 sm:flex-none bg-emerald-600 text-white py-3 px-6 sm:px-8 rounded-xl font-black shadow-md hover:bg-emerald-700 transition-all text-center">儲存變更</button>
                      <button onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none bg-slate-200 text-slate-700 py-3 px-5 sm:px-6 rounded-xl font-black shadow-sm hover:bg-slate-300 transition-all text-center">取消</button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="w-full sm:w-auto bg-slate-800 text-white py-3 px-8 rounded-xl font-black shadow-md hover:bg-slate-700 transition-all text-center text-lg">編輯會員資料</button>
                  )}
                </div>
              </div>

              {/* 備註 */}
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl w-full">
                <div className="flex flex-col sm:flex-row sm:gap-4 items-start sm:items-center">
                  <span className="text-sm font-black text-amber-600 mb-2 sm:mb-0 whitespace-nowrap">會員備註：</span>
                  {isEditing ? (
                    <textarea className="w-full flex-1 bg-white p-3 rounded-lg border border-amber-200 text-base sm:text-lg font-bold outline-none" rows="2" value={selectedMember.note} onChange={e => setSelectedMember({ ...selectedMember, note: e.target.value })} />
                  ) : (
                    <p className="text-slate-700 text-base sm:text-lg font-bold whitespace-pre-wrap break-words">{selectedMember.note || "無備註"}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 2. 統計數據區 (響應式網格) */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
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
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-tight">單號 #{order.id.slice(0, 8).toUpperCase()}</div>
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
