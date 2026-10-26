'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

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

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase URL या public key नहीं मिली। अपनी .env.local फ़ाइल जाँचें।'
    );
  }

  return createBrowserClient(url, key);
}

export default function ProMaxAdminDashboard() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [unlockedOrders, setUnlockedOrders] = useState<Record<number, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');

  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);

  const [storeName, setStoreName] = useState('MY SHOP');
  const [brandLogoText, setBrandLogoText] = useState('MY SHOP PRO');
  const [deliveryFee, setDeliveryFee] = useState('40');
  const [taxPercentage, setTaxPercentage] = useState('18');
  const [isStoreLive, setIsStoreLive] = useState(true);

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  function showNotificationMsg(msg: string) {
    setNotification(msg);
    window.setTimeout(() => setNotification(null), 3000);
  }

  const loadStoreSettings = useCallback(async function loadStoreSettings() {
    try {
      const supabase = getSupabaseClient();

      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading store settings:', error.message);
        return;
      }

      if (data) {
        setStoreName(data.store_name || 'MY SHOP');
        setBrandLogoText(
          data.store_name ? `${data.store_name} PRO` : 'MY SHOP PRO'
        );

        if (data.delivery_fee !== undefined && data.delivery_fee !== null) {
          setDeliveryFee(String(data.delivery_fee));
        }

        if (data.tax_percentage !== undefined && data.tax_percentage !== null) {
          setTaxPercentage(String(data.tax_percentage));
        }

        if (data.is_store_live !== undefined && data.is_store_live !== null) {
          setIsStoreLive(Boolean(data.is_store_live));
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }, []);

  const fetchAllStoreData = useCallback(async function fetchAllStoreData() {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const [catResult, prodResult, orderResult, customerResult] =
        await Promise.all([
          supabase.from('categories').select('*').order('id', { ascending: true }),
          supabase.from('products').select('*').order('id', { ascending: true }),
          supabase.from('orders').select('*').order('id', { ascending: false }),
          supabase.from('customers').select('*').order('id', { ascending: false }),
        ]);

      if (catResult.error) {
        console.error('Categories:', catResult.error.message);
      } else {
        setCategories((catResult.data || []) as Category[]);
      }

      if (prodResult.error) {
        console.error('Products:', prodResult.error.message);
      } else {
        setProducts((prodResult.data || []) as Product[]);
      }

      if (orderResult.error) {
        console.error('Orders:', orderResult.error.message);
      } else {
        setOrders((orderResult.data || []) as Order[]);
      }

      if (customerResult.error) {
        console.error('Customers:', customerResult.error.message);
      } else {
        setCustomers((customerResult.data || []) as Customer[]);
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
      showNotificationMsg('डेटा लोड नहीं हुआ। Console और Supabase जाँचें।');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkSessionAndLoad() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !data.user) {
          router.replace('/admin/login');
          router.refresh();
          return;
        }

        setAuthChecking(false);

        await Promise.all([
          fetchAllStoreData(),
          loadStoreSettings(),
        ]);
      } catch (error) {
        console.error('Admin session check failed:', error);

        if (!cancelled) {
          router.replace('/admin/login');
          router.refresh();
        }
      }
    }

    void checkSessionAndLoad();

    return () => {
      cancelled = true;
    };
  }, [router, fetchAllStoreData, loadStoreSettings]);

  async function handleSaveStoreSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const fee = Number(deliveryFee);
    const tax = Number(taxPercentage);

    if (!storeName.trim() || !Number.isFinite(fee) || fee < 0 ||
        !Number.isFinite(tax) || tax < 0) {
      alert('Store name, delivery fee और tax की सही value भरें।');
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const { error } = await supabase.from('store_settings').upsert({
        id: 1,
        store_name: storeName.trim(),
        delivery_fee: fee,
        tax_percentage: tax,
        is_store_live: isStoreLive,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        alert('Settings save नहीं हुईं: ' + error.message);
        return;
      }

      setStoreName(storeName.trim());
      setBrandLogoText(`${storeName.trim()} PRO`);
      showNotificationMsg('Store settings successfully saved!');
    } catch (error) {
      console.error(error);
      alert('Settings save करते समय समस्या हुई।');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error.message);
        alert('Logout नहीं हो पाया: ' + error.message);
        return;
      }

      router.replace('/admin/login');
      router.refresh();
    } catch (error) {
      console.error('Logout failed:', error);
      router.replace('/admin/login');
      router.refresh();
    }
  }

  function handleImageUrlChange(index: number, value: string) {
    setImageUrls((prev) =>
      prev.map((url, i) => (i === index ? value : url))
    );
  }

  function addImageField() {
    setImageUrls((prev) => [...prev, '']);
  }

  function removeImageField(index: number) {
    setImageUrls((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length ? updated : [''];
    });
  }

  async function handleAddCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newCategory.trim()) return;

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategory.trim() }]);

      if (error) {
        alert('Category add नहीं हुई: ' + error.message);
        return;
      }

      setNewCategory('');
      showNotificationMsg('Category added successfully!');
      await fetchAllStoreData();
    } catch (error) {
      console.error(error);
      alert('Category add करते समय समस्या हुई।');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('categories').delete().eq('id', id);

      if (error) {
        alert('Category delete नहीं हुई: ' + error.message);
        return;
      }

      showNotificationMsg('Category deleted.');
      await fetchAllStoreData();
    } catch (error) {
      console.error(error);
      alert('Category delete करते समय समस्या हुई।');
    }
  }

  function handleOpenAddForm() {
    setEditingProductId(null);
    setProdName('');
    setProdCategory(categories[0]?.name || '');
    setProdPrice('');
    setProdStock('');
    setProdDescription('');
    setImageUrls(['']);
    setShowProductForm(true);
  }

  function handleOpenEditForm(prod: Product) {
    setEditingProductId(prod.id);
    setProdName(prod.name);
    setProdCategory(prod.category);
    setProdPrice(String(prod.price));
    setProdStock(String(prod.stock));
    setProdDescription(prod.description || '');
    setImageUrls(prod.images?.length ? prod.images : ['']);
    setShowProductForm(true);
  }

  async function handleSaveProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const price = Number(prodPrice);
    const stock = Number(prodStock || '0');

    if (!prodName.trim() || prodPrice.trim() === '' ||
        !Number.isFinite(price) || price < 0 ||
        !Number.isInteger(stock) || stock < 0) {
      alert('Product name, price और stock सही भरें।');
      return;
    }

    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      const filteredImages = imageUrls
        .map((url) => url.trim())
        .filter(Boolean);

      const productData = {
        name: prodName.trim(),
        category: prodCategory || categories[0]?.name || 'General',
        price,
        stock,
        description: prodDescription.trim(),
        images: filteredImages,
      };

      if (editingProductId !== null) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProductId);

        if (error) {
          alert('Product update नहीं हुआ: ' + error.message);
          return;
        }

        showNotificationMsg('Product updated successfully!');
      } else {
        const { error } = await supabase
          .from('products')
          .insert([productData]);

        if (error) {
          alert('Product add नहीं हुआ: ' + error.message);
          return;
        }

        showNotificationMsg('New product added successfully!');
      }

      setShowProductForm(false);
      setEditingProductId(null);
      await fetchAllStoreData();
    } catch (error) {
      console.error(error);
      alert('Product save करते समय समस्या हुई।');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(id: number) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('products').delete().eq('id', id);

      if (error) {
        alert('Product delete नहीं हुआ: ' + error.message);
        return;
      }

      showNotificationMsg('Product deleted.');
      await fetchAllStoreData();
    } catch (error) {
      console.error(error);
      alert('Product delete करते समय समस्या हुई।');
    }
  }

  async function handleOrderStatusChange(orderId: number, newStatus: string) {
    try {
      const supabase = getSupabaseClient();

      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) {
        alert('Order status update नहीं हुआ: ' + error.message);
        return;
      }

      showNotificationMsg(`Order #${orderId} status updated to ${newStatus}`);

      if (newStatus === 'Delivered' || newStatus === 'Cancelled') {
        setUnlockedOrders((prev) => ({ ...prev, [orderId]: false }));
      }

      await fetchAllStoreData();
    } catch (error) {
      console.error(error);
      alert('Order status बदलते समय समस्या हुई।');
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = p.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      const matchesCat =
        selectedCategoryFilter === 'All' ||
        p.category === selectedCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) =>
      orderStatusFilter === 'All' || o.status === orderStatusFilter
    );
  }, [orders, orderStatusFilter]);

  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === 'Delivered')
      .reduce((total, order) => total + (Number(order.total_amount) || 0), 0);
  }, [orders]);

  const lowStockProductsCount = useMemo(
    () => products.filter((p) => Number(p.stock) < 5).length,
    [products]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-sm text-slate-300">Checking admin session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden font-sans">
      {notification && (
        <div className="fixed top-6 right-6 z-50 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold border border-emerald-400/30">
          ✨ {notification}
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col justify-between ${
          isSidebarOpen
            ? 'w-64 p-6 opacity-100'
            : 'w-0 p-0 opacity-0 overflow-hidden'
        }`}
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 animate-ping" />
            <h1 className="text-sm font-black tracking-widest text-white uppercase whitespace-nowrap">
              {brandLogoText}
            </h1>
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
            <span className="text-emerald-400 font-bold">● Connected session</span>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            🔒 Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto min-w-0">
        <header className="bg-slate-900/60 border-b border-slate-800 px-6 py-4 flex items-center justify-between gap-4 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white shadow transition w-10 h-10 border border-slate-700"
              title="Toggle Sidebar"
            >
              <svg
                className={`w-5 h-5 transition-transform duration-300 ${
                  isSidebarOpen ? 'rotate-180' : ''
                }`}
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

          <div className="flex items-center gap-4 flex-wrap justify-end">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 px-4 py-2 rounded-xl font-medium border border-slate-700 transition shadow-md"
            >
              View Customer Store ↗
            </a>

            <div
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 ${
                isStoreLive
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-red-400 bg-red-500/10 border border-red-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isStoreLive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              {isStoreLive ? 'Store Live' : 'Store Offline'}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          <div className="flex justify-between items-center mb-8 gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {activeTab} Management
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage inventory, orders, customers and store settings.
              </p>
            </div>

            <button
              onClick={() => {
                void fetchAllStoreData();
                void loadStoreSettings();
              }}
              disabled={loading}
              className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-xl border border-slate-800 transition shadow"
            >
              {loading ? '⏳ Loading...' : '🔄 Refresh Data'}
            </button>
          </div>

          {/* DASHBOARD */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[
                  {
                    title: 'Total Products',
                    value: products.length,
                    icon: '🛍️',
                    color: 'blue',
                    click: () => setActiveTab('Products'),
                  },
                  {
                    title: 'Delivered Revenue',
                    value: `₹${totalRevenue.toLocaleString('en-IN')}`,
                    icon: '💰',
                    color: 'emerald',
                    click: () => {
                      setOrderStatusFilter('Delivered');
                      setActiveTab('Orders');
                    },
                  },
                  {
                    title: 'Total Orders',
                    value: orders.length,
                    icon: '📦',
                    color: 'orange',
                    click: () => {
                      setOrderStatusFilter('All');
                      setActiveTab('Orders');
                    },
                  },
                  {
                    title: 'Low Stock (<5)',
                    value: lowStockProductsCount,
                    icon: '⚠️',
                    color: 'purple',
                    click: () => setActiveTab('Products'),
                  },
                ].map((card) => (
                  <button
                    key={card.title}
                    onClick={card.click}
                    className="text-left bg-slate-900/70 border border-slate-800/80 p-6 rounded-2xl shadow-xl hover:border-orange-500/50 transition"
                  >
                    <span className="text-2xl">{card.icon}</span>
                    <h3 className="text-xs text-slate-400 font-medium mt-4">{card.title}</h3>
                    <p className="text-3xl font-black text-white mt-1">{card.value}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-sm font-bold mb-4">📦 Order Status Breakdown</h3>
                  <div className="space-y-3 text-xs">
                    {[
                      ['Pending Verification', 'text-amber-400'],
                      ['Pending', 'text-yellow-400'],
                      ['Shipped', 'text-blue-400'],
                      ['Delivered', 'text-emerald-400'],
                      ['Cancelled', 'text-red-400'],
                    ].map(([status, color]) => (
                      <div key={status} className="flex justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className={`font-bold ${color}`}>{status} Orders</span>
                        <span className={`font-bold ${color}`}>
                          {orders.filter((o) => o.status === status).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
                  <h3 className="text-sm font-bold mb-4">⚡ Quick Store Shortcuts</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={() => { handleOpenAddForm(); setActiveTab('Products'); }} className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-orange-400 text-left">
                      ➕ Add New Product
                    </button>
                    <button onClick={() => setActiveTab('Store Settings')} className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-emerald-400 text-left">
                      ⚙️ Store Live / Offline
                    </button>
                    <button onClick={() => { setOrderStatusFilter('Pending Verification'); setActiveTab('Orders'); }} className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-amber-400 text-left">
                      ⏳ Verify New Orders
                    </button>
                    <button onClick={() => setActiveTab('Customers')} className="p-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-purple-400 text-left">
                      👥 View Customers
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {activeTab === 'Products' && (
            <div className="space-y-6">
              <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl flex justify-between items-center gap-4 flex-wrap">
                <div className="flex gap-3 items-center flex-wrap flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs w-full sm:w-72"
                  />
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs"
                  >
                    <option value="All">All Categories</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => showProductForm ? setShowProductForm(false) : handleOpenAddForm()}
                  className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl text-xs font-bold"
                >
                  {showProductForm ? 'Close Form' : '+ Add New Product'}
                </button>
              </section>

              {showProductForm && (
                <section className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-4 shadow-2xl">
                  <h3 className="font-bold">
                    {editingProductId !== null ? '✏️ Edit Existing Product' : '➕ Add New Store Product'}
                  </h3>

                  <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="text-xs text-slate-400">
                      Product Name
                      <input required value={prodName} onChange={(e) => setProdName(e.target.value)} className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-white" />
                    </label>

                    <label className="text-xs text-slate-400">
                      Category
                      <select value={prodCategory} onChange={(e) => setProdCategory(e.target.value)} className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-white">
                        <option value="">-- Select Category --</option>
                        {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      </select>
                    </label>

                    <label className="text-xs text-slate-400">
                      Price (₹)
                      <input required type="number" min="0" step="any" value={prodPrice} onChange={(e) => setProdPrice(e.target.value)} className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-white" />
                    </label>

                    <label className="text-xs text-slate-400">
                      Stock Quantity
                      <input type="number" min="0" step="1" value={prodStock} onChange={(e) => setProdStock(e.target.value)} className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-white" />
                    </label>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs text-slate-300 font-semibold">Product Images URLs (Multiple)</label>
                      {imageUrls.map((url, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="url" placeholder={`Image URL #${idx + 1}`} value={url} onChange={(e) => handleImageUrlChange(idx, e.target.value)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl flex-1 text-xs text-white" />
                          {imageUrls.length > 1 && (
                            <button type="button" onClick={() => removeImageField(idx)} className="text-red-400 border border-red-500/30 px-3 rounded-xl text-xs">Remove</button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={addImageField} className="text-xs bg-slate-800 px-4 py-2 rounded-xl">+ Add Another Image URL</button>
                    </div>

                    <label className="md:col-span-2 text-xs text-slate-400">
                      Description
                      <textarea rows={3} value={prodDescription} onChange={(e) => setProdDescription(e.target.value)} className="mt-1 bg-slate-950 border border-slate-800 p-3 rounded-xl w-full text-white" />
                    </label>

                    <div className="md:col-span-2 flex gap-3">
                      <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-6 py-3 rounded-xl font-bold text-xs">
                        {loading ? 'Saving...' : editingProductId !== null ? 'Update Product' : 'Save Product'}
                      </button>
                      <button type="button" onClick={() => setShowProductForm(false)} className="bg-slate-800 px-5 py-3 rounded-xl text-xs">
                        Cancel
                      </button>
                    </div>
                  </form>
                </section>
              )}

              <section className="bg-slate-900/70 border border-slate-800 p-4 md:p-6 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse min-w-[650px]">
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
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500 text-xs">No products found.</td></tr>
                    ) : filteredProducts.map((prod) => (
                      <tr key={prod.id} className="border-b border-slate-800/60 text-xs hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          {prod.images?.[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={prod.images[0]} alt={prod.name} className="w-10 h-10 rounded-xl object-cover" />
                          ) : <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-[10px]">No Img</div>}
                        </td>
                        <td className="py-3 px-4 font-bold">{prod.name}</td>
                        <td className="py-3 px-4 text-orange-400">{prod.category}</td>
                        <td className="py-3 px-4">₹{prod.price}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] ${prod.stock < 5 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{prod.stock} units</span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button onClick={() => handleOpenEditForm(prod)} className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg">Edit</button>
                          <button onClick={() => void handleDeleteProduct(prod.id)} className="bg-red-500/10 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* CATEGORIES */}
          {activeTab === 'Categories' && (
            <div className="space-y-6 max-w-4xl">
              <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h3 className="font-bold mb-4">Add New Category</h3>
                <form onSubmit={handleAddCategory} className="flex gap-4 flex-wrap">
                  <input required value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Category Name" className="flex-1 min-w-[180px] bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs" />
                  <button disabled={loading} type="submit" className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-3 rounded-xl text-xs font-bold disabled:opacity-50">
                    {loading ? 'Adding...' : '+ Add Category'}
                  </button>
                </form>
              </section>

              <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl">
                <h3 className="font-bold mb-4">Existing Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-slate-500 text-xs py-4">No categories created yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-800/80">
                    {categories.map((cat) => (
                      <li key={cat.id} className="py-3.5 flex justify-between items-center gap-4">
                        <span className="text-xs font-bold text-slate-200 uppercase">{cat.name}</span>
                        <button onClick={() => void handleDeleteCategory(cat.id)} className="bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-xl text-xs">Delete</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          {/* ORDERS */}
          {activeTab === 'Orders' && (
            <div className="space-y-6">
              <section className="bg-slate-900/70 border border-slate-800 p-6 rounded-2xl shadow-xl flex justify-between items-center gap-4 flex-wrap">
                <h3 className="font-bold">Customer Orders Tracking</h3>
                <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs">
                  <option value="All">All Orders</option>
                  <option value="Pending Verification">Pending Verification ⏳</option>
                  <option value="Pending">Pending 🟡</option>
                  <option value="Shipped">Shipped 🔵</option>
                  <option value="Delivered">Delivered 🟢</option>
                  <option value="Cancelled">Cancelled 🔴</option>
                </select>
              </section>

              <section className="bg-slate-900/70 border border-slate-800 p-4 md:p-6 rounded-2xl overflow-x-auto shadow-xl">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-xs">
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Customer Name</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Address</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status & WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr><td colSpan={6} className="py-12 text-center text-slate-500 text-xs">No orders found.</td></tr>
                    ) : filteredOrders.map((ord) => {
                      let statusMsg = `Hello ${ord.customer_name}, Regarding your Order #${ord.id} at ${storeName}...`;

                      if (ord.status === 'Pending') {
                        statusMsg = `Hello ${ord.customer_name}, आपका Order #${ord.id} (${storeName}) कन्फर्म हो गया है! धन्यवाद।`;
                      } else if (ord.status === 'Shipped') {
                        statusMsg = `Hello ${ord.customer_name}, खुशखबरी!! आपका Order #${ord.id} (${storeName}) शिप (Dispatch) कर दिया गया है।`;
                      } else if (ord.status === 'Delivered') {
                        statusMsg = `Hello ${ord.customer_name}, आपका Order #${ord.id} (${storeName}) सफलतापूर्वक डिलीवर हो चुका है। खरीदारी के लिए धन्यवाद!`;
                      } else if (ord.status === 'Cancelled') {
                        statusMsg = `Hello ${ord.customer_name}, किसी कारणवश आपका Order #${ord.id} (${storeName}) रद्द कर दिया गया है।`;
                      }

                      const isLocked =
                        (ord.status === 'Delivered' || ord.status === 'Cancelled') &&
                        !unlockedOrders[ord.id];

                      const phone = (ord.customer_phone || '').replace(/\D/g, '');
                      const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;

                      return (
                        <tr key={ord.id} className="border-b border-slate-800/60 text-xs hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-black text-orange-400">#{ord.id}</td>
                          <td className="py-3 px-4 font-bold">{ord.customer_name}</td>
                          <td className="py-3 px-4">{ord.customer_phone}</td>
                          <td className="py-3 px-4 text-slate-400 max-w-xs truncate">{ord.address}</td>
                          <td className="py-3 px-4 font-extrabold text-emerald-400">₹{ord.total_amount}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <select
                                value={ord.status}
                                disabled={isLocked}
                                onChange={(e) => void handleOrderStatusChange(ord.id, e.target.value)}
                                className={`bg-slate-950 border border-slate-800 text-xs p-2 rounded-xl font-semibold ${isLocked ? 'text-slate-500 cursor-not-allowed opacity-60' : 'text-slate-200'}`}
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
                                    if (window.confirm(`⚠️ क्या आप सच में ${ord.status} हो चुके ऑर्डर #${ord.id} का स्टेटस बदलना चाहते हैं?`)) {
                                      setUnlockedOrders((prev) => ({ ...prev, [ord.id]: true }));
                                    }
                                  }}
                                  className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                                >
                                  Edit
                                </button>
                              )}

                              <a
                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(statusMsg)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3.5 py-2 rounded-xl text-xs font-bold"
                              >
                                📲 Send {ord.status} Msg
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            </div>
          )}

          {/* CUSTOMERS */}
          {activeTab === 'Customers' && (
            <section className="bg-slate-900/70 border border-slate-800 p-4 md:p-6 rounded-2xl shadow-xl">
              <h3 className="text-lg font-bold mb-4">Registered Customers ({customers.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
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
                      <tr><td colSpan={4} className="py-12 text-center text-slate-500 text-xs">No customers found.</td></tr>
                    ) : customers.map((customer) => (
                      <tr key={customer.id} className="border-b border-slate-800/60 text-xs hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 font-semibold">CUST-{customer.id}</td>
                        <td className="py-3 px-4 font-bold">{customer.name}</td>
                        <td className="py-3 px-4 text-orange-400 font-bold">{customer.phone}</td>
                        <td className="py-3 px-4 text-slate-300">{customer.address || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* STORE SETTINGS */}
          {activeTab === 'Store Settings' && (
            <form onSubmit={handleSaveStoreSettings} className="bg-slate-900/70 border border-slate-800 p-6 md:p-8 rounded-2xl space-y-6 max-w-3xl shadow-xl">
              <h3 className="text-lg font-black">Store Configuration</h3>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-bold">Store Brand Name</label>
                <input
                  type="text"
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-bold">Delivery Fee (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 font-bold">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl w-full text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <div>
                  <h4 className="text-xs font-bold">Live Storefront Switch</h4>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Toggle whether customers can place orders
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsStoreLive((prev) => {
                      const next = !prev;
                      showNotificationMsg(next ? 'Store turned Live Online! 🟢' : 'Store turned Offline!');
                      return next;
                    });
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                    isStoreLive ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isStoreLive ? 'Store Live 🟢' : 'Store Offline 🔴'}
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                Live/Offline और बाकी settings को database में सेव करने के लिए नीचे Save दबाएँ।
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 py-3.5 rounded-xl text-xs font-bold shadow-lg"
              >
                {loading ? 'Saving Settings...' : 'Save Store Configuration 💾'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}