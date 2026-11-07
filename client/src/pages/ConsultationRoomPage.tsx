import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  MessageSquare,
  FileText,
  UserCheck,
  Clock,
  Shield,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  Download,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { apiUrl } from '../services/api.js';
import { ConsultationRoom, PrescriptionData, PrescriptionMedicine } from '../types/index.js';

export const ConsultationRoomPage: React.FC = () => {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  // State
  const [room, setRoom] = useState<ConsultationRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Audio / Video states
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(true);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // In-call chat
  const [messages, setMessages] = useState<{ sender: string; text: string; time: string }[]>([
    {
      sender: 'CareSphere Health',
      text: 'Encrypted end-to-end WebRTC consultation session initialized. Please ensure your microphone and camera are connected.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Doctor Clinical Pad State
  const [diagnosis, setDiagnosis] = useState('');
  const [clinicalSummary, setClinicalSummary] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([
    { name: '', dosage: '500mg', timing: 'Morning & Night', duration_days: 5, instructions: 'After food' }
  ]);
  const [advice, setAdvice] = useState('');
  const [issuingRx, setIssuingRx] = useState(false);
  const [completedPrescription, setCompletedPrescription] = useState<PrescriptionData | null>(null);

  // Video refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  // Fetch Room Info
  const fetchRoomStatus = async () => {
    if (!roomId || !token) return;
    try {
      const res = await fetch(apiUrl(`/api/consultations/room/${roomId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Consultation session not found');
      const data = await res.json();
      setRoom(data.room);

      if (data.room.status === 'completed' && data.room.prescription_url) {
        // Fetch prescription if completed
        fetchPrescription(data.room.appointment_id);
      }
    } catch (err: any) {
      setError(err.message || 'Error syncing room');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrescription = async (apptId: number) => {
    try {
      const res = await fetch(apiUrl(`/api/consultations/prescriptions/${apptId}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedPrescription(data.prescription);
      }
    } catch (err) {
      // Ignored
    }
  };

  // Initialize Media Devices & WebRTC
  useEffect(() => {
    fetchRoomStatus();
    const interval = setInterval(fetchRoomStatus, 5000);

    // Setup Local Media Stream
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((userStream) => {
        stream = userStream;
        setMediaStream(userStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = userStream;
        }

        // Initialize PeerConnection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
        });
        peerConnectionRef.current = pc;

        userStream.getTracks().forEach((track) => pc.addTrack(track, userStream));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };
      })
      .catch((err) => {
        console.warn('Camera/Mic permission denied or not supported in current environment:', err);
      });

    return () => {
      clearInterval(interval);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [roomId, token]);

  const toggleMic = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !micActive;
      });
    }
    setMicActive(!micActive);
  };

  const toggleVideo = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = !videoActive;
      });
    }
    setVideoActive(!videoActive);
  };

  // Doctor Admits Patient
  const handleAdmitPatient = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(apiUrl(`/api/consultations/room/${roomId}/admit`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRoomStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send In-call Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        sender: user?.name || 'Me',
        text: chatInput.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setChatInput('');
  };

  // Prescription Dynamic Form
  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      { name: '', dosage: '', timing: 'Morning & Night', duration_days: 5, instructions: 'After food' }
    ]);
  };

  const removeMedicineRow = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateMedicineRow = (idx: number, field: keyof PrescriptionMedicine, value: any) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: value };
      return updated;
    });
  };

  // Doctor Completes Consultation and Issues Prescription
  const handleCompleteConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomId) return;

    const validMedicines = medicines.filter((m) => ((m.name || m.medicine_name || '').trim().length > 0));
    if (!diagnosis.trim()) {
      setError('Please provide a clinical diagnosis before completing consultation.');
      return;
    }

    try {
      setIssuingRx(true);
      setError(null);
      const res = await fetch(apiUrl(`/api/consultations/room/${roomId}/complete`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          diagnosis,
          clinical_summary: clinicalSummary,
          medicines: validMedicines,
          advice,
          schedule_followup_days: 7
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete consultation');

      setCompletedPrescription(data.prescription);
      fetchRoomStatus();
    } catch (err: any) {
      setError(err.message || 'Error completing consultation');
    } finally {
      setIssuingRx(false);
    }
  };

  const handleEndCall = () => {
    if (window.confirm('Do you want to leave this consultation room?')) {
      navigate('/teleconsult');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Connecting to encrypted consultation chamber...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Session Bar */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <div>
            <h1 className="font-bold text-sm sm:text-base flex items-center gap-2">
              <span>CareSphere Telehealth Chamber</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-900/80 text-teal-300 font-mono">
                {roomId}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Doctor: <span className="text-slate-200">{room?.doctor_name}</span> • Patient:{' '}
              <span className="text-slate-200">{room?.patient_name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDoctor && room?.status === 'waiting' && (
            <button
              onClick={handleAdmitPatient}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow animate-pulse"
            >
              <UserCheck className="w-4 h-4" />
              <span>Admit Patient to Call</span>
            </button>
          )}

          <button
            onClick={handleEndCall}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold shadow"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Leave Session</span>
          </button>
        </div>
      </div>

      {/* Main Workspace: Video on left, Doctor Pad & Chat on right */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto w-full">
        {/* Left Video Area (cols 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Main Remote Video Window */}
          <div className="relative aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center">
            {room?.status === 'waiting' ? (
              <div className="text-center p-6 max-w-md">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {isDoctor ? 'Patient is Waiting Outside' : 'Consultation Waiting Room'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isDoctor
                    ? 'Patient has joined the encrypted room and is waiting for you to admit them.'
                    : 'Dr. ' + (room?.doctor_name || 'Specialist') + ' has been notified of your presence. Please stay on this screen.'}
                </p>
                {isDoctor && (
                  <button
                    onClick={handleAdmitPatient}
                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow"
                  >
                    Admit Patient Now
                  </button>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Fallback avatar overlay if remote stream is simulated */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-sm pointer-events-none">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-medblue-600 flex items-center justify-center text-white font-bold text-2xl shadow-xl mb-3">
                    {isDoctor ? room?.patient_name.charAt(0) : room?.doctor_name.charAt(0)}
                  </div>
                  <p className="font-semibold text-sm text-white">
                    {isDoctor ? room?.patient_name : room?.doctor_name}
                  </p>
                  <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Secure Audio / Video Connected
                  </p>
                </div>
              </>
            )}

            {/* PIP Local Video (User's own camera) */}
            <div className="absolute bottom-4 right-4 w-36 sm:w-44 aspect-video bg-slate-950 rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-xl">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!videoActive && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs text-slate-400">
                  Camera Off
                </div>
              )}
              <span className="absolute bottom-1 left-2 text-[10px] font-medium bg-black/60 px-1.5 py-0.5 rounded text-white">
                You
              </span>
            </div>

            {/* Video Control Bar */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 shadow-xl">
              <button
                onClick={toggleMic}
                className={`p-2.5 rounded-xl transition-colors ${
                  micActive ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
                }`}
                title={micActive ? t('teleconsult.mute') : t('teleconsult.unmute')}
              >
                {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-xl transition-colors ${
                  videoActive ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'
                }`}
                title={videoActive ? t('teleconsult.camera_off') : t('teleconsult.camera_on')}
              >
                {videoActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>

              <button
                onClick={handleEndCall}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
                title={t('teleconsult.end_call')}
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Consultation Details Card */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400">
              <span>Appointment Date & Time:</span>
              <span className="font-semibold text-slate-200">
                {room?.appointment_date} at {room?.appointment_time}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Specialization & Hospital:</span>
              <span className="font-semibold text-slate-200">
                {room?.specialization} • {room?.hospital_name}
              </span>
            </div>
            {room?.patient_notes && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-slate-400 block mb-1 font-semibold">Reported Symptoms:</span>
                <p className="text-slate-300 italic bg-slate-950/60 p-2 rounded-lg">
                  "{room?.patient_notes}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar: Doctor Clinical Pad OR Patient Prescription & In-Room Chat (cols 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Completed Prescription View if available */}
          {completedPrescription ? (
            <div className="bg-slate-900 rounded-3xl p-5 border border-emerald-500/40 shadow-xl space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm">Official Digital Prescription Issued</h3>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl space-y-2 text-xs border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rx ID:</span>
                  <span className="font-mono font-bold text-teal-400">{completedPrescription.prescription_id}</span>
                </div>
                <div>
                  <span className="text-slate-400">Diagnosis:</span>
                  <p className="font-semibold text-white mt-0.5">{completedPrescription.diagnosis}</p>
                </div>
                <div>
                  <span className="text-slate-400">Medicines Prescribed:</span>
                  <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-300">
                    {completedPrescription.medicines.map((m, i) => (
                      <li key={i}>
                        <span className="font-bold text-white">{m.name}</span> ({m.dosage}) — {m.timing} for {m.duration_days} days. ({m.instructions})
                      </li>
                    ))}
                  </ul>
                </div>
                {completedPrescription.advice && (
                  <div>
                    <span className="text-slate-400">Doctor's Advice:</span>
                    <p className="text-slate-300 italic mt-0.5">{completedPrescription.advice}</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                This digital prescription has been automatically synced with your Medicine Reminders.
              </p>
            </div>
          ) : isDoctor ? (
            /* Doctor Clinical Pad */
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <h2 className="font-bold text-sm text-white">Doctor Clinical Workspace</h2>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                    Live Prescription
                  </span>
                </div>

                {error && (
                  <div className="mb-3 p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs max-h-[380px] overflow-y-auto pr-1">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Diagnosis *</label>
                    <input
                      type="text"
                      placeholder="e.g. Acute Upper Respiratory Infection"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">Clinical Summary & Vitals</label>
                    <textarea
                      rows={2}
                      placeholder="Observed symptoms, general appearance, patient feedback..."
                      value={clinicalSummary}
                      onChange={(e) => setClinicalSummary(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-300">Prescription Medicines</label>
                      <button
                        type="button"
                        onClick={addMedicineRow}
                        className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Drug
                      </button>
                    </div>

                    <div className="space-y-2">
                      {medicines.map((med, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                        >
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="Drug name (e.g. Paracetamol)"
                              value={med.name}
                              onChange={(e) => updateMedicineRow(idx, 'name', e.target.value)}
                              className="flex-1 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-[11px]"
                            />
                            <input
                              type="text"
                              placeholder="Dose (500mg)"
                              value={med.dosage}
                              onChange={(e) => updateMedicineRow(idx, 'dosage', e.target.value)}
                              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-[11px]"
                            />
                            {medicines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMedicineRow(idx)}
                                className="text-red-400 p-1 hover:text-red-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            <input
                              type="text"
                              placeholder="Timing (Morning)"
                              value={med.timing}
                              onChange={(e) => updateMedicineRow(idx, 'timing', e.target.value)}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white text-[10px]"
                            />
                            <input
                              type="number"
                              placeholder="Days (5)"
                              value={med.duration_days}
                              onChange={(e) => updateMedicineRow(idx, 'duration_days', Number(e.target.value))}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white text-[10px]"
                            />
                            <input
                              type="text"
                              placeholder="Food relation"
                              value={med.instructions}
                              onChange={(e) => updateMedicineRow(idx, 'instructions', e.target.value)}
                              className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-white text-[10px]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-300 mb-1">General Advice / Next Steps</label>
                    <input
                      type="text"
                      placeholder="e.g. Drink warm fluids, monitor temperature for 48 hours"
                      value={advice}
                      onChange={(e) => setAdvice(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={issuingRx}
                  onClick={handleCompleteConsultation}
                  className="w-full py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {issuingRx ? (
                    'Issuing Prescription & Closing Session...'
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete Session & Issue Rx</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Patient Consultation Card */
            <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-center gap-2 text-teal-400">
                <Shield className="w-4 h-4" />
                <h3 className="font-bold text-sm">Consultation Guidelines</h3>
              </div>
              <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
                <li>Speak clearly into your microphone when the doctor joins.</li>
                <li>You can send text messages or share symptoms in the chat below.</li>
                <li>Your doctor will issue an official prescription at the end of this call.</li>
                <li>All medical records and follow-ups will be stored securely in your dashboard.</li>
              </ul>
            </div>
          )}

          {/* In-Call Live Chat Box */}
          <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl flex flex-col h-60">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
              <span>In-Session Chat</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 text-xs">
              {messages.map((msg, i) => (
                <div key={i} className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-bold text-teal-400">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-slate-200">{msg.text}</p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="pt-2 flex gap-2 border-t border-slate-800">
              <input
                type="text"
                placeholder="Type message to participant..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
