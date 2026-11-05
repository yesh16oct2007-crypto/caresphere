import React, { useState, useEffect } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Accessibility,
  Building2,
  Search,
  ArrowRight,
  Layers,
  Phone,
  CheckCircle,
  Footprints,
  Info
} from 'lucide-react';
import { apiUrl } from '../services/api.js';
import { HospitalFloorMap, HospitalLocation } from '../types/index.js';

export const IndoorNavigationPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number>(1);
  const [activeFloor, setActiveFloor] = useState<number>(0);
  const [locations, setLocations] = useState<HospitalLocation[]>([]);
  const [floors, setFloors] = useState<HospitalFloorMap[]>([]);
  const [loading, setLoading] = useState(true);

  // Wayfinding states
  const [startPoint, setStartPoint] = useState<string>('Main Entrance Gate A');
  const [destinationId, setDestinationId] = useState<number | ''>('');
  const [wheelchairMode, setWheelchairMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [routeSteps, setRouteSteps] = useState<any[]>([]);
  const [calculatingRoute, setCalculatingRoute] = useState(false);

  useEffect(() => {
    // Fetch hospitals
    fetch(apiUrl('/api/hospital/facilities'))
      .catch(() => {});

    // Set demo hospitals
    setHospitals([
      { id: 1, name: 'CareSphere Central Hospital', city: 'Bengaluru' },
      { id: 2, name: 'CareSphere Metro Hospital', city: 'Chennai' },
      { id: 3, name: 'CareSphere City Hospital', city: 'Hyderabad' }
    ]);
  }, []);

  useEffect(() => {
    fetchHospitalMaps();
  }, [selectedHospitalId]);

  const fetchHospitalMaps = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiUrl(`/api/navigation/hospital/${selectedHospitalId}`));
      if (!res.ok) throw new Error('Failed to load navigation map');
      const data = await res.json();
      setFloors(data.floors || []);
      setLocations(data.locations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleComputeRoute = async () => {
    if (!destinationId) return;
    try {
      setCalculatingRoute(true);
      const res = await fetch(
        apiUrl(
          `/api/navigation/directions?hospital_id=${selectedHospitalId}&destination_id=${destinationId}&start_location=${encodeURIComponent(
            startPoint
          )}&wheelchair_accessible=${wheelchairMode ? '1' : '0'}`
        )
      );
      if (res.ok) {
        const data = await res.json();
        setRouteSteps(data.route?.steps || []);
        if (data.route?.destination?.floor_number !== undefined) {
          setActiveFloor(data.route.destination.floor_number);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCalculatingRoute(false);
    }
  };

  const currentFloorLocations = locations.filter((loc) => loc.floor_number === activeFloor);

  const selectedDestinationLocation = locations.find((l) => l.id === Number(destinationId));

  const filteredDestinations = locations.filter((loc) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.name.toLowerCase().includes(q) ||
      loc.location_type.toLowerCase().includes(q) ||
      (loc.room_number && loc.room_number.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
              <Compass className="w-6 h-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Hospital Indoor GPS & Multi-Floor Navigation
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Turn-by-turn indoor wayfinding from hospital entrance to consultation chambers, ICU, pharmacy, and diagnostic rooms.
          </p>
        </div>

        {/* Hospital Selector */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
          <Building2 className="w-4 h-4 text-teal-600 ml-1" />
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(Number(e.target.value))}
            className="text-xs font-semibold bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            {hospitals.map((h) => (
              <option key={h.id} value={h.id} className="dark:bg-slate-900">
                {h.name} ({h.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Navigator Sidebar (Left) vs Interactive Floor Map (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Navigator Controls (cols 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
            <h2 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-teal-600" />
              <span>Route Wayfinder</span>
            </h2>

            {/* Starting Point */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Starting Entrance / Gate
              </label>
              <select
                value={startPoint}
                onChange={(e) => setStartPoint(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="Main Entrance Gate A">Main Entrance Gate A (Reception)</option>
                <option value="Emergency Bay Gate B">Emergency Bay Gate B</option>
                <option value="Basement Parking Lift Lobby">Basement Parking Lift Lobby</option>
                <option value="OPD Diagnostic Corridor">OPD Diagnostic Corridor</option>
              </select>
            </div>

            {/* Destination Search & Select */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Destination Room / Department
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by room, ICU, doctor, lab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <select
                value={destinationId}
                onChange={(e) => setDestinationId(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Choose Target Location --</option>
                {filteredDestinations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    Floor {loc.floor_number}: {loc.name} {loc.room_number ? `(${loc.room_number})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Wheelchair Accessibility Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-800 text-xs">
              <div className="flex items-center gap-2">
                <Accessibility className="w-4 h-4 text-teal-600" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Wheelchair Accessible Route
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Bypasses stairs and prioritizes ramps and elevator lifts
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={wheelchairMode}
                onChange={(e) => setWheelchairMode(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
              />
            </div>

            {/* Get Directions Button */}
            <button
              onClick={handleComputeRoute}
              disabled={!destinationId || calculatingRoute}
              className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-medblue-600 hover:from-teal-700 hover:to-medblue-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calculatingRoute ? (
                <span>Plotting Shortest Path...</span>
              ) : (
                <>
                  <Footprints className="w-4 h-4" />
                  <span>Get Turn-by-Turn Directions</span>
                </>
              )}
            </button>
          </div>

          {/* Turn-by-Turn Wayfinding Steps */}
          {routeSteps.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Footprints className="w-4 h-4 text-teal-600" />
                  <span>Turn-by-Turn Guidance</span>
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 font-bold">
                  {routeSteps.length} Steps
                </span>
              </div>

              <div className="space-y-3">
                {routeSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 text-[11px]">
                      {step.step_number || idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{step.direction}</p>
                      {step.distance_meters && (
                        <span className="text-[10px] text-slate-400">~{step.distance_meters} meters</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Floor Maps Display (cols 8) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Floor Level Selector Tabs */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-1">
              <Layers className="w-4 h-4 text-teal-600 ml-2 mr-1" />
              <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider hidden sm:inline">
                Floor:
              </span>
              {[
                { num: 0, label: 'Ground Floor (G)' },
                { num: 1, label: '1st Floor' },
                { num: 2, label: '2nd Floor' },
                { num: 3, label: '3rd Floor' }
              ].map((f) => (
                <button
                  key={f.num}
                  onClick={() => setActiveFloor(f.num)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeFloor === f.num
                      ? 'bg-teal-600 text-white shadow'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] font-medium text-slate-500 mr-2">
              {currentFloorLocations.length} Mapped Zones
            </span>
          </div>

          {/* Interactive SVG Floor Map Graphic */}
          <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-2 border-b border-slate-800">
              <span className="font-bold text-slate-200">
                Floor Plan: {activeFloor === 0 ? 'Ground Floor (Level 0)' : `Level ${activeFloor}`}
              </span>
              <span className="text-[11px] text-teal-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                Live Sensor Beacon Active
              </span>
            </div>

            {/* SVG Interactive Canvas */}
            <div className="relative aspect-[16/9] w-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4">
              <svg
                viewBox="0 0 800 450"
                className="w-full h-full select-none"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}
              >
                {/* Hospital Outer Perimeter */}
                <rect
                  x="20"
                  y="20"
                  width="760"
                  height="410"
                  rx="16"
                  fill="#0f172a"
                  stroke="#334155"
                  strokeWidth="3"
                />

                {/* Central Corridor */}
                <rect x="80" y="195" width="640" height="60" fill="#1e293b" />
                <line x1="80" y1="225" x2="720" y2="225" stroke="#475569" strokeDasharray="6 4" strokeWidth="2" />
                <text x="400" y="230" fill="#64748b" fontSize="12" textAnchor="middle" fontWeight="bold">
                  CENTRAL MAIN CORRIDOR
                </text>

                {/* Vertical Connectivity: Elevators & Staircases */}
                <g transform="translate(40, 190)">
                  <rect width="36" height="70" rx="6" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" />
                  <text x="18" y="40" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                    LIFT
                  </text>
                </g>

                <g transform="translate(724, 190)">
                  <rect width="36" height="70" rx="6" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" />
                  <text x="18" y="40" fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold">
                    RAMP
                  </text>
                </g>

                {/* Floor Specific Rooms & Zones */}
                {currentFloorLocations.map((loc) => {
                  const isDestination = selectedDestinationLocation?.id === loc.id;
                  const roomWidth = 130;
                  const roomHeight = 110;

                  return (
                    <g
                      key={loc.id}
                      transform={`translate(${loc.x_coord || 100}, ${loc.y_coord || 50})`}
                      className="cursor-pointer transition-transform hover:scale-105"
                      onClick={() => setDestinationId(loc.id)}
                    >
                      <rect
                        width={roomWidth}
                        height={roomHeight}
                        rx="12"
                        fill={isDestination ? '#0d9488' : '#1e293b'}
                        stroke={isDestination ? '#2dd4bf' : '#334155'}
                        strokeWidth={isDestination ? 3 : 1.5}
                        fillOpacity={isDestination ? 0.8 : 0.6}
                      />
                      <circle
                        cx="18"
                        cy="22"
                        r="6"
                        fill={isDestination ? '#34d399' : '#0ea5e9'}
                      />
                      <text
                        x="30"
                        y="26"
                        fill={isDestination ? '#ffffff' : '#e2e8f0'}
                        fontSize="11"
                        fontWeight="bold"
                      >
                        {loc.name.length > 15 ? loc.name.slice(0, 14) + '..' : loc.name}
                      </text>
                      {loc.room_number && (
                        <text x="30" y="42" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          Room: {loc.room_number}
                        </text>
                      )}
                      <text x="14" y="90" fill="#64748b" fontSize="8" textAnchor="start">
                        {loc.location_type.toUpperCase()}
                      </text>
                    </g>
                  );
                })}

                {/* Start Gate Indicator */}
                <g transform="translate(400, 400)">
                  <circle r="12" fill="#10b981" />
                  <text y="4" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">
                    A
                  </text>
                  <text y="24" fill="#10b981" fontSize="10" textAnchor="middle" fontWeight="bold">
                    Entrance Gate A
                  </text>
                </g>

                {/* Target Pin Marker if Destination is on this floor */}
                {selectedDestinationLocation && selectedDestinationLocation.floor_number === activeFloor && (
                  <g
                    transform={`translate(${
                      (selectedDestinationLocation.x_coord || 100) + 65
                    }, ${(selectedDestinationLocation.y_coord || 50) + 55})`}
                  >
                    <circle r="20" fill="#14b8a6" fillOpacity="0.3" className="animate-ping" />
                    <circle r="10" fill="#14b8a6" stroke="#ffffff" strokeWidth="2" />
                  </g>
                )}
              </svg>
            </div>

            {/* Map Legend */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-teal-600" /> Selected Destination
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-sky-600" /> Elevator / Lift
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" /> Entrance Gate
                </span>
              </div>
              <span>Click any room on the map to navigate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
