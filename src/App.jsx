import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

// 匯入拆分後的元件
import Sidebar from './components/Sidebar'
import POSView from './components/POSView'
import MemberView from './components/MemberView'
import InventoryView from './components/InventoryView'
import OrdersView from './components/OrdersView'
import SettingsView from './components/SettingsView'

export default function App() {
  const [activeTab, setActiveTab] = useState('pos') 
  const [products, setProducts] = useState([])     
  const [loading, setLoading] = useState(true)
  const [stores, setStores] = useState([]) 
  const [currentStore, setCurrentStore] = useState(null)

  // 1. 初始化：抓取所有分店
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .order('created_at', { ascending: true });

        if (storeError) throw storeError;

        if (storeData && storeData.length > 0) {
          setStores(storeData);
          setCurrentStore(storeData[0]); 
        } else {
          // 如果沒有分店，關閉加載
          setLoading(false);
        }
      } catch (err) {
        console.error("初始化失敗:", err);
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. 當切換分店時，重新抓取
  useEffect(() => {
    if (currentStore?.id) {
      fetchProducts(currentStore.id)
    }
  }, [currentStore])

  // 在 App.jsx 中更新此函數
async function fetchProducts() {
  if (!currentStore) return;
  setLoading(true);

  try {
    // 1. 抓取所有商品主檔 (全公司總表)
    const { data: allProducts, error: prodError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (prodError) throw prodError;

    // 2. 抓取所有庫存紀錄 (用來判斷各店上架狀態)
    const { data: allInventory, error: invError } = await supabase
      .from('store_inventory')
      .select('*');

    if (invError) throw invError;

    // 3. 數據揉合：以總表為基礎，掛載「本店資料」與「他店狀態」
    const formatted = allProducts.map(p => {
      // 找出本店的庫存紀錄
      const myInv = allInventory.find(i => i.product_id === p.id && i.store_id === currentStore.id);
      
      // 找出這項商品在哪些分店有上架 (供右側面板顯示標籤)
      const availableStoreIds = allInventory
        .filter(i => i.product_id === p.id)
        .map(i => i.store_id);

      return {
        ...p,
        // 本店屬性
        stock: myInv ? myInv.stock : 0,
        price: myInv?.store_price || p.suggested_price || 0,
        is_custom_price: !!myInv?.store_price,
        is_in_current_store: !!myInv, // 關鍵：如果沒這筆紀錄，就是 false
        
        // 全域屬性
        available_in_stores: availableStoreIds
      };
    });

    setProducts(formatted);
  } catch (err) {
    console.error("抓取失敗:", err.message);
  } finally {
    setLoading(false);
  }
}

  // --- 關鍵保護：如果連分店資訊都還沒拿到，顯示全螢幕讀取 ---
  if (!currentStore && loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-100">
        <div className="text-4xl animate-spin mb-4">🌀</div>
        <div className="text-xl font-black text-gray-400 animate-pulse">
          系統初始化中，正在讀取分店資訊...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden text-gray-800">
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        currentStore={currentStore}
        stores={stores}
        setCurrentStore={setCurrentStore}
      />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="font-black text-blue-600 animate-pulse text-xl">
              {currentStore?.name}店 資料傳輸中...
            </div>
          </div>
        )}

        {/* 確保傳入 InventoryView 的 props 都是最新的 */}
        {activeTab === 'pos' && (
          <POSView 
            products={products} 
            fetchProducts={() => fetchProducts(currentStore?.id)} 
            currentStore={currentStore}
          />
        )}

        {activeTab === 'members' && (
          <MemberView currentStore={currentStore} />
        )}

        {activeTab === 'inventory' && (
          <InventoryView 
            products={products} 
            fetchProducts={() => fetchProducts(currentStore?.id)} 
            currentStore={currentStore}
            stores={stores} // 確保這裡有傳入 stores 供同步勾選使用
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView currentStore={currentStore} />
        )}

        {activeTab === 'settings' && (
          <SettingsView 
            stores={stores} 
            currentStore={currentStore} 
            setCurrentStore={setCurrentStore} 
          />
        )}
      </main>
    </div>
  )
}