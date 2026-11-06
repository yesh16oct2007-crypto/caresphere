import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Building,
  Download,
  Stethoscope,
  Info,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext.js';
import { LabTest, LabBooking } from '../types/index.js';

export const LabBookingPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();

  const [tests, setTests] = useState<LabTest[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [search, setSearch] = useState<string>('');
  const [fastingFilter, setFastingFilter] = useState<boolean | null>(null);

  // Booking Modal State
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [bookingDate, setBookingDate] = useState<string>('');
  const [bookingTime, setBookingTime] = useState<string>('08:30 AM');
  const [bookingNotes, setBookingNotes] = useState<string>('');
  const [bookingLoading, setBookingLoading] = useState<boolean>(false);
  const [confirmedBooking, setConfirmedBooking] = useState<LabBooking | null>(null);

  const categories = [
    'All',
    'Hematology',
    'Biochemistry',
    'Diabetology',
    'Endocrinology',
    'Vitamins',
    'Clinical Pathology',
    'Radiology',
    'Cardiology Diagnostics'
  ];

  const timeSlots = [
    '07:30 AM',
    '08:00 AM',
    '08:30 AM',
    '09:00 AM',
    '09:30 AM',
    '10:00 AM',
    '11:00 AM',
    '02:00 PM',
    '04:30 PM'
  ];

  useEffect(() => {
    loadHospitals();
    if (isAuthenticated) {
      loadRecommendedTests();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCatalogue();
  }, [selectedHospitalId, selectedCategory, search]);

  const loadHospitals = async () => {
    try {
      const res = await fetch('/api/hospitals');
      if (res.ok) {
        const data = await res.json();
        setHospitals(data.hospitals || []);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    }
  };

  const loadCatalogue = async () => {
    try {
      let url = `/api/lab/catalogue?hospital_id=${selectedHospitalId}`;
      if (selectedCategory && selectedCategory !== 'All') url += `&category=${encodeURIComponent(selectedCategory)}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (err) {
      console.error('Failed to load lab catalogue:', err);
    }
  };

  const loadRecommendedTests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/lab/recommended', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRecommended(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to load recommended tests:', err);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTest || !bookingDate || !bookingTime) return;

    setBookingLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/lab/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          hospital_id: selectedHospitalId,
          test_id: selectedTest.id,
          booking_date: bookingDate,
          booking_time: bookingTime,
          notes: bookingNotes || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfirmedBooking(data.booking);
        setSelectedTest(null);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to book slot.');
      }
    } catch (err) {
      console.error('Booking error:', err);
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-teal-700 via-cyan-700 to-blue-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-teal-500/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-teal-100">
              <FlaskConical className="w-3.5 h-3.5" />
              <span>NABL & ICMR Accredited Diagnostic Labs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Clinical Laboratory & Diagnostic Booking
            </h1>
            <p className="text-sm text-teal-100 max-w-2xl">
              Schedule clinical pathology, blood biochemistry, and diagnostic imaging. Completed laboratory reports are automatically certified and synced to your Digital Medical Records Vault.
            </p>
          </div>

          {/* Hospital Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shrink-0">
            <label className="text-[10px] uppercase font-bold tracking-wider text-teal-100 block mb-1">
              Select Diagnostic Center
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
              className="bg-white text-slate-900 dark:bg-slate-800 dark:text-white px-3 py-1.5 rounded-xl text-xs font-bold outline-none"
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.city})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Doctor-Recommended Tests for Logged-in Patient */}
        {recommended.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-5 border border-amber-200 dark:border-amber-800/60 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-sm">
              <Stethoscope className="w-4 h-4 text-amber-600" />
              <span>Doctor-Recommended Investigations for You ({recommended.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recommended.map((rec) => (
                <div
                  key={rec.recommendation_id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-amber-200 dark:border-amber-700/60 flex flex-col justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      {rec.urgency}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                      {rec.test_name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Prescribed by {rec.doctor_name} ({rec.prescription_number})
                    </p>
                    {rec.instructions && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1 italic">
                        "{rec.instructions}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const matched = tests.find(
                        (t) =>
                          t.name.toLowerCase() === rec.test_name.toLowerCase() ||
                          t.test_code === rec.test_code
                      );
                      if (matched) {
                        setSelectedTest(matched);
                        setBookingDate(new Date().toISOString().slice(0, 10));
                      } else {
                        alert('This test can be booked at the hospital diagnostic reception.');
                      }
                    }}
                    className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    Book Recommended Slot
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search & Categories Filter */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by test name, test code, or disease (e.g., Lipid, CBC, Liver, Thyroid, HbA1c)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-bold">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tests Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test) => (
            <div
              key={test.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md">
                    {test.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    Code: {test.test_code}
                  </span>
                </div>

                <h3 className="font-extrabold text-base text-slate-900 dark:text-white line-clamp-1">
                  {test.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {test.description}
                </p>

                <div className="text-xs space-y-1 pt-1 text-slate-600 dark:text-slate-300">
                  <div>🧪 Sample: <span className="font-semibold">{test.sample_type}</span></div>
                  <div>⏱️ Turnaround: <span className="font-semibold">{test.turnaround_hours} Hours</span></div>
                  {test.fasting_required === 1 && (
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Fasting Required (8-12 hrs)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    ₹{test.hospital_price || test.base_price}
                  </div>
                  <div className="text-[10px] text-slate-400">Certified Digital Report</div>
                </div>

                <button
                  onClick={() => {
                    setSelectedTest(test);
                    setBookingDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Slot</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Booking Modal */}
        {selectedTest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 border border-teal-500/30 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-600" />
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Book Diagnostic Test Slot
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTest(null)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 text-xs space-y-1">
                <div className="font-extrabold text-sm">{selectedTest.name}</div>
                <div>Sample: {selectedTest.sample_type} • Price: ₹{selectedTest.hospital_price || selectedTest.base_price}</div>
                {selectedTest.preparation_instructions && (
                  <div className="text-amber-800 dark:text-amber-300 font-semibold pt-1">
                    Prep: {selectedTest.preparation_instructions}
                  </div>
                )}
              </div>

              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Test Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Preferred Time Slot *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((ts) => (
                      <button
                        type="button"
                        key={ts}
                        onClick={() => setBookingTime(ts)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all ${
                          bookingTime === ts
                            ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ts}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clinical Notes or Pre-existing Conditions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Taking anti-hypertensive medication; difficulty with vein puncture..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bookingLoading ? 'CONFIRMING APPOINTMENT...' : `CONFIRM LAB BOOKING (₹${selectedTest.hospital_price || selectedTest.base_price})`}</span>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {confirmedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 text-center border border-green-500/30 shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/60 text-green-600 mx-auto flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                Laboratory Slot Confirmed!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Booking Reference: <span className="font-bold text-teal-600">{confirmedBooking.booking_reference}</span>
              </p>

              <div className="text-xs text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 space-y-1.5">
                <div>Test: <span className="font-bold">{confirmedBooking.test_name}</span></div>
                <div>Hospital: <span className="font-bold">{confirmedBooking.hospital_name}</span></div>
                <div>Date & Time: <span className="font-bold">{confirmedBooking.booking_date} at {confirmedBooking.booking_time}</span></div>
                <div>Status: <span className="font-bold uppercase text-teal-600">{confirmedBooking.status}</span></div>
              </div>

              <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 text-xs">
                💡 Note: Once sample collection and analysis are complete, the verified report is automatically published directly into your Digital Medical Records Vault.
              </div>

              <button
                onClick={() => setConfirmedBooking(null)}
                className="w-full py-3 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md"
              >
                Close & View My Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
