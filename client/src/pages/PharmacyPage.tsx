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
  QrCode
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { Medicine, Pharmacy, PharmacyOrder } from '../types/index.js';

export const PharmacyPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [rxOnly, setRxOnly] = useState<boolean | null>(null);

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

  const loadHospitalPharmacy = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/pharmacy/hospital-pharmacy', { headers });
      if (res.ok) {
        const data = await res.json();
        setPharmacy(data.pharmacy);
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
    setCartOpen(true);
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
            medicine_name: `${it.medicine.brand_name} (${it.medicine.name})`,
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
        {/* Pharmacy Banner (Hospital Linked) */}
        {pharmacy && (
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-blue-100">
                <Building className="w-3.5 h-3.5" />
                <span>Hospital-Linked Pharmacy (Primary Counter)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {pharmacy.name}
              </h1>
              <p className="text-sm text-blue-100 max-w-2xl flex items-center gap-2">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{pharmacy.location} • License: {pharmacy.license_number}</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-blue-200 pt-1">
                <span>🕒 {pharmacy.operating_hours}</span>
                <span>📞 Hotline: {pharmacy.contact_phone}</span>
                <span>🚚 Home Delivery Available (₹{pharmacy.delivery_fee})</span>
              </div>
            </div>

            <button
              onClick={() => setCartOpen(true)}
              className="relative px-5 py-3 rounded-2xl bg-white text-blue-700 font-extrabold text-sm shadow-lg hover:bg-blue-50 flex items-center gap-2 transition-transform hover:scale-105 shrink-0"
            >
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <span>Cart ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-black animate-bounce">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Search & Category Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by brand name, generic formulation, manufacturer (e.g., Telma, Pan 40, Dolo)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
          {medicines.map((med) => (
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
                      {med.stock_quantity > 0 ? `${med.stock_quantity} units available` : 'Out of stock'}
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

                <button
                  onClick={() => addToCart(med)}
                  disabled={(med.stock_quantity ?? 10) === 0}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Confirmation Banner / Modal */}
        {orderConfirmed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 text-center border border-green-500/30 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Medicine Order Confirmed!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Order Reference: <span className="font-bold text-blue-600">{orderConfirmed.order_number}</span>
              </p>

              {orderConfirmed.pickup_code && (
                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-200">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Hospital Express Counter Pickup Token
                  </div>
                  <div className="text-3xl font-black tracking-widest text-blue-700 dark:text-blue-300 my-1">
                    {orderConfirmed.pickup_code}
                  </div>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400">
                    Present this code at {orderConfirmed.pharmacy_name || 'CareSphere Pharmacy Desk'} for instant collection.
                  </p>
                </div>
              )}

              <div className="text-xs text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1">
                <div>Fulfillment: <span className="font-bold capitalize">{orderConfirmed.fulfillment_type.replace('_', ' ')}</span></div>
                <div>Amount Paid: <span className="font-bold">₹{orderConfirmed.total_amount}</span> (Online Simulated)</div>
                <div>Status: <span className="font-bold uppercase text-green-600">{orderConfirmed.status}</span></div>
              </div>

              <button
                onClick={() => setOrderConfirmed(null)}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md"
              >
                Close & Continue
              </button>
            </div>
          </div>
        )}

        {/* Sliding Cart Drawer */}
        {cartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full p-6 flex flex-col justify-between shadow-2xl overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-extrabold text-base text-slate-900 dark:text-white">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                    <span>Hospital Pharmacy Cart</span>
                  </div>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Your medicine cart is empty.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.medicine.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.medicine.brand_name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            ₹{item.medicine.selling_price || 95} each
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(item.medicine.id, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold"
                          >
                            -
                          </button>
                          <span className="font-extrabold">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.medicine.id, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fulfillment Option */}
                {cart.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <label className="font-bold text-slate-900 dark:text-white block">
                      Choose Fulfillment Type:
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('hospital_pickup')}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-bold border transition-all flex flex-col items-center gap-1 ${
                          fulfillmentType === 'hospital_pickup'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Building className="w-4 h-4" />
                        <span>Counter Pickup (Free)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFulfillmentType('home_delivery')}
                        className={`flex-1 py-2.5 px-3 rounded-xl font-bold border transition-all flex flex-col items-center gap-1 ${
                          fulfillmentType === 'home_delivery'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Truck className="w-4 h-4" />
                        <span>Home Delivery (+₹{pharmacy?.delivery_fee || 50})</span>
                      </button>
                    </div>

                    {fulfillmentType === 'home_delivery' && (
                      <textarea
                        rows={2}
                        placeholder="Complete Delivery Address with Landmark & Pincode..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                      />
                    )}

                    <input
                      type="tel"
                      placeholder="Contact Phone Number (+91-...)"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Checkout Action */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal:</span>
                      <span>₹{subtotal}</span>
                    </div>
                    {fulfillmentType === 'home_delivery' && (
                      <div className="flex justify-between text-slate-500">
                        <span>Delivery Fee:</span>
                        <span>₹{deliveryFee}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-base text-slate-900 dark:text-white pt-1 border-t">
                      <span>Total Amount:</span>
                      <span>₹{grandTotal}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={ordering}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>{ordering ? 'CONFIRMING ORDER...' : `CONFIRM ORDER (₹${grandTotal})`}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
