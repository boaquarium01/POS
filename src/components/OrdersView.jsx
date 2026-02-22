import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function OrdersView() {
  const [orders, setOrders] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState(null)

  // 編輯支出用的狀態
  const [editingExpense, setEditingExpense] = useState(null)
  const [editFormData, setEditFormData] = useState({ amount: '', reason: '' })

  const todayStr = new Date().toLocaleDateString('en-CA')
  const [startDate, setStartDate] = useState(todayStr)
  const [endDate, setEndDate] = useState(todayStr)

  useEffect(() => { fetchData() }, [startDate, endDate])

  async function fetchData() {
    try {
      setLoading(true)
      // 計算該日期的本地起點與終點，並轉成 ISO (UTC) 時間字串給 Supabase 查詢
      const startOfDay = new Date(`${startDate}T00:00:00`).toISOString()
      const endOfDay = new Date(`${endDate}T23:59:59.999`).toISOString()

      const { data: ordersData } = await supabase
        .from('orders')
        .select(`*, members(name), order_items (quantity, price, products ( name ))`)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })

      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })

      if (ordersData) setOrders(ordersData)
      if (expensesData) setExpenses(expensesData)
    } finally { setLoading(false) }
  }

  // 開啟編輯視窗
  const handleEditClick = (exp) => {
    setEditingExpense(exp)
    setEditFormData({ amount: exp.amount, reason: exp.reason || '' })
  }

  // 儲存編輯
  async function handleSaveExpense(e) {
    e.preventDefault()
    const { error } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(editFormData.amount),
        reason: editFormData.reason
      })
      .eq('id', editingExpense.id)

    if (error) {
      alert("更新失敗：" + error.message)
    } else {
      setEditingExpense(null)
      fetchData() // 重新整理
    }
  }

  const displayDate = (s) => new Date(s).toLocaleDateString('zh-TW')
  const displayTime = (s) => new Date(s).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' })

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const expense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)
    const byMethod = orders.reduce((acc, o) => {
      const method = o.payment_method || '現金'
      acc[method] = (acc[method] || 0) + (o.total_amount || 0)
      return acc
    }, { '現金': 0, '轉帳': 0, '刷卡': 0 })
    return { revenue, expense, byMethod }
  }, [orders, expenses])

  if (loading) return <div className="p-20 text-center text-3xl font-black text-slate-400 font-sans">資料加載中...</div>

  return (
    <div className="flex flex-col h-full bg-slate-100 overflow-hidden font-sans text-slate-900 relative">

      {/* 編輯支出的彈出視窗 (Modal) */}
      {editingExpense && (
        <div className="absolute inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <form onSubmit={handleSaveExpense} className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-10 space-y-6 border-4 border-rose-500 animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <span className="text-rose-500 text-4xl">📝</span> 編輯支出紀錄
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 ml-2">支出金額</label>
                <input
                  type="number"
                  required
                  className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-3xl font-black font-mono focus:border-rose-500 outline-none transition-colors"
                  value={editFormData.amount}
                  onChange={e => setEditFormData({ ...editFormData, amount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-black text-slate-400 ml-2">支出原因 (Reason)</label>
                <textarea
                  required
                  rows="3"
                  className="w-full p-5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xl font-black focus:border-rose-500 outline-none transition-colors"
                  value={editFormData.reason}
                  onChange={e => setEditFormData({ ...editFormData, reason: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="submit" className="flex-1 py-5 bg-rose-600 text-white font-black rounded-2xl text-xl shadow-lg hover:bg-rose-700 active:scale-95 transition-all">
                確認修改
              </button>
              <button type="button" onClick={() => setEditingExpense(null)} className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl text-xl hover:bg-slate-200 transition-all">
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 頂部篩選欄 */}
      <div className="bg-white px-8 py-3 shadow-md z-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h2 className="text-2xl font-black tracking-tighter text-slate-800">帳務分析系統</h2>
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button onClick={() => { setStartDate(todayStr); setEndDate(todayStr) }} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${startDate === todayStr ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>今日紀錄</button>
            <button onClick={() => {
              const start = new Date(); start.setDate(start.getDate() - 6);
              setStartDate(start.toLocaleDateString('en-CA')); setEndDate(todayStr);
            }} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${startDate !== todayStr ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}>最近一週</button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200 text-xs font-bold">
            <input type="date" className="bg-transparent outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-slate-400 font-black">-</span>
            <input type="date" className="bg-transparent outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="flex gap-8">
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-emerald-600">區間總營收</span>
            <span className="text-2xl font-black font-mono text-emerald-700">${stats.revenue.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-slate-200"></div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-black text-rose-600">區間總支出</span>
            <span className="text-2xl font-black font-mono text-rose-600">-${stats.expense.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6">

        {/* 左側：銷售流水帳 */}
        <div className="flex-[3] bg-white rounded-[2rem] shadow-xl flex flex-col overflow-hidden border border-slate-200">
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <table className="w-full">
              <thead className="bg-slate-800 text-white sticky top-0 z-10">
                <tr className="text-left font-black text-sm uppercase tracking-widest">
                  <th className="p-5">交易時間</th>
                  <th className="p-5">客戶資訊</th>
                  <th className="p-5 text-center">支付</th>
                  <th className="p-5 text-right font-black text-lg">收款金額</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr
                      className={`hover:bg-blue-50/50 transition-all cursor-pointer ${expandedOrderId === order.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                    >
                      <td className="p-5">
                        <div className="text-lg font-black text-slate-800">{displayDate(order.created_at)}</div>
                        <div className="text-xs font-black text-slate-500 font-mono">{displayTime(order.created_at)}</div>
                      </td>
                      <td className="p-5 font-black text-xl text-slate-800">
                        {order.members?.name || '一般散客'}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-4 py-1.5 rounded-lg font-black text-sm ${order.payment_method === '現金' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                            order.payment_method === '轉帳' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                              'bg-purple-100 text-purple-700 border border-purple-200'
                          }`}>
                          {order.payment_method || '現金'}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black">
                        <div className="text-3xl font-mono text-slate-900">${(order.total_amount || 0).toLocaleString()}</div>
                      </td>
                      <td className="p-5 text-center text-slate-400">
                        {expandedOrderId === order.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-slate-50">
                        <td colSpan="5" className="p-6">
                          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
                            <h4 className="font-black text-blue-700 text-xl border-b-2 border-blue-50 pb-2">🛒 銷售商品細項</h4>
                            {order.order_items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xl font-bold border-b border-slate-50 pb-2">
                                <div className="text-slate-800">#{idx + 1} {item.products?.name}</div>
                                <div className="font-mono text-slate-900 flex items-baseline gap-6">
                                  <span className="text-slate-500 text-sm font-black">${item.price} × {item.quantity}</span>
                                  <span className="text-2xl font-black">${(item.price * item.quantity).toLocaleString()}</span>
                                </div>
                              </div>
                            ))}
                            <div className="pt-4 flex justify-between items-center">
                              <span className="text-slate-600 font-black text-sm">備註：{order.note || '無'}</span>
                              <div className="text-3xl font-black text-blue-700 font-mono underline decoration-blue-200 decoration-4">實收：${order.total_amount.toLocaleString()}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右側：金額匯總區 */}
        <div className="w-96 flex flex-col gap-6">

          {/* 支付分類統計 */}
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-slate-100 space-y-4">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest border-b-2 border-slate-50 pb-3">收款方式統計</h3>
            <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-200">
              <span className="text-emerald-800 font-black text-lg">💵 現金</span>
              <span className="text-2xl font-black font-mono text-emerald-900">${stats.byMethod['現金'].toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border-2 border-blue-200">
              <span className="text-blue-800 font-black text-lg">📱 轉帳</span>
              <span className="text-2xl font-black font-mono text-blue-900">${stats.byMethod['轉帳'].toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 p-4 rounded-2xl border-2 border-purple-200">
              <span className="text-purple-800 font-black text-lg">💳 刷卡</span>
              <span className="text-2xl font-black font-mono text-purple-900">${stats.byMethod['刷卡'].toLocaleString()}</span>
            </div>
          </div>

          {/* 支出紀錄 (點擊可編輯) */}
          <div className="flex-1 bg-white rounded-[2rem] shadow-xl border-2 border-slate-100 flex flex-col overflow-hidden">
            <div className="p-5 bg-rose-600 text-white font-black text-lg flex justify-between items-center">
              <span>雜支支出紀錄</span>
              <span className="text-xs bg-rose-800 px-3 py-1 rounded-full">{expenses.length} 筆</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 no-scrollbar">
              {expenses.map(exp => (
                <div
                  key={exp.id}
                  onClick={() => handleEditClick(exp)}
                  className="bg-white p-5 rounded-2xl border-2 border-rose-100 shadow-sm hover:border-rose-500 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-black text-slate-500 font-mono">{displayDate(exp.created_at)}</span>
                    <span className="text-2xl font-black text-rose-700 font-mono">-${exp.amount.toLocaleString()}</span>
                  </div>
                  <div className="text-xl font-black text-slate-900 leading-tight flex justify-between items-end">
                    {exp.reason || '未填寫原因'}
                    <span className="text-xs text-rose-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">點擊修改 📝</span>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && (
                <div className="text-center py-20 text-slate-400 font-black">區間內無支出紀錄</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}