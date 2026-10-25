'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  description?: string;
  images?: string[];
}

interface Order {
  id: number;
  created_at?: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  total_amount: number;
  status: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  created_at?: string;
}

export default function ProMaxAdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Core Data States
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // ✨ Har ek order ke liye alag independent unlock state (Record<number, boolean>)
  const [unlockedOrders, setUnlockedOrders] = useState<Record<number, boolean>>({});

  // UI & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  // Product Form States
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);

  // Dynamic Store Configuration States
  const [storeName, setStoreName] = useState('MY SHOP');
  const [brandLogoText, setBrandLogoText] = useState('MY SHOP PRO');
  const [deliveryFee, setDeliveryFee] = useState('40');
  const [taxPercentage, setTaxPercentage] = useState('18');
  const [isStoreLive, setIsStoreLive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isAdminLoggedIn');
    if (!isLoggedIn) {
      router.push('/admin/login');
      return;
    }
    fetchAllStoreData();
    loadStoreSettings();
  }, [router]);

  const showNotificationMsg = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  async function loadStoreSettings() {
    try {
      const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (data) {
        setStoreName(data.store_name || 'KIRANA');
        setBrandLogoText(data.store_name ? `${data.store_name} PRO` : 'MY SHOP PRO');
        if (data.delivery_fee !== undefined) setDeliveryFee(data.delivery_fee.toString());
        if (data.tax_percentage !== undefined) setTaxPercentage(data.tax_percentage.toString());
        if (data.is_store_live !== undefined) setIsStoreLive(data.is_store_live);
      }
    } catch (err) {
      console.log('Error loading settings:', err);
    }
  }

  async function fetchAllStoreData() {
    try {
      setLoading(true);
      const { data: catData } = await supabase.from('categories').select('*').order('id', { ascending: true });
      if (catData) setCategories(catData);

      const { data: prodData } = await supabase.from('products').select('*').order('id', { ascending: true });
      if (prodData) setProducts(prodData);

      const { data: ordData } = await supabase.from('orders').select('*').order('id', { ascending: false });
      if (ordData) {
        setOrders(ordData as Order[]);
      }

      const { data: custData } = await supabase.from('customers').select('*').order('id', { ascending: false });
      if (custData) setCustomers(custData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('store_settings').upsert({
      id: 1,
      store_name: storeName,
      delivery_fee: 0,
      tax_percentage: parseFloat(taxPercentage || '0'),
      is_store_live: isStoreLive,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      alert('Error updating settings: ' + error.message);
    } else {
      setBrandLogoText(`${storeName} PRO`);
      showNotificationMsg('Store settings saved successfully!');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    router.push('/admin/login');
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const updated = [...imageUrls];
    updated[index] = value;
    setImageUrls(updated);
  };

  const addImageField = () => setImageUrls([...imageUrls, '']);
  const removeImageField = (index: number) => {
    const updated = imageUrls.filter((_, i) => i !== index);
    setImageUrls(updated.length ? updated : ['']);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('categories').insert([{ name: newCategory.trim() }]);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      setNewCategory('');
      showNotificationMsg('Category added successfully!');
      fetchAllStoreData();
    }
    setLoading(false);
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
      showNotificationMsg('Category deleted.');
      fetchAllStoreData();
    }
  };

  const handleOpenAddForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdCategory(categories[0]?.name || '');
    setProdPrice('');
    setProdStock('');
    setProdDescription('');
    setImageUrls(['']);
    setShowProductForm(true);
  };

  const handleOpenEditForm = (prod: Product) => {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(prod.price.toString());
    setProdStock(prod.stock.toString());
    setProdDescription(prod.description || '');
    setImageUrls(prod.images && prod.images.length > 0 ? prod.images : ['']);
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice) return;

    setLoading(true);
    const filteredImages = imageUrls.filter((url) => url.trim() !== '');

    const productData = {
      name: prodName,
      category: prodCategory || (categories[0] ? categories[0].name : 'General'),
      price: parseFloat(prodPrice),
      stock: parseInt(prodStock || '0', 10),
      description: prodDescription,
      images: filteredImages,
    };

    if (editingProductId !== null) {
      const { error } = await supabase.from('products').update(productData).eq('id', editingProductId);
      if (error) alert('Error: ' + error.message);
      else {
        showNotificationMsg('Product updated successfully!');
        setShowProductForm(false);
        setEditingProductId(null);
        fetchAllStoreData();
      }
    } else {
      const { error } = await supabase.from('products').insert([productData]);
      if (error) alert('Error: ' + error.message);
      else {
        showNotificationMsg('New product added successfully!');
        setShowProductForm(false);
        fetchAllStoreData();
      }
    }
    setLoading(false);
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else {
      showNotificationMsg('Product deleted.');
      fetchAllStoreData();
    }
  };

  const handleOrderStatusChange = async (orderId: number, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (error) {
      alert('Error: ' + error.message);
    } else {
      showNotificationMsg(`Order #${orderId} status updated to ${newStatus}`);
      // Agar status badal kar Delivered ya Cancelled kar diya, toh wapas lock kar do sirf usi order ko
      if (newStatus === 'Delivered' || newStatus === 'Cancelled') {
        setUnlockedOrders((prev) => ({ ...prev, [orderId]: false }));
      }
      fetchAllStoreData();
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategoryFilter === 'All' || p.category === selectedCategoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter === 'All') return true;
      return o.status === orderStatusFilter;
    });
  }, [orders, orderStatusFilter]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === 'Delivered')
      .reduce((acc, curr) => acc + (curr.total_amount || 0), 0);
  }, [orders]);

  const lowStockProductsCount = useMemo(() => {
    return products.filter((p) => p.stock < 5).length;
  }, [products]);

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold animate-bounce border border-emerald-400/30">
          ✨ {notification}
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between ${
          isSidebarOpen ? 'w-64 p-6 opacity-100' : 'w-0 p-0 opacity-0 overflow-hidden'
        }`}
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping"></div>
            <h1 className="text-sm font-black tracking-widest text-white uppercase">{brandLogoText}</h1>
          </div>

          <div className="mb-6 px-3 py-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
            <p className="text-[10px] text-slate-400 font-medium">Logged in as:</p>
            <p className="text-xs font-bold text-orange-400 truncate">Super Admin 👑</p>
          </div>

          <nav className="space-y-1.5">
            {[
              { name: 'Dashboard', icon: '📊' },
              { name: 'Products', icon: '🛍️' },
              { name: 'Categories', icon: '🏷️' },
              { name: 'Orders', icon: '📦' },
              { name: 'Customers', icon: '👥' },
              { name: 'Store Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold transition-all flex items-center gap-3 ${
                  activeTab === tab.name
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xl shadow-orange-500/20 translate-x-1'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-[11px] px-2 text-slate-400">
            <span>Database:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">● Synced</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            🔒 Logout Admin
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow transition transform active:scale-95 flex items-center justify-center w-10 h-10 border border-slate-700"
              title="Toggle Sidebar"
            >
              <svg 
                className={`w-5 h-5 transition-transform duration-300 ${isSidebarOpen ? 'rotate-180' : 'rotate-0'}`} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div>
              <h2 className="text-xs font-medium text-slate-400">Admin Control Panel</h2>
              <h3 className="text-sm font-bold text-white tracking-wide">{activeTab}</h3>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a 
              href="/" 
              target="_blank" 
              className="text-xs bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 px-4 py-2 rounded-xl font-medium border border-slate-700 transition shadow-md flex items-center gap-1.5"
            >
              <span>View Customer Store</span>
              <span className="text-orange-400">↗</span>
            </a>
            <div className={`text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm ${isStoreLive ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
              <span className={`w-2 h-2 rounded-full ${isStoreLive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              {isStoreLive ? 'Store Live' : 'Store Offline'}
            </div>
          </div>
        </header>

        <div className="p-8 flex-1">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">{activeTab} Management</h2>
              <p className="text-xs text-slate-400 mt-1">Manage your enterprise e-commerce inventory, orders, customers and settings efficiently.</p>
            </div>
            <button 
              onClick={fetchAllStoreData}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl border border-slate-800 transition shadow flex items-center gap-2"
            >
              <span>🔄 Refresh Data</span>
            </button>
          </div>

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="grid grid-cols-4 gap-6">
                <div 
                  onClick={() => setActiveTab('Products')}
                  className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl text-lg">🛍️</span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-bold">View Inventory ↗</span>
                  </div>
                  <h3 className="text-xs text-slate-400 font-medium">Total Products</h3>
                  <p className="text-3xl font-black text-white mt-1">{products.length}</p>
                </div>

                <div 
                  onClick={() => { setOrderStatusFilter('All'); setActiveTab('Orders'); }}
                  className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-3 bg-orange-500/10 text-orange-400 rounded-xl text-lg">💰</span>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-bold">Delivered Orders ↗</span>
                  </div>
                  <h3 className="text-xs text-slate-400 font-medium">Total Revenue (Delivered Only)</h3>
                  <p className="text-3xl font-black text-emerald-400 mt-1">₹{totalRevenue}</p>
                </div>

                <div 
                  onClick={() => { setOrderStatusFilter('All'); setActiveTab('Orders'); }}
                  className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-lg">📦</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full font-bold">Track Orders ↗</span>
                  </div>
                  <h3 className="text-xs text-slate-400 font-medium">Total Orders</h3>
                  <p className="text-3xl font-black text-blue-400 mt-1">{orders.length}</p>
                </div>

                <div 
                  onClick={() => setActiveTab('Products')}
                  className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl cursor-pointer hover:border-orange-500/50 hover:bg-slate-800/50 transition transform hover:-translate-y-1"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="p-3 bg-purple-500/10 text-purple-400 rounded-xl text-lg">⚠️</span>
                    <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-1 rounded-full font-bold">Check Stock ↗</span>
                  </div>
                  <h3 className="text-xs text-slate-400 font-medium">Low Stock Warning (&lt;5)</h3>
                  <p className="text-3xl font-black text-amber-400 mt-1">{lowStockProductsCount}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">📦 Recent Orders Status Breakdown</h3>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-amber-400 font-bold">Verification Pending Orders</span>
                      <span className="bg-amber-500/10 text-amber-400 px-3 py-1 rounded-lg font-bold">
                        {orders.filter(o => o.status === 'Pending Verification').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-yellow-500 font-bold">Pending Orders</span>
                      <span className="bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-lg font-bold">
                        {orders.filter(o => o.status === 'Pending').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-blue-400 font-bold">Shipped Orders</span>
                      <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg font-bold">
                        {orders.filter(o => o.status === 'Shipped').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-emerald-400 font-bold">Delivered Orders</span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg font-bold">
                        {orders.filter(o => o.status === 'Delivered').length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-950 rounded-xl border border-slate-800">
                      <span className="text-red-400 font-bold">Cancelled Orders</span>
                      <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-lg font-bold">
                        {orders.filter(o => o.status === 'Cancelled').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                  <h3 className="text-sm font-bold text-white mb-4">⚡ Quick Store Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => { handleOpenAddForm(); setActiveTab('Products'); }}
                      className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-orange-400 transition text-left"
                    >
                      ➕ Add New Product
                    </button>
                    <button 
                      onClick={() => setActiveTab('Store Settings')}
                      className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 transition text-left"
                    >
                      ⚙️ Store Live / Offline
                    </button>
                    <button 
                      onClick={() => { setOrderStatusFilter('Pending Verification'); setActiveTab('Orders'); }}
                      className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 transition text-left"
                    >
                      ⏳ Verify New Orders
                    </button>
                    <button 
                      onClick={() => setActiveTab('Customers')}
                      className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-purple-400 transition text-left"
                    >
                      👥 View Customers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === 'Products' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-3 items-center flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white w-72 focus:outline-none focus:border-orange-500"
                  />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (showProductForm) setShowProductForm(false);
                    else handleOpenAddForm();
                  }}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-6 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-orange-500/20"
                >
                  {showProductForm ? 'Close Form' : '+ Add New Product'}
                </button>
              </div>

              {showProductForm && (
                <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl backdrop-blur-2xl space-y-4 shadow-2xl animate-fadeIn">
                  <h3 className="text-md font-bold text-white">
                    {editingProductId !== null ? '✏️ Edit Existing Product' : '➕ Add New Store Product'}
                  </h3>
                  <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">Product Name</label>
                      <input
                        type="text"
                        placeholder="Product Name"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-xs text-white focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">Category</label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        <option value="">-- Select Category --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">Price (₹)</label>
                      <input
                        type="number"
                        placeholder="Price"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-xs text-white focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">Stock Quantity</label>
                      <input
                        type="number"
                        placeholder="Stock"
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <label className="block text-xs font-semibold text-slate-300">Product Images URLs (Multiple):</label>
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="url"
                            placeholder={`Image URL #${idx + 1}`}
                            value={url}
                            onChange={(e) => handleImageUrlChange(idx, e.target.value)}
                            className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex-1 text-xs text-white focus:outline-none focus:border-orange-500"
                          />
                          {imageUrls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeImageField(idx)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2.5 rounded-xl text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addImageField}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2 rounded-xl border border-slate-700 transition"
                      >
                        + Add Another Image URL
                      </button>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 mb-1 font-semibold">Description</label>
                      <textarea
                        rows={3}
                        placeholder="Description..."
                        value={prodDescription}
                        onChange={(e) => setProdDescription(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div className="col-span-2 flex gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-xs transition shadow-md"
                      >
                        {loading ? 'Saving...' : editingProductId !== null ? 'Update Product' : 'Save Product'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProductForm(false)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-xl font-bold text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3 px-4">Image</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((prod) => (
                        <tr key={prod.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4">
                            {prod.images && prod.images[0] ? (
                              <div className="w-10 h-10 rounded-xl border border-slate-700 overflow-hidden shadow">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={prod.images[0]}
                                  alt={prod.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                                No Img
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-white">{prod.name}</td>
                          <td className="py-3 px-4 text-xs text-orange-400 font-medium">{prod.category}</td>
                          <td className="py-3 px-4 text-xs text-slate-200 font-semibold">₹{prod.price}</td>
                          <td className="py-3 px-4 text-xs">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${prod.stock < 5 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                              {prod.stock} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleOpenEditForm(prod)}
                              className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3.5 py-1.5 rounded-lg text-xs transition font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3.5 py-1.5 rounded-lg text-xs transition font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CATEGORIES */}
          {activeTab === 'Categories' && (
            <div className="space-y-6 animate-fadeIn max-w-4xl">
              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                <h3 className="text-md font-bold text-white mb-4">Add New Category</h3>
                <form onSubmit={handleAddCategory} className="flex gap-4">
                  <input
                    type="text"
                    placeholder="Category Name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl text-xs font-bold transition shadow-md"
                  >
                    {loading ? 'Adding...' : '+ Add Category'}
                  </button>
                </form>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                <h3 className="text-md font-bold text-white mb-4">Existing Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4">No categories created yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-800/80">
                    {categories.map((cat) => (
                      <li key={cat.id} className="py-3.5 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-200 uppercase">{cat.name}</span>
                        <button
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-xl text-xs transition font-semibold"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS */}
          {activeTab === 'Orders' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl flex justify-between items-center">
                <h3 className="text-md font-bold text-white">Customer Orders Tracking</h3>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="All">All Orders</option>
                  <option value="Pending Verification">Pending Verification ⏳</option>
                  <option value="Pending">Pending 🟡</option>
                  <option value="Shipped">Shipped 🔵</option>
                  <option value="Delivered">Delivered 🟢</option>
                  <option value="Cancelled">Cancelled 🔴</option>
                </select>
              </div>

              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Address</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status & Direct WhatsApp Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500 text-xs">
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((ord) => {
                        let statusMsg = `Hello ${ord.customer_name}, Regarding your Order #${ord.id} at ${storeName}...`;
                        if (ord.status === 'Pending') {
                          statusMsg = `Hello ${ord.customer_name}, आपका Order #${ord.id} (${storeName}) कन्फर्म हो गया है! धन्यवाद।`;
                        } else if (ord.status === 'Shipped') {
                          statusMsg = `Hello ${ord.customer_name}, खुशखबरी! आपका Order #${ord.id} (${storeName}) शिप (Dispatch) कर दिया गया है। `;
                        } else if (ord.status === 'Delivered') {
                          statusMsg = `Hello ${ord.customer_name}, आपका Order #${ord.id} (${storeName}) सफलतापूर्वक डिलीवर हो चुका है। खरीदारी के लिए धन्यवाद! `;
                        } else if (ord.status === 'Cancelled') {
                          statusMsg = `Hello ${ord.customer_name}, किसी कारणवश आपका Order #${ord.id} (${storeName}) रद्द कर दिया गया है। `;
                        }

                        // ✨ Har order ka independent lock check
                        const isLocked = (ord.status === 'Delivered' || ord.status === 'Cancelled') && !unlockedOrders[ord.id];

                        return (
                          <tr key={ord.id} className="border-b border-slate-800/60 text-xs hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4 font-black text-orange-400">#{ord.id}</td>
                            <td className="py-3 px-4 text-white font-bold">{ord.customer_name}</td>
                            <td className="py-3 px-4 text-slate-300">{ord.customer_phone}</td>
                            <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{ord.address}</td>
                            <td className="py-3 px-4 font-extrabold text-emerald-400">₹{ord.total_amount}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 flex-wrap">
                                <select
                                  value={ord.status}
                                  disabled={isLocked}
                                  onChange={(e) => handleOrderStatusChange(ord.id, e.target.value)}
                                  className={`bg-slate-950 border border-slate-800 text-xs p-2 rounded-xl font-semibold ${
                                    isLocked ? 'text-slate-500 cursor-not-allowed opacity-60' : 'text-slate-200'
                                  }`}
                                >
                                  <option value="Pending Verification">Pending Verification ⏳</option>
                                  <option value="Pending">Pending 🟡</option>
                                  <option value="Shipped">Shipped 🔵</option>
                                  <option value="Delivered">Delivered 🟢</option>
                                  <option value="Cancelled">Cancelled 🔴</option>
                                </select>

                                {isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const confirmUnlock = window.confirm(
                                        `⚠️ क्या आप सच में ${ord.status} हो चुके ऑर्डर #${ord.id} का स्टेटस बदलना चाहते हैं?`
                                      );
                                      if (confirmUnlock) {
                                        // ✨ Sirf usi particular order ko unlock karega bina baakiyon ko chhede
                                        setUnlockedOrders((prev) => ({ ...prev, [ord.id]: true }));
                                      }
                                    }}
                                    className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition shadow-sm"
                                  >
                                    Edit
                                  </button>
                                )}

                                <a
                                  href={`https://wa.me/91${ord.customer_phone?.replace(/\D/g, '')}?text=${encodeURIComponent(statusMsg)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                                  title="Send WhatsApp status update message"
                                >
                                  <span>📲</span>
                                  <span>Send {ord.status} Msg</span>
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === 'Customers' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">Registered Customers ({customers.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs">
                        <th className="py-3 px-4">Customer ID</th>
                        <th className="py-3 px-4">Full Name</th>
                        <th className="py-3 px-4">Mobile Number</th>
                        <th className="py-3 px-4">Delivery Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-slate-500 text-xs">
                            No customers found.
                          </td>
                        </tr>
                      ) : (
                        customers.map((c) => (
                          <tr key={c.id} className="border-b border-slate-800/60 text-xs hover:bg-slate-800/30 transition">
                            <td className="py-3 px-4 text-slate-400 font-semibold">CUST-{c.id}</td>
                            <td className="py-3 px-4 text-white font-bold">{c.name}</td>
                            <td className="py-3 px-4 text-orange-400 font-bold">{c.phone}</td>
                            <td className="py-3 px-4 text-slate-300">{c.address || 'N/A'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: STORE SETTINGS */}
          {activeTab === 'Store Settings' && (
            <div className="space-y-6 animate-fadeIn">
              <form onSubmit={handleSaveStoreSettings} className="bg-slate-900/70 border border-slate-800/80 p-8 rounded-2xl backdrop-blur-xl space-y-6 max-w-3xl shadow-xl">
                <h3 className="text-lg font-black text-white">Store Configuration</h3>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 font-bold">Store Brand Name</label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs text-white font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-bold">Delivery Fee (₹)</label>
                      <input
                        type="number"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs text-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1.5 font-bold">Tax Rate (%)</label>
                      <input
                        type="number"
                        value={taxPercentage}
                        onChange={(e) => setTaxPercentage(e.target.value)}
                        className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs text-white font-semibold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-white">Live Storefront Switch</h4>
                      <p className="text-[10px] text-slate-400">Toggle whether customers can place orders</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStoreLive(!isStoreLive);
                        showNotificationMsg(isStoreLive ? 'Store turned Offline!' : 'Store turned Live Online! 🟢');
                      }}
                      className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow ${
                        isStoreLive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      {isStoreLive ? 'Store Live 🟢' : 'Store Offline 🔴'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white py-3.5 rounded-xl text-xs font-bold transition shadow-lg shadow-orange-500/20"
                  >
                    {loading ? 'Saving Settings...' : 'Save Store Configuration 💾'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}