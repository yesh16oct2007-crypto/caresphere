import { db } from '../db/database.js';
import { detectLanguage, DetectedLanguage } from './languageDetector.js';
import { parseMultilingualIntent, ParsedIntent } from './multilingualIntentParser.js';
import { executeAIAction, UserContext, ActionExecutionResult } from './aiActionExecutor.js';
import {
  saveConversationMessage,
  getConversationHistory,
  getLatestContext,
  SessionContext
} from './conversationMemory.js';
import {
  generateUniversalKnowledgeResponse,
  normalizeLanguage,
  SupportedLanguage,
  MEDICAL_DISCLAIMERS
} from './aiKnowledgeBrain.js';

export interface ChatRequest {
  message: string;
  language?: string; // Optional preferred language
  sessionId?: string;
  user?: UserContext;
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export interface ChatResponse {
  reply: string;
  language: string;
  is_emergency: boolean;
  emergency_contacts?: { name: string; number: string }[];
  suggested_actions?: string[];
  action_executed?: string | null;
  action_data?: any;
  requires_confirmation?: boolean;
  source: 'gemini_api' | 'verified_knowledge_base' | 'action_executor';
}

// Emergency keywords across supported languages
const EMERGENCY_KEYWORDS: Record<string, string[]> = {
  en: ['chest pain', 'heart attack', 'breathless', 'stroke', 'unconscious', 'fainted', 'heavy bleeding', 'poison', 'suicide', 'severe trauma', 'cannot breathe', 'choking'],
  hi: ['सीने में दर्द', 'दिल का दौरा', 'सांस लेने में तकलीफ', 'बेहोश', 'खून बह रहा', 'आपातकाल', 'स्ट्रोक', 'सांस नहीं आ रही'],
  ta: ['நெஞ்சு வலி', 'மாரடைப்பு', 'மூச்சுத் திணறல்', 'மயக்கம்', 'இரத்தப்போக்கு', 'அவசரநிலை', 'பக்கவாதம்', 'மூச்சு விட முடியவில்லை'],
  te: ['గుండె నొప్పి', 'శ్వాస తీసుకోవడంలో ఇబ్బంది', 'స్పృహ తప్పడం', 'తీవ్ర రక్తస్రావం', 'పక్షవాతం', 'అత్యవసర'],
  kn: ['ಎದೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಪ್ರಜ್ಞೆ ತಪ್ಪಿದೆ', 'ತೀವ್ರ ರಕ್ತಸ್ರಾವ', 'ಪಾರ್ಶ್ವವಾಯು', 'ತುರ್ತು ಪರಿಸ್ಥಿತಿ'],
  ml: ['നെഞ്ചുവേദന', 'ശ്വാസതടസ്സം', 'ബോധംകെട്ടു', 'രക്തസ്രാവം', 'സ്ട്രോക്ക്', 'അടിയന്തിര'],
  bn: ['বুকে ব্যথা', 'হার্ট অ্যাটাক', 'শ্বাসকষ্ট', 'অজ্ঞান', 'প্রচুর রক্তপাত', 'জরুরী'],
  mr: ['छातीत दुखणे', 'हृदयविकाराचा झटका', 'श्वास घेण्यास त्रास', 'बेशुद्ध', 'रक्तस्त्राव', 'आपत्कालीन'],
  gu: ['છાતીમાં દુખાવો', 'હાર્ટ એટેક', 'શ્વાસ લેવામાં તકલીફ', 'બેભાન', 'લોહી વહેવું', 'કટોકટી'],
  pa: ['ਛਾਤੀ ਵਿੱਚ ਦਰਦ', 'ਦਿਲ ਦਾ ਦੌਰਾ', 'ਸਾਹ ਲੈਣ ਵਿੱਚ ਤਕਲੀਫ਼', 'ਬੇਹੋਸ਼', 'ਖੂਨ ਵਹਿਣਾ', 'ਐਮਰਜੈਂਸੀ']
};

export function checkEmergency(message: string, language: string): boolean {
  const lowerMsg = message.toLowerCase();
  
  // Check English words always
  for (const kw of EMERGENCY_KEYWORDS.en) {
    if (lowerMsg.includes(kw)) return true;
  }

  // Check language-specific keywords
  const langWords = EMERGENCY_KEYWORDS[language];
  if (langWords) {
    for (const kw of langWords) {
      if (lowerMsg.includes(kw.toLowerCase())) return true;
    }
  }

  return false;
}

// Pre-translated emergency response messages
const EMERGENCY_RESPONSES: Record<string, string> = {
  en: `🚨 **MEDICAL EMERGENCY ALERT**\n\nBased on your message, this could be a critical or life-threatening situation. **Please do not wait for an online appointment or an AI response.**\n\n**Immediate Action Steps:**\n1. Call our 24/7 Hospital Emergency Trauma Bay: **+91-80-CARE-911**\n2. Call National Ambulance Services: **108** or **112**\n3. If safe, have someone transport you to the nearest hospital Emergency Room immediately.\n\n*Our emergency department is open 24 hours at Ground Floor, South Wing, Direct Ambulance Bay.*`,
  ta: `🚨 **மருத்துவ அவசர எச்சரிக்கை**\n\nஉங்கள் தகவலின்படி, இது உயிருக்கு ஆபத்தான அவசரநிலையாக இருக்கலாம். **தயவுசெய்து ஆன்லைன் முன்பதிவுக்காகவோ அல்லது கூடுதல் பதிலுக்காகவோ காத்திருக்க வேண்டாம்.**\n\n**உடனடி நடவடிக்கைகள்:**\n1. எங்கள் 24/7 மருத்துவமனை அவசர சேவைக்கு அழைக்கவும்: **+91-80-CARE-911**\n2. தேசிய ஆம்புலன்ஸ் சேவை: **108** அல்லது **112**\n3. தாமதிக்காமல் உடனடியாக அருகிலுள்ள மருத்துவமனை அவசர சிகிச்சைப் பிரிவிற்கு (Emergency Room) செல்லவும்.\n\n*எங்கள் அவசர சிகிச்சைப் பிரிவு தரைத்தளத்தில் 24 மணி நேரமும் செயல்படுகிறது.*`,
  hi: `🚨 **चिकित्सा आपातकालीन चेतावनी**\n\nआपके संदेश के आधार पर यह एक गंभीर या जानलेवा आपातकालीन स्थिति हो सकती है। **कृपया ऑनलाइन अपॉइंटमेंट या अतिरिक्त चैट संदेशों की प्रतीक्षा न करें।**\n\n**तुरंत उठाए जाने वाले कदम:**\n1. हमारे 24/7 अस्पताल इमरजेंसी ट्रॉमा सेंटर को कॉल करें: **+91-80-CARE-911**\n2. राष्ट्रीय एम्बुलेंस सेवा: **108** या **112** पर कॉल करें\n3. बिना देरी किए तुरंत नजदीकी अस्पताल के आपातकालीन कक्ष (Emergency Room) में पहुंचें।\n\n*हमारा आपातकालीन विभाग ग्राउंड फ्लोर पर 24 घंटे खुला है।*`,
  te: `🚨 **వైద్య అత్యవసర హెచ్చరిక**\n\nమీ సందేశం ప్రకారం, ఇది తీవ్రమైన లేదా ప్రాణాంతక అత్యవసర పరిస్థితి కావచ్చు. **దయచేసి ఆన్‌లైన్ అపాయింట్‌మెంట్ కోసం వేచి ఉండకండి.**\n\n**తక్షణ చర్యలు:**\n1. మా 24/7 ఆసుపత్రి అత్యవసర నంబర్‌కు కాల్ చేయండి: **+91-80-CARE-911**\n2. జాతీయ అంబులెన్స్ సేవలు: **108** లేదా **112**\n3. ఆలస్యం చేయకుండా వెంటనే సమీపంలోని ఆసుపత్రి ఎమర్జెన్సీ వార్డుకు వెళ్లండి.`,
  kn: `🚨 **ತುರ್ತು ವೈದ್ಯಕೀಯ ಎಚ್ಚರಿಕೆ**\n\nನಿಮ್ಮ ಸಂದೇಶದ ಪ್ರಕಾರ, ಇದು ತೀವ್ರವಾದ ಜೀವಕ್ಕೆ ಅಪಾಯಕಾರಿಯಾದ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯಾಗಿರಬಹುದು. **ದಯವಿಟ್ಟು ಆನ್‌ಲೈನ್ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಾಗಿ ಕಾಯಬೇಡಿ.**\n\n**ತಕ್ಷಣದ ಕ್ರಮಗಳು:**\n1. ನಮ್ಮ 24/7 ಆಸ್ಪತ್ರೆ ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕಕ್ಕೆ ಕರೆ ಮಾಡಿ: **+91-80-CARE-911**\n2. ರಾಷ್ಟ್ರೀಯ ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆ: **108** ಅಥವಾ **112**\n3. ತಕ್ಷಣವೇ ಹತ್ತಿರದ ಆಸ್ಪತ್ರೆಯ ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.`,
  ml: `🚨 **അടിയന്തിര മെഡിക്കൽ മുന്നറിയിപ്പ്**\n\nനിങ്ങളുടെ സന്ദേശ പ്രകാരം ഇത് ഗുരുതരമായ അടിയന്തിര സാഹചര്യമാകാം. **ഓൺലൈൻ അപ്പോയിന്റ്മെന്റിനായി കാത്തിരിക്കരുത്.**\n\n**ഉടൻ ചെയ്യേണ്ട കാര്യങ്ങൾ:**\n1. ഞങ്ങളുടെ 24/7 അത്യാഹിത വിഭാഗത്തിലേക്ക് വിളിക്കുക: **+91-80-CARE-911**\n2. ദേശീയ ആംബുലൻസ് സർവീസ്: **108** അല്ലെങ്കിൽ **112**\n3. ഉടൻ തന്നെ ഏറ്റവും അടുത്തുള്ള ആശുപത്രി അത്യാഹിത വിഭാഗത്തിൽ എത്തുക.`,
  bn: `🚨 **জরুরী চিকিৎসা সতর্কতা**\n\nআপনার বার্তা অনুযায়ী এটি একটি জীবনঘাতী জরুরী পরিস্থিতি হতে পারে। **দয়া করে অনলাইন অ্যাপয়েন্টমেন্টের জন্য অপেক্ষা করবেন না।**\n\n**অবিলম্বে করণীয়:**\n1. আমাদের ২৪/৭ জরুরী ট্রমা বে-তে কল করুন: **+91-80-CARE-911**\n2. জাতীয় অ্যাম্বুলেন্স পরিষেবা: **১০৮** বা **১১২**\n3. অবিলম্বে নিকটস্থ হাসপাতালের জরুরী বিভাগে যান।`,
  mr: `🚨 **वैद्यकीय आपत्कालीन सूचना**\n\nतुमच्या संदेशानुसार ही गंभीर परिस्थिती असू शकते. **कृपया ऑनलाइन भेटीसाठी वाट पाहू नका.**\n\n**त्वरित उपाय:**\n1. आमच्या 24/7 हॉस्पिटल आपत्कालीन विभागाला कॉल करा: **+91-80-CARE-911**\n2. राष्ट्रीय रुग्णवाहिका सेवा: **108** किंवा **112**\n3. विलंब न करता ताबडतोब जवळच्या रुग्णालयाच्या आपत्कालीन विभागात जा.`,
  gu: `🚨 **તબીબી કટોકટી ચેતવણી**\n\nતમારા સંદેશ મુજબ આ ગંભીર કટોકટીની સ્થિતિ હોઈ શકે છે. **કૃપા કરીને ઓનલાઈન એપોઇન્ટમેન્ટની રાહ ન જુઓ.**\n\n**તાત્કાલિક પગલાં:**\n1. અમારા 24/7 ઇમરજન્સી સેન્ટરને કૉલ કરો: **+91-80-CARE-911**\n2. રાષ્ટ્રીય એમ્બ્યુલન્સ સેવા: **108** અથવા **112**\n3. વિલંબ કર્યા વિના તરત જ નજીકના હોસ્પિટલના ઇમરજન્સી રૂમમાં પહોંચો.`,
  pa: `🚨 **ਮੈਡੀਕਲ ਐਮਰਜੈਂਸੀ ਅਲਰਟ**\n\nਤੁਹਾਡੇ ਸੁਨੇਹੇ ਅਨੁਸਾਰ ਇਹ ਇੱਕ ਗੰਭੀਰ ਐਮਰਜੈਂਸੀ ਹੋ ਸਕਦੀ ਹੈ। **ਕਿਰਪਾ ਕਰਕੇ ਔਨਲਾਈਨ ਮੁਲਾਕਾਤ ਦੀ ਉਡੀਕ ਨਾ ਕਰੋ।**\n\n**ਤੁਰੰਤ ਕਾਰਵਾਈ:**\n1. ਸਾਡੇ 24/7 ਹਸਪਤਾਲ ਐਮਰਜੈਂਸੀ ਨੰਬਰ ਤੇ ਕਾਲ ਕਰੋ: **+91-80-CARE-911**\n2. ਨੈਸ਼ਨਲ ਐਂਬੂਲੈਂਸ ਸੇਵਾ: **108** ਜਾਂ **112**\n3. ਬਿਨਾਂ ਦੇਰੀ ਕੀਤੇ ਤੁਰੰਤ ਨਜ਼ਦੀਕੀ ਹਸਪਤਾਲ ਦੇ ਐਮਰਜੈਂਸੀ ਰੂਮ ਵਿੱਚ ਪਹੁੰਚੋ।`
};

// Localized Suggested Actions across 10 Indian Regional Languages
export const SUGGESTED_ACTIONS_BY_LANG: Record<string, string[]> = {
  en: ['Show my appointments', 'Book Doctor Appointment', 'Available Medicines', 'Hospital Facilities'],
  ta: ['என் அப்பாய்ன்ட்மென்ட்கள்', 'மருத்துவர் முன்பதிவு', 'மருந்துகள் இருப்பு', 'மருத்துவமனை வசதிகள்'],
  hi: ['मेरी अपॉइंटमेंट', 'डॉक्टर बुक करें', 'उपलब्ध दवाएं', 'अस्पताल सुविधाएं'],
  te: ['నా అపాయింట్‌మెంట్‌లు', 'డాక్టర్‌ను బుక్ చేయండి', 'అందుబాటులో ఉన్న మందులు', 'ఆసుపత్రి సౌకర్యాలు'],
  kn: ['ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್', 'ವೈದ್ಯರ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕಿಂಗ್', 'ಲಭ್ಯವಿರುವ ಔಷಧಿಗಳು', 'ಆಸ್ಪತ್ರೆ ಸೌಲಭ್ಯಗಳು'],
  ml: ['എന്റെ അപ്പോയിന്റ്മെന്റുകൾ', 'ഡോക്ടറെ ബുക്ക് ചെയ്യുക', 'ലഭ്യമായ മരുന്നുകൾ', 'ആശുപത്രി സൗകര്യങ്ങൾ'],
  bn: ['আমার অ্যাপয়েন্টমেন্ট', 'ডাক্তার বুক করুন', 'উপলব্ধ ওষুধ', 'হাসপাতালের সুবিধাসমূহ'],
  mr: ['माझी अपॉइंटमेंट', 'डॉक्टर बुक करा', 'उपलब्ध औषधे', 'रुग्णालय सुविधा'],
  gu: ['મારી એપોઇન્ટમેન્ટ', 'ડૉક્ટર બુક કરો', 'ઉપલબ્ધ દવાઓ', 'હોસ્પિટલ સુવિધાઓ'],
  pa: ['ਮੇਰੀ ਮੁਲਾਕਾਤ', 'ਡਾਕਟਰ ਬੁੱਕ ਕਰੋ', 'ਉਪਲਬਧ ਦਵਾਈਆਂ', 'ਹਸਪਤਾਲ ਦੀਆਂ ਸਹੂਲਤਾਂ']
};

export const EMERGENCY_SUGGESTED_ACTIONS: Record<string, string[]> = {
  en: ['Call +91-80-CARE-911', 'Visit Emergency Bay Ground Floor', 'Call Ambulance 108'],
  ta: ['அழைக்கவும் +91-80-CARE-911', 'அவசர சிகிச்சை பிரிவு (தரைத்தளம்)', 'ஆம்புலன்ஸ் 108 அழைக்கவும்'],
  hi: ['कॉल करें +91-80-CARE-911', 'इमरजेंसी वार्ड ग्राउंड फ्लोर जाएं', 'एम्बुलेंस 108 पर कॉल करें'],
  te: ['కాల్ చేయండి +91-80-CARE-911', 'ఎమర్జెన్సీ వార్డుకు వెళ్లండి', 'అంబులెన్స్ 108'],
  kn: ['ಕರೆ ಮಾಡಿ +91-80-CARE-911', 'ತುರ್ತು ಚಿಕಿತ್ಸಾ ವಿಭಾಗಕ್ಕೆ ಭೇಟಿ ನೀಡಿ', 'ಆಂಬ್ಯುಲೆನ್ಸ್ 108'],
  ml: ['വിളിക്കുക +91-80-CARE-911', 'അത്യാഹിത വിഭാഗത്തിൽ എത്തുക', 'ആംബുലൻസ് 108'],
  bn: ['কল করুন +91-80-CARE-911', 'জরুরী ট্রমা বিভাগে যান', 'অ্যাম্বুলেন্স ১০৮'],
  mr: ['कॉल करा +91-80-CARE-911', 'आपत्कालीन वॉर्डमध्ये जा', 'रुग्णवाहिका 108'],
  gu: ['કૉલ કરો +91-80-CARE-911', 'ઇમરજન્સી રૂમમાં જાઓ', 'એમ્બ્યુલન્સ 108'],
  pa: ['ਕਾਲ ਕਰੋ +91-80-CARE-911', 'ਐਮਰਜੈਂਸੀ ਰੂਮ ਪਹੁੰਚੋ', 'ਐਂਬੂਲੈਂਸ 108']
};

export async function processChatMessage(req: ChatRequest): Promise<ChatResponse> {
  const { message, language: requestedLang, sessionId: passedSessionId, user } = req;
  const userText = message ? message.trim() : '';

  // 1. Language Detection & Preference Synchronization
  const preferredFallback = (requestedLang || user?.preferred_language || 'en') as DetectedLanguage['lang'];
  const detected = detectLanguage(userText, preferredFallback);
  const activeLang = requestedLang || detected.lang || 'en';

  // Persist language to user profile if user is logged in
  if (user && activeLang && user.preferred_language !== activeLang) {
    try {
      db.prepare('UPDATE users SET preferred_language = ? WHERE id = ?').run(activeLang, user.id);
    } catch (e) {
      // non-blocking
    }
  }

  // 2. Session Context & Multi-Turn Conversational Memory
  const sessionId = passedSessionId || (user ? `user_${user.id}` : `session_${Date.now()}`);
  const history = getConversationHistory(sessionId, 6);
  const latestContext = getLatestContext(sessionId);

  // Record user message into session memory
  saveConversationMessage(sessionId, user?.id || null, 'user', userText, activeLang);

  // 3. Urgent Medical Emergency Check
  if (checkEmergency(userText, activeLang)) {
    const reply = EMERGENCY_RESPONSES[activeLang] || EMERGENCY_RESPONSES.en;
    const emergencyRes: ChatResponse = {
      reply,
      language: activeLang,
      is_emergency: true,
      emergency_contacts: [
        { name: 'CareSphere 24/7 Trauma Hotline', number: '+91-80-CARE-911' },
        { name: 'National Medical Ambulance', number: '108 / 112' },
        { name: 'CareSphere Main Desk', number: '+91-80-4911-2000' }
      ],
      suggested_actions: EMERGENCY_SUGGESTED_ACTIONS[activeLang] || EMERGENCY_SUGGESTED_ACTIONS.en,
      source: 'verified_knowledge_base'
    };
    saveConversationMessage(sessionId, user?.id || null, 'assistant', reply, activeLang, 'EMERGENCY_SOS');
    return emergencyRes;
  }

  // 4. Intent & Entity Parsing
  const parsed = parseMultilingualIntent(userText);

  // 5. Check if user is confirming or rejecting a previous pending action
  if (parsed.intent === 'CONFIRM_ACTION' && latestContext?.pending_action) {
    const actionResult = await executeAIAction(
      latestContext.pending_action.action,
      { ...latestContext.pending_action.params, confirmed: true },
      user || null,
      activeLang,
      latestContext
    );

    saveConversationMessage(
      sessionId,
      user?.id || null,
      'assistant',
      actionResult.reply,
      activeLang,
      actionResult.action,
      actionResult.updated_context || null
    );

    return {
      reply: actionResult.reply,
      language: activeLang,
      is_emergency: false,
      action_executed: actionResult.action,
      action_data: actionResult.data,
      suggested_actions: actionResult.suggested_actions,
      source: 'action_executor'
    };
  }

  if (parsed.intent === 'REJECT_ACTION' && latestContext?.pending_action) {
    const cancelNoticeMap: Record<string, string> = {
      en: 'Action aborted. No changes were made to your appointment.',
      ta: 'நடவடிக்கை ரத்து செய்யப்பட்டது. உங்கள் அப்பாய்ன்ட்மென்ட் மாற்றப்படவில்லை.',
      hi: 'क्रिया रद्द कर दी गई है। आपकी अपॉइंटमेंट में कोई बदलाव नहीं हुआ है।',
      te: 'చర్య రద్దు చేయబడింది. మీ అపాయింట్‌మెంట్‌లో ఎలాంటి మార్పులు జరగలేదు.',
      kn: 'ಕ್ರಿಯೆಯನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಬದಲಾವಣೆಗಳಾಗಿಲ್ಲ.',
      ml: 'നടപടി റദ്ദാക്കി. നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റിൽ മാറ്റങ്ങളൊന്നും വരുത്തിയിട്ടില്ല.',
      bn: 'পদক্ষেপ বাতিল করা হয়েছে। আপনার অ্যাপয়েন্টমেন্টে কোনো পরিবর্তন করা হয়নি।',
      mr: 'क्रिया रद्द केली आहे. आपल्या अपॉइंटमेंटमध्ये कोणताही बदल झालेला नाही.',
      gu: 'ક્રિયા રદ કરવામાં આવી છે. તમારી એપોઇન્ટમેન્ટમાં કોઈ ફેરફાર થયો નથી.',
      pa: 'ਕਾਰਵਾਈ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ ਵਿੱਚ ਕੋਈ ਬਦਲਾਅ ਨਹੀਂ ਹੋਇਆ।'
    };
    const cancelNotice = cancelNoticeMap[activeLang] || cancelNoticeMap.en;

    saveConversationMessage(sessionId, user?.id || null, 'assistant', cancelNotice, activeLang);

    return {
      reply: cancelNotice,
      language: activeLang,
      is_emergency: false,
      suggested_actions: SUGGESTED_ACTIONS_BY_LANG[activeLang] || SUGGESTED_ACTIONS_BY_LANG.en,
      source: 'action_executor'
    };
  }

  // 6. Execute User Requested Action if Intent is Actionable
  const actionableIntents = [
    'SHOW_MY_APPOINTMENTS',
    'BOOK_APPOINTMENT',
    'CANCEL_APPOINTMENT',
    'RESCHEDULE_APPOINTMENT',
    'SHOW_MEDICAL_RECORDS',
    'SHOW_AVAILABLE_MEDICINES',
    'SHOW_DOCTOR_APPOINTMENTS',
    'SHOW_PENDING_DOCTORS'
  ];

  if (actionableIntents.includes(parsed.intent)) {
    const actionResult = await executeAIAction(
      parsed.intent,
      parsed.entities,
      user || null,
      activeLang,
      latestContext
    );

    saveConversationMessage(
      sessionId,
      user?.id || null,
      'assistant',
      actionResult.reply,
      activeLang,
      actionResult.action,
      actionResult.updated_context || null
    );

    return {
      reply: actionResult.reply,
      language: activeLang,
      is_emergency: false,
      action_executed: actionResult.action,
      action_data: actionResult.data,
      requires_confirmation: actionResult.requires_confirmation,
      suggested_actions: actionResult.suggested_actions,
      source: 'action_executor'
    };
  }

  // 7. Context Loading from Live Hospital Database
  const departments = db.prepare('SELECT name, code, floor, head_of_department, phone_extension FROM departments').all() as any[];
  const doctors = db.prepare(`
    SELECT dp.id, u.name, dp.specialization, dp.experience_years, dp.consultation_fee, d.name as dept_name
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    JOIN departments d ON dp.department_id = d.id
    WHERE dp.verification_status = 'approved'
  `).all() as any[];
  const facilities = db.prepare('SELECT name, category, timing, location FROM hospital_facilities').all() as any[];

  // 8. Try LLM API (Gemini or OpenAI) if Key Configured
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (geminiKey || openaiKey) {
    try {
      const response = await callLLMAPI(userText, activeLang, departments, doctors, facilities, { geminiKey, openaiKey }, history);
      saveConversationMessage(sessionId, user?.id || null, 'assistant', response, activeLang);
      return {
        reply: response,
        language: activeLang,
        is_emergency: false,
        suggested_actions: SUGGESTED_ACTIONS_BY_LANG[activeLang] || SUGGESTED_ACTIONS_BY_LANG.en,
        source: 'gemini_api'
      };
    } catch (apiErr) {
      console.warn('LLM API call failed or timed out. Falling back to autonomous grounded knowledge engine:', apiErr);
    }
  }

  // 9. Intelligent Multilingual Grounded Knowledge Engine (Fallback & Offline-First)
  const localReply = generateUniversalKnowledgeResponse(userText, activeLang, {
    departments,
    doctors,
    facilities,
    history,
    userName: user?.name,
    userRole: user?.role
  });
  saveConversationMessage(sessionId, user?.id || null, 'assistant', localReply, activeLang);

  return {
    reply: localReply,
    language: activeLang,
    is_emergency: false,
    suggested_actions: SUGGESTED_ACTIONS_BY_LANG[activeLang] || SUGGESTED_ACTIONS_BY_LANG.en,
    source: 'verified_knowledge_base'
  };
}

/**
 * Call Gemini or OpenAI LLM API with timeout, retry, and full conversation history
 * Configured to answer ANY question thoroughly like ChatGPT in the requested language
 */
async function callLLMAPI(
  message: string,
  language: string,
  departments: any[],
  doctors: any[],
  facilities: any[],
  keys: { geminiKey?: string; openaiKey?: string },
  history: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  const languageNames: Record<string, string> = {
    en: 'English',
    ta: 'Tamil (தமிழ்)',
    hi: 'Hindi (हिन्दी)',
    te: 'Telugu (తెలుగు)',
    kn: 'Kannada (ಕನ್ನಡ)',
    ml: 'Malayalam (മലയാളം)',
    bn: 'Bengali (বাংলা)',
    mr: 'Marathi (मराठी)',
    gu: 'Gujarati (ગુજરાતી)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)'
  };

  const targetLanguage = languageNames[language] || 'English';

  const systemPrompt = `You are CareSphere AI, an intelligent, empathetic, and comprehensive conversational healthcare AI assistant like ChatGPT for the CareSphere Multi-Hospital Network.
Hospital Emergency Hotline: +91-80-CARE-911 | Ambulance: 108 / 112 | General Desk: +91-80-4911-2000.
Hospital OPD Timings: Mon-Sat 08:00 AM - 08:00 PM. Emergency: 24/7. Visiting hours: 4-7 PM.

HOSPITAL DEPARTMENTS:
${departments.map(d => `- ${d.name} (${d.floor}, HOD: ${d.head_of_department})`).join('\n')}

VERIFIED APPROVED DOCTORS:
${doctors.map(d => `- Dr. ${d.name} (${d.specialization}, Dept: ${d.dept_name}, ${d.experience_years} yrs exp, Fee: ₹${d.consultation_fee})`).join('\n')}

FACILITIES:
${facilities.map(f => `- ${f.name} (${f.timing}, Location: ${f.location})`).join('\n')}

CRITICAL INSTRUCTIONS:
1. You MUST reply in the requested language: ${targetLanguage}.
2. Answer ANY user question thoroughly, accurately, empathetically, and comprehensively like ChatGPT in ${targetLanguage}.
3. You can answer medical science, human anatomy, symptoms, medications, home remedies, laboratory tests, diet, lifestyle, disease mechanisms, general inquiries, and hospital navigation.
4. Format your response with clear headings, bullet points, and well-structured markdown.
5. If the user uses transliterated language (such as Tanglish, Hinglish, Tenglish), reply naturally in that conversational style or native script.
6. Understand spelling mistakes, colloquial terms, and grammatical variations sympathetically.
7. If the user asks to book an appointment or view records, provide direct and clear answers based on verified doctor records.
8. Never refuse a question or say you cannot answer. You have full clinical and general knowledge.
9. Always append a short, respectful medical disclaimer in ${targetLanguage} stating that you are an AI assistant and not a medical doctor.`;

  if (keys.geminiKey) {
    const model = process.env.AI_MODEL || 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.geminiKey}`;

    const contents = [
      ...history.slice(-4).map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Message (${targetLanguage}): ${message}` }]
      }
    ];

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 900
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Gemini API HTTP status ${res.status}`);
      }

      const data = await res.json() as any;
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) throw new Error('No text returned by Gemini API');
      return answer;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  // Fallback to OpenAI API if OPENAI_API_KEY is configured
  if (keys.openaiKey) {
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        ...history.slice(-4).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: `[Respond in ${targetLanguage}]\n${message}` }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openaiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 900
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`OpenAI API HTTP ${res.status}`);
      const data = await res.json() as any;
      const answer = data.choices?.[0]?.message?.content;
      if (!answer) throw new Error('No text returned by OpenAI API');
      return answer;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  throw new Error('No LLM API key configured');
}
