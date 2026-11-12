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

// Multilingual UI Text Dictionaries for All 10 Supported Indian Regional Languages
const UI_TEXT: Record<string, Record<string, string>> = {
  your_appointments: {
    en: 'Your Appointments',
    ta: 'உங்கள் அப்பாய்ன்ட்மென்ட்கள்',
    hi: 'आपकी अपॉइंटमेंट्स',
    te: 'మీ అపాయింట్‌మెంట్‌లు',
    kn: 'ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು',
    ml: 'നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റുകൾ',
    bn: 'আপনার অ্যাপয়েন্টমেন্টসমূহ',
    mr: 'आपल्या अपॉइंटमेंट्स',
    gu: 'તમારી એપોઇન્ટમેન્ટ્સ',
    pa: 'ਤੁਹਾਡੀਆਂ ਮੁਲਾਕਾਤਾਂ'
  },
  cancel_this_appointment: {
    en: 'Cancel This Appointment',
    ta: 'இந்த அப்பாய்ன்ட்மென்ட்டை ரத்து செய்',
    hi: 'यह अपॉइंटमेंट रद्द करें',
    te: 'ఈ అపాయింట్‌మెంట్‌ను రద్దు చేయండి',
    kn: 'ಈ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರದ್ದುಮಾಡಿ',
    ml: 'ഈ അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കുക',
    bn: 'এই অ্যাপয়েন্টমেন্ট বাতিল করুন',
    mr: 'ही अपॉइंटमेंट रद्द करा',
    gu: 'આ એપોઇન્ટમેન્ટ રદ કરો',
    pa: 'ਇਹ ਮੁਲਾਕਾਤ ਰੱਦ ਕਰੋ'
  },
  booking_confirmed: {
    en: 'Booking Confirmed',
    ta: 'முன்பதிவு உறுதி செய்யப்பட்டது',
    hi: 'बुकिंग कन्फर्म हो गई',
    te: 'బుకింగ్ నిర్ధారించబడింది',
    kn: 'ಬುಕಿಂಗ್ ದೃಢಪಟ್ಟಿದೆ',
    ml: 'ബുക്കിംഗ് സ്ഥിരീകരിച്ചു',
    bn: 'বুকিং নিশ্চিত হয়েছে',
    mr: 'बुकिंग निश्चित झाले',
    gu: 'બુકિંગ કન્ફર્મ થયું',
    pa: 'ਬੁਕਿੰਗ ਦੀ ਪੁਸ਼ਟੀ ਹੋਈ'
  },
  doctor: {
    en: 'Doctor',
    ta: 'மருத்துவர்',
    hi: 'डॉक्टर',
    te: 'వైద్యుడు',
    kn: 'ವೈದ್ಯರು',
    ml: 'ഡോക്ടർ',
    bn: 'ডাক্তার',
    mr: 'डॉक्टर',
    gu: 'ડૉક્ટર',
    pa: 'ਡਾਕਟਰ'
  },
  date_time: {
    en: 'Date & Time',
    ta: 'தேதி & நேரம்',
    hi: 'तारीख व समय',
    te: 'తేదీ & సమయం',
    kn: 'ದಿನಾಂಕ & ಸಮಯ',
    ml: 'തീയതി & സമയം',
    bn: 'তারিখ ও সময়',
    mr: 'तारीख व वेळ',
    gu: 'તારીખ અને સમય',
    pa: 'ਮਿਤੀ ਅਤੇ ਸਮਾਂ'
  },
  room: {
    en: 'Room',
    ta: 'அறை',
    hi: 'कमरा',
    te: 'గది',
    kn: 'ಕೊಠಡಿ',
    ml: 'മുറി',
    bn: 'কক্ষ',
    mr: 'खोली',
    gu: 'રૂમ',
    pa: 'ਕਮਰਾ'
  },
  ref_code: {
    en: 'Ref Code',
    ta: 'குறிப்பு எண்',
    hi: 'संदर्भ संख्या',
    te: 'రెఫరెన్స్ కోడ్',
    kn: 'ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ',
    ml: 'റഫറൻസ് കോഡ്',
    bn: 'রেফারেন্স কোড',
    mr: 'संदर्भ कोड',
    gu: 'સંદર્ભ કોડ',
    pa: 'ਹਵਾਲਾ ਕੋਡ'
  },
  view_my_appointments: {
    en: 'View My Appointments',
    ta: 'என் அப்பாய்ன்ட்மென்ட்களைப் பார்',
    hi: 'मेरी अपॉइंटमेंट्स देखें',
    te: 'నా అపాయింట్‌మెంట్‌లు చూడండి',
    kn: 'ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳನ್ನು ನೋಡಿ',
    ml: 'എന്റെ അപ്പോയിന്റ്മെന്റുകൾ കാണുക',
    bn: 'আমার অ্যাপয়েন্টমেন্ট দেখুন',
    mr: 'माझ्या अपॉइंटमेंट्स पहा',
    gu: 'મારી એપોઇન્ટમેન્ટ્સ જુઓ',
    pa: 'ਮੇਰੀਆਂ ਮੁਲਾਕਾਤਾਂ ਵੇਖੋ'
  },
  please_confirm: {
    en: 'Please Confirm Your Request',
    ta: 'தயவுசெய்து உறுதிப்படுத்தவும்',
    hi: 'कृपया अपने अनुरोध की पुष्टि करें',
    te: 'దయచేసి మీ అభ్యర్థనను నిర్ధారించండి',
    kn: 'ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ದೃಢೀಕರಿಸಿ',
    ml: 'ദയവായി നിങ്ങളുടെ അഭ്യർത്ഥന സ്ഥിരീകരിക്കുക',
    bn: 'অনুগ্রহ করে আপনার অনুরোধ নিশ্চিত করুন',
    mr: 'कृपया आपल्या विनंतीची पुष्टी करा',
    gu: 'કૃપા કરીને તમારી વિનંતીની પુષ્ટિ કરો',
    pa: 'ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੀ ਬੇਨਤੀ ਦੀ ਪੁਸ਼ਟੀ ਕਰੋ'
  },
  yes_confirm: {
    en: 'Yes, Confirm',
    ta: 'ஆம், உறுதிசெய்',
    hi: 'हाँ, पुष्टि करें',
    te: 'అవును, నిర్ధారించు',
    kn: 'ಹೌದು, ದೃಢೀಕರಿಸಿ',
    ml: 'അതെ, സ്ഥിരീകരിക്കുക',
    bn: 'হ্যাঁ, নিশ্চিত করুন',
    mr: 'होय, पुष्टी करा',
    gu: 'હા, પુષ્ટિ કરો',
    pa: 'ਹਾਂ, ਪੁਸ਼ਟੀ ਕਰੋ'
  },
  no_cancel: {
    en: 'No, Cancel',
    ta: 'இல்லை, ரத்து செய்',
    hi: 'नहीं, रद्द करें',
    te: 'వద్దు, రద్దు చేయి',
    kn: 'ಇಲ್ಲ, ರದ್ದುಮಾಡಿ',
    ml: 'അല്ല, റദ്ദാക്കുക',
    bn: 'না, বাতিল করুন',
    mr: 'नाही, रद्द करा',
    gu: 'ના, રદ કરો',
    pa: 'ਨਹੀਂ, ਰੱਦ ਕਰੋ'
  },
  pharmacy_stock: {
    en: 'Pharmacy Stock',
    ta: 'மருந்தக இருப்பு',
    hi: 'फार्मेसी स्टॉक',
    te: 'ఫార్మసీ నిల్వలు',
    kn: 'ಔಷಧಾಲಯ ದಾಸ್ತಾನು',
    ml: 'ഫാർമസി സ്റ്റോക്ക്',
    bn: 'ফার্মেসি স্টক',
    mr: 'फार्मसी साठा',
    gu: 'ફાર્મસી સ્ટોક',
    pa: 'ਫਾਰਮੇਸੀ ਸਟਾਕ'
  },
  visit_pharmacy: {
    en: 'Visit Pharmacy',
    ta: 'மருந்தகம் செல்லவும்',
    hi: 'फार्मेसी देखें',
    te: 'ఫార్మసీని సందర్శించండి',
    kn: 'ಔಷಧಾಲಯಕ್ಕೆ ಭೇಟಿ ನೀಡಿ',
    ml: 'ഫാർമസി സന്ദർശിക്കുക',
    bn: 'ফার্মেসিতে যান',
    mr: 'फार्मसीला भेट द्या',
    gu: 'ફાર્મસીની મુલાકાત લો',
    pa: 'ਫਾਰਮੇਸੀ ਜਾਓ'
  },
  medical_records: {
    en: 'Your Medical Records',
    ta: 'உங்கள் மருத்துவ ஆவணங்கள்',
    hi: 'आपके मेडिकल रिकॉर्ड्स',
    te: 'మీ వైద్య రికార్డులు',
    kn: 'ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು',
    ml: 'നിങ്ങളുടെ മെഡിക്കൽ റെക്കോർഡുകൾ',
    bn: 'আপনার মেডিকেল রেকর্ডসমূহ',
    mr: 'आपल्या वैद्यकीय नोंदी',
    gu: 'તમારા મેડિકલ રેકોર્ડ્સ',
    pa: 'ਤੁਹਾਡੇ ਮੈਡੀਕਲ ਰਿਕਾਰਡ'
  },
  open_records: {
    en: 'Open Records Manager',
    ta: 'ஆவண மேலாளர்',
    hi: 'रिकॉर्ड्स मैनेजर खोलें',
    te: 'రికార్డుల మేనేజర్ తెరవండి',
    kn: 'ದಾಖಲೆಗಳ ಮ್ಯಾನೇಜರ್ ತೆರೆಯಿರಿ',
    ml: 'റെക്കോർഡ്സ് മാനേജർ തുറക്കുക',
    bn: 'রেকর্ড ম্যানেজার খুলুন',
    mr: 'रेकॉर्ड मॅनेजर उघडा',
    gu: 'રેકોર્ડ્સ મેનેજર ખોલો',
    pa: 'ਰਿਕਾਰਡ ਮੈਨੇਜਰ ਖੋਲ੍ਹੋ'
  },
  pending_doctors: {
    en: 'Pending Doctor Registrations',
    ta: 'சரிபார்ப்பு நிலுவையில் உள்ள மருத்துவர்கள்',
    hi: 'सत्यापन हेतु लंबित डॉक्टर',
    te: 'పరిశీలనలో ఉన్న డాక్టర్ దరఖాస్తులు',
    kn: 'ಬಾಕಿ ಇರುವ ವೈದ್ಯರ ನೋಂದಣಿಗಳು',
    ml: 'പരിശോധനയിലുള്ള ഡോക്ടർ അപേക്ഷകൾ',
    bn: 'অনুমোদনের অপেক্ষায় ডাক্তারদের তালিকা',
    mr: 'प्रलंबित डॉक्टर नोंदणी',
    gu: 'બાકી ડૉક્ટર નોંધણીઓ',
    pa: 'ਬਕਾਇਆ ਡਾਕਟਰ ਰਜਿਸਟ੍ਰੇਸ਼ਨ'
  },
  open_admin_approvals: {
    en: 'Open Admin Doctor Approvals',
    ta: 'மருத்துவர் ஒப்புதல் பிரிவு',
    hi: 'डॉक्टर अनुमोदन खोलें',
    te: 'డాక్టర్ ఆమోదాలు తెరవండి',
    kn: 'ವೈದ್ಯರ ಅನುಮೋದನೆ ಪುಟ ತೆರೆಯಿರಿ',
    ml: 'അഡ്മിൻ അപ്രൂവൽ തുറക്കുക',
    bn: 'অ্যাডমিন ডাক্তার অনুমোদন খুলুন',
    mr: 'प्रशासक डॉक्टर मान्यता उघडा',
    gu: 'એડમિન ડૉક્ટર મંજૂરી ખોલો',
    pa: 'ਡਾਕਟਰ ਪ੍ਰਵਾਨਗੀ ਖੋਲ੍ਹੋ'
  },
  read_aloud: {
    en: 'Read Aloud',
    ta: 'ஒலி வாசிப்பு',
    hi: 'बोलकर सुनाएं',
    te: 'వినండి',
    kn: 'ಓದಿ ಕೇಳಿ',
    ml: 'വായിച്ചു കേൾക്കുക',
    bn: 'পড়ে শোনান',
    mr: 'ऐका',
    gu: 'વાંચી સંભળાવો',
    pa: 'ਪੜ੍ਹ ਕੇ ਸੁਣਾਓ'
  },
  stop_speaking: {
    en: 'Stop Speaking',
    ta: 'நிறுத்து',
    hi: 'बोलना बंद करें',
    te: 'ఆపండి',
    kn: 'ನಿಲ್ಲಿಸಿ',
    ml: 'നിർത്തുക',
    bn: 'বন্ধ করুন',
    mr: 'थांबवा',
    gu: 'બંધ કરો',
    pa: 'ਬੰਦ ਕਰੋ'
  },
  input_placeholder: {
    en: 'Ask any question like ChatGPT, book a doctor, or check medicines...',
    ta: 'ChatGPT போல எதையும் கேளுங்கள், மருத்துவரை முன்பதிவு செய்யுங்கள்...',
    hi: 'ChatGPT की तरह कोई भी सवाल पूछें, डॉक्टर बुक करें या दवाएं देखें...',
    te: 'ChatGPT వలే ఏదైనా ప్రశ్న అడగండి, డాక్టర్‌ను బుక్ చేయండి...',
    kn: 'ChatGPT ರೀತಿಯಲ್ಲಿ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ, ವೈದ್ಯರನ್ನು ಬುಕ್ ಮಾಡಿ...',
    ml: 'ChatGPT പോലെ ഏതു സംശയവും ചോദിക്കാം, ഡോക്ടറെ ബുക്ക് ചെയ്യാം...',
    bn: 'চ্যাটজিপিটির মতো যেকোনো প্রশ্ন করুন, ডাক্তার বুক করুন...',
    mr: 'ChatGPT प्रमाणे कोणताही प्रश्न विचारा, डॉक्टर बुक करा...',
    gu: 'ChatGPT ની જેમ કોઈપણ પ્રશ્ન પૂછો, ડૉક્ટર બુક કરો...',
    pa: 'ChatGPT ਵਾਂਗ ਕੋਈ ਵੀ ਸਵਾਲ ਪੁੱਛੋ, ਡਾਕਟਰ ਬੁੱਕ ਕਰੋ...'
  },
  listening: {
    en: 'Listening...',
    ta: 'கேட்கிறது...',
    hi: 'सुन रहा हूँ...',
    te: 'వింటున్నాను...',
    kn: 'ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದ್ದೇನೆ...',
    ml: 'കേൾക്കുന്നു...',
    bn: 'শুনছি...',
    mr: 'ऐकत आहे...',
    gu: 'સાંભળી રહ્યો છું...',
    pa: 'ਸੁਣ ਰਿਹਾ ਹਾਂ...'
  },
  speaking_in: {
    en: 'Speaking in',
    ta: 'பேசுகிறது',
    hi: 'बोल रहा है',
    te: 'మాట్లాడుతోంది',
    kn: 'ಮಾತನಾಡುತ್ತಿದೆ',
    ml: 'സംസാരിക്കുന്നു',
    bn: 'বলছে',
    mr: 'बोलत आहे',
    gu: 'બોલી રહ્યો છે',
    pa: 'ਬੋਲ ਰਿਹਾ ਹੈ'
  },
  mute: {
    en: 'Mute',
    ta: 'ஒலி நிறுத்து',
    hi: 'म्यूट',
    te: 'మ్యూట్',
    kn: 'ಮ್ಯೂಟ್',
    ml: 'മ്യൂട്ട്',
    bn: 'মিউট',
    mr: 'म्यूट',
    gu: 'મ્યૂટ',
    pa: 'ਮਿਊਟ'
  }
};

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

  // Helper for UI text in active language
  const tUI = (key: string): string => {
    return UI_TEXT[key]?.[activeLangCode] || UI_TEXT[key]?.en || key;
  };

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

  // Initialize and synchronize welcome message when language changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const welcomeMap: Record<string, string> = {
        en: 'Hello! I am CareSphere AI Assistant. You can speak or type to ask ANY health question like ChatGPT, check or cancel appointments, book consultations, and search medicines.',
        ta: 'வணக்கம்! நான் கேர்ஸ்பியர் AI உதவியாளர். நீங்கள் உங்கள் தாய்மொழியில் பேசலாம் அல்லது எழுதலாம். ChatGPT போன்று எந்த கேள்விக்கும் விளக்கம் பெறவும், மருத்துவர் முன்பதிவு மற்றும் ரத்து செய்யவும் நான் தயாராக உள்ளேன்.',
        hi: 'नमस्ते! मैं केयरस्फ़ीयर AI सहायक हूँ। आप हिंदी में बोलकर या लिखकर ChatGPT की तरह कोई भी सवाल पूछ सकते हैं, अपनी अपॉइंटमेंट देख सकते हैं, नई बुकिंग कर सकते हैं या अस्पताल की जानकारी ले सकते हैं।',
        te: 'నమస్కారం! నేను కేర్‌స్పియర్ AI సహాయకుడిని. ChatGPT వలే మీ ఆరోగ్య ప్రశ్నలన్నింటికీ సమాధానాలు పొందవచ్చు, డాక్టర్ అపాయింట్‌మెంట్లు బుక్ చేసుకోవచ్చు లేదా రద్దు చేయవచ్చు.',
        kn: 'ನಮಸ್ಕಾರ! ನಾನು ಕೇರ್‌ಸ್ಪಿಯರ್ AI ಸಹಾಯಕ. ChatGPT ರೀತಿಯಲ್ಲಿ ಯಾವುದೇ ಆರೋಗ್ಯ ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾಹಿತಿ ಪಡೆಯಲು, ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಲು ಅಥವಾ ರದ್ದುಗೊಳಿಸಲು ನನ್ನನ್ನು ಕೇಳಿ.',
        ml: 'നമസ്കാരം! ഞാൻ കെയർസ്ഫിയർ AI അസിസ്റ്റന്റാണ്. ChatGPT പോലെ ഏതു സംശയങ്ങൾക്കും ഉത്തരം നൽകാനും, ഡോക്ടർ അപ്പോയിന്റ്മെന്റുകൾ ബുക്ക് ചെയ്യാനും റദ്ദാക്കാനും ഞാൻ സജ്ജനാണ്.',
        bn: 'নমস্কার! আমি কেয়ারস্ফিয়ার এআই সহকারী। চ্যাটজিপিটির মতো যেকোনো স্বাস্থ্য প্রশ্নের উত্তর, ডাক্তার বুকিং বা বাতিলের জন্য আমাকে জিজ্ঞাসা করুন।',
        mr: 'नमस्कार! मी केअरस्फीअर AI सहाय्यक आहे. ChatGPT प्रमाणे कोणत्याही आरोग्य प्रश्नाचे उत्तर, डॉक्टर अपॉइंटमेंट किंवा औषधांच्या माहितीसाठी मला विचारा.',
        gu: 'નમસ્તે! હું કેરસ્ફિયર AI સહાયક છું. ChatGPT ની જેમ કોઈપણ સ્વાસ્થ્ય પ્રશ્નોના ઉત્તર મેળવવા, ડૉક્ટર બુક કરવા કે રદ કરવા માટે મને કહો.',
        pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਕੇਅਰਸਫੀਅਰ AI ਸਹਾਇਕ ਹਾਂ। ChatGPT ਵਾਂਗ ਕਿਸੇ ਵੀ ਸਿਹਤ ਸਵਾਲ ਦਾ ਜਵਾਬ, ਡਾਕਟਰ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨ ਜਾਂ ਰੱਦ ਕਰਨ ਲਈ ਮੇਰੇ ਨਾਲ ਗੱਲ ਕਰੋ।'
      };

      const welcomeText = welcomeMap[activeLangCode] || welcomeMap.en;

      if (messages.length === 0 || (messages.length === 1 && messages[0].id === 'welcome')) {
        const welcomeMsg: ChatMessage = {
          id: 'welcome',
          sender: 'assistant',
          text: welcomeText,
          timestamp: new Date()
        };
        setMessages([welcomeMsg]);

        if (autoVoiceOutput && messages.length === 0) {
          setTimeout(() => speakText(welcomeText, 'welcome'), 600);
        }
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
      const fallbackMap: Record<string, string> = {
        en: 'We are unable to connect to the hospital information service right now. For urgent help, please call our 24/7 hotline +91-80-CARE-911.',
        ta: 'தற்போது மருத்துவமனை தகவல் சேவையை இணைக்க முடியவில்லை. அவசர உதவிக்கு +91-80-CARE-911 என்ற எண்ணை அழைக்கவும்.',
        hi: 'वर्तमान में अस्पताल सूचना सेवा से संपर्क नहीं हो पा रहा है। आपातकालीन सहायता के लिए +91-80-CARE-911 पर कॉल करें।',
        te: 'ప్రస్తుతం ఆసుపత్రి సమాచార సేవను అనుసంధానించలేకపోతున్నాము. అత్యవసర సహాయం కోసం +91-80-CARE-911 కు కాల్ చేయండి.',
        kn: 'ಆಸ್ಪತ್ರೆ ಮಾಹಿತಿ ಸೇವೆ ಸಂಪರ್ಕಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ. ತುರ್ತು ಸಹಾಯಕ್ಕಾಗಿ +91-80-CARE-911 ಗೆ ಕರೆ ಮಾಡಿ.',
        ml: 'ആശുപത്രി വിവര സേവനവുമായി ബന്ധപ്പെടാൻ സാധിക്കുന്നില്ല. അടിയന്തിര സഹായത്തിന് +91-80-CARE-911 എന്ന നമ്പറിൽ വിളിക്കുക.',
        bn: 'বর্তমানে হাসপাতাল তথ্য সেবায় সংযোগ করা যাচ্ছে না। জরুরী সহায়তার জন্য +91-80-CARE-911 নম্বরে কল করুন।',
        mr: 'सध्या रुग्णालय माहिती सेवेशी संपर्क होऊ शकत नाही. तातडीच्या मदतीसाठी +91-80-CARE-911 वर कॉल करा.',
        gu: 'હાલમાં હોસ્પિટલ સેવા સાથે કનેક્ટ થઈ શકતું નથી. તાત્કાલિક સહાય માટે +91-80-CARE-911 પર કૉલ કરો.',
        pa: 'ਇਸ ਸਮੇਂ ਹਸਪਤਾਲ ਸੂਚਨਾ ਸੇਵਾ ਨਾਲ ਸੰਪਰਕ ਨਹੀਂ ਹੋ ਰਿਹਾ। ਐਮਰਜੈਂਸੀ ਮਦਦ ਲਈ +91-80-CARE-911 ਤੇ ਕਾਲ ਕਰੋ।'
      };

      const fallbackText = fallbackMap[activeLangCode] || fallbackMap.en;

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

  // Role-Aware Quick Prompt Chips localized in user's preferred language
  const quickPrompts = useMemo(() => {
    const role = user?.role;
    const l = activeLangCode;

    if (role === 'patient') {
      const patientPrompts: Record<string, { label: string; query: string }[]> = {
        ta: [
          { label: '📅 என் அப்பாய்ன்ட்மென்ட்கள்', query: 'என் அப்பாய்ன்ட்மென்ட்களை காட்டு' },
          { label: '🩺 மருத்துவர் முன்பதிவு', query: 'மருத்துவர் அப்பாய்ன்ட்மென்ட் முன்பதிவு செய்' },
          { label: '💊 மருந்துகள் இருப்பு', query: 'மருந்துகள் இருப்பை காட்டு' },
          { label: '📋 மருத்துவ ஆவணங்கள்', query: 'என் மருத்துவ ஆவணங்களை காட்டு' },
          { label: '🚨 அவசர உதவி', query: 'அவசர மருத்துவ உதவி தேவை' }
        ],
        hi: [
          { label: '📅 मेरी अपॉइंटमेंट्स', query: 'मेरी अपॉइंटमेंट दिखाओ' },
          { label: '🩺 डॉक्टर बुक करें', query: 'डॉक्टर अपॉइंटमेंट बुक करो' },
          { label: '💊 उपलब्ध दवाएं', query: 'उपलब्ध दवाएं दिखाओ' },
          { label: '📋 मेडिकल रिकॉर्ड्स', query: 'मेरे मेडिकल रिकॉर्ड दिखाओ' },
          { label: '🚨 आपातकालीन SOS', query: 'आपातकालीन सहायता' }
        ],
        te: [
          { label: '📅 నా అపాయింట్‌మెంట్‌లు', query: 'నా అపాయింట్‌మెంట్‌లు చూపించు' },
          { label: '🩺 డాక్టర్ బుకింగ్', query: 'డాక్టర్ అపాయింట్‌మెంట్ బుక్ చేయి' },
          { label: '💊 మందుల నిల్వలు', query: 'అందుబాటులో ఉన్న మందులు చూపించు' },
          { label: '📋 వైద్య రికార్డులు', query: 'నా వైద్య రికార్డులు చూపించు' },
          { label: '🚨 ఎమర్జెన్సీ SOS', query: 'అత్యవసర సహాయం' }
        ],
        kn: [
          { label: '📅 ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್', query: 'ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ತೋರಿಸಿ' },
          { label: '🩺 ವೈದ್ಯರ ಭೇಟಿ', query: 'ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ' },
          { label: '💊 ಔಷಧಿಗಳು', query: 'ಲಭ್ಯವಿರುವ ಔಷಧಿಗಳನ್ನು ತೋರಿಸಿ' },
          { label: '📋 ಮೆಡಿಕಲ್ ರೆಕಾರ್ಡ್', query: 'ನನ್ನ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ತೋರಿಸಿ' },
          { label: '🚨 ತುರ್ತು SOS', query: 'ತುರ್ತು ಸಹಾಯ' }
        ],
        ml: [
          { label: '📅 എന്റെ അപ്പോയിന്റ്മെന്റുകൾ', query: 'എന്റെ അപ്പോയിന്റ്മെന്റുകൾ കാണിക്കുക' },
          { label: '🩺 ഡോക്ടറെ ബുക്ക് ചെയ്യുക', query: 'ഡോക്ടറെ കാണാൻ സമയം ബുക്ക് ചെയ്യുക' },
          { label: '💊 മരുന്നുകൾ', query: 'ലഭ്യമായ മരുന്നുകൾ കാണിക്കുക' },
          { label: '📋 മെഡിക്കൽ രേഖകൾ', query: 'എന്റെ മെഡിക്കൽ രേഖകൾ കാണിക്കുക' },
          { label: '🚨 അടിയന്തിര SOS', query: 'അടിയന്തിര സഹായം' }
        ],
        bn: [
          { label: '📅 আমার অ্যাপয়েন্টমেন্ট', query: 'আমার অ্যাপয়েন্টমেন্ট দেখাও' },
          { label: '🩺 ডাক্তার বুকিং', query: 'ডাক্তার অ্যাপয়েন্টমেন্ট বুক করো' },
          { label: '💊 ওষুধের স্টক', query: 'উপলব্ধ ওষুধ দেখাও' },
          { label: '📋 মেডিকেল রেকর্ড', query: 'আমার মেডিকেল রেকর্ড দেখাও' },
          { label: '🚨 জরুরী SOS', query: 'জরুরী চিকিৎসা সহায়তা' }
        ],
        mr: [
          { label: '📅 माझी अपॉइंटमेंट', query: 'माझी अपॉइंटमेंट दाखवा' },
          { label: '🩺 डॉक्टर बुकिंग', query: 'डॉक्टर अपॉइंटमेंट बुक करा' },
          { label: '💊 औषधांचा साठा', query: 'उपलब्ध औषधे दाखवा' },
          { label: '📋 वैद्यकीय नोंदी', query: 'माझ्या वैद्यकीय नोंदी दाखवा' },
          { label: '🚨 आपत्कालीन SOS', query: 'आपत्कालीन मदत' }
        ],
        gu: [
          { label: '📅 મારી એપોઇન્ટમેન્ટ', query: 'મારી એપોઇન્ટમેન્ટ બતાવો' },
          { label: '🩺 ડૉક્ટર બુકિંગ', query: 'ડૉક્ટર એપોઇન્ટમેન્ટ બુક કરો' },
          { label: '💊 દવાનો સ્ટોક', query: 'ઉપલબ્ધ દવાઓ બતાવો' },
          { label: '📋 મેડિકલ રેકોર્ડ', query: 'મારા મેડિકલ રેકોર્ડ બતાવો' },
          { label: '🚨 કટોકટી SOS', query: 'કટોકટી સહાય' }
        ],
        pa: [
          { label: '📅 ਮੇਰੀ ਮੁਲਾਕਾਤ', query: 'ਮੇਰੀ ਮੁਲਾਕਾਤ ਦਿਖਾਓ' },
          { label: '🩺 ਡਾਕਟਰ ਬੁੱਕ ਕਰੋ', query: 'ਡਾਕਟਰ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ' },
          { label: '💊 ਦਵਾਈਆਂ ਦਾ ਸਟਾਕ', query: 'ਉਪਲਬਧ ਦਵਾਈਆਂ ਦਿਖਾਓ' },
          { label: '📋 ਮੈਡੀਕਲ ਰਿਕਾਰਡ', query: 'ਮੇਰੇ ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਦਿਖਾਓ' },
          { label: '🚨 ਐਮਰਜੈਂਸੀ SOS', query: 'ਐਮਰਜੈਂਸੀ ਸਹਾਇਤਾ' }
        ],
        en: [
          { label: '📅 Show my appointments', query: 'Show my appointments' },
          { label: '🩺 Book doctor appointment', query: 'Book doctor appointment' },
          { label: '💊 Check medicine stock', query: 'Show available medicines' },
          { label: '📋 View medical records', query: 'Show my medical records' },
          { label: '🚨 Emergency SOS', query: 'Emergency SOS' }
        ]
      };
      return patientPrompts[l] || patientPrompts.en;
    } else if (role === 'doctor') {
      const docPrompts: Record<string, { label: string; query: string }[]> = {
        ta: [
          { label: '👨‍⚕️ என் நோயாளிகள் அட்டவணை', query: 'Show my doctor appointments' },
          { label: '📋 இன்றைய அட்டவணை', query: 'Show my appointments today' },
          { label: '💊 மருந்தக இருப்பு', query: 'Show available medicines' }
        ],
        hi: [
          { label: '👨‍⚕️ मेरा मरीज शेड्यूल', query: 'Show my doctor appointments' },
          { label: '📋 आज की अपॉइंटमेंट्स', query: 'Show my appointments today' },
          { label: '💊 फार्मेसी स्टॉक', query: 'Show available medicines' }
        ],
        en: [
          { label: '👨‍⚕️ My appointments', query: 'Show my doctor appointments' },
          { label: '📋 Patient schedule', query: 'Show my appointments today' },
          { label: '💊 Available medicines', query: 'Show available medicines' }
        ]
      };
      return docPrompts[l] || docPrompts.en;
    } else if (role === 'admin' || role === 'hospital_admin' || role === 'superadmin') {
      const adminPrompts: Record<string, { label: string; query: string }[]> = {
        ta: [
          { label: '🩺 மருத்துவர் ஒப்புதல்கள்', query: 'Show pending doctor registrations' },
          { label: '📊 இன்றைய அப்பாய்ன்ட்மென்ட்கள்', query: 'Show today appointments' },
          { label: '💊 மருந்தக இருப்பு', query: 'Show available medicines' }
        ],
        hi: [
          { label: '🩺 लंबित डॉक्टर अनुमोदन', query: 'Show pending doctor registrations' },
          { label: '📊 आज की अपॉइंटमेंट्स', query: 'Show today appointments' },
          { label: '💊 फार्मेसी इन्वेंटरी', query: 'Show available medicines' }
        ],
        en: [
          { label: '🩺 Pending doctor approvals', query: 'Show pending doctor registrations' },
          { label: '📊 Today appointments', query: 'Show today appointments' },
          { label: '💊 Pharmacy inventory', query: 'Show available medicines' }
        ]
      };
      return adminPrompts[l] || adminPrompts.en;
    } else {
      // General inquiries / Exploring user like ChatGPT
      const guestPrompts: Record<string, { label: string; query: string }[]> = {
        ta: [
          { label: '🩺 மருத்துவர்கள் விவரம்', query: 'மருத்துவமனையில் உள்ள சிறப்பு மருத்துவர்கள் விவரம் காட்டு' },
          { label: '🏥 மருத்துவமனை துறைகள்', query: 'எந்தெந்த துறைகள் செயல்படுகின்றன?' },
          { label: '🩸 இரத்த சர்க்கரை அளவு', query: 'இயல்பான இரத்த சர்க்கரை அளவு எவ்வளவு?' },
          { label: '🚨 அவசர எண்கள்', query: 'அவசர உதவி எண்கள் காட்டு' }
        ],
        hi: [
          { label: '🩺 उपलब्ध विशेषज्ञ', query: 'अस्पताल के विशेषज्ञ डॉक्टरों की सूची दिखाओ' },
          { label: '🏥 अस्पताल के विभाग', query: 'अस्पताल में कौन-कौन से विभाग हैं?' },
          { label: '🩸 सामान्य ब्लड शुगर', query: 'सामान्य ब्लड शुगर का स्तर क्या होना चाहिए?' },
          { label: '🚨 इमरजेंसी हेल्पलाइन', query: 'आपातकालीन हेल्पलाइन नंबर' }
        ],
        te: [
          { label: '🩺 వైద్యుల వివరాలు', query: 'ఆసుపత్రిలో అందుబాటులో ఉన్న వైద్యులు ఎవరు?' },
          { label: '🏥 ఆసుపత్రి విభాగాలు', query: 'ఏయే విభాగాలు అందుబాటులో ఉన్నాయి?' },
          { label: '🩸 సాధారణ షుగర్ లెవెల్స్', query: 'నార్మల్ బ్లడ్ షుగర్ లెవెల్స్ ఎంత ఉండాలి?' },
          { label: '🚨 అత్యవసర హెల్ప్‌లైన్', query: 'ఎమర్జెన్సీ హెల్ప్‌లైన్ నంబర్లు' }
        ],
        en: [
          { label: '🩺 Available doctors', query: 'Show available doctors in the hospital' },
          { label: '🏥 Hospital departments', query: 'Which clinical departments are available?' },
          { label: '🩸 Blood sugar guide', query: 'What are normal blood glucose reference levels?' },
          { label: '🚨 Emergency helpline', query: 'Emergency helpline numbers' }
        ]
      };
      return guestPrompts[l] || guestPrompts.en;
    }
  }, [user?.role, activeLangCode]);

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
                <span>{tUI('stop_speaking')}</span>
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
                <span>{tUI('speaking_in')} {activeLangCode.toUpperCase()}...</span>
              </div>
              <button
                onClick={stopSpeaking}
                className="text-[10px] text-teal-700 dark:text-teal-300 font-bold hover:underline cursor-pointer"
              >
                {tUI('mute')}
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
                        <span>{tUI('your_appointments')} ({m.actionData.appointments.length})</span>
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
                                <span>{tUI('cancel_this_appointment')}</span>
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
                        <span>{tUI('booking_confirmed')}</span>
                      </div>
                      <div className="mt-1.5 text-[10px] text-emerald-900 dark:text-emerald-200 space-y-0.5">
                        <p><strong>{tUI('doctor')}:</strong> Dr. {m.actionData.appointment.doctor_name} ({m.actionData.appointment.specialization})</p>
                        <p><strong>{tUI('date_time')}:</strong> {m.actionData.appointment.date} at {m.actionData.appointment.time}</p>
                        <p><strong>{tUI('room')}:</strong> {m.actionData.appointment.room_number}</p>
                        <p><strong>{tUI('ref_code')}:</strong> {m.actionData.appointment.reference_number}</p>
                      </div>
                      <div className="mt-2">
                        <Link
                          to="/appointments"
                          onClick={() => setIsOpen(false)}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 rounded-lg"
                        >
                          <span>{tUI('view_my_appointments')}</span>
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
                        <span>{tUI('please_confirm')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendMessage('Yes, confirm')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{tUI('yes_confirm')}</span>
                        </button>
                        <button
                          onClick={() => handleSendMessage('No, cancel')}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold py-1.5 px-3 rounded-xl text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{tUI('no_cancel')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Action Execution: Medicines List */}
                  {m.actionExecuted === 'SHOW_AVAILABLE_MEDICINES' && m.actionData?.medicines && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-purple-600" />
                        <span>{tUI('pharmacy_stock')}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                        {m.actionData.medicines.map((med: any) => (
                          <div
                            key={med.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between text-[10px]"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">{med.name}</span>
                              <span className="text-slate-500">{med.category || med.generic_name} • ₹{med.selling_price || med.unit_price}</span>
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
                        <span>{tUI('visit_pharmacy')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Inline Action Execution: Medical Records List */}
                  {m.actionExecuted === 'SHOW_MEDICAL_RECORDS' && m.actionData?.records && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                        <span>{tUI('medical_records')} ({m.actionData.records.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.actionData.records.map((rec: any) => (
                          <div
                            key={rec.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-[10px]"
                          >
                            <span className="font-bold text-slate-900 dark:text-white block">{rec.title}</span>
                            <span className="text-slate-500">{rec.document_type || rec.record_type} • {rec.record_date || rec.created_at?.split('T')[0]}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/records"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-blue-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>{tUI('open_records')}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Inline Action Execution: Pending Doctors List for Admin */}
                  {m.actionExecuted === 'SHOW_PENDING_DOCTORS' && m.actionData?.doctors && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{tUI('pending_doctors')} ({m.actionData.doctors.length})</span>
                      </div>
                      <div className="space-y-1.5">
                        {m.actionData.doctors.map((doc: any) => (
                          <div
                            key={doc.id}
                            className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-[10px]"
                          >
                            <span className="font-bold text-slate-900 dark:text-white block">Dr. {doc.name}</span>
                            <span className="text-slate-500">{doc.specialization} • Reg: {doc.registration_number || doc.license_number}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/admin"
                        onClick={() => setIsOpen(false)}
                        className="text-[10px] text-indigo-600 hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>{tUI('open_admin_approvals')}</span>
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
                            <span>{tUI('stop_speaking')}</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                            <span>{tUI('read_aloud')}</span>
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
                  <span className="font-bold block text-xs">{tUI('listening')} ({activeLangCode.toUpperCase()})</span>
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
              placeholder={isListening ? `${tUI('listening')} (${activeLangCode.toUpperCase()})...` : tUI('input_placeholder')}
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
