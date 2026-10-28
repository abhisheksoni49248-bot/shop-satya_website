'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type TouchEvent,
  type PointerEvent,
} from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

interface Product {
  id: number;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  description?: string | null;
  images?: string[] | null;
}

interface CartItem extends Product {
  quantity: number;
}

interface OrderItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  address: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const STORE_WHATSAPP_NUMBER = '9098236826';
const DEFAULT_STORE_NAME = 'MY STORE';
const DEFAULT_DELIVERY_FEE = 0;
const UPI_ID = '9098236826@ibl';

function makeSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase configuration missing.');
    return null;
  }

  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Supabase initialization failed:', error);
    return null;
  }
}

const supabase = makeSupabaseClient();

function formatRupees(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default function CustomerStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'store' | 'myOrders'>('store');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const [houseNo, setHouseNo] = useState('');
  const [village, setVillage] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [landmark, setLandmark] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'UPI'>('COD');
  const [transactionId, setTransactionId] = useState('');
  const [isCodBlocked, setIsCodBlocked] = useState(false);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);

  const [storeName, setStoreName] = useState(DEFAULT_STORE_NAME);
  const [deliveryFee, setDeliveryFee] = useState(DEFAULT_DELIVERY_FEE);
  const [isStoreLive, setIsStoreLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [storeError, setStoreError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showQrFullScreen, setShowQrFullScreen] = useState(false);

  // नई प्रोडक्ट गैलरी की states
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  const galleryRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinchStartRef = useRef<number | null>(null);
  const zoomStartRef = useRef(1);
  const lastTapRef = useRef(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const galleryImages = useMemo(() => {
    if (!galleryProduct) return [];

    return Array.from(
      new Set(
        (galleryProduct.images ?? []).filter(
          (src): src is string =>
            typeof src === 'string' && src.trim().length > 0
        )
      )
    );
  }, [galleryProduct]);

  const openGallery = (product: Product, index = 0) => {
    const images = Array.from(
      new Set(
        (product.images ?? []).filter(
          (src): src is string =>
            typeof src === 'string' && src.trim().length > 0
        )
      )
    );

    if (images.length === 0) return;

    setGalleryProduct(product);
    setGalleryIndex(Math.max(0, Math.min(index, images.length - 1)));
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const closeGallery = useCallback(() => {
    setGalleryProduct(null);
    setGalleryIndex(0);
    setZoom(1);
    setImagePosition({ x: 0, y: 0 });

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
  }, []);

  const changeGalleryImage = useCallback(
    (direction: number) => {
      if (galleryImages.length <= 1) return;

      setGalleryIndex((current) => {
        return (
          (current + direction + galleryImages.length) %
          galleryImages.length
        );
      });

      setZoom(1);
      setImagePosition({ x: 0, y: 0 });
    },
    [galleryImages.length]
  );

  const toggleZoom = () => {
    setZoom((current) => {
      if (current > 1) {
        setImagePosition({ x: 0, y: 0 });
        return 1;
      }

      return 2;
    });
  };

  const handleGalleryDoubleClick = () => {
    toggleZoom();
  };

  const handleGalleryTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1) {
      touchStartRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };

      const now = Date.now();

      if (now - lastTapRef.current < 300) {
        toggleZoom();
      }

      lastTapRef.current = now;
    } else if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;

      pinchStartRef.current = Math.hypot(dx, dy);
      zoomStartRef.current = zoom;
      touchStartRef.current = null;
    }
  };

  const handleGalleryTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchStartRef.current !== null) {
      event.preventDefault();

      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const distance = Math.hypot(dx, dy);
      const ratio = distance / Math.max(pinchStartRef.current, 1);

      setZoom(
        Math.max(1, Math.min(4, zoomStartRef.current * ratio))
      );
    }
  };

  const handleGalleryTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    pinchStartRef.current = null;

    if (!touchStartRef.current || zoom > 1) {
      touchStartRef.current = null;
      return;
    }

    const changedTouch = event.changedTouches[0];
    if (!changedTouch) return;

    const deltaX = changedTouch.clientX - touchStartRef.current.x;
    const deltaY = changedTouch.clientY - touchStartRef.current.y;

    if (
      Math.abs(deltaX) > 55 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      changeGalleryImage(deltaX < 0 ? 1 : -1);
    }

    touchStartRef.current = null;
  };

  const handleImagePointerDown = (event: PointerEvent<HTMLImageElement>) => {
    if (zoom <= 1) return;

    pointerStartRef.current = {
      x: event.clientX - imagePosition.x,
      y: event.clientY - imagePosition.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleImagePointerMove = (event: PointerEvent<HTMLImageElement>) => {
    if (!pointerStartRef.current || zoom <= 1) return;

    setImagePosition({
      x: event.clientX - pointerStartRef.current.x,
      y: event.clientY - pointerStartRef.current.y,
    });
  };

  const handleImagePointerUp = () => {
    pointerStartRef.current = null;
  };

  const toggleBrowserFullscreen = async () => {
    try {
      if (!document.fullscreenElement && galleryRef.current) {
        await galleryRef.current.requestFullscreen();
        setIsBrowserFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsBrowserFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen is not available:', error);
    }
  };

  // गैलरी के कीबोर्ड कंट्रोल और Fullscreen स्थिति
  useEffect(() => {
    if (!galleryProduct) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGallery();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        changeGalleryImage(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changeGalleryImage(-1);
      } else if (event.key === '+' || event.key === '=') {
        setZoom((current) => Math.min(4, current + 0.5));
      } else if (event.key === '-') {
        setZoom((current) => Math.max(1, current - 0.5));
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener(
        'fullscreenchange',
        handleFullscreenChange
      );
      document.body.style.overflow = previousOverflow;
      setIsBrowserFullscreen(false);
    };
  }, [galleryProduct, closeGallery, changeGalleryImage]);

  // स्टोर के प्रोडक्ट और सेटिंग्स लोड करना
  useEffect(() => {
    let isMounted = true;

    async function fetchStoreData() {
      if (!supabase) {
        setStoreError(
          'Supabase सेटिंग नहीं मिली। .env.local और Vercel Environment Variables में NEXT_PUBLIC_SUPABASE_URL तथा public key सेट करें।'
        );
        return;
      }

      try {
        const productsResult = await supabase.from('products').select('*');

        if (productsResult.error) throw productsResult.error;
        if (!isMounted) return;

        const loadedProducts = (productsResult.data ?? []) as Product[];
        setProducts(loadedProducts);

        setCategories(
          Array.from(
            new Set(
              loadedProducts
                .map((product) => product.category?.trim())
                .filter((category): category is string => Boolean(category))
            )
          ).sort((a, b) => a.localeCompare(b, 'hi'))
        );

        try {
          const settingsResult = await supabase
            .from('store_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (settingsResult.data) {
            const settings = settingsResult.data as Record<string, unknown>;

            if (
              typeof settings.store_name === 'string' &&
              settings.store_name.trim()
            ) {
              setStoreName(settings.store_name.trim());
            }

            if (
              typeof settings.delivery_fee === 'number' &&
              settings.delivery_fee >= 0
            ) {
              setDeliveryFee(settings.delivery_fee);
            }

            if (typeof settings.is_live === 'boolean') {
              setIsStoreLive(settings.is_live);
            }
          }
        } catch {
          // Settings unavailable: keep defaults.
        }
      } catch (error) {
        console.error('Error loading store:', error);

        if (isMounted) {
          setStoreError(
            'स्टोर का डेटा लोड नहीं हो सका। Supabase कनेक्शन, products टेबल और permissions जाँचें।'
          );
        }
      }
    }

    void fetchStoreData();

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchCustomerOrderHistory = useCallback(async (phone: string) => {
    if (!supabase || !/^[6-9]\d{9}$/.test(phone)) {
      setMyOrders([]);
      setIsCodBlocked(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching order history:', error.message);
        setMyOrders([]);
        return;
      }

      const orders = (data ?? []) as OrderItem[];
      setMyOrders(orders);

      const cancelledCount = orders.filter(
        (order) => order.status === 'Cancelled'
      ).length;

      const blocked = cancelledCount >= 10;
      setIsCodBlocked(blocked);

      if (blocked) setPaymentMethod('UPI');
    } catch (error) {
      console.error('Error fetching order history:', error);
    }
  }, []);

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setCustomerPhone(cleaned);

    if (cleaned.length > 0 && !/^[6-9]/.test(cleaned)) {
      setPhoneError('अमान्य नंबर! नंबर 6, 7, 8 या 9 से शुरू होना चाहिए।');
    } else if (cleaned.length > 0 && cleaned.length < 10) {
      setPhoneError('कृपया पूरा 10 अंकों का मोबाइल नंबर दर्ज करें।');
    } else {
      setPhoneError('');
    }

    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      void fetchCustomerOrderHistory(cleaned);
    } else {
      setMyOrders([]);
      setIsCodBlocked(false);
    }
  };

  const addToCart = (product: Product) => {
    if (!isStoreLive) {
      alert('स्टोर अभी ऑफ़लाइन है। नए ऑर्डर बंद हैं।');
      return;
    }

    if (!Number.isFinite(product.stock) || product.stock <= 0) {
      alert('यह उत्पाद अभी स्टॉक में उपलब्ध नहीं है।');
      return;
    }

    setCart((previousCart) => {
      const existing = previousCart.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= product.stock) {
          alert('उपलब्ध स्टॉक से ज्यादा सामान नहीं जोड़ सकते।');
          return previousCart;
        }

        return previousCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previousCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart((previousCart) =>
      previousCart
        .map((item) => {
          if (item.id !== productId) return item;

          const nextQuantity = item.quantity + delta;

          if (nextQuantity <= 0) return null;

          if (nextQuantity > item.stock) {
            alert('उपलब्ध स्टॉक से ज्यादा सामान नहीं जोड़ सकते।');
            return item;
          }

          return { ...item, quantity: nextQuantity };
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((previousCart) =>
      previousCart.filter((item) => item.id !== productId)
    );
  };

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      ),
    [cart]
  );

  const totalAmount = subtotal + (cart.length > 0 ? deliveryFee : 0);

  const totalCartItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const fullAddress = [
    `मकान नंबर: ${houseNo.trim()}`,
    `गाँव/शहर: ${village.trim()}`,
    `तहसील: ${tehsil.trim()}`,
    `जिला: ${district.trim()}`,
    `राज्य: ${stateName.trim()}`,
    `पिन कोड: ${pinCode.trim()}`,
    `लैंडमार्क: ${landmark.trim()}`,
  ].join(', ');

  const handleInitiateOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      alert('Supabase सेटिंग उपलब्ध नहीं है।');
      return;
    }

    if (!isStoreLive) {
      alert('स्टोर अभी ऑफ़लाइन है। कृपया बाद में कोशिश करें।');
      return;
    }

    if (cart.length === 0) {
      alert('आपकी कार्ट खाली है। पहले उत्पाद जोड़ें।');
      return;
    }

    if (!customerName.trim()) {
      alert('कृपया अपना पूरा नाम दर्ज करें।');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
      setPhoneError('कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।');
      return;
    }

    if (
      !houseNo.trim() ||
      !village.trim() ||
      !tehsil.trim() ||
      !district.trim() ||
      !stateName.trim() ||
      !/^\d{6}$/.test(pinCode) ||
      !landmark.trim()
    ) {
      alert('पते के सभी कॉलम भरें और सही पिन कोड दर्ज करें।');
      return;
    }

    if (paymentMethod === 'UPI' && transactionId.trim().length < 6) {
      alert('UPI पेमेंट के बाद सही Transaction ID / UTR दर्ज करें।');
      return;
    }

    if (paymentMethod === 'COD' && isCodBlocked) {
      alert('इस नंबर पर COD उपलब्ध नहीं है। कृपया UPI चुनें।');
      return;
    }

    setShowVerificationModal(true);
  };

  const handleFinalizeOrderAndVerifyWhatsApp = async () => {
    if (!supabase || loading) return;

    if (cart.length === 0) {
      alert('आपकी कार्ट खाली है।');
      setShowVerificationModal(false);
      return;
    }

    setLoading(true);

    try {
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customerName.trim(),
          phone: customerPhone,
          address: fullAddress,
        });

      if (customerError) {
        console.warn('Customer record was not saved:', customerError.message);
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: customerName.trim(),
          customer_phone: customerPhone,
          address: fullAddress,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: 'Pending Verification',
        })
        .select('id')
        .single();

      if (orderError || !orderData) {
        alert(
          'ऑर्डर दर्ज नहीं हुआ। Supabase orders टेबल और permissions जाँचें।' +
            (orderError?.message ? ` विवरण: ${orderError.message}` : '')
        );
        return;
      }

      const orderId = orderData.id;

      const paymentInfo =
        paymentMethod === 'COD'
          ? 'Cash on Delivery (COD)'
          : `UPI दावा किया गया (UTR: ${transactionId.trim()})`;

      const itemsText = cart
        .map(
          (item) =>
            `${item.name} × ${item.quantity} = ${formatRupees(
              item.price * item.quantity
            )}`
        )
        .join('\n');

      const message = [
        `नमस्ते ${storeName}!`,
        `ऑर्डर #${orderId} की पुष्टि करें।`,
        '',
        `नाम: ${customerName.trim()}`,
        `फोन: ${customerPhone}`,
        `पता: ${fullAddress}`,
        '',
        'सामान:',
        itemsText,
        '',
        `पेमेंट: ${paymentInfo}`,
        `सामान का कुल: ${formatRupees(subtotal)}`,
        `डिलीवरी शुल्क: ${formatRupees(deliveryFee)}`,
        `कुल राशि: ${formatRupees(totalAmount)}`,
        '',
        'कृपया ऑर्डर की पुष्टि करें।',
      ].join('\n');

      const storeNumber = STORE_WHATSAPP_NUMBER.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/91${storeNumber}?text=${encodeURIComponent(
        message
      )}`;

      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

      const submittedPhone = customerPhone;

      setCart([]);
      setShowVerificationModal(false);
      setIsCartOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setPhoneError('');
      setHouseNo('');
      setVillage('');
      setTehsil('');
      setDistrict('');
      setStateName('');
      setPinCode('');
      setLandmark('');
      setTransactionId('');

      alert(
        `ऑर्डर #${orderId} दर्ज हो गया है। WhatsApp पर संदेश भेजकर स्टोर से पुष्टि लें।`
      );

      await fetchCustomerOrderHistory(submittedPhone);
    } catch (error) {
      console.error('Order processing failed:', error);
      alert('ऑर्डर प्रोसेस नहीं हो सका। इंटरनेट और Supabase सेटिंग जाँचें।');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (order: OrderItem) => {
    if (!supabase) {
      alert('Supabase कनेक्शन उपलब्ध नहीं है।');
      return;
    }

    if (
      !/^[6-9]\d{9}$/.test(customerPhone) ||
      order.customer_phone !== customerPhone
    ) {
      alert('इस ऑर्डर के लिए दर्ज मोबाइल नंबर मेल नहीं खाता।');
      return;
    }

    if (!confirm(`क्या आप ऑर्डर #${order.id} कैंसिल करना चाहते हैं?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'Cancelled' })
        .eq('id', order.id)
        .eq('customer_phone', customerPhone)
        .not('status', 'in', '("Cancelled","Delivered")');

      if (error) {
        alert('ऑर्डर कैंसिल नहीं हुआ: ' + error.message);
        return;
      }

      alert('कैंसिलेशन अनुरोध पूरा हुआ।');
      await fetchCustomerOrderHistory(customerPhone);
    } catch (error) {
      console.error('Cancel order failed:', error);
      alert('ऑर्डर कैंसिल नहीं हो सका।');
    }
  };

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        product.category === selectedCategory;

      const matchesSearch =
        product.name.toLocaleLowerCase().includes(query) ||
        (product.description ?? '').toLocaleLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <h1 className="truncate text-lg font-black uppercase tracking-wider text-orange-500 sm:text-xl">
            {storeName}
          </h1>

          <nav className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('store')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                activeTab === 'store'
                  ? 'bg-slate-800 text-orange-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Shop
            </button>

            <button
              onClick={() => setActiveTab('myOrders')}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                activeTab === 'myOrders'
                  ? 'bg-slate-800 text-orange-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Orders
            </button>
          </nav>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold shadow-lg transition hover:bg-orange-500 sm:px-4"
        >
          <span>Cart</span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black text-orange-600">
            {totalCartItems}
          </span>
        </button>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        {!isStoreLive && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-xs font-bold text-red-400">
            स्टोर अभी ऑफ़लाइन है। नए ऑर्डर बंद हैं।
          </div>
        )}

        {storeError && (
          <div
            role="alert"
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200"
          >
            {storeError}
          </div>
        )}

        {activeTab === 'store' ? (
          <>
            <section className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:flex-row">
              <input
                type="search"
                placeholder="उत्पाद खोजें..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-orange-500 focus:outline-none md:w-80"
              />

              <div className="flex w-full gap-2 overflow-x-auto pb-2 md:w-auto md:pb-0">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                    selectedCategory === 'All'
                      ? 'bg-orange-500 text-white'
                      : 'border border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  सभी उत्पाद
                </button>

                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                      selectedCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'border border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full py-20 text-center text-sm text-slate-500">
                  कोई उत्पाद नहीं मिला।
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const images = Array.from(
                    new Set(
                      (product.images ?? []).filter(
                        (src): src is string =>
                          typeof src === 'string' && src.trim().length > 0
                      )
                    )
                  );

                  return (
                    <article
                      key={product.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/65 p-4 shadow-lg"
                    >
                      <div>
                        <div className="relative mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                          {images.length > 0 ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={images[0]}
                                alt={`${product.name} - फोटो 1`}
                                loading="lazy"
                                onClick={() => openGallery(product, 0)}
                                className="h-full w-full cursor-zoom-in object-cover transition duration-300 hover:scale-105"
                              />

                              <button
                                type="button"
                                onClick={() => openGallery(product, 0)}
                                aria-label={`${product.name} की सभी तस्वीरें देखें`}
                                className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm"
                              >
                                ⛶ बड़ा देखें
                                {images.length > 1 && ` · ${images.length} फोटो`}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-600">
                              इमेज उपलब्ध नहीं
                            </span>
                          )}
                        </div>

                        <h2 className="mb-1 text-sm font-bold text-white">
                          {product.name}
                        </h2>

                        <p className="mb-3 line-clamp-2 text-[11px] text-slate-400">
                          {product.description || 'कोई विवरण उपलब्ध नहीं।'}
                        </p>
                      </div>

                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-emerald-400">
                            {formatRupees(Number(product.price))}
                          </span>

                          <span
                            className={`text-[10px] font-semibold ${
                              product.stock > 0
                                ? 'text-slate-500'
                                : 'text-red-400'
                            }`}
                          >
                            {product.stock > 0
                              ? `${product.stock} स्टॉक में`
                              : 'स्टॉक खत्म'}
                          </span>
                        </div>

                        <button
                          disabled={!isStoreLive || product.stock <= 0}
                          onClick={() => addToCart(product)}
                          className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {product.stock <= 0 ? 'स्टॉक खत्म' : 'कार्ट में जोड़ें'}
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </section>
          </>
        ) : (
          <section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
            <h2 className="text-base font-bold text-white">
              अपने पुराने ऑर्डर और कैंसिलेशन देखें
            </h2>

            <div>
              <label
                htmlFor="history-phone"
                className="mb-1 block text-xs font-bold text-slate-400"
              >
                रजिस्टर्ड 10 अंकों का मोबाइल नंबर
              </label>

              <input
                id="history-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="xxxxxxxxxx"
                value={customerPhone}
                onChange={(event) => handlePhoneChange(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-orange-500 focus:outline-none"
              />

              {phoneError && (
                <p className="mt-1 text-[10px] font-semibold text-red-400">
                  {phoneError}
                </p>
              )}
            </div>

            {isCodBlocked && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-400">
                इस नंबर से 10 या अधिक कैंसिल ऑर्डर मिले हैं, इसलिए इस समय COD उपलब्ध नहीं है।
              </div>
            )}

            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold text-slate-300">
                ऑर्डर सूची ({myOrders.length})
              </h3>

              {myOrders.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  इस नंबर पर कोई ऑर्डर नहीं मिला या डेटाबेस से सूची नहीं पढ़ी जा सकी।
                </p>
              ) : (
                myOrders.map((order) => (
                  <article
                    key={order.id}
                    className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <p className="font-bold text-white">
                        ऑर्डर #{order.id} —{' '}
                        <span className="text-emerald-400">
                          {formatRupees(Number(order.total_amount))}
                        </span>
                      </p>

                      <p className="text-slate-400">
                        पेमेंट: {order.payment_method}
                      </p>

                      <p className="text-slate-400">
                        स्थिति:{' '}
                        <span
                          className={`font-bold ${
                            order.status === 'Cancelled'
                              ? 'text-red-400'
                              : 'text-orange-400'
                          }`}
                        >
                          {order.status}
                        </span>
                      </p>

                      <p className="text-slate-500">
                        {order.created_at
                          ? new Date(order.created_at).toLocaleString('hi-IN')
                          : ''}
                      </p>
                    </div>

                    {order.status !== 'Cancelled' &&
                      order.status !== 'Delivered' && (
                        <button
                          onClick={() => void handleCancelOrder(order)}
                          className="rounded-xl border border-red-500/30 bg-red-600/25 px-3 py-2 font-bold text-red-400 transition hover:bg-red-600 hover:text-white"
                        >
                          ऑर्डर कैंसिल करें
                        </button>
                      )}
                  </article>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* नई Amazon/Flipkart जैसी प्रोडक्ट फोटो गैलरी */}
      {galleryProduct && galleryImages.length > 0 && (
        <div
          ref={galleryRef}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95 text-white"
          role="dialog"
          aria-modal="true"
          aria-label={`${galleryProduct.name} फोटो गैलरी`}
          onTouchStart={handleGalleryTouchStart}
          onTouchMove={handleGalleryTouchMove}
          onTouchEnd={handleGalleryTouchEnd}
          onContextMenu={(event) => event.preventDefault()}
        >
          <header className="relative z-10 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-slate-950/90 px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold sm:text-base">
                {galleryProduct.name}
              </h2>
              <p className="text-xs text-slate-400">
                {galleryIndex + 1} / {galleryImages.length} फोटो
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggleZoom}
                aria-label={zoom > 1 ? 'Zoom हटाएँ' : 'फोटो Zoom करें'}
                className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-slate-800 px-3 text-lg font-bold hover:bg-slate-700"
              >
                {zoom > 1 ? '−' : '＋'}
              </button>

              <button
                type="button"
                onClick={() => void toggleBrowserFullscreen()}
                aria-label="Fullscreen टॉगल करें"
                className="hidden h-10 min-w-10 items-center justify-center rounded-xl bg-slate-800 px-3 text-lg hover:bg-slate-700 sm:flex"
              >
                {isBrowserFullscreen ? '⊡' : '⛶'}
              </button>

              <button
                type="button"
                onClick={closeGallery}
                aria-label="गैलरी बंद करें"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-2xl font-bold text-black hover:bg-orange-500 hover:text-white"
              >
                ×
              </button>
            </div>
          </header>

          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-3 sm:px-16">
            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => changeGalleryImage(-1)}
                aria-label="पिछली फोटो"
                className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-800/90 text-2xl shadow-lg hover:bg-orange-600 sm:left-4 sm:h-14 sm:w-14 sm:text-3xl"
              >
                ‹
              </button>
            )}

            <div className="flex h-full w-full items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                key={`${galleryProduct.id}-${galleryImages[galleryIndex]}`}
                src={galleryImages[galleryIndex]}
                alt={`${galleryProduct.name} - फोटो ${galleryIndex + 1}`}
                draggable={false}
                onDoubleClick={handleGalleryDoubleClick}
                onPointerDown={handleImagePointerDown}
                onPointerMove={handleImagePointerMove}
                onPointerUp={handleImagePointerUp}
                onPointerCancel={handleImagePointerUp}
                className="max-h-full max-w-full select-none object-contain"
                style={{
                  transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 150ms ease-out',
                  cursor: zoom > 1 ? 'grab' : 'zoom-in',
                  touchAction: 'pan-y',
                  maxHeight: '100%',
                  maxWidth: '100%',
                }}
              />
            </div>

            {galleryImages.length > 1 && (
              <button
                type="button"
                onClick={() => changeGalleryImage(1)}
                aria-label="अगली फोटो"
                className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-800/90 text-2xl shadow-lg hover:bg-orange-600 sm:right-4 sm:h-14 sm:w-14 sm:text-3xl"
              >
                ›
              </button>
            )}
          </div>

          <footer className="border-t border-white/10 bg-slate-950/95 px-3 py-3">
            <p className="mb-3 text-center text-xs text-slate-400">
              मोबाइल पर स्वाइप करें · फोटो पर डबल-टैप करके Zoom करें
            </p>

            {galleryImages.length > 1 && (
              <div className="flex justify-center gap-2 overflow-x-auto pb-1">
                {galleryImages.map((src, index) => (
                  <button
                    type="button"
                    key={`${src}-${index}`}
                    onClick={() => {
                      setGalleryIndex(index);
                      setZoom(1);
                      setImagePosition({ x: 0, y: 0 });
                    }}
                    aria-label={`फोटो ${index + 1} देखें`}
                    aria-current={galleryIndex === index ? 'true' : undefined}
                    className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition sm:h-16 sm:w-16 ${
                      galleryIndex === index
                        ? 'border-orange-500 ring-2 ring-orange-500/30'
                        : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`थंबनेल ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </footer>
        </div>
      )}

      {/* शॉपिंग कार्ट */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <button
            aria-label="कार्ट बंद करें"
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 cursor-default"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-label="शॉपिंग कार्ट"
            className="relative flex h-full w-full max-w-md flex-col justify-between overflow-y-auto border-l border-slate-800 bg-slate-900 p-5 shadow-2xl sm:p-6"
          >
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-black text-white">आपकी कार्ट</h2>

                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-sm font-bold text-slate-400 hover:text-white"
                >
                  ✕ बंद करें
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="py-10 text-center text-xs text-slate-500">
                  आपकी कार्ट खाली है।
                </p>
              ) : (
                <div className="mb-6 space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"
                    >
                      <div className="min-w-0">
                        <h3 className="font-bold text-white">{item.name}</h3>
                        <p className="font-semibold text-emerald-400">
                          {formatRupees(Number(item.price))} प्रति यूनिट
                        </p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="mt-1 text-[10px] text-red-400 underline"
                        >
                          हटाएँ
                        </button>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          aria-label={`${item.name} की मात्रा घटाएँ`}
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-7 w-7 rounded-lg bg-slate-800 font-bold"
                        >
                          −
                        </button>

                        <span className="min-w-4 text-center font-bold">
                          {item.quantity}
                        </span>

                        <button
                          aria-label={`${item.name} की मात्रा बढ़ाएँ`}
                          disabled={item.quantity >= item.stock}
                          onClick={() => updateQuantity(item.id, 1)}
                          className="h-7 w-7 rounded-lg bg-slate-800 font-bold disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>सामान का कुल</span>
                    <span>{formatRupees(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>डिलीवरी शुल्क</span>
                    <span>{formatRupees(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                    <span>कुल राशि</span>
                    <span className="text-emerald-400">
                      {formatRupees(totalAmount)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleInitiateOrder} className="space-y-3 pt-1">
                  <div>
                    <label htmlFor="customer-name" className="mb-1 block text-[11px] font-bold text-slate-400">
                      पूरा नाम
                    </label>
                    <input
                      id="customer-name"
                      type="text"
                      autoComplete="name"
                      maxLength={100}
                      placeholder="अपना पूरा नाम"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="checkout-phone" className="mb-1 block text-[11px] font-bold text-slate-400">
                      मोबाइल / WhatsApp नंबर
                    </label>
                    <input
                      id="checkout-phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={10}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      value={customerPhone}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      className={`w-full rounded-xl border bg-slate-950 p-2.5 text-xs text-white focus:outline-none ${
                        phoneError ? 'border-red-500' : 'border-slate-800 focus:border-orange-500'
                      }`}
                      required
                    />
                    {phoneError && (
                      <p className="mt-1 text-[10px] font-semibold text-red-400">{phoneError}</p>
                    )}
                    {isCodBlocked && (
                      <p className="mt-1 text-[10px] font-semibold text-red-400">
                        अधिक कैंसिलेशन के कारण COD उपलब्ध नहीं है।
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <p className="text-xs font-bold text-orange-400">पेमेंट का तरीका</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isCodBlocked}
                        onClick={() => setPaymentMethod('COD')}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          paymentMethod === 'COD' ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        Cash on Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                          paymentMethod === 'UPI' ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        UPI
                      </button>
                    </div>

                    {paymentMethod === 'UPI' && (
                      <div className="mt-2 space-y-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-center">
                        <p className="text-[11px] text-slate-300">QR कोड स्कैन करें या UPI ID का उपयोग करें।</p>
                        <button
                          type="button"
                          onClick={() => setShowQrFullScreen(true)}
                          aria-label="QR कोड बड़ा देखें"
                          className="mx-auto flex h-48 w-48 cursor-zoom-in items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-white p-2"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/qrcode.png" alt="UPI QR Code" className="h-full w-full object-contain" />
                        </button>
                        <p className="text-center text-xs text-slate-400">QR कोड को बड़ा देखने के लिए उस पर क्लिक करें।</p>
                        <p className="select-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs font-bold text-emerald-400">{UPI_ID}</p>
                        <div>
                          <label htmlFor="transaction-id" className="mb-1 block text-left text-[10px] font-semibold text-slate-400">
                            Transaction ID / UTR
                          </label>
                          <input
                            id="transaction-id"
                            type="text"
                            maxLength={100}
                            value={transactionId}
                            onChange={(event) => setTransactionId(event.target.value)}
                            placeholder="पेमेंट के बाद UTR दर्ज करें"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                            required={paymentMethod === 'UPI'}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-slate-800 pt-3">
                    <p className="pt-1 text-xs font-bold text-orange-400">डिलीवरी पता</p>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="house-no" className="mb-1 block text-[10px] font-semibold text-slate-400">मकान नंबर</label>
                        <input id="house-no" autoComplete="address-line1" maxLength={100} value={houseNo} onChange={(event) => setHouseNo(event.target.value)} placeholder="मकान नंबर" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                      <div>
                        <label htmlFor="village" className="mb-1 block text-[10px] font-semibold text-slate-400">गाँव / शहर</label>
                        <input id="village" autoComplete="address-level2" maxLength={100} value={village} onChange={(event) => setVillage(event.target.value)} placeholder="गाँव / शहर" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="tehsil" className="mb-1 block text-[10px] font-semibold text-slate-400">तहसील</label>
                        <input id="tehsil" maxLength={100} value={tehsil} onChange={(event) => setTehsil(event.target.value)} placeholder="तहसील" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                      <div>
                        <label htmlFor="district" className="mb-1 block text-[10px] font-semibold text-slate-400">जिला</label>
                        <input id="district" autoComplete="address-level1" maxLength={100} value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="जिला" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="state-name" className="mb-1 block text-[10px] font-semibold text-slate-400">राज्य</label>
                        <input id="state-name" autoComplete="address-level1" maxLength={100} value={stateName} onChange={(event) => setStateName(event.target.value)} placeholder="राज्य" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                      <div>
                        <label htmlFor="pin-code" className="mb-1 block text-[10px] font-semibold text-slate-400">पिन कोड</label>
                        <input id="pin-code" inputMode="numeric" autoComplete="postal-code" maxLength={6} value={pinCode} onChange={(event) => setPinCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6 अंकों का पिन" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="landmark" className="mb-1 block text-[10px] font-semibold text-slate-400">लैंडमार्क</label>
                      <input id="landmark" maxLength={150} value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="नजदीकी पहचान की जगह" className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 text-xs text-white focus:border-orange-500 focus:outline-none" required />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={Boolean(phoneError) || !/^[6-9]\d{9}$/.test(customerPhone) || loading || !isStoreLive}
                    className="mt-2 w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-600 py-3 text-xs font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ऑर्डर की जाँच करें ({paymentMethod})
                  </button>
                </form>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ऑर्डर वेरिफिकेशन */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-labelledby="verification-title" className="w-full max-w-sm space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20 text-xl text-emerald-400">✓</div>
            <h2 id="verification-title" className="text-base font-bold text-white">ऑर्डर की पुष्टि</h2>
            <p className="text-xs leading-relaxed text-slate-300">
              ऑर्डर डेटाबेस में दर्ज करने के बाद स्टोर के WhatsApp पर पुष्टि संदेश खोलें। UPI भुगतान स्टोर द्वारा जाँचे जाने तक सत्यापित नहीं माना जाएगा।
            </p>
            <div className="space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-3 text-left text-[11px]">
              <p className="text-slate-400">नाम: <span className="font-bold text-white">{customerName}</span></p>
              <p className="text-slate-400">पेमेंट: <span className="font-bold text-orange-400">{paymentMethod}</span></p>
              <p className="text-slate-400">कुल राशि: <span className="font-bold text-emerald-400">{formatRupees(totalAmount)}</span></p>
              <p className="text-slate-400">कुल आइटम: <span className="font-bold text-white">{totalCartItems}</span></p>
            </div>
            <div className="space-y-2 pt-2">
              <button onClick={() => void handleFinalizeOrderAndVerifyWhatsApp()} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50">
                {loading ? 'ऑर्डर सेव हो रहा है…' : 'ऑर्डर दर्ज करें और WhatsApp खोलें'}
              </button>
              <button onClick={() => setShowVerificationModal(false)} disabled={loading} className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-400 transition hover:bg-slate-700 disabled:opacity-50">
                वापस जाएँ / विवरण बदलें
              </button>
            </div>
          </section>
        </div>
      )}

      {/* UPI QR Fullscreen */}
      {showQrFullScreen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setShowQrFullScreen(false)}
        >
          <button type="button" onClick={() => setShowQrFullScreen(false)} aria-label="QR कोड बंद करें" className="absolute right-5 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-white text-4xl font-bold text-black">
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/qrcode.png"
            alt="Full screen UPI QR Code"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85vh] w-auto max-w-[95vw] rounded-xl bg-white p-2 object-contain"
          />
        </div>
      )}
    </div>
  );
}