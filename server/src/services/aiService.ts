import { db } from '../db/database.js';

interface ChatRequest {
  message: string;
  language: string; // en, ta, hi, te, kn, ml, bn, mr, gu, pa
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

interface ChatResponse {
  reply: string;
  language: string;
  is_emergency: boolean;
  emergency_contacts?: { name: string; number: string }[];
  suggested_actions?: string[];
  source?: 'gemini_api' | 'verified_knowledge_base';
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
  const { message, language = 'en' } = req;

  // 1. Check for urgent medical emergency
  if (checkEmergency(message, language)) {
    const reply = EMERGENCY_RESPONSES[language] || EMERGENCY_RESPONSES.en;
    return {
      reply,
      language,
      is_emergency: true,
      emergency_contacts: [
        { name: 'CareSphere 24/7 Trauma Hotline', number: '+91-80-CARE-911' },
        { name: 'National Medical Ambulance', number: '108 / 112' },
        { name: 'CareSphere Hospital Main Desk', number: '+91-80-4911-2000' }
      ],
      suggested_actions: ['Call +91-80-CARE-911', 'Visit Emergency Bay Ground Floor', 'Call Ambulance 108'],
      source: 'verified_knowledge_base'
    };
  }

  // 2. Load context from database knowledge base
  const departments = db.prepare('SELECT name, code, floor, head_of_department, phone_extension FROM departments').all() as any[];
  const doctors = db.prepare(`
    SELECT dp.id, u.name, dp.specialization, dp.experience_years, dp.consultation_fee, d.name as dept_name
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    JOIN departments d ON dp.department_id = d.id
    WHERE dp.verification_status = 'approved'
  `).all() as any[];
  const facilities = db.prepare('SELECT name, category, timing, location FROM hospital_facilities').all() as any[];

  // 3. Try Gemini API if key is available
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const response = await callGeminiAPI(message, language, departments, doctors, facilities, apiKey);
      return {
        reply: response,
        language,
        is_emergency: false,
        source: 'gemini_api'
      };
    } catch (apiErr) {
      console.warn('Gemini API call failed or timed out. Falling back to knowledge-base engine:', apiErr);
    }
  }

  // 4. Built-in Multilingual Grounded Knowledge Engine (Fallback & offline-first)
  const localReply = generateLocalKnowledgeResponse(message, language, departments, doctors, facilities);
  return {
    reply: localReply,
    language,
    is_emergency: false,
    suggested_actions: ['Book Appointment', 'View Departments', 'Find Doctor', 'Hospital Facilities'],
    source: 'verified_knowledge_base'
  };
}

async function callGeminiAPI(
  message: string,
  language: string,
  departments: any[],
  doctors: any[],
  facilities: any[],
  apiKey: string
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

  const systemPrompt = `You are CareSphere AI, a polite, compassionate, and precise hospital assistant for CareSphere Multispeciality Hospital.
Hospital Address: Plot 42, Healthcare Boulevard, Electronic City Phase 1, Bengaluru.
Emergency Phone: +91-80-CARE-911 | National Ambulance: 108 / 112 | General Desk: +91-80-4911-2000.
Hospital OPD Timings: Mon-Sat 08:00 AM - 08:00 PM. Emergency: 24/7. Visiting hours: 4-7 PM.

HOSPITAL DEPARTMENTS:
${departments.map(d => `- ${d.name} (${d.floor}, HOD: ${d.head_of_department})`).join('\n')}

VERIFIED APPROVED DOCTORS:
${doctors.map(d => `- ${d.name} (${d.specialization}, Dept: ${d.dept_name}, ${d.experience_years} yrs exp, Fee: ₹${d.consultation_fee})`).join('\n')}

FACILITIES:
${facilities.map(f => `- ${f.name} (${f.timing}, Location: ${f.location})`).join('\n')}

CRITICAL MEDICAL INSTRUCTIONS:
- You MUST reply strictly in the requested language: ${targetLanguage}.
- Never diagnose diseases, prescribe medication dosages, or invent false doctor credentials.
- Do not fabricate availability. Direct users to the "Book Appointment" tab for real-time slots.
- For non-emergency symptoms, provide general health education and advise booking a consultation with a qualified doctor.
- Always append a short respectful disclaimer that you are an AI assistant and not a medical doctor.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nUser Question (${targetLanguage}): ${message}` }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 600
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error(`Gemini API HTTP status ${res.status}`);
  }

  const data = await res.json() as any;
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) throw new Error('No text returned by Gemini API');
  return answer;
}

// Local knowledge response generator
function generateLocalKnowledgeResponse(
  query: string,
  lang: string,
  departments: any[],
  doctors: any[],
  facilities: any[]
): string {
  const q = query.toLowerCase();

  // Helper dictionary for localized templates
  const templates: Record<string, any> = {
    en: {
      doctor_match: (doc: any) => `**${doc.name}** is our approved specialist in **${doc.specialization}** (${doc.dept_name}).\n• Experience: ${doc.experience_years} years\n• Consultation Fee: ₹${doc.consultation_fee}\n\nYou can book an appointment directly from the "Doctors" tab.`,
      dept_list: `Our verified departments include:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}\n\nYou can filter doctors by department in the Directory.`,
      booking_info: `**How to Book an Appointment on CareSphere:**\n1. Go to the "Book Appointment" or "Doctors" page.\n2. Choose your preferred department and verified doctor.\n3. Pick your convenient date and 30-minute time slot.\n4. Confirm your booking to receive an instant CareSphere Reference Number (e.g. CS-2026-XXXXX).\n\n*Appointments can be rescheduled or cancelled anytime from your Patient Dashboard.*`,
      facilities_info: `**CareSphere Hospital Facilities:**\n• 24/7 Emergency & Trauma Bay (Ground Floor, Direct Ambulance Access)\n• Automated Diagnostic Pathology Lab (NABL Accredited)\n• Digital 3T MRI & 128-Slice CT Scan (Basement 1)\n• 24/7 In-House Pharmacy\n• Multilingual Patient Assistance Desks at Main Entrance.`,
      general_health: `Thank you for reaching out to CareSphere. For your symptoms, we strongly recommend scheduling a consultation with one of our specialized doctors so you can receive an accurate in-person medical evaluation and tailored treatment plan.\n\n*Note: CareSphere AI provides hospital information and general health guidance. We do not prescribe medication or substitute for professional medical diagnosis.*`,
      visiting_hours: `**Hospital Timings & Visiting Hours:**\n• OPD Clinics: Monday to Saturday, 08:00 AM - 08:00 PM\n• Emergency Trauma Unit: Open 24/7, 365 Days\n• General Ward Visiting Hours: 04:00 PM - 07:00 PM\n• ICU Visiting Hours: 11:00 AM - 12:00 PM & 05:00 PM - 06:00 PM`
    },
    ta: {
      doctor_match: (doc: any) => `**${doc.name}** அவர்கள் **${doc.specialization}** (${doc.dept_name}) துறையில் எங்கள் சரிபார்க்கப்பட்ட நிபுணர் ஆவார்.\n• அனுபவம்: ${doc.experience_years} ஆண்டுகள்\n• ஆலோசனைக் கட்டணம்: ₹${doc.consultation_fee}\n\nநீங்கள் "Doctors" பக்கத்தில் நேரடியாக முன்பதிவு செய்யலாம்.`,
      dept_list: `கேர்ஸ்பியர் மருத்துவமனை துறைகள்:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}\n\nமருத்துவர் பட்டியலில் துறைவாரியாக தேடலாம்.`,
      booking_info: `**முன்பதிவு செய்வது எப்படி:**\n1. "Book Appointment" அல்லது "Doctors" பக்கத்திற்குச் செல்லவும்.\n2. உங்களுக்குத் தேவையான துறை மற்றும் மருத்துவரைத் தேர்ந்தெடுக்கவும்.\n3. வசதியான தேதி மற்றும் நேரத்தைத் தேர்வு செய்யவும்.\n4. உறுதிசெய்து உடனடியாக CareSphere குறிப்பு எண்ணைப் பெறவும்.`,
      facilities_info: `**கேர்ஸ்பியர் மருத்துவமனை வசதிகள்:**\n• 24/7 அவசர சிகிச்சை மற்றும் விபத்து பிரிவு (தரைத்தளம்)\n• முழு தானியங்கி நோயியல் ஆய்வகம் (NABL அங்கீகாரம்)\n• 3T MRI மற்றும் அதிநவீன CT ஸ்கேன்\n• 24 மணி நேர மருந்தகம்\n• பலமொழி உதவி மையம்.`,
      general_health: `உங்கள் ஆரோக்கிய விவரங்களுக்கு நன்றி. துல்லியமான மருத்துவ பரிசோதனைக்கு எங்கள் மருத்துவரை நேரில் சந்திக்குமாறு பரிந்துரைக்கிறோம். "Book Appointment" மூலம் முன்பதிவு செய்யலாம்.\n\n*குறிப்பு: இந்த AI உதவி மருத்துவ தகவல்களை மட்டுமே வழங்குகிறது; மருத்துவ ஆலோசனைக்கு மாற்றாகாது.*`,
      visiting_hours: `**மருத்துவமனை மற்றும் பார்வையாளர் நேரம்:**\n• புறநோயாளிகள் பிரிவு (OPD): திங்கள் முதல் சனி வரை, காலை 08:00 - இரவு 08:00\n• அவசர சிகிச்சை: 24 மணி நேரமும் செயல்படுகிறது\n• பொது வார்டு பார்வையாளர் நேரம்: மாலை 04:00 - 07:00\n• தீவிர சிகிச்சை பிரிவு (ICU): காலை 11:00 - 12:00 மற்றும் மாலை 05:00 - 06:00`
    },
    hi: {
      doctor_match: (doc: any) => `**${doc.name}** हमारे **${doc.specialization}** (${doc.dept_name}) के स्वीकृत विशेषज्ञ हैं।\n• अनुभव: ${doc.experience_years} वर्ष\n• परामर्श शुल्क: ₹${doc.consultation_fee}\n\nआप "Doctors" टैब से सीधे अपॉइंटमेंट बुक कर सकते हैं।`,
      dept_list: `हमारे प्रमुख विभाग:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}\n\nआप डॉक्टर डायरेक्टरी में विभाग अनुसार खोज सकते हैं।`,
      booking_info: `**केयरस्फ़ीयर पर अपॉइंटमेंट बुक करने के चरण:**\n1. "Book Appointment" पृष्ठ पर जाएं।\n2. उपयुक्त विभाग और स्वीकृत डॉक्टर चुनें।\n3. अपनी सुविधानुसार तारीख और समय स्लॉट चुनें।\n4. पुष्टि करें और तुरंत अपॉइंटमेंट संदर्भ संख्या प्राप्त करें।`,
      facilities_info: `**केयरस्फ़ीयर अस्पताल सुविधाएं:**\n• 24/7 आपातकालीन एवं ट्रॉमा सेंटर (ग्राउंड फ्लोर)\n• आधुनिक पैथोलॉजी लैब (NABL प्रमाणित)\n• 3T डिजिटल एमआरआई और 128-स्लाइस सीटी स्कैन\n• 24/7 फार्मेसी और बहुभाषी सहायता केंद्र।`,
      general_health: `आपके स्वास्थ्य से जुड़े प्रश्न के लिए धन्यवाद। लक्षणों के सटीक मूल्यांकन हेतु हम संबंधित विशेषज्ञ डॉक्टर से परामर्श लेने की सलाह देते हैं।\n\n*नोट: यह AI केवल सामान्य जानकारी प्रदान करता है, चिकित्सीय परामर्श का विकल्प नहीं है।*`,
      visiting_hours: `**अस्पताल और मुलाकात का समय:**\n• ओपीडी (OPD): सोमवार से शनिवार, सुबह 08:00 से रात 08:00 तक\n• आपातकालीन सेवा: 24 घंटे, सातों दिन खुली है\n• वार्ड में मुलाकात: शाम 04:00 से 07:00 बजे\n• आईसीयू (ICU) मुलाकात: सुबह 11:00 से 12:00 और शाम 05:00 से 06:00 बजे`
    },
    te: {
      doctor_match: (doc: any) => `**${doc.name}** గారు **${doc.specialization}** (${doc.dept_name}) విభాగంలో నిపుణులు.\n• అనుభవం: ${doc.experience_years} సంవత్సరాలు\n• సంప్రదింపు రుసుము: ₹${doc.consultation_fee}`,
      dept_list: `మా ఆసుపత్రి విభాగాలు:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**అపాయింట్‌మెంట్ బుక్ చేసుకునే విధానం:**\n1. "Book Appointment" పేజీకి వెళ్లండి.\n2. విభాగాన్ని మరియు వైద్యుడిని ఎంచుకోండి.\n3. అనుకూలమైన తేదీ మరియు సమయాన్ని ఎంచుకుని నిర్ధారించండి.`,
      facilities_info: `**కేర్‌స్పియర్ సౌకర్యాలు:**\n• 24/7 ఎమర్జెన్సీ & ట్రామా బే (గ్రౌండ్ ఫ్లోర్)\n• అధునాతన పాథాలజీ ల్యాబ్ & 24 గంటల ఫార్మసీ\n• డిజిటల్ MRI & CT స్కాన్ సదుపాయం.`,
      general_health: `సరియైన రోగ నిర్ధారణ కొరకు దయచేసి మా నిపుణులైన వైద్యుడిని సంప్రదించండి.\n\n*గమనిక: ఈ సమాచారం సాధారణ అవగాహన కోసం మాత్రమే.*`,
      visiting_hours: `**సందర్శన వేళలు:**\n• OPD వేళలు: సోమవారం - శనివారం, ఉదయం 08:00 నుండి రాత్రి 08:00 వరకు\n• ఎమర్జెన్సీ: 24 గంటలు అందుబాటులో ఉంటుంది\n• సాధారణ వార్డు సందర్శన: సాయంత్రం 04:00 - 07:00`
    },
    kn: {
      doctor_match: (doc: any) => `**${doc.name}** ರವರು **${doc.specialization}** (${doc.dept_name}) ವಿಭಾಗದ ನುರಿತ ತಜ್ಞರು.\n• ಅನುಭವ: ${doc.experience_years} ವರ್ಷಗಳು\n• ಶುಲ್ಕ: ₹${doc.consultation_fee}`,
      dept_list: `ನಮ್ಮ ಆಸ್ಪತ್ರೆಯ ವಿಭಾಗಗಳು:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡುವುದು ಹೇಗೆ:**\n1. "Book Appointment" ಪುಟಕ್ಕೆ ಹೋಗಿ.\n2. ವಿಭಾಗ ಮತ್ತು ವೈದ್ಯರನ್ನು ಆಯ್ಕೆಮಾಡಿ.\n3. ದಿನಾಂಕ ಮತ್ತು ಸಮಯವನ್ನು ಆಯ್ಕೆಮಾಡಿ ದೃಢೀಕರಿಸಿ.`,
      facilities_info: `**ಆಸ್ಪತ್ರೆಯ ಸೌಲಭ್ಯಗಳು:**\n• 24/7 ತುರ್ತು ಚಿಕಿತ್ಸಾ ಘಟಕ\n• ಆಧುನಿಕ ಲ್ಯಾಬ್ ಮತ್ತು 24 ಗಂಟೆಗಳ ಔಷಧಾಲಯ.`,
      general_health: `ಸರಿಯಾದ ವೈದ್ಯಕೀಯ ತಪಾಸಣೆಗಾಗಿ ದಯವಿಟ್ಟು ನಮ್ಮ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಿ.\n\n*ಸೂಚನೆ: ಇದು ಸಾಮಾನ್ಯ ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ.*`,
      visiting_hours: `**ಆಸ್ಪತ್ರೆಯ ಸಮಯ:**\n• ಒಪಿಡಿ: ಬೆಳಿಗ್ಗೆ 08:00 ರಿಂದ ರಾತ್ರಿ 08:00 ರವರೆಗೆ\n• ತುರ್ತು ಸೇವೆ: 24 ಗಂಟೆಗಳು ಲಭ್ಯ.`
    },
    ml: {
      doctor_match: (doc: any) => `**${doc.name}** **${doc.specialization}** (${doc.dept_name}) വിഭാഗത്തിലെ വിദഗ്ദ്ധനാണ്.\n• പരിചയം: ${doc.experience_years} വർഷം\n• ഫീസ്: ₹${doc.consultation_fee}`,
      dept_list: `പ്രധാന വിഭാഗങ്ങൾ:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുന്ന വിധം:**\n1. "Book Appointment" പേജ് തുറക്കുക.\n2. വിഭാഗവും ഡോക്ടറെയും തിരഞ്ഞെടുക്കുക.\n3. തീയതിയും സമയവും തിരഞ്ഞെടുത്ത് സ്ഥിരീകരിക്കുക.`,
      facilities_info: `**ആശുപത്രി സൗകര്യങ്ങൾ:**\n• 24/7 എമർജൻസി കെയർ\n• പൂർണ്ണ സജ്ജീകരണങ്ങളുള്ള ലാബും ഫാർമസിയും.`,
      general_health: `കൃത്യമായ പരിശോധനക്കായി ദയവായി ഞങ്ങളുടെ ഡോക്ടറെ നേരിൽ കാണുക.\n\n*ശ്രദ്ധിക്കുക: ഇത് പൊതുവായ ആരോഗ്യ വിവരങ്ങൾ മാത്രമാണ്.*`,
      visiting_hours: `**സന്ദർശന സമയം:**\n• ഒപിഡി: രാവിലെ 08:00 മുതൽ രാത്രി 08:00 വരെ\n• എമർജൻസി: 24 മണിക്കൂറും പ്രവർത്തിക്കുന്നു.`
    },
    bn: {
      doctor_match: (doc: any) => `**${doc.name}** আমাদের **${doc.specialization}** (${doc.dept_name}) বিভাগের অনুমোদিত বিশেষজ্ঞ।\n• অভিজ্ঞতা: ${doc.experience_years} বছর\n• ফি: ₹${doc.consultation_fee}`,
      dept_list: `হাসপাতালের বিভাগসমূহ:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**অ্যাপয়েন্টমেন্ট বুকিং পদ্ধতি:**\n১. "Book Appointment" পেজে যান।\n২. বিভাগ এবং ডাক্তার নির্বাচন করুন।\n৩. তারিখ ও সময় নির্বাচন করে নিশ্চিত করুন।`,
      facilities_info: `**হাসপাতালের সুবিধাসমূহ:**\n• ২৪/৭ জরুরী পরিষেবা\n• আধুনিক ডায়াগনস্টিক ল্যাব এবং সার্বক্ষণিক ফার্মেসী।`,
      general_health: `সঠিক রোগ নির্ণয়ের জন্য অনুগ্রহ করে আমাদের বিশেষজ্ঞ ডাক্তারের পরামর্শ নিন।`,
      visiting_hours: `**সময়সূচী:**\n• ওপিডি: সকাল ০৮:০০ থেকে রাত ০৮:০০\n• জরুরী বিভাগ: ২৪ ঘন্টা খোলা থাকে।`
    },
    mr: {
      doctor_match: (doc: any) => `**${doc.name}** हे **${doc.specialization}** (${doc.dept_name}) मधील तज्ञ डॉक्टर आहेत.\n• अनुभव: ${doc.experience_years} वर्षे\n• फी: ₹${doc.consultation_fee}`,
      dept_list: `रुग्णालयातील प्रमुख विभाग:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**अपॉइंटमेंट कशी बुक करावी:**\n१. "Book Appointment" पानावर जा.\n२. विभाग आणि डॉक्टर निवडा.\n३. योग्य वेळ आणि तारीख निवडून निश्चित करा.`,
      facilities_info: `**सुविधा:**\n• २४/७ आपत्कालीन विभाग\n• आधुनिक पॅथॉलॉजी लॅब आणि औषधालय.`,
      general_health: `योग्य वैद्यकीय तपासणीसाठी कृपया संबंधित तज्ञ डॉक्टरांचा सल्ला घ्या.`,
      visiting_hours: `**भेटण्याची वेळ:**\n• ओपीडी: सकाळी ०८:०० ते रात्री ०८:००\n• आपत्कालीन: २४ तास उपलब्ध.`
    },
    gu: {
      doctor_match: (doc: any) => `**${doc.name}** અમારા **${doc.specialization}** (${doc.dept_name}) ના માન્ય નિષ્ણાત છે.\n• અનુભવ: ${doc.experience_years} વર્ષ\n• ફી: ₹${doc.consultation_fee}`,
      dept_list: `હોસ્પિટલના વિભાગો:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**એપોઇન્ટમેન્ટ બુક કરવાની રીત:**\n૧. "Book Appointment" પેજ પર જાઓ.\n૨. વિભાગ અને ડૉક્ટર પસંદ કરો.\n૩. તારીખ અને સમય પસંદ કરી કન્ફર્મ કરો.`,
      facilities_info: `**સુવિધાઓ:**\n• 24/7 ઇમરજન્સી સેવા\n• અદ્યતન લેબોરેટરી અને 24 કલાક ફાર્મસી.`,
      general_health: `યોગ્ય તબીબી તપાસ માટે કૃપા કરીને અમારા નિષ્ણાત ડૉક્ટરની સલાહ લો.`,
      visiting_hours: `**સમય:**\n• ઓપીડી: સવારે 08:00 થી રાત્રે 08:00 સુધી\n• ઇમરજન્સી: 24 કલાક ઉપલબ્ધ.`
    },
    pa: {
      doctor_match: (doc: any) => `**${doc.name}** ਸਾਡੇ **${doc.specialization}** (${doc.dept_name}) ਦੇ ਮਾਹਰ ਡਾਕਟਰ ਹਨ।\n• ਤਜਰਬਾ: ${doc.experience_years} ਸਾਲ\n• ਫੀਸ: ₹${doc.consultation_fee}`,
      dept_list: `ਹਸਪਤਾਲ ਦੇ ਵਿਭਾਗ:\n${departments.map(d => `• **${d.name}** (${d.floor})`).join('\n')}`,
      booking_info: `**ਅਪਾਇੰਟਮੈਂਟ ਬੁੱਕ ਕਰਨ ਦਾ ਤਰੀਕਾ:**\n1. "Book Appointment" ਪੇਜ 'ਤੇ ਜਾਓ।\n2. ਵਿਭਾਗ ਅਤੇ ਡਾਕਟਰ ਚੁਣੋ।\n3. ਤਰੀਕ ਅਤੇ ਸਮਾਂ ਚੁਣ ਕੇ ਪੁਸ਼ਟੀ ਕਰੋ।`,
      facilities_info: `**ਸਹੂਲਤਾਂ:**\n• 24/7 ਐਮਰਜੈਂਸੀ ਵਿਭਾਗ\n• ਆਧੁਨಿಕ ਲੈਬ ਅਤੇ 24 ਘੰਟੇ ਫਾਰਮੇਸੀ।`,
      general_health: `ਸਹੀ ਇਲਾਜ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਸਾਡੇ ਮਾਹਰ ਡਾਕਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।`,
      visiting_hours: `**ਮੁਲਾਕਾਤ ਦਾ ਸਮਾਂ:**\n• ਓਪੀਡੀ: ਸਵੇਰੇ 08:00 ਤੋਂ ਰਾਤ 08:00 ਤੱਕ\n• ਐਮਰਜੈਂਸੀ: 24 ਘੰਟੇ ਖੁੱਲ੍ਹਾ.`
    }
  };

  const t = templates[lang] || templates.en;

  // Check if user is asking about specific doctor by name
  for (const doc of doctors) {
    const lastName = doc.name.split(' ').slice(-1)[0].toLowerCase();
    if (q.includes(lastName) || q.includes(doc.name.toLowerCase())) {
      return t.doctor_match(doc);
    }
  }

  // Check if asking about departments or specialties
  if (q.includes('department') || q.includes('special') || q.includes('cardio') || q.includes('neuro') || q.includes('ortho') || q.includes('pediatric') || q.includes('துறை') || q.includes('विभाग')) {
    return t.dept_list;
  }

  // Check if asking about appointment booking / cancellation
  if (q.includes('book') || q.includes('appointment') || q.includes('cancel') || q.includes('reschedule') || q.includes('பதிவு') || q.includes('अपॉइंटमेंट')) {
    return t.booking_info;
  }

  // Check if asking about hospital facilities / pharmacy / lab
  if (q.includes('facility') || q.includes('pharmacy') || q.includes('lab') || q.includes('mri') || q.includes('ct scan') || q.includes('மருந்தகம்') || q.includes('दवाखाना')) {
    return t.facilities_info;
  }

  // Check if asking about visiting hours or timings
  if (q.includes('timing') || q.includes('hour') || q.includes('visit') || q.includes('open') || q.includes('நேரம்') || q.includes('समय')) {
    return t.visiting_hours;
  }

  // General fallback
  return t.general_health;
}
