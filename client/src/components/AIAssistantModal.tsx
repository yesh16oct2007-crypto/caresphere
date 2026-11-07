import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  PhoneCall,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Pill,
  FileText,
  Check,
  Globe,
  ArrowRight,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { Link } from 'react-router-dom';
import { apiUrl } from '../services/api.js';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  isEmergency?: boolean;
  contacts?: { name: string; number: string }[];
  suggestedActions?: string[];
  actionExecuted?: string | null;
  actionData?: any;
  requiresConfirmation?: boolean;
  timestamp: Date;
}

const SPEECH_LANG_MAP: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  pa: 'pa-IN'
};

const LANG_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ் (Tamil)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'te', label: 'తెలుగు (Telugu)' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'ml', label: 'മലയാളം (Malayalam)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'mr', label: 'मराठी (Marathi)' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' }
];

export const AIAssistantModal: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, token, setLanguage } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<'patient' | 'appointment' | 'pharmacy' | 'report' | 'emergency'>('patient');

  // Stable session ID for context memory across follow-ups in this browser session
  const sessionId = useMemo(() => {
    let sid = sessionStorage.getItem('caresphere_ai_sid');
    if (!sid) {
      sid = 'cs_' + Math.random().toString(36).substring(2, 12);
      sessionStorage.setItem('caresphere_ai_sid', sid);
    }
    return sid;
  }, []);

  // Multilingual Voice Input (STT) State
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Multilingual Voice Output (TTS) State
  const [autoVoiceOutput, setAutoVoiceOutput] = useState<boolean>(() => {
    return localStorage.getItem('caresphere_voice_output') !== 'disabled';
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeLangCode = i18n.language || user?.preferred_language || 'en';

  // Save voice output preference
  useEffect(() => {
    localStorage.setItem('caresphere_voice_output', autoVoiceOutput ? 'enabled' : 'disabled');
  }, [autoVoiceOutput]);

  // Clean voice synthesis on unmount or modal close
  useEffect(() => {
    if (!isOpen && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      }
    }
  }, [isOpen]);

  // Stop synthesis when language changes
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  }, [i18n.language]);

  // Language Change Handler with profile sync
  const handleLanguageChange = async (newLang: string) => {
    try {
      await setLanguage(newLang);
    } catch (err) {
      i18n.changeLanguage(newLang);
    }
  };

  // Initialize welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = activeLangCode === 'ta'
        ? 'வணக்கம்! நான் கேர்ஸ்பியர் AI உதவியாளர். நீங்கள் உங்கள் தாய்மொழியில் பேசலாம் அல்லது எழுதலாம். மருத்துவர் அப்பாய்ன்ட்மென்ட் பதிவு செய்ய, ரத்து செய்ய அல்லது மருத்துவ தகவல்கள் அறிய நான் தயாராக உள்ளேன்.'
        : activeLangCode === 'hi'
        ? 'नमस्ते! मैं केयरस्फ़ीयर AI सहायक हूँ। आप हिंदी या हिंग्लिश में बोलकर या लिखकर अपनी अपॉइंटमेंट देख सकते हैं, नई बुकिंग कर सकते हैं या अस्पताल की जानकारी ले सकते हैं।'
        : activeLangCode === 'te'
        ? 'నమస్కారం! నేను కేర్‌స్పియర్ AI సహాయకుడిని. డాక్టర్ అపాయింట్‌మెంట్లు బుక్ చేయడానికి, రద్దు చేయడానికి లేదా మందుల వివరాలు తెలుసుకోవడానికి మీరు నాతో మాట్లాడవచ్చు.'
        : activeLangCode === 'ml'
        ? 'നമസ്കാരം! ഞാൻ കെയർസ്ഫിയർ AI അസിസ്റ്റന്റാണ്. ഡോക്ടർ അപ്പോയിന്റ്മെന്റുകൾ, മരുന്നുകൾ, ആശുപത്രി വിവരങ്ങൾ എന്നിവ ചോദിക്കാം.'
        : activeLangCode === 'kn'
        ? 'ನಮಸ್ಕಾರ! ನಾನು ಕೇರ್‌ಸ್ಪಿಯರ್ AI ಸಹಾಯಕ. ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಲು ಅಥವಾ ಮಾಹಿತಿ ಪಡೆಯಲು ನನ್ನನ್ನು ಕೇಳಿ.'
        : 'Hello! I am CareSphere AI Assistant. You can speak or type to check or cancel your appointments, book consultations, search medicines, and get instant medical assistance.';

      const welcomeMsg: ChatMessage = {
        id: 'welcome',
        sender: 'assistant',
        text: welcomeText,
        timestamp: new Date()
      };

      setMessages([welcomeMsg]);

      if (autoVoiceOutput) {
        setTimeout(() => speakText(welcomeText, 'welcome'), 600);
      }
    }
  }, [isOpen, activeLangCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isListening]);

  // ---------------- Voice Output (TTS) Function ----------------
  const speakText = (text: string, msgId?: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechError('Text-to-speech is not supported in this browser.');
      return;
    }

    // Stop ongoing speech
    window.speechSynthesis.cancel();

    if (isSpeaking && currentlySpeakingId === msgId) {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
      return;
    }

    // Strip markdown formatting for natural voice output
    const cleanText = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\(.*?\)/g, '$1')
      .replace(/#+\s/g, '')
      .replace(/[-*•]\s/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const targetTag = SPEECH_LANG_MAP[activeLangCode] || 'en-IN';
    utterance.lang = targetTag;
    utterance.rate = 0.95; // Slightly slower for clear Indian script pronunciation
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const availableVoices = window.speechSynthesis.getVoices();
    const matchingVoice = availableVoices.find(
      v => v.lang === targetTag || v.lang.startsWith(activeLangCode)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setCurrentlySpeakingId(msgId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentlySpeakingId(null);
    }
  };

  // ---------------- Voice Input (STT) Function ----------------
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.');
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    // If currently speaking, stop so mic doesn't capture speaker
    stopSpeaking();

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = SPEECH_LANG_MAP[activeLangCode] || 'en-IN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice input issue: ${event.error}. Please try typing.`);
        }
        setTimeout(() => setSpeechError(null), 6000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechError('Could not initialize microphone. Please check browser permissions.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // ---------------- Send Message Flow ----------------
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    // Stop any ongoing voice listening or speaking
    stopListening();
    stopSpeaking();

    const userMessage: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const endpoint = selectedAgent === 'patient' ? '/api/ai/chat' : '/api/ai/orchestrate';
      const authToken = token || localStorage.getItem('caresphere_token');

      const bodyPayload = selectedAgent === 'patient'
        ? {
            message: text,
            language: activeLangCode,
            sessionId
          }
        : {
            agent_type: selectedAgent,
            message: text,
            language: activeLangCode,
            hospital_id: user?.hospital_id,
            sessionId
          };

      const res = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      const assistantMsgId = String(Date.now() + 1);

      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        sender: 'assistant',
        text: data.reply,
        isEmergency: data.is_emergency,
        contacts: data.emergency_contacts,
        suggestedActions: data.suggested_actions,
        actionExecuted: data.action_executed,
        actionData: data.action_data,
        requiresConfirmation: data.requires_confirmation,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Speak response aloud if auto-speech is enabled
      if (autoVoiceOutput && data.reply) {
        setTimeout(() => {
          speakText(data.reply, assistantMsgId);
        }, 400);
      }
    } catch (err) {
      console.error('AI chat failed:', err);
      const fallbackText =
        activeLangCode === 'ta'
          ? 'தற்போது மருத்துவமனை தகவல் சேவையை இணைக்க முடியவில்லை. அவசர உதவிக்கு +91-80-CARE-911 என்ற எண்ணை அழைக்கவும்.'
          : activeLangCode === 'hi'
          ? 'वर्तमान में अस्पताल सूचना सेवा से संपर्क नहीं हो पा रहा है। आपातकालीन सहायता के लिए +91-80-CARE-911 पर कॉल करें।'
          : 'We are unable to connect to the hospital information service right now. For urgent help, please call our 24/7 hotline +91-80-CARE-911.';

      const errMessage: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: fallbackText,
        isEmergency: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errMessage]);

      if (autoVoiceOutput) {
        speakText(fallbackText, errMessage.id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Role-Aware Quick Prompt Chips
  const quickPrompts = useMemo(() => {
    const role = user?.role;
    if (role === 'patient') {
      return [
        { label: '📅 Show my appointments', query: 'Show my appointments' },
        { label: '🩺 Book doctor appointment', query: 'Book appointment with Dr. Priya Sharma tomorrow 10 AM' },
        { label: '💊 Check medicine stock', query: 'Show available medicines' },
        { label: '📋 View medical records', query: 'Show my medical records' },
        { label: '🚨 Emergency SOS', query: 'Emergency SOS' }
      ];
    } else if (role === 'doctor') {
      return [
        { label: '👨‍⚕️ My appointments', query: 'Show my doctor appointments' },
        { label: '📋 Patient schedule', query: 'Show my appointments today' },
        { label: '💊 Available medicines', query: 'Show available medicines' }
      ];
    } else if (role === 'admin' || role === 'hospital_admin' || role === 'superadmin') {
      return [
        { label: '🩺 Pending doctor approvals', query: 'Show pending doctor registrations' },
        { label: '📊 Today appointments', query: 'Show today appointments' },
        { label: '💊 Pharmacy inventory', query: 'Show available medicines' }
      ];
    } else {
      return [
        { label: '🩺 Available doctors', query: 'Show available doctors in the hospital' },
        { label: '🏥 Hospital departments', query: 'Which departments are available?' },
        { label: '🚨 Emergency helpline', query: 'Emergency helpline numbers' }
      ];
    }
  }, [user?.role]);

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r from-[#123B5D] via-[#0D9488] to-[#38BDF8] hover:from-[#0e304d] hover:to-[#0f766e] text-white px-4 py-3 rounded-full shadow-glow-teal hover:shadow-glow-brand transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-teal-400 group cursor-pointer border border-white/20"
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <Bot className="w-6 h-6 text-white" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1">
            CareSphere AI <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
          </span>
          <span className="text-[11px] text-teal-100 flex items-center gap-1">
            <span>Voice & Actions</span>
            <span className="text-[9px] bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded-full uppercase font-bold text-white">
              {activeLangCode}
            </span>
          </span>
        </div>
      </button>

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="fixed bottom-3 right-2.5 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-20px)] sm:w-[460px] max-h-[92vh] sm:max-h-[690px] h-[88vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#123B5D] via-[#0D9488] to-[#123B5D] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
                <Bot className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  CareSphere AI
                  <span className="text-[10px] bg-teal-400/20 text-teal-200 px-2 py-0.5 rounded-full border border-teal-300/30 font-semibold">
                    Live
                  </span>
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {/* Multilingual Selector Dropdown */}
                  <div className="flex items-center gap-1 bg-white/15 px-2 py-0.5 rounded-lg border border-white/20 text-[10px]">
                    <Globe className="w-3 h-3 text-teal-200 shrink-0" />
                    <select
                      value={activeLangCode}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1 text-[11px]"
                    >
                      {LANG_OPTIONS.map((l) => (
                        <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Auto Voice Output Toggle */}
              <button
                onClick={() => {
                  if (isSpeaking) stopSpeaking();
                  setAutoVoiceOutput(!autoVoiceOutput);
                }}
                title={autoVoiceOutput ? 'Auto-Voice Output Enabled' : 'Auto-Voice Output Muted'}
                className={`p-2 rounded-xl transition-colors ${
                  autoVoiceOutput
                    ? 'bg-teal-500/30 text-teal-100 hover:bg-teal-500/50'
                    : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                }`}
                aria-label="Toggle voice output"
              >
                {autoVoiceOutput ? <Volume2 className="w-4 h-4 text-teal-200" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                onClick={() => {
                  stopSpeaking();
                  stopListening();
                  setIsOpen(false);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Medical Disclaimer Banner */}
          <div className="px-3.5 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1.5">
            <div className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate">{t('ai.disclaimer')}</span>
            </div>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded-full hover:bg-amber-200 cursor-pointer"
              >
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>Stop</span>
              </button>
            )}
          </div>

          {/* Autonomous AI Specialized Agent Switcher */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedAgent('patient')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedAgent === 'patient'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              🤖 Care AI
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgent('appointment')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedAgent === 'appointment'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              📅 Bookings
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgent('pharmacy')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedAgent === 'pharmacy'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              💊 Pharmacy
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgent('report')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition cursor-pointer ${
                selectedAgent === 'report'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              📑 Reports
            </button>
            <button
              type="button"
              onClick={() => setSelectedAgent('emergency')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-black whitespace-nowrap transition cursor-pointer ${
                selectedAgent === 'emergency'
                  ? 'bg-red-600 text-white shadow-xs animate-pulse'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              🚨 SOS
            </button>
          </div>

          {/* Speech Error Banner if any */}
          {speechError && (
            <div className="px-3.5 py-2 bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between">
              <span>{speechError}</span>
              <button onClick={() => setSpeechError(null)} className="p-0.5 hover:opacity-75">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Active Speaking Indicator Bar */}
          {isSpeaking && (
            <div className="px-4 py-1 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-[11px] font-medium flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <span className="w-1 h-3 bg-teal-500 rounded-full animate-pulse" />
                  <span className="w-1 h-4 bg-teal-600 rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-teal-400 rounded-full animate-pulse delay-150" />
                </div>
                <span>Speaking in {activeLangCode.toUpperCase()}...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="text-[10px] text-teal-700 dark:text-teal-300 font-bold hover:underline cursor-pointer"
              >
                Mute
              </button>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/60">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed relative group ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                      : m.isEmergency
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-950 dark:text-red-100 border border-red-200 dark:border-red-800 rounded-bl-none shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line font-normal">{m.text}</p>

                  {/* Inline Action Execution Result: Appointments Card List */}
                  {m.actionExecuted === 'SHOW_MY_APPOINTMENTS' && m.actionData?.appointments && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-600" />
                        <span>Your Appointments ({m.actionData.appointments.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.actionData.appointments.map((appt: any, idx: number) => (
                          <div
                            key={appt.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-[11px] space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 dark:text-white">
                                #{idx + 1}. Dr. {appt.doctor_name}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                appt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {appt.status}
                              </span>
                            </div>
                            <div className="text-slate-600 dark:text-slate-300 text-[10px] flex items-center gap-2">
                              <span>📅 {appt.appointment_date}</span>
                              <span>⏰ {appt.appointment_time}</span>
                              {appt.room_number && <span>📍 Room {appt.room_number}</span>}
                            </div>
                            {appt.status !== 'cancelled' && (
                              <button
                                onClick={() => handleSendMessage(`Cancel appointment #${appt.id} with Dr. ${appt.doctor_name}`)}
                                className="mt-1 text-[10px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-800 flex items-center gap-1 transition cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Cancel This Appointment</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inline Action Execution Result: Booking Success Card */}
                  {m.actionExecuted === 'BOOK_APPOINTMENT' && m.actionData?.appointment && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border">
                      <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Booking Confirmed</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
                        <p><strong>Doctor:</strong> Dr. {m.actionData.appointment.doctor_name} ({m.actionData.appointment.specialization})</p>
                        <p><strong>Date & Time:</strong> {m.actionData.appointment.date} at {m.actionData.appointment.time}</p>
                        <p><strong>Room:</strong> {m.actionData.appointment.room_number}</p>
                        <p><strong>Ref Code:</strong> {m.actionData.appointment.reference_number}</p>
                      </div>
                      <div className="mt-2">
                        <Link
                          to="/appointments"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg"
                        >
                          <span>View My Appointments</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Inline Action Execution: Confirmation Request Safeguard Buttons */}
                  {m.requiresConfirmation && (
                    <div className="mt-3 pt-2 border-t border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border space-y-2">
                      <div className="text-[11px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Please Confirm Your Request</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendMessage('Yes, confirm')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Yes, Confirm</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage('No, cancel')}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>No, Cancel</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Action Execution: Medicines List */}
                  {m.actionExecuted === 'SHOW_AVAILABLE_MEDICINES' && m.actionData?.medicines && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                        <span>Pharmacy Stock</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                        {m.actionData.medicines.map((med: any) => (
                          <div
                            key={med.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between text-[10px]"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{med.name}</span>
                              <span className="text-slate-500">{med.category} • ₹{med.unit_price}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full font-bold bg-purple-100 text-purple-800">
                              {med.stock_quantity} in stock
                            </span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/pharmacy"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-purple-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Visit Pharmacy</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Inline Action Execution: Medical Records List */}
                  {m.actionExecuted === 'SHOW_MEDICAL_RECORDS' && m.actionData?.records && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>Your Medical Records ({m.actionData.records.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.actionData.records.map((rec: any) => (
                          <div
                            key={rec.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-[10px]"
                          >
                            <span className="font-bold text-slate-900 dark:text-white block">{rec.title}</span>
                            <span className="text-slate-500">{rec.record_type} • {rec.created_at?.split('T')[0]}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/records"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Open Records Manager</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Inline Action Execution: Pending Doctors List for Admin */}
                  {m.actionExecuted === 'SHOW_PENDING_DOCTORS' && m.actionData?.doctors && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Pending Doctor Registrations ({m.actionData.doctors.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.actionData.doctors.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-[10px]"
                          >
                            <span className="font-bold text-slate-900 dark:text-white block">Dr. {doc.name}</span>
                            <span className="text-slate-500">{doc.specialization} • Lic: {doc.license_number}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Open Admin Doctor Approvals</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Read Aloud Voice Button for Assistant Messages */}
                  {m.sender === 'assistant' && (
                    <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[10px]">
                      <button
                        onClick={() => speakText(m.text, m.id)}
                        className={`flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                          isSpeaking && currentlySpeakingId === m.id
                            ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200'
                            : 'text-slate-500 hover:text-brand-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                        title="Read this message aloud"
                      >
                        {isSpeaking && currentlySpeakingId === m.id ? (
                          <>
                            <Square className="w-3 h-3 fill-current text-teal-600" />
                            <span>Stop Speaking</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      <span className="text-[9px] opacity-60">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Emergency Hotline Buttons */}
                  {m.isEmergency && m.contacts && (
                    <div className="mt-3 pt-2.5 border-t border-red-200 dark:border-red-800 space-y-1.5">
                      {m.contacts.map((c, i) => (
                        <a
                          key={i}
                          href={`tel:${c.number.replace(/[^0-9+]/g, '')}`}
                          className="flex items-center justify-between bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
                            {c.name}
                          </span>
                          <span className="underline">{c.number}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Suggested Quick Actions */}
                  {m.suggestedActions && m.suggestedActions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5">
                      {m.suggestedActions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(act)}
                          className="text-[10px] bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{act}</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {m.sender === 'user' && (
                    <span className="block text-[9px] mt-1 text-right opacity-60">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center text-xs text-slate-400">
                <div className="w-7 h-7 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-500" />
                  <span>Understanding in {activeLangCode.toUpperCase()}...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Voice Listening Ripple Notification */}
          {isListening && (
            <div className="p-3 bg-gradient-to-r from-teal-500 to-brand-600 text-white flex items-center justify-between text-xs animate-in slide-in-from-bottom duration-150">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <span className="w-3 h-3 rounded-full bg-red-400 block animate-ping" />
                  <span className="w-3 h-3 rounded-full bg-red-500 absolute top-0 left-0" />
                </div>
                <div>
                  <span className="font-bold block text-xs">Listening in {activeLangCode.toUpperCase()}...</span>
                  <span className="text-[10px] text-teal-100">Speak naturally in your language</span>
                </div>
              </div>
              <button
                onClick={stopListening}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Role-Aware Quick Prompts Bar */}
          <div className="px-3 py-2 bg-slate-100/60 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p.query)}
                className="text-[11px] whitespace-nowrap bg-white dark:bg-slate-700 hover:bg-brand-50 text-slate-700 dark:text-slate-200 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-600 transition-colors shadow-2xs cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input Box with Voice Input Button */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer ${
                isListening
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 text-slate-700 dark:text-slate-200 hover:text-brand-600'
              }`}
              title={isListening ? 'Click to stop listening' : `Click to speak in ${activeLangCode.toUpperCase()}`}
              aria-label="Voice input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isListening ? `Listening in ${activeLangCode.toUpperCase()}...` : 'Ask anything, book doctor, or cancel appointment...'}
              className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-[#123B5D] to-[#0D9488] hover:from-[#0e304d] hover:to-[#0f766e] disabled:opacity-40 text-white transition-all shadow-md shrink-0 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
