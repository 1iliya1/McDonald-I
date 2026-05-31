import React, { useState, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  MapPin,
  Percent,
  Search,
  BookOpen,
  Info,
  Phone,
  Clock,
  Navigation,
  ArrowRight,
  Plus,
  Minus,
  Check,
  Tag,
  Flame,
  Award,
  AlertTriangle,
  Smartphone,
  ChevronRight,
  Compass,
  Truck
} from "lucide-react";

import { MenuItem, CartItem, Deal, Restaurant, UserPreferences } from "./types";
import { MENU_ITEMS, LIVE_DEALS, MOCK_RESTAURANTS } from "./data";
import { AIAssistant } from "./components/AIAssistant";
import { PersonalizationPanel } from "./components/PersonalizationPanel";
import { VisionSection } from "./components/VisionSection";

export default function App() {
  // Global Tab Navigation
  const [activeTab, setActiveTab] = useState<
    "homepage" | "menu" | "deals" | "finder" | "checkout" | "app" | "nutrition" | "brand"
  >("homepage");

  // Global Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCoupon, setActiveCoupon] = useState<Deal | null>(null);

  // User simulation preferences
  const [preferences, setPreferences] = useState<UserPreferences>({
    timeOfDay: "afternoon",
    dietaryGoals: [],
    pastOrderIds: [],
    isLoyaltyMember: true,
    pointBalance: 240
  });

  // AI-personalized Copy States
  const [personalization, setPersonalization] = useState({
    greeting: "Vibe Match Comfort Food",
    promotionalCopy: "Welcome to Arches. Set your taste profile to let Gemini suggest targeted nutritional mappings of your favorite breakfast, burgers, and cold treats."
  });
  const [isPersonalizing, setIsPersonalizing] = useState(false);

  // Natural Language search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchExplanation, setSearchExplanation] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [filteredMenu, setFilteredMenu] = useState<MenuItem[]>(MENU_ITEMS);

  // Selected menu item detailed nutrition modal
  const [selectedNutritionItem, setSelectedNutritionItem] = useState<MenuItem | null>(null);

  // AI Checkout Upsell states
  const [upsellItem, setUpsellItem] = useState<MenuItem | null>(null);
  const [upsellPitch, setUpsellPitch] = useState("");
  const [upsellLoading, setUpsellLoading] = useState(false);

  // Restaurant Finder variables
  const [storeFilterDriveThru, setStoreFilterDriveThru] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState("");
  const [checkoutSimDone, setCheckoutSimDone] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any | null>(null);

  // Quick category selection on Menu tab
  const [currentMenuCategory, setCurrentMenuCategory] = useState<string>("all");

  // Loyalty coupon redemption logs
  const [dealNotification, setDealNotification] = useState<string | null>(null);

  // 1. Trigger AI Personalization call on preference change
  useEffect(() => {
    const fetchPersonalization = async () => {
      setIsPersonalizing(true);
      try {
        const response = await fetch("/api/ai/personalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preferences)
        });
        if (response.ok) {
          const data = await response.json();
          setPersonalization({
            greeting: data.greeting || "Golden Arches Experience",
            promotionalCopy: data.promotionalCopy || "Delicious deals recommended based on your diet."
          });
        }
      } catch (err) {
        console.warn("Simulator backend inactive or loading fallback", err);
      } finally {
        setIsPersonalizing(false);
      }
    };
    fetchPersonalization();
  }, [preferences]);

  // 2. Trigger AI cart upsells when cart contents structural dependencies change
  useEffect(() => {
    const checkUpsell = async () => {
      if (cart.length === 0) {
        setUpsellItem(null);
        setUpsellPitch("");
        return;
      }
      setUpsellLoading(true);
      try {
        const response = await fetch("/api/ai/upsells", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItems: cart.map(item => ({
              menuItemId: item.menuItem.id,
              quantity: item.quantity
            }))
          })
        });
        if (response.ok) {
          const data = await response.json();
          // Avoid suggesting items already in the cart
          const inCart = cart.some(i => i.menuItem.id === data.upsellItem?.id);
          if (!inCart && data.upsellItem) {
            setUpsellItem(data.upsellItem);
            setUpsellPitch(data.pitchSentence);
          } else {
            // Pick a safe fallback dessert not in cart
            const fallback = MENU_ITEMS.find(m => m.category === "desserts" && !cart.some(i => i.menuItem.id === m.id));
            if (fallback) {
              setUpsellItem(fallback);
              setUpsellPitch(`Add our ${fallback.name}! Perfect sweet snack favored by 87% of other diners.`);
            }
          }
        }
      } catch (e) {
        console.warn("Upsell fetch error, applying local mock default", e);
      } finally {
        setUpsellLoading(false);
      }
    };
    checkUpsell();
  }, [cart.length]);

  // 3. Natural Language Search executor
  const handleSmartSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const queryToUse = customQuery !== undefined ? customQuery : searchQuery;
    if (!queryToUse.trim()) {
      setFilteredMenu(MENU_ITEMS);
      setSearchExplanation("");
      return;
    }

    setSearchLoading(true);
    setSearchExplanation("");
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryToUse })
      });
      if (response.ok) {
        const data = await response.json();
        setFilteredMenu(data.items || MENU_ITEMS);
        setSearchExplanation(data.explanation || "Filtered matches");
      }
    } catch (err) {
      console.error(err);
      // Fallback local search
      const lower = queryToUse.toLowerCase();
      const results = MENU_ITEMS.filter(m => 
        m.name.toLowerCase().includes(lower) || 
        m.description.toLowerCase().includes(lower) ||
        m.tags.some(t => t.toLowerCase().includes(lower))
      );
      setFilteredMenu(results);
      setSearchExplanation(`Found ${results.length} items containing "${queryToUse}" (Offline search breakdown)`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Add Item handler
  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });

    // Provide micro bounce feel onto the UI
    const targetElement = document.getElementById("cart-counter-bubble");
    if (targetElement) {
      targetElement.classList.add("scale-125", "bg-[#FFE02E]", "text-black");
      setTimeout(() => {
        targetElement.classList.remove("scale-125", "bg-[#FFE02E]", "text-black");
      }, 300);
    }
  };

  // Update Qty
  const handleUpdateQty = (itemId: string, diff: number) => {
    setCart(prev => {
      const match = prev.find(i => i.menuItem.id === itemId);
      if (!match) return prev;
      const newQty = match.quantity + diff;
      if (newQty <= 0) {
        return prev.filter(i => i.menuItem.id !== itemId);
      }
      return prev.map(i => i.menuItem.id === itemId ? { ...i, quantity: newQty } : i);
    });
  };

  // Redeem Promo points catalog code
  const handleRedeemRewardCode = (rewardDeal: Deal) => {
    if (preferences.pointBalance < 800 && rewardDeal.code === "REDEEMPIE") {
      alert("Insufficient Points balance! Earn points by completing active orders.");
      return;
    }
    if (preferences.pointBalance < 1500 && rewardDeal.code === "REDEEMMAC") {
      alert("Insufficient Points balance! Need 1,500 loyalty points.");
      return;
    }

    const cost = rewardDeal.code === "REDEEMMAC" ? 1500 : 800;
    setPreferences(prev => ({
      ...prev,
      pointBalance: prev.pointBalance - cost
    }));

    // Find equivalent item in database to add automatically for $0.00
    const matchedItem = MENU_ITEMS.find(m => 
      rewardDeal.code === "REDEEMMAC" ? m.id === "m1" : m.id === "m12"
    );

    if (matchedItem) {
      setCart(prev => {
        const existing = prev.find(i => i.menuItem.id === matchedItem.id);
        if (existing) {
          return prev.map(i => i.menuItem.id === matchedItem.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { menuItem: matchedItem, quantity: 1 }];
      });
    }

    setDealNotification(`🎉 Redeemed ${cost} Points! Added free ${rewardDeal.title.split(" ")[1] || "Reward Item"} to your order folder.`);
    setTimeout(() => setDealNotification(null), 5000);
  };

  // Checkout math counters
  const subtotal = cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
  const discountAmount = activeCoupon ? activeCoupon.discountValue : 0;
  const deliveryFee = subtotal > 15 || subtotal === 0 ? 0 : 3.99;
  const estimatedTax = subtotal * 0.085;
  const grandTotal = Math.max(0, subtotal - discountAmount + deliveryFee + estimatedTax);

  // Form checkout logic
  const handleCompleteOrder = () => {
    setLastOrderDetails({
      itemsCount: cart.reduce((a, b) => a + b.quantity, 0),
      totalPayed: grandTotal,
      timestamp: new Date().toLocaleTimeString()
    });
    setCheckoutSimDone(true);
    setCart([]);
    setActiveCoupon(null);
    // Increase loyalty points
    setPreferences(prev => ({
      ...prev,
      pointBalance: prev.pointBalance + 120
    }));
  };

  // Filter restaurants list
  const filteredStores = MOCK_RESTAURANTS.filter(store => {
    const searchMatch = store.name.toLowerCase().includes(storeSearchQuery.toLowerCase()) || 
                       store.address.toLowerCase().includes(storeSearchQuery.toLowerCase());
    const driveThruMatch = !storeFilterDriveThru || store.hasDriveThru;
    return searchMatch && driveThruMatch;
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCF9]">
      
      {/* 1. STICKY BRAND HEADER */}
      <header className="sticky top-0 z-40 bg-[#27251F] text-white py-3.5 px-4 shadow-md border-b-4 border-brand-yellow">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo Brand Accent */}
          <div 
            onClick={() => setActiveTab("homepage")} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="bg-brand-red p-2 rounded-xl border border-brand-yellow font-display font-black text-2xl text-brand-yellow group-hover:rotate-6 transition-all duration-300 shadow-lg leading-none">
              M
            </div>
            <div>
              <h1 className="font-display font-bold text-base leading-tight tracking-tight group-hover:text-brand-yellow transition-colors">
                GOLDEN <span className="text-brand-yellow">ARCHES</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono tracking-widest leading-none">AI KITCHEN ENGINE</p>
            </div>
          </div>

          {/* Core Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
            <button 
              onClick={() => setActiveTab("homepage")} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "homepage" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab("menu"); setFilteredMenu(MENU_ITEMS); setCurrentMenuCategory("all"); }} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "menu" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Menu
            </button>
            <button 
              onClick={() => setActiveTab("deals")} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "deals" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Deals
            </button>
            <button 
              onClick={() => setActiveTab("finder")} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "finder" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Find Restaurant
            </button>
            <button 
              onClick={() => setActiveTab("nutrition")} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "nutrition" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Nutrition Hub
            </button>
            <button 
              onClick={() => setActiveTab("brand")} 
              className={`hover:text-brand-yellow transition-colors cursor-pointer ${activeTab === "brand" ? "text-brand-yellow underline underline-offset-4 decoration-2" : "text-gray-300"}`}
            >
              Our Story
            </button>
          </nav>

          {/* Quick CTAs right-hand pack */}
          <div className="flex items-center gap-3">
            
            {/* Quick loyalty points badge */}
            {preferences.isLoyaltyMember && (
              <div 
                onClick={() => setActiveTab("deals")}
                className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 border border-brand-yellow/30 px-3 py-1.5 rounded-full text-xs font-semibold text-brand-yellow cursor-pointer hover:bg-yellow-500/20 transition-all"
              >
                <Award className="w-3.5 h-3.5" />
                <span>{preferences.pointBalance} Points</span>
              </div>
            )}

            {/* Sticky bag checkout button */}
            <button
              onClick={() => { setActiveTab("checkout"); setCheckoutSimDone(false); }}
              className="bg-brand-red hover:bg-[#b51c12] text-white px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold font-display uppercase tracking-wider relative border-2 border-[#fff240] hover:scale-105 transition-all outline-none cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-brand-yellow animate-pulse" />
              <span>Checkout</span>
              {cart.length > 0 && (
                <span 
                  id="cart-counter-bubble"
                  className="bg-white text-brand-dark px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono transition-all shrink-0"
                >
                  {cart.reduce((a, b) => a + b.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Promos strip banner */}
      <div className="bg-brand-yellow text-brand-dark px-4 py-1.5 text-xs text-center font-semibold tracking-wide border-b border-[#eed133]">
        💥 SIMULATOR ALERT: Click the Vibe Simulator below to watch Gemini transform this entire site instantly based on your target craving!
      </div>

      {/* Loyalty/coupon top alert banner banner */}
      {dealNotification && (
        <div className="bg-emerald-600 text-white p-3.5 text-center text-xs font-semibold animate-in slide-in-from-top duration-300 flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {dealNotification}
        </div>
      )}

      {/* Vibe Persona Config */}
      <PersonalizationPanel
        currentPreferences={preferences}
        onPreferencesChange={setPreferences}
        isLoading={isPersonalizing}
      />

      {/* 2. CORE VIEWPORT CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto px-4 py-4 w-full">
        
        {/* ================= VIEW: HOMEPAGE ================= */}
        {activeTab === "homepage" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            
            {/* Elegant Personalized Hero Jumbotron */}
            <section className="bg-brand-dark rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden shadow-xl border border-gray-800">
              {/* Radial gradient backing */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-red/3s0 via-brand-dark to-brand-dark pointer-events-none opacity-40" />
              
              <div className="max-w-2xl space-y-5 relative">
                <div className="inline-flex items-center gap-2 bg-brand-red text-white text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-full border border-brand-yellow leading-none">
                  {preferences.timeOfDay.toUpperCase()} SPECIALS RECOMMENDED NOW
                </div>
                
                <h2 className="font-display font-black text-4xl lg:text-5xl leading-none tracking-tight">
                  {isPersonalizing ? "Rewriting tastes..." : personalization.greeting}
                </h2>
                
                <p className="text-gray-300 text-sm leading-relaxed max-w-xl">
                  {isPersonalizing ? "Analyzing nutritional preferences and alignment indexes..." : personalization.promotionalCopy}
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => { setActiveTab("menu"); setFilteredMenu(MENU_ITEMS); setCurrentMenuCategory("all"); }}
                    className="bg-brand-yellow hover:bg-[#e5b320] text-brand-dark px-6 py-3.5 rounded-2xl font-display font-extrabold text-sm uppercase tracking-wide transition-all scale-100 hover:scale-[1.03] duration-150 cursor-pointer"
                  >
                    Order Now & Collect Points
                  </button>
                  <button
                    onClick={() => setActiveTab("deals")}
                    className="bg-transparent border-2 border-gray-600 hover:border-brand-yellow hover:text-brand-yellow px-5 py-3 rounded-2xl font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    See Live Promotions
                  </button>
                </div>
              </div>

              {/* Float visual card showcase */}
              <div className="absolute right-12 bottom-0 top-0 hidden lg:flex items-center justify-center pointer-events-none">
                <span className="text-[140px] select-none hover:scale-110 transition-transform opacity-95">🍔</span>
                <span className="text-7xl select-none absolute top-12 right-12 blur-[1px]">🍟</span>
              </div>
            </section>

            {/* Quick order navigation banner tiles */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Morning Breakfast", icon: "🍳", cat: "breakfast" },
                { label: "Classic Burgers", icon: "🍔", cat: "burgers" },
                { label: "Crispy Nuggets & Salad", icon: "🍗", cat: "chicken-fish" },
                { label: "Drinks & Shakes", icon: "🥤", cat: "drinks" }
              ].map((tile, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveTab("menu");
                    setCurrentMenuCategory(tile.cat);
                    setFilteredMenu(MENU_ITEMS.filter(m => m.category === tile.cat));
                  }}
                  className="bg-white hover:bg-[#FFFDF4] p-5 rounded-2xl border border-gray-200/90 text-center cursor-pointer transition-all hover:-translate-y-1 hover:border-brand-yellow flex flex-col items-center justify-center gap-2 group shadow-sm"
                >
                  <span className="text-3xl group-hover:scale-125 transition-transform">{tile.icon}</span>
                  <span className="font-display font-bold text-xs uppercase text-brand-dark tracking-wide">{tile.label}</span>
                </div>
              ))}
            </section>

            {/* Vision snapshot trigger module */}
            <VisionSection onAddToCart={handleAddToCart} />

            {/* Suggested / Most Popular Grid */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-brand-dark">
                    Our Featured Hot Recipes
                  </h3>
                  <p className="text-xs text-gray-500">Perfectly salted, freshly built, and prepared to perfection.</p>
                </div>
                <button
                  onClick={() => { setActiveTab("menu"); setFilteredMenu(MENU_ITEMS); }}
                  className="text-xs text-brand-red font-bold flex items-center gap-1 hover:underline"
                >
                  View complete menu <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {MENU_ITEMS.filter(item => item.isFeatured).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm relative flex flex-col justify-between hover:shadow-lg transition-shadow group"
                  >
                    <div>
                      {/* Emoji Display on Dark circle back */}
                      <div className="bg-gray-50 aspect-video rounded-xl flex items-center justify-center text-4xl mb-3.5 relative overflow-hidden group-hover:rotate-2 transition-transform">
                        {item.image}
                        {item.tags.includes("High-Protein") && (
                          <span className="absolute top-2 right-2 bg-brand-red text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-0.5 leading-none">
                            <Flame className="w-2.5 h-2.5 text-brand-yellow fill-brand-yellow" /> Protein
                          </span>
                        )}
                      </div>

                      <div className="flex items-start justify-between min-h-[44px]">
                        <h4 className="font-display font-extrabold text-sm text-brand-dark tracking-tight leading-snug">
                          {item.name}
                        </h4>
                        <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {item.calories} kcal
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-normal">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-brand-red">${item.price.toFixed(2)}</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedNutritionItem(item)}
                          className="bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all cursor-pointer"
                        >
                          Specs
                        </button>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="bg-brand-yellow text-brand-dark px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-red hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ================= VIEW: MENU ================= */}
        {activeTab === "menu" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Title */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark">
                Golden Arches Official Menu
              </h2>
              <p className="text-xs text-gray-500">Fresh ingredients, cooked to order, with full nutritional metrics.</p>
            </div>

            {/* Smart Search Query Input Section */}
            <div className="bg-brand-dark rounded-2xl p-4 lg:p-6 text-white border border-gray-800">
              <div className="max-w-3xl space-y-3">
                <span className="inline-flex items-center gap-1 bg-brand-red text-white text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full border border-brand-yellow leading-none">
                  <Sparkles className="w-3 h-3 text-brand-yellow" /> Gemini Intelligent Search
                </span>
                <h3 className="font-display font-bold text-base text-brand-yellow">
                  Search via Natural Language (Calorie alerts, vegetarian or allergies)
                </h3>
                
                <form onSubmit={handleSmartSearch} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g., 'something under 450 calories and free from gluten'"
                      className="w-full bg-neutral-800 border-2 border-transparent focus:border-brand-yellow rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-0 text-white placeholder-gray-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="bg-brand-yellow hover:bg-[#e5b320] text-brand-dark font-display font-extrabold text-xs tracking-wider uppercase px-5 py-3 rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {searchLoading ? "Consulting DB..." : "Ask Gemini"}
                  </button>
                </form>

                {/* Suggestions chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                  <span className="text-gray-400 font-mono text-[11px] uppercase mr-1">Hot Queries:</span>
                  {[
                    "high protein burger under 600 calories",
                    "gluten-free vegetarian sides",
                    "warm low calorie comforting desserts"
                  ].map((chipTopic, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => {
                        setSearchQuery(chipTopic);
                        handleSmartSearch(undefined, chipTopic);
                      }}
                      className="bg-neutral-800/80 hover:bg-neutral-700/80 hover:border-brand-yellow text-gray-200 border border-gray-700 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      "{chipTopic}"
                    </button>
                  ))}
                </div>

                {/* Search explanation feedback */}
                {searchExplanation && (
                  <div className="bg-[#DA291C]/10 border border-brand-red/30 p-3 rounded-xl text-xs text-gray-200 italic mt-3 flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
                    <p>
                      <strong>Gemini Match Breakdown:</strong> {searchExplanation}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Category horizontal tabs list */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-b border-gray-200">
              {[
                { id: "all", label: "All Items", icon: "🍽️" },
                { id: "burgers", label: "Beef Burgers", icon: "🍔" },
                { id: "chicken-fish", label: "Chicken & Seafood", icon: "🍗" },
                { id: "sides", label: "Crispy Sides", icon: "🍟" },
                { id: "breakfast", label: "Sunrise Breakfast", icon: "🍳" },
                { id: "desserts", label: "Sweet Desserts", icon: "🥧" },
                { id: "drinks", label: "Drinks & McCafé", icon: "🥤" }
              ].map((catTab) => (
                <button
                  key={catTab.id}
                  onClick={() => {
                    setCurrentMenuCategory(catTab.id);
                    setSearchQuery("");
                    setSearchExplanation("");
                    if (catTab.id === "all") {
                      setFilteredMenu(MENU_ITEMS);
                    } else {
                      setFilteredMenu(MENU_ITEMS.filter(m => m.category === catTab.id));
                    }
                  }}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-xs font-bold font-display uppercase tracking-wider rounded-xl border transition-all cursor-pointer ${
                    currentMenuCategory === catTab.id
                      ? "bg-brand-red text-white border-brand-red shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-brand-yellow hover:bg-amber-50/10"
                  }`}
                >
                  <span>{catTab.icon}</span>
                  <span>{catTab.label}</span>
                </button>
              ))}
            </div>

            {/* Active filters summary */}
            {preferences.dietaryGoals.length > 0 && (
              <div className="bg-amber-500/10 border border-brand-yellow/30 p-3 rounded-xl text-xs flex items-center gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 shrink-0 text-brand-gold" />
                <span>
                  <strong>Active Allergy Filters:</strong> Highlighting items compatible with your chosen simulator settings:{" "}
                  <span className="font-bold underline">{preferences.dietaryGoals.join(", ")}</span>.
                </span>
              </div>
            )}

            {/* Active Items list grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMenu.map((item) => {
                // Apply visual badge matching if item aligns with preferences dietary goals
                const isMatchDiet = preferences.dietaryGoals.every(g => item.tags.includes(g) || (g === "Gluten-Free" && !item.allergens.includes("Gluten")));

                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl p-4 border relative flex flex-col justify-between hover:shadow-lg transition-transform hover:-translate-y-0.5 group ${
                      preferences.dietaryGoals.length > 0 && isMatchDiet
                        ? "border-green-500 bg-green-50/20"
                        : "border-gray-200 shadow-sm"
                    }`}
                  >
                    <div>
                      {/* Image container representation */}
                      <div className="bg-gray-50 aspect-video rounded-xl flex items-center justify-center text-4xl mb-3 relative overflow-hidden group-hover:rotate-1 transition-transform">
                        {item.image}
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {item.allergens.includes("Gluten") ? (
                            <span className="bg-amber-100 text-amber-800 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-none">GLUTEN</span>
                          ) : (
                            <span className="bg-green-100 text-green-800 text-[8px] px-1.5 py-0.5 rounded font-mono font-bold leading-none">GF SAFE</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-start justify-between min-h-[44px]">
                        <h4 className="font-display font-extrabold text-sm text-brand-dark tracking-tight leading-snug">
                          {item.name}
                        </h4>
                        <span className="font-mono text-[11px] text-gray-500 font-semibold">
                          {item.calories} kcal
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-normal">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="font-mono font-bold text-sm text-brand-red">
                        ${item.price.toFixed(2)}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setSelectedNutritionItem(item)}
                          className="bg-gray-100 text-gray-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-all cursor-pointer"
                        >
                          Specs
                        </button>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="bg-brand-yellow text-brand-dark px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-brand-red hover:text-white transition-all shadow-sm cursor-pointer"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {filteredMenu.length === 0 && (
                <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <p className="text-sm font-semibold text-gray-500">No items match your smart search criteria</p>
                  <button 
                    onClick={() => { setFilteredMenu(MENU_ITEMS); setSearchQuery(""); setSearchExplanation(""); }} 
                    className="text-xs text-brand-red font-bold mt-2"
                  >
                    Clear Search Filters
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= VIEW: DEALS & LOYALTY ================= */}
        {activeTab === "deals" && (
          <div className="space-y-8 animate-in fade-in duration-200">
            
            {/* Header section */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark">
                Live Promotions & Member Loyalty Cards
              </h2>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-brand-red" />
                Active promotional discount vouchers. Present code or redeem points directly.
              </p>
            </div>

            {/* Loyalty Point Showcase Card */}
            <div className="bg-brand-dark text-white rounded-3xl p-6 lg:p-8 relative overflow-hidden shadow-xl border border-gray-800">
              <div className="absolute -right-12 -bottom-12 text-[150px] opacity-10 select-none">👑</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-1.5 bg-brand-yellow text-brand-dark text-xs font-bold px-3 py-1 rounded-full border border-[#FFF] uppercase leading-none animate-bounce-slow">
                    <Award className="w-3.5 h-3.5 fill-brand-dark" />
                    GOLDEN ARCHES CLUB MEMBER
                  </span>
                  <h3 className="font-display font-black text-2xl lg:text-3xl">
                    Your Rewards Ledger
                  </h3>
                  <p className="text-xs text-gray-300 leading-relaxed max-w-sm">
                    Earn 10 points for every dollar spent on our hot sandwiches or side items. Redeem points to claim free meals with no purchase minimum checks!
                  </p>
                  
                  <div className="flex gap-4 pt-2">
                    <div className="p-3 bg-neutral-900 rounded-xl border border-gray-800 min-w-[120px]">
                      <span className="text-[10px] uppercase font-mono text-gray-400">Points Balance</span>
                      <p className="text-2xl font-bold font-mono text-brand-yellow mt-1">
                        {preferences.pointBalance} PTS
                      </p>
                    </div>
                    <div className="p-3 bg-neutral-900 rounded-xl border border-gray-800 min-w-[120px]">
                      <span className="text-[10px] uppercase font-mono text-gray-400">Current Order Value</span>
                      <p className="text-2xl font-bold font-mono text-gray-300 mt-1">
                        ${subtotal.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* High conversion status progression tracker */}
                <div className="bg-neutral-900/60 p-5 rounded-2xl border border-gray-800 space-y-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Rank Progression</span>
                    <span className="text-brand-yellow">1,500 pts to FREE Big Mac</span>
                  </div>
                  
                  {/* Visual progression bar */}
                  <div className="w-full h-3 bg-neutral-800 rounded-full overflow-hidden border border-gray-700">
                    <div 
                      className="h-full bg-brand-yellow transition-all duration-300" 
                      style={{ width: `${Math.min(100, (preferences.pointBalance / 2000) * 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-gray-400">
                    <span>0 PTS (Member)</span>
                    <span className="text-brand-yellow font-bold">🌟 GOLD ARCHES ELITE LEVEL</span>
                    <span>2000 PTS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty points instant redemption catalog */}
            <div className="space-y-4">
              <h3 className="font-display font-extrabold text-lg text-brand-dark">
                Redeem Free Meals with Points (Click to claim immediately)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {LIVE_DEALS.filter(d => d.isPremiumRewards).map((deal) => {
                  const requiredPoints = deal.code === "REDEEMMAC" ? 1500 : 800;
                  const canClaim = preferences.pointBalance >= requiredPoints;

                  return (
                    <div
                      key={deal.id}
                      className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                        canClaim 
                          ? "bg-white border-brand-yellow hover:shadow-md transition-shadow cursor-pointer" 
                          : "bg-gray-100 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex gap-3.5 items-center">
                        <span className="text-4xl">{deal.image}</span>
                        <div>
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            {requiredPoints} POINTS REQUIRED
                          </span>
                          <h4 className="font-display font-extrabold text-sm text-brand-dark mt-1">
                            {deal.title}
                          </h4>
                          <p className="text-xs text-gray-500 leading-normal">
                            {deal.description}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRedeemRewardCode(deal)}
                        disabled={!canClaim}
                        className={`text-xs px-4 py-2 rounded-xl font-display font-bold uppercase shrink-0 transition-colors cursor-pointer ${
                          canClaim 
                            ? "bg-brand-red text-white hover:bg-[#b51c12]" 
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        Claim
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* General Deals vouchers section */}
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-1 border-b border-gray-100 pb-2">
                <h3 className="font-display font-extrabold text-lg text-brand-dark">
                  Active Vouchers & Limited-Time Banners
                </h3>
                <p className="text-xs text-gray-500">Apply coupon codes to your shopping tray instantly</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {LIVE_DEALS.filter(d => !d.isPremiumRewards).map((deal) => {
                  const isCouponApplied = activeCoupon?.id === deal.id;

                  return (
                    <div
                      key={deal.id}
                      className="bg-white rounded-3xl overflow-hidden border border-gray-200 flex flex-col justify-between hover:shadow-md transition-shadow relative"
                    >
                      {/* Urgency countdown indicator pill */}
                      {deal.urgencyDaysLeft !== undefined && (
                        <span className="absolute top-3.5 right-3.5 bg-brand-red text-white font-mono text-[9px] px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse border border-[#ffd52c]">
                          <Clock className="w-2.5 h-2.5 text-[#fff444]" /> Only {deal.urgencyDaysLeft}d Left
                        </span>
                      )}

                      <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-4xl mb-2">{deal.image}</div>
                          <span className="text-[10px] uppercase font-bold text-brand-red tracking-wider">
                            {deal.category} Promo Coupon
                          </span>
                          <h4 className="font-display font-extrabold text-sm text-brand-dark leading-snug mt-1">
                            {deal.title}
                          </h4>
                          <p className="text-xs text-gray-500 leading-normal mt-1">
                            {deal.description}
                          </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-2 px-3 border border-dashed border-gray-300 flex items-center justify-between text-xs text-semibold">
                          <span>Usage Code:</span>
                          <span className="font-mono font-bold text-brand-dark bg-brand-yellow/30 px-2 py-0.5 rounded">
                            {deal.code}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                        {isCouponApplied ? (
                          <button
                            onClick={() => setActiveCoupon(null)}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" /> Code Active
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (subtotal < deal.minimumSpend) {
                                alert(`Requires a minimum purchase value of $${deal.minimumSpend.toFixed(2)}. Add more food first!`);
                                return;
                              }
                              setActiveCoupon(deal);
                              setDealNotification(`Applied Coupon ${deal.code}! $${deal.discountValue.toFixed(2)} deducted.`);
                              setTimeout(() => setDealNotification(null), 4000);
                            }}
                            className="w-full bg-brand-red hover:bg-[#b51c12] text-white text-xs font-bold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Apply this coupon
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ================= VIEW: RESTAURANT FINDER ================= */}
        {activeTab === "finder" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header Title */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark">
                Golden Arches Geolocation Store Finder
              </h2>
              <p className="text-xs text-gray-500">Find operating outlets, drive-thru lanes, and McCafé coffee services.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Side Sidebar store query directory */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-widest text-[#666]">Store Search Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={storeSearchQuery}
                        onChange={(e) => setStoreSearchQuery(e.target.value)}
                        placeholder="Search street, zip, or city..."
                        className="w-full p-2.5 pl-9 text-xs outline-none focus:ring-1 focus:ring-brand-yellow font-sans border-2 border-gray-100 bg-gray-50 rounded-xl focus:border-brand-yellow"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  {/* Drive-thru quick checkbox filter */}
                  <div className="flex items-center gap-2 pt-3">
                    <input
                      type="checkbox"
                      id="dt-filter"
                      checked={storeFilterDriveThru}
                      onChange={(e) => setStoreFilterDriveThru(e.target.checked)}
                      className="w-4 h-4 text-brand-red border-gray-300 rounded focus:ring-brand-yellow focus:ring-2"
                    />
                    <label htmlFor="dt-filter" className="text-xs font-semibold text-gray-700 cursor-pointer">
                      Only show locations offering 24h Drive-Thru
                    </label>
                  </div>
                </div>

                <div className="space-y-3 mt-4 overflow-y-auto max-h-[380px] pr-1">
                  {filteredStores.map((store) => (
                    <div
                      key={store.id}
                      className="p-3.5 bg-gray-50 hover:bg-[#FFFDF4] rounded-xl border border-gray-200/90 transition-all cursor-pointer hover:border-brand-yellow relative group"
                    >
                      <div className="flex items-center justify-between text-xs font-mono font-bold text-brand-red">
                        <span>{store.hours}</span>
                        <span className="bg-white/80 px-2 rounded-full border border-gray-200">
                          {store.distance} mi away
                        </span>
                      </div>
                      
                      <h4 className="font-display font-extrabold text-sm text-brand-dark mt-1">
                        {store.name}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-normal">
                        {store.address}
                      </p>

                      {/* Amenities checklist icons */}
                      <div className="flex gap-2 items-center text-[10px] font-semibold text-gray-600 mt-2.5">
                        {store.hasDriveThru && (
                          <span className="bg-yellow-500/10 text-amber-900 px-1.5 py-0.5 rounded">Drive-Thru</span>
                        )}
                        {store.hasMcCafe && (
                          <span className="bg-orange-500/10 text-orange-900 px-1.5 py-0.5 rounded">McCafé</span>
                        )}
                        {store.hasPlayplace && (
                          <span className="bg-purple-500/10 text-purple-900 px-1.5 py-0.5 rounded">Playplace</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {filteredStores.length === 0 && (
                    <div className="py-6 text-center text-xs text-gray-400 font-medium">
                      No outlets found matching chosen radius constraints or search queries.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side Visual Simulated Map Canvas */}
              <div className="lg:col-span-7 bg-[#FFFDEC] rounded-2xl border-2 border-dashed border-brand-yellow/70 overflow-hidden min-h-[350px] relative flex flex-col justify-between p-6">
                
                {/* Visual Grid Mock Elements for San Francisco map lines */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  {/* Fake map drawing lines */}
                  <div className="absolute left-1/4 h-full w-0.5 bg-gray-800" />
                  <div className="absolute left-2/4 h-full w-1 bg-gray-800/80" />
                  <div className="absolute top-1/3 w-full h-0.5 bg-gray-800" />
                  <div className="absolute top-2/3 w-full h-0.5 bg-gray-800" />
                </div>

                <div className="relative text-center max-w-sm mx-auto space-y-3 my-auto">
                  <div className="p-3.5 bg-brand-red text-brand-yellow rounded-full inline-flex border-2 border-white shadow-md animate-bounce-slow">
                    <MapPin className="w-8 h-8 text-brand-yellow fill-brand-red" />
                  </div>
                  <h3 className="font-display font-black text-brand-dark text-base tracking-tight">
                    Interactive Local Store Map Simulator
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Interactive map interface overlay pinpointing SOMA Plaza, Downtown Plaza, Fisherman's Wharf, and Sunset Boulevard outlets. Select a store from the sidebar to set as your primary checkout hub.
                  </p>
                </div>

                <div className="relative bg-white/95 backdrop-blur-sm px-4 py-3 border border-gray-200/90 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping" />
                    <span className="font-medium text-gray-700">Simulating Location: Market St, San Francisco, CA</span>
                  </div>
                  <button 
                    onClick={() => alert("Simulating actual browser GPS access... Permission set! Geolocation coordinates: [37.7885, -122.3995]")}
                    className="text-xs font-bold text-brand-red hover:underline uppercase tracking-wide cursor-pointer"
                  >
                    Simulate Live GPS Trigger
                  </button>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= VIEW: ORDER CHECKOUT & DYNAMIC UPSELL ================= */}
        {activeTab === "checkout" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark">
                Your Digital Ordering Tray
              </h2>
              <p className="text-xs text-gray-500">Confirm items, claim custom coupon code reductions, and purchase.</p>
            </div>

            {checkoutSimDone ? (
              <div className="max-w-md mx-auto text-center p-8 bg-white border border-gray-200 rounded-3xl shadow-sm space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-3xl mx-auto border-2 border-emerald-500">
                  🍔
                </div>
                <div>
                  <h3 className="font-display font-black text-brand-dark text-lg">
                    Order cooking at SOMA Express!
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Receipt #ARCH-{Math.floor(Math.random() * 8000 + 1000)} generated. Your order is placed into the queue.
                  </p>
                </div>

                {lastOrderDetails && (
                  <div className="bg-neutral-50 p-4 rounded-xl border border-gray-200 text-xs text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Total Charged:</span>
                      <strong className="font-mono text-brand-red font-bold">${lastOrderDetails.totalPayed.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Size Count:</span>
                      <strong>{lastOrderDetails.itemsCount} Hot Items</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Simulation Status:</span>
                      <strong className="text-green-600">Pending Pickup (8 mins)</strong>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <div className="bg-yellow-500/10 border border-brand-yellow/30 p-2.5 rounded-lg text-xs font-semibold text-brand-gold flex items-center gap-1">
                    <Award className="w-4 h-4 shrink-0 fill-brand-yellow text-brand-gold" />
                    <span>+120 Golden Points credited to your account!</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setCheckoutSimDone(false); setLastOrderDetails(null); }}
                    className="w-full bg-brand-yellow hover:bg-[#e5a010] text-brand-dark py-3 rounded-xl font-display font-bold text-xs uppercase"
                  >
                    View active layout details
                  </button>
                  <button
                    onClick={() => { setActiveTab("menu"); setCheckoutSimDone(false); setLastOrderDetails(null); }}
                    className="w-full bg-brand-red hover:bg-[#b51c12] text-white py-3 rounded-xl font-display font-bold text-xs uppercase"
                  >
                    Go Back to Menu
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Left Side: Order items itemized list */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {cart.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
                      <span className="text-5xl">🛒</span>
                      <h3 className="font-display font-bold text-sm text-gray-500">Your tray is currently empty.</h3>
                      <button
                        onClick={() => { setActiveTab("menu"); setFilteredMenu(MENU_ITEMS); }}
                        className="bg-brand-red text-white font-display font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl border-b-2 border-amber-400 hover:bg-[#b01e15]"
                      >
                        Explore our hot menu selections
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center text-xs font-bold text-brand-dark uppercase">
                        <span>Items Selected</span>
                        <span>{cart.reduce((a, b) => a + b.quantity, 0)} Items Added</span>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {cart.map((item) => (
                          <div key={item.menuItem.id} className="p-4 flex items-center justify-between gap-4">
                            <div className="flex gap-3 items-center">
                              <span className="text-3xl bg-gray-100 p-1.5 rounded-xl">{item.menuItem.image}</span>
                              <div>
                                <h4 className="font-display font-bold text-sm tracking-tight text-brand-dark">
                                  {item.menuItem.name}
                                </h4>
                                <span className="font-mono text-xs font-semibold text-brand-red">
                                  ${item.menuItem.price.toFixed(2)} each
                                </span>
                              </div>
                            </div>

                            {/* Qty Counter selectors */}
                            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-xl">
                              <button
                                onClick={() => handleUpdateQty(item.menuItem.id, -1)}
                                className="bg-white hover:bg-gray-200 border border-gray-200/50 text-gray-700 p-1 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-mono font-bold text-brand-dark">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQty(item.menuItem.id, 1)}
                                className="bg-white hover:bg-gray-200 border border-gray-200/50 text-gray-700 p-1 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* HIGH VALUE DYNAMIC AI UPSELL COMPONENT */}
                  {cart.length > 0 && upsellItem && (
                    <div className="bg-gradient-to-tr from-[#DA291C]/5 via-[#FFC72C]/5 to-white rounded-2xl p-5 border-2 border-brand-yellow relative overflow-hidden animate-in fade-in slide-in-from-bottom duration-300">
                      
                      {/* Decorative backdrop indicator */}
                      <Sparkles className="absolute -right-3 -top-3 w-16 h-16 text-brand-yellow/30 pointer-events-none rotate-12" />

                      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-3.5 items-center">
                          <span className="text-4xl bg-[#FFFDEC] p-2.5 rounded-full border border-brand-yellow/40 shadow-inner shrink-0 scale-100 hover:scale-110 duration-200">
                            {upsellItem.image}
                          </span>
                          <div>
                            <span className="inline-flex items-center gap-1 bg-brand-red text-white text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full border border-brand-yellow leading-none animate-pulse">
                              <Sparkles className="w-3 h-3 text-brand-yellow" /> Recommended pairing
                            </span>
                            <h4 className="font-display font-extrabold text-sm text-brand-dark mt-1.5">
                              Add the {upsellItem.name}?
                            </h4>
                            <p className="text-xs text-gray-600 leading-relaxed font-sans mt-1">
                              {upsellPitch || `Claim this classic alongside your meal!`}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddToCart(upsellItem)}
                          className="w-full sm:w-auto bg-brand-yellow hover:bg-[#e2a212] text-brand-dark font-display font-extrabold text-xs tracking-wider uppercase px-4 py-2.5 rounded-xl border border-[#FFF] hover:scale-105 duration-150 transition-all shrink-0 cursor-pointer"
                        >
                          + Add for ${upsellItem.price.toFixed(2)}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Side: Tray checkout math and submit */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <h3 className="font-display font-extrabold text-base text-brand-dark">
                    Tray Total Summary
                  </h3>

                  {/* Delivery vs Pickup Selector option */}
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button className="flex-1 bg-white hover:bg-neutral-100 text-brand-dark py-2 rounded-lg text-xs font-bold font-display uppercase tracking-wider shadow-sm flex items-center justify-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-brand-red" /> Delivery
                    </button>
                    <button className="flex-1 bg-transparent text-gray-500 py-2 rounded-lg text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-1">
                      <Navigation className="w-3.5 h-3.5" /> Self Pick-up
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs font-medium text-gray-700">
                    <div className="flex justify-between">
                      <span>Tray Subtotal:</span>
                      <span className="font-mono">${subtotal.toFixed(2)}</span>
                    </div>

                    {activeCoupon && (
                      <div className="flex justify-between text-emerald-600 font-semibold bg-emerald-50 p-1.5 rounded">
                        <span className="flex items-center gap-1">🏷️ Promo Code ({activeCoupon.code}):</span>
                        <span className="font-mono">-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-gray-500">
                        Delivery Surcharge:
                        {subtotal > 15 ? (
                          <span className="text-[10px] uppercase font-bold text-emerald-600 font-mono bg-green-50 px-1 rounded border border-green-200">FREE OVER $15</span>
                        ) : null}
                      </span>
                      <span className="font-mono">${deliveryFee.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Estimated State Taxes (8.5%):</span>
                      <span className="font-mono">${estimatedTax.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm font-bold text-brand-dark pt-2.5 border-t border-gray-100">
                      <span>Total Payable:</span>
                      <span className="font-mono text-brand-red text-base font-black">${grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Coupon prompt bar */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Coupon Discount Code</label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g., FREEFRIES"
                        id="promo-code-input"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                      />
                      <button 
                        onClick={() => {
                          const inputElement = document.getElementById("promo-code-input") as HTMLInputElement;
                          const typed = inputElement ? inputElement.value.trim().toUpperCase() : "";
                          const matched = LIVE_DEALS.find(d => d.code === typed);
                          if (matched) {
                            if (subtotal < matched.minimumSpend) {
                              alert(`The code requires a minimum purchase of $${matched.minimumSpend.toFixed(2)}.`);
                              return;
                            }
                            setActiveCoupon(matched);
                            setDealNotification(`Applied Promo Code: ${matched.code}`);
                            setTimeout(() => setDealNotification(null), 4000);
                          } else {
                            alert("Invalid discount code. Try entering FREEFRIES or DOUBLETASTE!");
                          }
                        }}
                        className="bg-brand-dark hover:bg-neutral-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleCompleteOrder}
                    disabled={cart.length === 0}
                    className="w-full bg-brand-red hover:bg-[#b01c13] text-white py-3.5 rounded-2xl font-display font-extrabold text-sm uppercase tracking-wider relative border-b-4 border-amber-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:scale-[1.01] duration-100"
                  >
                    🚀 Lock-in & complete cooking order
                  </button>

                  <div className="text-center">
                    <span className="text-[10px] text-gray-400 font-mono">
                      Safe simulated transaction. No actual currencies required.
                    </span>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ================= VIEW: APP LANDING PAGE ================= */}
        {activeTab === "app" && (
          <div className="space-y-8 py-6 max-w-5xl mx-auto animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <span className="inline-flex items-center gap-1 bg-brand-red text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-brand-yellow">
                  <Smartphone className="w-3.5 h-3.5 text-brand-yellow" />
                  ARCHES MOBILE EXTRAS
                </span>
                <h2 className="font-display font-black text-3xl lg:text-4xl text-brand-dark leading-tight">
                  Enjoy the Golden Arches app in your palm
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed font-sans">
                  The absolute core. Save your customized dietary targets, claim VIP high-percentage coupon incentives, and purchase in 1-tap with built-in sandbox Apple/Google pay tokens on mobile. 68% of returning eaters prefer app delivery.
                </p>

                <div className="space-y-2 pb-2">
                  <div className="flex gap-2.5 items-center text-xs font-semibold text-brand-dark">
                    <div className="w-5 h-5 bg-yellow-500/10 text-brand-red border border-yellow-500/20 rounded-full flex items-center justify-center font-bold">1</div>
                    <span>One-Tap Reordering of your simulated past burgers.</span>
                  </div>
                  <div className="flex gap-2.5 items-center text-xs font-semibold text-brand-dark">
                    <div className="w-5 h-5 bg-yellow-500/10 text-brand-red border border-yellow-500/20 rounded-full flex items-center justify-center font-bold">2</div>
                    <span>Earn points and pay zero on sweet McCafé lattes.</span>
                  </div>
                  <div className="flex gap-2.5 items-center text-xs font-semibold text-brand-dark">
                    <div className="w-5 h-5 bg-yellow-500/10 text-brand-red border border-yellow-500/20 rounded-full flex items-center justify-center font-bold">3</div>
                    <span>GPS active directions directly tracking delivery riders.</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => alert("Redirecting to simulated App Store interface...")} className="bg-brand-dark hover:bg-neutral-800 text-white font-display font-bold py-3 px-5 rounded-2xl text-xs uppercase tracking-wider cursor-pointer">
                    App Store
                  </button>
                  <button onClick={() => alert("Redirecting to simulated Google Play Store interface...")} className="bg-brand-dark hover:bg-neutral-800 text-white font-display font-bold py-3 px-5 rounded-2xl text-xs uppercase tracking-wider cursor-pointer">
                    Play Store
                  </button>
                </div>
              </div>

              {/* High-fidelity Visual Smartphone layout Mockup */}
              <div className="bg-[#27251F] border-[12px] border-[#3a3934] rounded-[44px] h-[480px] p-5 shadow-2xl relative flex flex-col justify-between text-white overflow-hidden/80">
                
                {/* Smartphone top camera pill notch */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 bg-[#3a3934] w-24 h-4 rounded-full" />
                
                {/* Simulated inner screen */}
                <div className="flex-1 rounded-[24px] bg-red-65 bg-brand-red my-1 border border-brand-yellow/30 p-4 relative flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] font-mono tracking-widest text-[#fff]">
                    <span>Golden Club UI</span>
                    <span>100% Cooked</span>
                  </div>

                  <div className="space-y-2 text-center max-w-sm mx-auto">
                    <span className="text-4xl text-center select-none block">🍟</span>
                    <h3 className="font-display font-black text-brand-yellow text-lg leading-tight uppercase">
                      Exclusive App Reward Locked
                    </h3>
                    <p className="text-[10px] text-gray-200 leading-normal">
                      Scan your code to unlock a free McCafé sundae! Earn points on every single morning biscuit or bite.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="w-full bg-white text-brand-dark p-2 rounded-xl text-[10px] font-bold text-center uppercase tracking-wide">
                      SCAN ARCH-CODE IN RESTAURANT
                    </div>
                    {/* Simulated barcode bars */}
                    <div className="h-6 bg-white flex justify-around p-1 rounded">
                      {[1, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 2].map((w, index) => (
                        <div key={index} className="bg-black h-full" style={{ width: `${w * 2}px` }} />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW: NUTRITION HUB ================= */}
        {activeTab === "nutrition" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            
            {/* Header info */}
            <div>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark">
                Official Allergen & Nutrition Ledger
              </h2>
              <p className="text-xs text-gray-500">We display protein, fat, carbohydrates, and allergies on every signature recipe.</p>
            </div>

            {/* Quick checkbox allergens exclusion filters */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3.5">
              <h4 className="text-xs text-amber-900 uppercase tracking-widest font-bold">
                Check ingredients to flag specific items on our menu ledger
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "Milk", label: "Exclude Dairy / Milk" },
                  { key: "Gluten", label: "Exclude Gluten / Wheat" },
                  { key: "Egg", label: "Exclude Egg whites" },
                  { key: "Soy", label: "Exclude Soybean trace" }
                ].map((crit) => {
                  const existsExclusion = preferences.dietaryGoals.includes(crit.key);
                  return (
                    <button
                      key={crit.key}
                      onClick={() => {
                        setPreferences(prev => {
                          const goalExists = prev.dietaryGoals.includes(crit.key);
                          const nextGoals = goalExists 
                            ? prev.dietaryGoals.filter(g => g !== crit.key)
                            : [...prev.dietaryGoals, crit.key];
                          return { ...prev, dietaryGoals: nextGoals };
                        });
                      }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between pointer-events-auto cursor-pointer transition-colors ${
                        existsExclusion 
                          ? "bg-brand-red text-white border-brand-red" 
                          : "bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-yellow"
                      }`}
                    >
                      <span>{crit.label}</span>
                      {existsExclusion && <Check className="w-3.5 h-3.5 text-brand-yellow" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complete database ledger table list */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 font-display font-extrabold uppercase text-brand-dark tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Signature Meal</th>
                    <th className="p-4">Carbohydrates</th>
                    <th className="p-4 font-mono font-bold text-brand-red">Calories</th>
                    <th className="p-4">Protein</th>
                    <th className="p-4">Sodium</th>
                    <th className="p-4">Allergens Traced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {MENU_ITEMS.map((item) => {
                    const excludedMatched = preferences.dietaryGoals.some(g => item.allergens.includes(g));

                    return (
                      <tr 
                        key={item.id} 
                        className={`hover:bg-neutral-50 transition-colors ${excludedMatched ? "bg-red-50/15 text-gray-400 border border-dotted border-red-200" : "text-brand-dark"}`}
                      >
                        <td className="p-4 flex items-center gap-2 font-display font-bold">
                          <span className="text-xl shrink-0">{item.image}</span>
                          <div>
                            <span>{item.name}</span>
                            {excludedMatched && (
                              <span className="block text-[9px] text-brand-red font-bold uppercase tracking-wider mt-0.5">
                                ⚠️ Excluded by your settings
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-mono">{item.nutrition.carbs}g</td>
                        <td className="p-4 font-mono font-bold text-brand-red">{item.calories} kcal</td>
                        <td className="p-4 font-mono">{item.nutrition.protein}g</td>
                        <td className="p-4 font-mono text-gray-500">{item.nutrition.sodium} mg</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {item.allergens.map((alg) => (
                              <span 
                                key={alg} 
                                className={`text-[10px] uppercase font-bold font-mono px-1.5 py-0.5 rounded leading-none ${
                                  preferences.dietaryGoals.includes(alg) 
                                    ? "bg-brand-red text-white" 
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {alg}
                              </span>
                            ))}
                            {item.allergens.length === 0 && (
                              <span className="text-green-600 font-bold font-mono text-[10px] uppercase leading-none">NONE TRACED 🌿</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ================= VIEW: BRAND & STORY ================= */}
        {activeTab === "brand" && (
          <div className="space-y-6 max-w-4xl mx-auto py-6 animate-in fade-in duration-200 text-gray-700">
            <div className="space-y-3.5">
              <span className="inline-flex bg-brand-red text-white text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded">
                OVER 80 YEARS OF SAVORY TRADITIONS
              </span>
              <h2 className="font-display font-black text-2xl lg:text-3xl text-brand-dark leading-snug">
                Our Story: Feeding communities with affordable, delicious bites
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed font-sans">
                Driven by speed, consistency, and clean ingredients, we started as an adventurous hamburger venture and transformed food service layout dynamics around the globe. Every burger patty is built and checked according to strict safety regulations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2 shadow-sm">
                <h4 className="font-display font-extrabold text-sm text-brand-dark">Our Sustainability Pledge</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  We commit to 100% sustainable paper and packaging sourcing by our operations. 100% of Alaskan Pollock are sourced from MSC-certified sustainable wild fisheries.
                </p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2 shadow-sm">
                <h4 className="font-display font-extrabold text-sm text-brand-dark">Join Our Dynamic Kitchens</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Arches operates flexible shift workflows giving competitive remunerations. 82% of managers started as crew restaurant positions. Earn as you grow with us.
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#FFFDEC] rounded-2xl border border-brand-yellow/60 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-brand-gold fill-brand-yellow" />
              <span>
                <strong>Did you know?</strong> This complete visual interface is driven by unified data matrices mapping our exact menu, deals ledger, and store finder geolocation tags directly using Express proxy nodes.
              </span>
            </div>
          </div>
        )}

      </main>

      {/* 3. MENU DETAIL NUTRITION DETAILED SPEC MODAL */}
      {selectedNutritionItem && (
        <div className="fixed inset-0 bg-brand-dark/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header detail */}
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div className="flex gap-3.5 items-center">
                <span className="text-4xl bg-gray-50 p-2 rounded-xl">{selectedNutritionItem.image}</span>
                <div>
                  <h3 className="font-display font-extrabold text-brand-dark text-base tracking-tight leading-snug">
                    {selectedNutritionItem.name}
                  </h3>
                  <span className="text-xs text-gray-500 font-semibold uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded text-amber-900 mt-1 inline-block">
                    {selectedNutritionItem.calories} kcal
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNutritionItem(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 p-1.5 rounded-full text-xs font-semibold"
                title="Close Info"
              >
                ✕
              </button>
            </div>

            {/* Core Description block */}
            <div className="py-4 space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed leading-normal">
                {selectedNutritionItem.description}
              </p>

              {/* Nutrition Panel */}
              <div className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400">Nutritional Breakdown</h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-semibold">
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-mono block">Protein</span>
                    <strong className="text-sm font-bold text-brand-dark block mt-1">{selectedNutritionItem.nutrition.protein}g</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-mono block">Lipid Fat</span>
                    <strong className="text-sm font-bold text-brand-dark block mt-1">{selectedNutritionItem.nutrition.fat}g</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-mono block">Carbs</span>
                    <strong className="text-sm font-bold text-brand-dark block mt-1">{selectedNutritionItem.nutrition.carbs}g</strong>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-500 font-mono block">Sodium</span>
                    <strong className="text-sm font-mono font-bold text-brand-red block mt-1">{selectedNutritionItem.nutrition.sodium}mg</strong>
                  </div>
                </div>
              </div>

              {/* Allergens warning */}
              <div className="space-y-1.5 pt-1">
                <h4 className="text-xs uppercase tracking-wider font-bold text-gray-400">Allergen Traces Checked</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedNutritionItem.allergens.map((alg) => (
                    <span key={alg} className="bg-red-100 text-red-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                      Traces of {alg}
                    </span>
                  ))}
                  {selectedNutritionItem.allergens.length === 0 && (
                    <span className="bg-green-100 text-green-800 text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono">
                      100% Allergen-free 🌿
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick action button */}
            <div className="pt-2 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => {
                  handleAddToCart(selectedNutritionItem);
                  setSelectedNutritionItem(null);
                }}
                className="flex-1 bg-brand-yellow text-brand-dark py-3 rounded-xl font-display font-extrabold text-xs uppercase tracking-wider shadow-sm hover:bg-[#e4ad11]"
              >
                Add Meal to Shop Tray
              </button>
              <button
                onClick={() => setSelectedNutritionItem(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 4. FOOTER REGIONS */}
      <footer className="bg-brand-dark text-white p-8 mt-12 border-t-4 border-brand-yellow">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <h4 className="font-display font-extrabold text-base text-brand-yellow">
              GOLDEN ARCHES
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Our AI Kitchen ordering platform pairs iconic colors and styling with active, server-side Google Gemini decision engines.
            </p>
          </div>

          <div className="space-y-3.5">
            <h5 className="font-display font-bold text-xs uppercase text-brand-yellow tracking-widest">
              Platform Features
            </h5>
            <ul className="space-y-1.5 text-xs text-gray-300">
              <li>· Interactive Gemini Assisting</li>
              <li>· Smart Natural Searches</li>
              <li>· Custom Photographic Identification</li>
              <li>· Conversational Upselling Pitching</li>
            </ul>
          </div>

          <div className="space-y-3.5">
            <h5 className="font-display font-bold text-xs uppercase text-white tracking-widest">
              Simulation Tools
            </h5>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li>· Morning Breakfast Simulator</li>
              <li>· Late-Night College Burger Simulator</li>
              <li>· Allergy Restricted Filtering</li>
              <li>· GPS Location Coordinates</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-display font-bold text-xs uppercase text-white tracking-widest">
              Digital Download
            </h5>
            <p className="text-xs text-gray-400">Scan code on app mock frame is functional to collect rewards.</p>
            <div className="text-xs font-bold text-brand-yellow underline hover:no-underline cursor-pointer">
              Privacy, Safety & Cookie Metrics
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto border-t border-gray-800 pt-5 mt-6 text-center text-xs text-gray-500 font-mono flex flex-col md:flex-row justify-between items-center gap-3">
          <span>© {new Date().getFullYear()} Golden Arches Corp. All rights reserved.</span>
          <span>Crafted with server-side Gemini 3.5 AI APIs</span>
        </div>
      </footer>

      {/* 5. DYNAMIC FLOATING AI ASSISTANT CHAT GLOBALLY MOUNTED */}
      <AIAssistant onAddToCart={handleAddToCart} />

    </div>
  );
}
