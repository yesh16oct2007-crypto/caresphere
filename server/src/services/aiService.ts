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
      suggested_actions: ['Call +91-80-CARE-911', 'Visit Emergency Bay Ground Floor', 'Call Ambulance 108'],
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
    const cancelNotice = activeLang === 'ta'
      ? 'நடவடிக்கை ரத்து செய்யப்பட்டது. உங்கள் அப்பாய்ன்ட்மென்ட் மாற்றப்படவில்லை.'
      : activeLang === 'hi'
      ? 'क्रिया रद्द कर दी गई है। आपकी अपॉइंटमेंट में कोई बदलाव नहीं हुआ है।'
      : 'Action aborted. No changes were made to your appointment.';

    saveConversationMessage(sessionId, user?.id || null, 'assistant', cancelNotice, activeLang);

    return {
      reply: cancelNotice,
      language: activeLang,
      is_emergency: false,
      suggested_actions: ['Show my appointments', 'Book Doctor Appointment'],
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

  // 8. Try LLM API (Gemini 1.5 Flash) if Key Configured
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await callGeminiAPI(userText, activeLang, departments, doctors, facilities, apiKey, history);
      saveConversationMessage(sessionId, user?.id || null, 'assistant', response, activeLang);
      return {
        reply: response,
        language: activeLang,
        is_emergency: false,
        source: 'gemini_api'
      };
    } catch (apiErr) {
      console.warn('Gemini API call failed or timed out. Falling back to autonomous grounded knowledge engine:', apiErr);
    }
  }

  // 9. Intelligent Multilingual Grounded Knowledge Engine (Fallback & Offline-First)
  const localReply = generateLocalKnowledgeResponse(userText, activeLang, departments, doctors, facilities);
  saveConversationMessage(sessionId, user?.id || null, 'assistant', localReply, activeLang);

  return {
    reply: localReply,
    language: activeLang,
    is_emergency: false,
    suggested_actions: ['Show my appointments', 'Book Doctor Appointment', 'Available Medicines', 'Hospital Facilities'],
    source: 'verified_knowledge_base'
  };
}

/**
 * Call Gemini API with timeout, retry, and conversation history
 */
async function callGeminiAPI(
  message: string,
  language: string,
  departments: any[],
  doctors: any[],
  facilities: any[],
  apiKey: string,
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

  const systemPrompt = `You are CareSphere AI, an intelligent, empathetic, and multilingual hospital assistant for CareSphere Multispeciality Hospital Network.
Hospital Emergency Hotline: +91-80-CARE-911 | Ambulance: 108 / 112 | General Desk: +91-80-4911-2000.
Hospital OPD Timings: Mon-Sat 08:00 AM - 08:00 PM. Emergency: 24/7. Visiting hours: 4-7 PM.

HOSPITAL DEPARTMENTS:
${departments.map(d => `- ${d.name} (${d.floor}, HOD: ${d.head_of_department})`).join('\n')}

VERIFIED APPROVED DOCTORS:
${doctors.map(d => `- Dr. ${d.name} (${d.specialization}, Dept: ${d.dept_name}, ${d.experience_years} yrs exp, Fee: ₹${d.consultation_fee})`).join('\n')}

FACILITIES:
${facilities.map(f => `- ${f.name} (${f.timing}, Location: ${f.location})`).join('\n')}

INSTRUCTIONS:
1. You MUST reply in the requested language: ${targetLanguage}.
2. If the user uses transliterated language (such as Tanglish, Hinglish, Tenglish), reply naturally in that conversational style or native script.
3. Understand spelling mistakes and grammatical variations sympathetically.
4. If the user asks to book an appointment or view records, provide direct and clear answers based on verified doctor records.
5. Never invent doctor names or degrees. Never provide an independent diagnosis or prescribe medication dosages.
6. Always append a short, respectful medical disclaimer stating that you are an AI assistant and not a medical doctor.`;

  const model = process.env.AI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
      maxOutputTokens: 600
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

// Local grounded knowledge response generator
function generateLocalKnowledgeResponse(
  query: string,
  lang: string,
  departments: any[],
  doctors: any[],
  facilities: any[]
): string {
  const q = query.toLowerCase();

  const templates: Record<string, any> = {
    en: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** is our approved specialist in **${doc.specialization}** (${doc.dept_name}).\n• Experience: ${doc.experience_years} years\n• Consultation Fee: ₹${doc.consultation_fee}\n\nYou can book an appointment directly by saying *"Book Dr. ${doc.name}"* or via the Doctors directory.`,
      dept_list: `Our verified departments include:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}\n\nYou can filter doctors by department in the Directory.`,
      booking_info: `**CareSphere Appointment Booking:**\n• Say *"Book Dr. [Doctor Name]"* or *"Book Cardiology tomorrow at 10 AM"* to schedule instantly.\n• You can also view available specialists in the Doctors tab.\n• Appointments can be rescheduled or cancelled anytime by saying *"Show my appointments"* or *"Cancel my appointment"*.`,
      facilities_info: `**CareSphere Hospital Facilities:**\n• 24/7 Emergency & Trauma Bay (Ground Floor, Direct Ambulance Access)\n• Automated Diagnostic Pathology Lab (NABL Accredited)\n• Digital 3T MRI & 128-Slice CT Scan (Basement 1)\n• 24/7 In-House Pharmacy\n• Multilingual Patient Assistance Desks at Main Entrance.`,
      general_health: `Thank you for reaching out to CareSphere. For your symptoms, we recommend scheduling an evaluation with our specialist doctors. You can tell me *"Book an appointment"* or *"Show available doctors"*.\n\n*Note: CareSphere AI provides hospital navigation and guidance. Professional diagnosis requires a clinical consultation.*`,
      visiting_hours: `**Hospital Timings & Visiting Hours:**\n• OPD Clinics: Monday to Saturday, 08:00 AM - 08:00 PM\n• Emergency Trauma Unit: Open 24/7, 365 Days\n• General Ward Visiting Hours: 04:00 PM - 07:00 PM\n• ICU Visiting Hours: 11:00 AM - 12:00 PM & 05:00 PM - 06:00 PM`
    },
    ta: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** அவர்கள் **${doc.specialization}** (${doc.dept_name}) துறையில் எங்கள் சரிபார்க்கப்பட்ட நிபுணர் ஆவார்.\n• அனுபவம்: ${doc.experience_years} ஆண்டுகள்\n• ஆலோசனைக் கட்டணம்: ₹${doc.consultation_fee}\n\nமுன்பதிவு செய்ய *"Book Dr. ${doc.name}"* என்று சொல்லலாம்.`,
      dept_list: `கேர்ஸ்பியர் மருத்துவமனை துறைகள்:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}\n\nமருத்துவர் பட்டியலில் துறைவாரியாக தேடலாம்.`,
      booking_info: `**அப்பாய்ன்ட்மென்ட் முன்பதிவு:**\n• *"Book Cardiology"* அல்லது *"Dr. ${doctors[0]?.name || 'Doctor'} உடன் நாளை காலை 10 மணிக்கு முன்பதிவு செய்"* என்று கூறலாம்.\n• உங்கள் அப்பாய்ன்ட்மென்ட்களைப் பார்க்க *"Show my appointments"* என்று கூறவும்.`,
      facilities_info: `**கேர்ஸ்பியர் மருத்துவமனை வசதிகள்:**\n• 24/7 அவசர சிகிச்சை மற்றும் விபத்து பிரிவு (தரைத்தளம்)\n• முழு தானியங்கி நோயியல் ஆய்வகம் (NABL அங்கீகாரம்)\n• 3T MRI மற்றும் அதிநவீன CT ஸ்கேன்\n• 24 மணி நேர மருந்தகம்\n• பலமொழி உதவி மையம்.`,
      general_health: `உங்கள் ஆரோக்கிய விவரங்களுக்கு நன்றி. துல்லியமான மருத்துவ பரிசோதனைக்கு எங்கள் மருத்துவரை நேரில் சந்திக்குமாறு பரிந்துரைக்கிறோம். "Book appointment" மூலம் முன்பதிவு செய்யலாம்.\n\n*குறிப்பு: இந்த AI உதவி மருத்துவ தகவல்களை மட்டுமே வழங்குகிறது; மருத்துவ ஆலோசனைக்கு மாற்றாகாது.*`,
      visiting_hours: `**மருத்துவமனை நேரம்:**\n• புறநோயாளிகள் பிரிவு (OPD): திங்கள் - சனி, காலை 08:00 - இரவு 08:00\n• அவசர சிகிச்சை: 24 மணி நேரமும் செயல்படுகிறது.`
    },
    hi: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** हमारे **${doc.specialization}** (${doc.dept_name}) के स्वीकृत विशेषज्ञ हैं।\n• अनुभव: ${doc.experience_years} वर्ष\n• परामर्श शुल्क: ₹${doc.consultation_fee}\n\nअपॉइंटमेंट के लिए *"Book Dr. ${doc.name}"* कहें।`,
      dept_list: `प्रमुख विभाग:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**अपॉइंटमेंट बुकिंग:**\n• सीधे बुक करने के लिए *"Dr. ${doctors[0]?.name || 'Specialist'} के साथ कल 10 बजे बुक करो"* कहें।\n• अपनी अपॉइंटमेंट देखने के लिए *"मेरी अपॉइंटमेंट दिखाओ"* कहें।`,
      facilities_info: `**केयरस्फ़ीयर अस्पताल सुविधाएं:**\n• 24/7 आपातकालीन एवं ट्रॉमा सेंटर\n• आधुनिक पैथोलॉजी लैब व 24 घंटे फार्मेसी।`,
      general_health: `लक्षणों के सटीक मूल्यांकन हेतु हम संबंधित विशेषज्ञ डॉक्टर से परामर्श लेने की सलाह देते हैं।\n\n*नोट: यह AI केवल सामान्य जानकारी प्रदान करता है, चिकित्सीय परामर्श का विकल्प नहीं है।*`,
      visiting_hours: `**अस्पताल का समय:**\n• ओपीडी: सोमवार से शनिवार, सुबह 08:00 से रात 08:00 तक\n• इमरजेंसी: 24 घंटे खुली है।`
    },
    te: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** గారు **${doc.specialization}** (${doc.dept_name}) విభాగంలో నిపుణులు.\n• అనుభవం: ${doc.experience_years} సంవత్సరాలు\n• రుసుము: ₹${doc.consultation_fee}`,
      dept_list: `ఆసుపత్రి విభాగాలు:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**అపాయింట్‌మెంట్ బుకింగ్:**\n• *"Book Dr. ${doctors[0]?.name || 'Doctor'}"* అని చెప్పి వెంటనే బుక్ చేసుకోవచ్చు.`,
      facilities_info: `**సౌకర్యాలు:**\n• 24/7 ఎమర్జెన్సీ & ట్రామా బే\n• అధునాతన పాథాలజీ ల్యాబ్ & 24 గంటల ఫార్మసీ.`,
      general_health: `సరియైన రోగ నిర్ధారణ కొరకు దయచేసి మా నిపుణులైన వైద్యుడిని సంప్రదించండి.\n\n*గమనిక: ఈ సమాచారం సాధారణ అవగాహన కోసం మాత్రమే.*`,
      visiting_hours: `**సందర్శన వేళలు:**\n• OPD వేళలు: సోమవారం - శనివారం, ఉదయం 08:00 నుండి రాత్రి 08:00 వరకు\n• ఎమర్జెన్సీ: 24 గంటలు అందుబాటులో ఉంటుంది.`
    },
    kn: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** ರವರು **${doc.specialization}** (${doc.dept_name}) ವಿಭಾಗದ ತಜ್ಞರು.\n• ಶುಲ್ಕ: ₹${doc.consultation_fee}`,
      dept_list: `ವಿಭಾಗಗಳು:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕಿಂಗ್:**\n• *"Book appointment"* ಎಂದು ಹೇಳಿ ಸುಲಭವಾಗಿ ಬುಕ್ ಮಾಡಬಹುದು.`,
      facilities_info: `**ಸೌಲಭ್ಯಗಳು:**\n• 24/7 ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕ ಹಾಗೂ ಔಷಧಾಲಯ.`,
      general_health: `ವೈದ್ಯಕೀಯ ತಪಾಸಣೆಗಾಗಿ ದಯವಿಟ್ಟು ನಮ್ಮ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.`,
      visiting_hours: `**ಸಮಯ:**\n• ಒಪಿಡಿ: ಬೆಳಿಗ್ಗೆ 08:00 ರಿಂದ ರಾತ್ರಿ 08:00 ರವರೆಗೆ.`
    },
    ml: {
      doctor_match: (doc: any) => `**Dr. ${doc.name}** **${doc.specialization}** വിഭാഗത്തിലെ വിദഗ്ദ്ധനാണ്.\n• ഫീസ്: ₹${doc.consultation_fee}`,
      dept_list: `വിഭാഗങ്ങൾ:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**അപ്പോയിന്റ്മെന്റ്:**\n• ബുക്ക് ചെയ്യാൻ *"Book Dr. ${doctors[0]?.name || 'Doctor'}"* എന്ന് പറയുക.`,
      facilities_info: `**സൗകര്യങ്ങൾ:**\n• 24/7 എമർജൻസി കെയർ, ലാബ്, ഫാർമസി.`,
      general_health: `കൃത്യമായ പരിശോധനക്കായി ദയവായി ഡോക്ടറെ നേരിൽ കാണുക.`,
      visiting_hours: `**സമയം:** ഒപിഡി രാവിലെ 08:00 മുതൽ രാത്രി 08:00 വരെ.`
    }
  };

  const t = templates[lang] || templates.en;

  for (const doc of doctors) {
    const lastName = doc.name.split(' ').slice(-1)[0].toLowerCase();
    if (q.includes(lastName) || q.includes(doc.name.toLowerCase())) {
      return t.doctor_match(doc);
    }
  }

  if (q.includes('department') || q.includes('special') || q.includes('துறை') || q.includes('विभाग') || q.includes('విభాగం')) {
    return t.dept_list;
  }

  if (q.includes('facility') || q.includes('pharmacy') || q.includes('lab') || q.includes('மருந்தகம்') || q.includes('दवाखाना')) {
    return t.facilities_info;
  }

  if (q.includes('timing') || q.includes('hour') || q.includes('visit') || q.includes('நேரம்') || q.includes('समय')) {
    return t.visiting_hours;
  }

  return t.general_health;
}
