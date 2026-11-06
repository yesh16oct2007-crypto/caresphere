import React, { useState, useEffect } from 'react';
import {
  Pill,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  Truck,
  Building,
  ShieldCheck,
  FileText,
  X,
  CreditCard,
  QrCode,
  Plus,
  Minus,
  ArrowLeftRight,
  Store,
  Sparkles,
  Check
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { Medicine, Pharmacy, PharmacyOrder } from '../types/index.js';

export const PharmacyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [allPharmacies, setAllPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyModalOpen, setPharmacyModalOpen] = useState(false);
  const [pharmacyTypeFilter, setPharmacyTypeFilter] = useState<'all' | 'hospital_counter' | 'retail_partner' | 'central_warehouse'>('all');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [rxOnly, setRxOnly] = useState<boolean | null>(null);

  // Add Specific Medicine Modal State
  const [addSpecificModalOpen, setAddSpecificModalOpen] = useState(false);
  const [specificTab, setSpecificTab] = useState<'catalogue' | 'custom'>('catalogue');
  const [customMedName, setCustomMedName] = useState('');
  const [customBrandName, setCustomBrandName] = useState('');
  const [customStrength, setCustomStrength] = useState('');
  const [customDosageForm, setCustomDosageForm] = useState('Tablet');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(95);
  const [customRxNotes, setCustomRxNotes] = useState('');

  // Cart State
  const [cart, setCart] = useState<{ medicine: Medicine; quantity: number }[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<'hospital_pickup' | 'home_delivery'>('hospital_pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [paymentMethod, setPaymentMethod] = useState('online_upi');
  const [ordering, setOrdering] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<PharmacyOrder | null>(null);

  const categories = [
    'All',
    'Cardiology',
    'Diabetology',
    'Antibiotics',
    'Analgesics & Antipyretics',
    'Gastroenterology',
    'Respiratory',
    'Vitamins & Supplements',
    'Pain Relief'
  ];

  useEffect(() => {
    loadHospitalPharmacy();
  }, [user]);

  useEffect(() => {
    if (pharmacy) {
      loadMedicines();
    }
  }, [pharmacy, search, selectedCategory, rxOnly]);

  const loadHospitalPharmacy = async (pharmacyId?: number) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = pharmacyId ? `/api/pharmacy/hospital-pharmacy?pharmacy_id=${pharmacyId}` : '/api/pharmacy/hospital-pharmacy';
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setPharmacy(data.pharmacy);
        if (data.all_pharmacies) {
          setAllPharmacies(data.all_pharmacies);
        }
      }

      // Also ensure we have the complete pharmacy list
      const listRes = await fetch('/api/pharmacy/list');
      if (listRes.ok) {
        const lData = await listRes.json();
        if (lData.pharmacies) setAllPharmacies(lData.pharmacies);
      }
    } catch (err) {
      console.error('Failed to load pharmacy:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async () => {
    if (!pharmacy) return;
    try {
      let url = `/api/pharmacy/medicines?pharmacy_id=${pharmacy.id}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (selectedCategory && selectedCategory !== 'All') url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (rxOnly !== null) url += `&prescription_required=${rxOnly ? 1 : 0}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMedicines(data.medicines || []);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  const addToCart = (med: Medicine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.medicine.id === med.id);
      if (existing) {
        return prev.map((item) =>
          item.medicine.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { medicine: med, quantity: 1 }];
    });
  };

  const updateCartQty = (medId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicine.id === medId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { medicine: Medicine; quantity: number }[]
    );
  };

  const handleAddCustomSpecificMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMedName.trim() || !customStrength.trim()) {
      alert('Please enter medicine name and strength.');
      return;
    }

    const customMed: Medicine = {
      id: Date.now(),
      name: customMedName.trim(),
      brand_name: customBrandName.trim() || customMedName.trim(),
      generic_name: customMedName.trim(),
      strength: customStrength.trim(),
      dosage_form: customDosageForm,
      manufacturer: 'Prescribed Formulation',
      category: 'Prescription Item',
      prescription_required: 1,
      selling_price: Number(customPrice) || 95,
      mrp_price: Math.round((Number(customPrice) || 95) * 1.15),
      stock_quantity: 100,
      description: customRxNotes || 'Specific prescribed formulation'
    };

    setCart((prev) => [...prev, { medicine: customMed, quantity: Math.max(1, customQuantity) }]);
    setAddSpecificModalOpen(false);
    setCustomMedName('');
    setCustomBrandName('');
    setCustomStrength('');
    setCustomDosageForm('Tablet');
    setCustomQuantity(1);
    setCustomPrice(95);
    setCustomRxNotes('');
    setCartOpen(true);
  };

  const subtotal = cart.reduce((acc, it) => acc + (it.medicine.selling_price || 95) * it.quantity, 0);
  const deliveryFee = fulfillmentType === 'home_delivery' ? (pharmacy?.delivery_fee || 50) : 0;
  const grandTotal = Math.round((subtotal + deliveryFee) * 100) / 100;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacy || cart.length === 0) return;
    if (!contactPhone) {
      alert('Please enter your contact phone number.');
      return;
    }
    if (fulfillmentType === 'home_delivery' && !deliveryAddress) {
      alert('Please enter your complete delivery address.');
      return;
    }

    setOrdering(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/pharmacy/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pharmacy_id: pharmacy.id,
          hospital_id: pharmacy.hospital_id,
          fulfillment_type: fulfillmentType,
          delivery_address: deliveryAddress || null,
          contact_phone: contactPhone,
          payment_method: paymentMethod,
          items: cart.map((it) => ({
            medicine_id: it.medicine.id,
            medicine_name: `${it.medicine.brand_name || it.medicine.name} (${it.medicine.strength || ''})`,
            strength: it.medicine.strength,
            dosage_form: it.medicine.dosage_form,
            quantity: it.quantity,
            unit_price: it.medicine.selling_price || 95
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setOrderConfirmed(data.order);
        setCart([]);
        setCartOpen(false);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to place order.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Pharmacy Banner with Pharmacy Switcher */}
        {pharmacy && (
          <div className="bg-gradient-to-r from-[#123B5D] via-[#144167] to-[#0D9488] rounded-3xl p-6 sm:p-8 text-white shadow-premium flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-teal-200 border border-white/20">
                  <Building className="w-3.5 h-3.5" />
                  <span>
                    {pharmacy.pharmacy_type === 'retail_partner'
                      ? 'Verified Partner Retail Pharmacy'
                      : pharmacy.pharmacy_type === 'central_warehouse'
                      ? 'CareSphere National Digital Warehouse'
                      : 'Hospital Campus Pharmacy Counter'}
                  </span>
                </div>
                <button
                  onClick={() => setPharmacyModalOpen(true)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span>Change Pharmacy / Partner Store ({allPharmacies.length})</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {pharmacy.name}
              </h1>
              <p className="text-sm text-teal-100 max-w-2xl flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0 text-teal-300" />
                <span>{pharmacy.location} • License: {pharmacy.license_number}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-teal-200 pt-1">
                <span>🕒 {pharmacy.operating_hours}</span>
                <span>📞 Hotline: {pharmacy.contact_phone}</span>
                <span>🚚 Delivery Fee: ₹{pharmacy.delivery_fee}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setAddSpecificModalOpen(true)}
                className="px-4 py-3 rounded-2xl bg-[#0D9488] hover:bg-[#0f766e] text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Specific Medicine</span>
              </button>

              <button
                onClick={() => setCartOpen(true)}
                className="relative px-5 py-3 rounded-2xl bg-white text-[#123B5D] font-extrabold text-sm shadow-lg hover:bg-teal-50 flex items-center gap-2 transition-transform hover:scale-105 cursor-pointer"
              >
                <ShoppingCart className="w-5 h-5 text-[#0D9488]" />
                <span>Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
                {cart.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-black animate-bounce">
                    {cart.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Search, Action Bar & Category Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search specific medicine, generic formulation, brand (e.g., Telma, Pan 40, Dolo)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setAddSpecificModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 whitespace-nowrap cursor-pointer transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Specific Medicine</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => setRxOnly(null)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  rxOnly === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                All Medicines
              </button>
              <button
                onClick={() => setRxOnly(false)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  rxOnly === false
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                OTC Only
              </button>
              <button
                onClick={() => setRxOnly(true)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  rxOnly === true
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                Rx Required
              </button>
            </div>
          </div>

          {/* Category Badges */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {medicines.map((med) => {
            const inCart = cart.find((item) => item.medicine.id === med.id);
            return (
              <div
                key={med.id}
                className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      {med.category}
                    </span>
                    {med.prescription_required === 1 ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        Rx Required
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300">
                        OTC
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                      {med.brand_name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {med.generic_name} • {med.strength}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Form: {med.dosage_form} | Mfr: {med.manufacturer}
                    </div>
                  </div>

                  {med.stock_quantity !== undefined && (
                    <div className="text-[11px] flex items-center gap-1.5 font-semibold">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          med.stock_quantity > 15 ? 'bg-green-500' : med.stock_quantity > 0 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-slate-600 dark:text-slate-300">
                        {med.stock_quantity > 0 ? `${med.stock_quantity} units in stock` : 'Out of stock'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      ₹{med.selling_price || 95}
                    </div>
                    {med.mrp_price && (
                      <div className="text-[10px] text-slate-400 line-through">
                        MRP ₹{med.mrp_price}
                      </div>
                    )}
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-1.5 bg-teal-50 dark:bg-teal-950/60 p-1 rounded-xl border border-teal-200 dark:border-teal-800">
                      <button
                        onClick={() => updateCartQty(med.id, -1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-white font-black text-sm flex items-center justify-center hover:bg-slate-100 shadow-xs cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-black text-[#0D9488] dark:text-teal-300">
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => updateCartQty(med.id, 1)}
                        className="w-7 h-7 rounded-lg bg-[#0D9488] text-white font-black text-sm flex items-center justify-center hover:bg-[#0f766e] shadow-xs cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(med)}
                      disabled={(med.stock_quantity ?? 10) === 0}
                      className="px-3.5 py-2 rounded-xl bg-[#123B5D] hover:bg-[#0D9488] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-subtle transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Order</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHARMACY SELECTOR / SWITCHER MODAL */}
      {/* ========================================================================= */}
      {pharmacyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  CareSphere Pharmacy Network
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-600" />
                  <span>Choose Dispensing Pharmacy or Partner Network</span>
                </h3>
              </div>
              <button
                onClick={() => setPharmacyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
              {[
                { id: 'all', label: 'All Stores' },
                { id: 'hospital_counter', label: 'Hospital Counters' },
                { id: 'retail_partner', label: 'Partner Retail Pharmacies' },
                { id: 'central_warehouse', label: 'Central Express Warehouse' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPharmacyTypeFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                    pharmacyTypeFilter === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pharmacies list */}
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {allPharmacies
                .filter((p) => (pharmacyTypeFilter === 'all' ? true : (p.pharmacy_type || 'hospital_counter') === pharmacyTypeFilter))
                .map((p) => {
                  const isSelected = pharmacy?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 ring-2 ring-blue-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                            {p.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.pharmacy_type === 'retail_partner'
                              ? 'Retail Partner'
                              : p.pharmacy_type === 'central_warehouse'
                              ? 'Central Warehouse'
                              : 'Hospital Counter'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.location}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-medium">
                          <span>🕒 {p.operating_hours}</span>
                          <span>📞 {p.contact_phone}</span>
                          <span>🚚 Delivery: ₹{p.delivery_fee}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setPharmacy(p);
                          setPharmacyModalOpen(false);
                        }}
                        className={`px-4 py-2 rounded-xl font-bold text-xs shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isSelected ? 'Current Store' : 'Select Store'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD SPECIFIC MEDICINE MODAL (PATIENT QUICK FORMULATION / CATALOGUE) */}
      {/* ========================================================================= */}
      {addSpecificModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                  Prescription Medicine Selector
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-emerald-600" />
                  <span>Add Specific Medicine to Your Order</span>
                </h3>
              </div>
              <button
                onClick={() => setAddSpecificModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
              <button
                onClick={() => setSpecificTab('catalogue')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  specificTab === 'catalogue'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Search In-Store Specific Medicines
              </button>
              <button
                onClick={() => setSpecificTab('custom')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  specificTab === 'custom'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                Add Prescribed Custom Formulation
              </button>
            </div>

            {specificTab === 'catalogue' ? (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Type medicine name or generic (e.g. Augmentin, Amlong, Dolo)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                />
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {medicines.slice(0, 8).map((med) => (
                    <div
                      key={med.id}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {med.brand_name} ({med.name})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {med.generic_name} • {med.strength} • {med.dosage_form}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-600">
                          ₹{med.selling_price || 95}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          addToCart(med);
                          setAddSpecificModalOpen(false);
                          setCartOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddCustomSpecificMedicine} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Medicine / Brand Name:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Augmentin Duo Oral Suspension or Insulin Glargine"
                    value={customMedName}
                    onChange={(e) => setCustomMedName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Strength / Potency:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 200mg/5ml or 100 IU/ml"
                      value={customStrength}
                      onChange={(e) => setCustomStrength(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Dosage Form:
                    </label>
                    <select
                      value={customDosageForm}
                      onChange={(e) => setCustomDosageForm(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup / Suspension</option>
                      <option value="Injection">Injection / Pen</option>
                      <option value="Inhaler">Inhaler / Respules</option>
                      <option value="Drops">Eye / Ear Drops</option>
                      <option value="Ointment">Gel / Ointment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantity Required:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Estimated Unit Price (₹):
                    </label>
                    <input
                      type="number"
                      min="10"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Notes / Doctor Directions:
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. As prescribed for 7 days post-meal"
                    value={customRxNotes}
                    onChange={(e) => setCustomRxNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddSpecificModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    Add to Cart Now
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-md h-full flex flex-col justify-between shadow-2xl p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600" />
                  <h2 className="font-extrabold text-lg text-slate-900 dark:text-white">
                    Order Cart ({cart.length})
                  </h2>
                </div>
                <button
                  onClick={() => setCartOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Add Specific Medicine inside Cart */}
              <button
                onClick={() => setAddSpecificModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Another Specific Medicine</span>
              </button>

              {/* Cart Items List */}
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                {cart.map((it) => (
                  <div
                    key={it.medicine.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 max-w-[200px]">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {it.medicine.brand_name || it.medicine.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {it.medicine.strength} • ₹{it.medicine.selling_price || 95} each
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          onClick={() => updateCartQty(it.medicine.id, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-white font-black text-xs flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-black">
                          {it.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(it.medicine.id, 1)}
                          className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="font-black text-xs text-slate-900 dark:text-white w-14 text-right">
                        ₹{(it.medicine.selling_price || 95) * it.quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fulfillment Options */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Select Fulfillment Mode
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFulfillmentType('hospital_pickup')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      fulfillmentType === 'hospital_pickup'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5" />
                      <span>Counter Pickup</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Express Token at Store Counter (FREE)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFulfillmentType('home_delivery')}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                      fulfillmentType === 'home_delivery'
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="font-extrabold flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Home Delivery</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Direct to Doorstep (+₹{pharmacy?.delivery_fee || 50})
                    </span>
                  </button>
                </div>

                {fulfillmentType === 'home_delivery' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Street Address:
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Flat/House number, Apartment, Landmark, Pincode..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Phone Number:
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Total & Checkout Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{subtotal}</span>
                </div>
                {fulfillmentType === 'home_delivery' && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Fee</span>
                    <span>₹{deliveryFee}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base text-slate-900 dark:text-white pt-1">
                  <span>Grand Total</span>
                  <span>₹{grandTotal}</span>
                </div>
              </div>

              <button
                disabled={ordering || cart.length === 0}
                onClick={handleCheckout}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-extrabold text-sm shadow-lg shadow-blue-500/25 transition-transform hover:scale-[1.02] cursor-pointer"
              >
                {ordering ? 'Placing Order...' : `Proceed to Pay ₹${grandTotal}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmed Modal */}
      {orderConfirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">
                Order Placed Successfully
              </span>
              <h3 className="font-black text-xl text-slate-900 dark:text-white">
                #{orderConfirmed.order_number}
              </h3>
              <p className="text-xs text-slate-500">
                Dispensing Pharmacy: {orderConfirmed.pharmacy_name || pharmacy?.name}
              </p>
            </div>

            {orderConfirmed.pickup_code && (
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 space-y-1 text-center">
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                  Express Counter Pickup Token
                </span>
                <div className="font-mono text-3xl font-black text-blue-700 dark:text-blue-300">
                  {orderConfirmed.pickup_code}
                </div>
                <p className="text-[11px] text-blue-600 dark:text-blue-400">
                  Present this token at the pharmacy counter to collect your prescribed package.
                </p>
              </div>
            )}

            <button
              onClick={() => setOrderConfirmed(null)}
              className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
            >
              Continue Shopping / Track Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};