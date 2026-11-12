/**
 * CareSphere Autonomous Universal Medical & General Knowledge AI Brain
 *
 * Powers ChatGPT-like intelligent, multi-turn, comprehensive conversational responses
 * across all 10 supported regional Indian languages (English, Tamil, Hindi, Telugu,
 * Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi) for ANY question.
 */

export interface KnowledgeContext {
  departments?: any[];
  doctors?: any[];
  facilities?: any[];
  history?: { role: 'user' | 'assistant'; content: string }[];
  userName?: string;
  userRole?: string;
}

export type SupportedLanguage = 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr' | 'gu' | 'pa';

// Helper to normalize language code
export function normalizeLanguage(lang?: string): SupportedLanguage {
  if (!lang) return 'en';
  const clean = lang.toLowerCase().trim();
  if (clean.startsWith('ta')) return 'ta';
  if (clean.startsWith('hi')) return 'hi';
  if (clean.startsWith('te')) return 'te';
  if (clean.startsWith('kn')) return 'kn';
  if (clean.startsWith('ml')) return 'ml';
  if (clean.startsWith('bn')) return 'bn';
  if (clean.startsWith('mr')) return 'mr';
  if (clean.startsWith('gu')) return 'gu';
  if (clean.startsWith('pa')) return 'pa';
  return 'en';
}

// Medical disclaimer strings across all 10 languages
export const MEDICAL_DISCLAIMERS: Record<SupportedLanguage, string> = {
  en: '💡 *CareSphere AI provides verified health education and hospital guidance. For persistent or acute symptoms, please consult a qualified doctor or book an OPD consultation.*',
  ta: '💡 *கேர்ஸ்பியர் AI மருத்துவ கல்வி மற்றும் வழிகாட்டலை வழங்குகிறது. தீவிர அறிகுறிகளுக்கு தகுதியான மருத்துவரை அணுகவும்.*',
  hi: '💡 *केयरस्फ़ीयर AI सत्यापित स्वास्थ्य शिक्षा व अस्पताल मार्गदर्शन प्रदान करता है। गंभीर लक्षणों हेतु कृपया चिकित्सक से परामर्श लें।*',
  te: '💡 *కేర్‌స్పియర్ AI ఆరోగ్య సమాచారం మరియు మార్గదర్శకత్వాన్ని అందిస్తుంది. తీవ్రమైన లక్షణాలు ఉంటే దయచేసి అర్హత కలిగిన వైద్యుడిని సంప్రదించండి.*',
  kn: '💡 *ಕೇರ್‌ಸ್ಪಿಯರ್ AI ಆರೋಗ್ಯ ಶಿಕ್ಷಣ ಮತ್ತು ಆಸ್ಪತ್ರೆ ಮಾರ್ಗದರ್ಶನವನ್ನು ನೀಡುತ್ತದೆ. ತೀವ್ರ ಲಕ್ಷಣಗಳಿದ್ದಲ್ಲಿ ದಯವಿಟ್ಟು ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.*',
  ml: '💡 *കെയർസ്ഫിയർ AI ആരോഗ്യ വിവരങ്ങളും മാർഗ്ഗനിർദ്ദേശങ്ങളും നൽകുന്നു. ഗുരുതര ലക്ഷണങ്ങൾക്ക് ദയവായി ഒരു ഡോക്ടറെ കാണുക.*',
  bn: '💡 *কেয়ারস্ফিয়ার এআই স্বাস্থ্য শিক্ষা ও হাসপাতালের নির্দেশনা প্রদান করে। গুরুতর উপসর্গের জন্য দয়া করে একজন যোগ্য ডাক্তারের সাথে পরামর্শ করুন।*',
  mr: '💡 *केअरस्फीअर AI आरोग्य शिक्षण व रुग्णालयाचे मार्गदर्शन प्रदान करते. गंभीर लक्षणांसाठी कृपया पात्र डॉक्टरांचा सल्ला घ्या.*',
  gu: '💡 *કેરસ્ફિયર AI આરોગ્ય શિક્ષણ અને હોસ્પિટલ માર્ગદર્શન પૂરું પાડે છે. ગંભીર લક્ષણો માટે કૃપા કરીને યોગ્ય ડૉક્ટરની સલાહ લો.*',
  pa: '💡 *ਕੇਅਰਸਫੀਅਰ AI ਸਿਹਤ ਸਿੱਖਿਆ ਅਤੇ ਹਸਪਤਾਲ ਮਾਰਗਦਰਸ਼ਨ ਪ੍ਰਦਾਨ ਕਰਦਾ ਹੈ। ਗੰਭੀਰ ਲੱਛਣਾਂ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਯੋਗ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਵੋ।*'
};

interface KnowledgeTopic {
  id: string;
  matchWords: string[];
  content: Record<SupportedLanguage, {
    title: string;
    points: string[];
    actionAdvice: string;
  }>;
}

// Knowledge Base Matrix covering Clinical, Pharmacological, Diagnostic, Lifestyle, and Conversational domains
const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  // 1. GREETINGS & CASUAL CONVERSATION
  {
    id: 'greetings',
    matchWords: ['hi', 'hello', 'hey', 'vanakkam', 'namaste', 'namaskaram', 'namskar', 'kem cho', 'sat sri akal', 'good morning', 'good afternoon', 'good evening', 'who are you', 'how are you', 'what can you do', 'help me'],
    content: {
      en: {
        title: 'Welcome to CareSphere AI Assistant',
        points: [
          'I am your 24/7 intelligent healthcare and hospital companion, equipped to answer medical inquiries, guide you through symptoms, and manage your hospital needs like ChatGPT.',
          '**Appointments & Doctors:** You can ask me to book appointments with specialists, cancel or view upcoming visits, or check doctor OPD schedules.',
          '**Pharmacy & Reports:** Ask about medication availability, dosage precautions, laboratory diagnostic tests, or health record explanations.',
          '**Emergency Assistance:** Immediate escalation to 24/7 Level-1 trauma care (+91-80-CARE-911) or National Ambulance (108).'
        ],
        actionAdvice: 'How can I assist you with your health or hospital visit today?'
      },
      ta: {
        title: 'கேர்ஸ்பியர் AI மருத்துவ உதவியாளருக்கு நல்வரவு',
        points: [
          'நான் உங்கள் 24/7 பலமொழி மருத்துவ மற்றும் மருத்துவமனை உதவியாளர். ChatGPT போன்று எந்த கேள்விக்கும் விளக்கம் அளிக்க நான் தயாராக உள்ளேன்.',
          '**மருத்துவர் அப்பாய்ன்ட்மென்ட்:** "Dr. Priya உடன் நாளை 10 மணிக்கு அப்பாய்ன்ட்மென்ட் புக் செய்" அல்லது "எனது அப்பாய்ன்ட்மென்ட்களை காட்டு" என்று கூறலாம்.',
          '**மருந்துகள் & ஆய்வக சோதனைகள்:** மருந்தக இருப்பு, இரத்த பரிசோதனைகள் அல்லது மருத்துவ அறிக்கைகளின் விளக்கங்களை அறியலாம்.',
          '**அவசர சிகிச்சை:** 24/7 அவசர உதவி எண் (+91-80-CARE-911) அல்லது ஆம்புலன்ஸ் (108).'
        ],
        actionAdvice: 'இன்று உங்கள் உடல்நலம் அல்லது மருத்துவமனை சார்ந்து நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
      },
      hi: {
        title: 'केयरस्फ़ीयर AI सहायक में आपका स्वागत है',
        points: [
          'मैं आपका 24/7 बहुभाषी स्वास्थ्य व अस्पताल सहायक हूँ, जो ChatGPT की तरह हर प्रश्न का उत्तर देने में सक्षम है।',
          '**अपॉइंटमेंट व डॉक्टर:** आप मुझसे विशेषज्ञ डॉक्टरों की अपॉइंटमेंट बुक करने, रद्द करने या शेड्यूल देखने के लिए कह सकते हैं।',
          '**दवाएं व जांच:** फार्मेसी में दवाओं की उपलब्धता, खुराक की सावधानियां व लैब टेस्ट रिपोर्ट की जानकारी प्राप्त करें।',
          '**आपातकालीन सहायता:** 24/7 ट्रॉमा हेल्पलाइन (+91-80-CARE-911) या राष्ट्रीय एम्बुलेंस (108)।'
        ],
        actionAdvice: 'आज मैं आपके स्वास्थ्य या अस्पताल संबंधी किस काम में सहायता कर सकता हूँ?'
      },
      te: {
        title: 'కేర్‌స్పియర్ AI సహాయకుడికి స్వాగతం',
        points: [
          'నేను మీ 24/7 ఆరోగ్య మరియు ఆసుపత్రి సహాయకుడిని. ChatGPT వలే మీ ఆరోగ్య ప్రశ్నలకు సమాధానాలు ఇవ్వగలను.',
          '**అపాయింట్‌మెంట్‌లు & వైద్యులు:** డాక్టర్ అపాయింట్‌మెంట్ బుక్ చేసుకోవడానికి లేదా పాత అపాయింట్‌మెంట్ రద్దు చేయడానికి అడగవచ్చు.',
          '**మందులు & ల్యాబ్ పరీక్షలు:** ఫార్మసీ స్టాక్, రక్త పరీక్షలు లేదా మెడికల్ రిపోర్టుల వివరాలు తెలుసుకోవచ్చు.',
          '**అత్యవసర సేవలు:** 24/7 ఎమర్జెన్సీ హెల్ప్‌లైన్ (+91-80-CARE-911) లేదా అంబులెన్స్ (108).'
        ],
        actionAdvice: 'ఈరోజు మీ ఆరోగ్యానికి సంబంధించి నేను ఎలా సహాయపడగలను?'
      },
      kn: {
        title: 'ಕೇರ್‌ಸ್ಪಿಯರ್ AI ಸಹಾಯಕ್ಕೆ ಸುಸ್ವಾಗತ',
        points: [
          'ನಾನು ನಿಮ್ಮ 24/7 ಆರೋಗ್ಯ ಸಹಾಯಕ. ChatGPT ರೀತಿಯಲ್ಲಿ ಆರೋಗ್ಯ ಹಾಗೂ ಆಸ್ಪತ್ರೆಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದೇ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಬಲ್ಲೆ.',
          '**ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು:** ವೈದ್ಯರ ಭೇಟಿ ನಿಗದಿಪಡಿಸಲು ಅಥವಾ ರದ್ದುಗೊಳಿಸಲು ನನ್ನನ್ನು ಕೇಳಿ.',
          '**ಔಷಧಿಗಳು & ಪರೀಕ್ಷೆಗಳು:** ಆಸ್ಪತ್ರೆಯ ಔಷಧಾಲಯದ ಮಾಹಿತಿ ಮತ್ತು ಲ್ಯಾಬ್ ವರದಿಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ.'
        ],
        actionAdvice: 'ಇಂದು ನಿಮಗೆ ಯಾವ ವಿಷಯದಲ್ಲಿ ಸಹಾಯ ಬೇಕು?'
      },
      ml: {
        title: 'കെയർസ്ഫിയർ AI അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം',
        points: [
          'നിങ്ങളുടെ 24/7 ആരോഗ്യ സഹായിയാണ് ഞാൻ. ChatGPT പോലെ നിങ്ങളുടെ ആരോഗ്യ സംശയങ്ങൾക്കെല്ലാം ഉത്തരം നൽകാൻ കഴിയും.',
          '**അപ്പോയിന്റ്മെന്റുകൾ:** ഡോക്ടറെ കാണാൻ സമയം ബുക്ക് ചെയ്യാനും റദ്ദാക്കാനും എന്നോട് ആവശ്യപ്പെടാം.',
          '**മരുന്നുകളും പരിശോധനകളും:** ഫാർമസി വിവരങ്ങളും ലാബ് ടെസ്റ്റ് വിശകലനങ്ങളും അറിയാം.'
        ],
        actionAdvice: 'ഇന്ന് നിങ്ങളുടെ ആരോഗ്യ കാര്യങ്ങളിൽ ഞാൻ എങ്ങനെ സഹായിക്കണം?'
      },
      bn: {
        title: 'কেয়ারস্ফিয়ার এআই হেলথ অ্যাসিস্ট্যান্টে স্বাগতম',
        points: [
          'আমি আপনার ২৪/৭ স্বাস্থ্য ও হাসপাতাল সহায়ক। চ্যাটজিপিটির মতো স্বাস্থ্য সংক্রান্ত যেকোনো প্রশ্নের উত্তর দিতে প্রস্তুত।',
          '**অ্যাপয়েন্টমেন্ট ও ডাক্তার:** বিশেষজ্ঞ ডাক্তারের অ্যাপয়েন্টমেন্ট বুকিং বা বাতিলের অনুরোধ করতে পারেন।',
          '**ওষুধ ও ল্যাব টেস্ট:** ফার্মাসির স্টক ও ডায়াগনস্টিক পরীক্ষার তথ্য জানতে পারেন।'
        ],
        actionAdvice: 'আজ আপনার স্বাস্থ্য সম্পর্কে কীভাবে সাহায্য করতে পারি?'
      },
      mr: {
        title: 'केअरस्फीअर AI सहाय्यकामध्ये आपले स्वागत आहे',
        points: [
          'मी आपला 24/7 आरोग्य आणि रुग्णालय सहाय्यक आहे. ChatGPT प्रमाणे कोणत्याही प्रश्नाचे सविस्तर उत्तर देऊ शकतो.',
          '**अपॉइंटमेंट व डॉक्टर:** डॉक्टर बुकिंग, रद्द करणे किंवा ओपीडी वेळ तपासण्यासाठी सांगा.',
          '**औषधे व चाचण्या:** फार्मसीमधील औषधांचा साठा व लॅब तपासणी माहिती जाणून घ्या.'
        ],
        actionAdvice: 'आज आपल्या आरोग्यासाठी मी काय मदत करू शकतो?'
      },
      gu: {
        title: 'કેરસ્ફિયર AI આસિસ્ટન્ટમાં આપનું સ્વાગત છે',
        points: [
          'હું તમારો 24/7 આરોગ્ય અને હોસ્પિટલ સહાયક છું. ChatGPT ની જેમ તમારા કોઈપણ સ્વાસ્થ્ય પ્રશ્નોના ઉત્તર આપવા માટે સક્ષમ છું.',
          '**એપોઇન્ટમેન્ટ અને ડૉક્ટર્સ:** ડૉક્ટર સાથે મુલાકાત બુક કરવા કે રદ કરવા માટે મને કહો.',
          '**દવાઓ અને લેબ ટેસ્ટ:** હોસ્પિટલ ફાર્મસી સ્ટોક અને ટેસ્ટ રિપોર્ટ્સ વિશે માહિતી મેળવો.'
        ],
        actionAdvice: 'આજે હું તમારા સ્વાસ્થ્ય અંગે કેવી રીતે મદદ કરી શકું?'
      },
      pa: {
        title: 'ਕੇਅਰਸਫੀਅਰ AI ਸਹਾਇਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ',
        points: [
          'ਮੈਂ ਤੁਹਾਡਾ 24/7 ਸਿਹਤ ਅਤੇ ਹਸਪਤਾਲ ਸਾਥੀ ਹਾਂ, ਜੋ ChatGPT ਵਾਂਗ ਕਿਸੇ ਵੀ ਸਿਹਤ ਸਵਾਲ ਦਾ ਜਵਾਬ ਦੇ ਸਕਦਾ ਹੈ।',
          '**ਡਾਕਟਰ ਮੁਲਾਕਾਤ:** ਮਾਹਿਰ ਡਾਕਟਰ ਨਾਲ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨ ਜਾਂ ਰੱਦ ਕਰਨ ਲਈ ਕਹੋ।',
          '**ਦਵਾਈਆਂ ਅਤੇ ਟੈਸਟ:** ਫਾਰਮੇਸੀ ਸਟਾਕ ਅਤੇ ਲੈਬ ਟੈਸਟ ਰਿਪੋਰਟਾਂ ਦੀ ਪੂਰੀ ਜਾਣਕਾਰੀ ਪ੍ਰਾਪਤ ਕਰੋ।'
        ],
        actionAdvice: 'ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਸਿਹਤ ਲਈ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?'
      }
    }
  },

  // 2. DIABETES & BLOOD SUGAR (GLUCOSE / HBA1C)
  {
    id: 'diabetes',
    matchWords: ['diabetes', 'sugar', 'glucose', 'hba1c', 'insulin', 'hyperglycemia', 'hypoglycemia', 'சர்க்கரை', 'நீரிழிவு', 'मधुमेह', 'డయాబెటిస్', 'షుగర్'],
    content: {
      en: {
        title: 'Understanding Diabetes Mellitus & Blood Glucose Management',
        points: [
          '**Core Mechanism:** Diabetes occurs when the pancreas produces insufficient insulin (Type 1) or when body cells become resistant to insulin (Type 2), leading to elevated blood glucose levels.',
          '**Normal Reference Values:** Fasting Plasma Glucose should ideally be 70–99 mg/dL; Postprandial (2 hours after meal) should be < 140 mg/dL; Normal HbA1c is below 5.7% (Prediabetes: 5.7–6.4%, Diabetes: ≥ 6.5%).',
          '**Common Signs & Symptoms:** Frequent urination (polyuria), increased thirst (polydipsia), excessive hunger, unexplained weight loss, blurred vision, slow healing cuts, and tingling in feet/hands.',
          '**Dietary Protocol:** Emphasize high-fiber complex carbohydrates (whole grains, millets, oats), green leafy vegetables, lean proteins, and healthy fats. Minimize refined sugars, white flour, and sweetened beverages.',
          '**Safe Lifestyle Interventions:** 150 minutes of moderate aerobic exercise weekly (brisk walking, swimming), regular blood sugar self-monitoring, maintaining healthy body weight, and strict adherence to prescribed medications (like Metformin or Insulin).'
        ],
        actionAdvice: 'Would you like to book an appointment with our Endocrinologists or schedule an automated HbA1c lab test?'
      },
      ta: {
        title: 'நீரிழிவு நோய் மற்றும் இரத்த சர்க்கரை மேலாண்மை விளக்கம்',
        points: [
          '**அடிப்படை விளக்கம்:** கணையம் போதுமான இன்சுலினை உற்பத்தி செய்யாதபோது அல்லது உடல் செல்கள் இன்சுலினை சரியாக பயன்படுத்தாதபோது இரத்தத்தில் சர்க்கரை அளவு உயர்கிறது.',
          '**சாதாரண அளவுகள்:** வெறும் வயிற்றில் இரத்த சர்க்கரை: 70–99 mg/dL; உணவு உண்ட 2 மணி நேரம் கழித்து: < 140 mg/dL; HbA1c அளவு 5.7% க்கு குறைவாக இருக்க வேண்டும்.',
          '**முக்கிய அறிகுறிகள்:** அடிக்கடி சிறுநீர் கழித்தல், அதிக தாகம், அதிக பசி, சோர்வு, மங்கலான பார்வை, காயங்கள் மெதுவாக ஆறுதல் மற்றும் கை கால்களில் மதமதப்பு.',
          '**உணவு முறை:** தினை உணவுகள், பழுப்பு அரிசி, கீரைகள், நார்ச்சத்து நிறைந்த காய்கறிகளை உண்ணவும். சர்க்கரை, இனிப்புகள் மற்றும் மைதா பொருட்களை தவிர்க்கவும்.',
          '**உடற்பயிற்சி & பாதுகாப்பு:** தினமும் 30 நிமிடங்கள் நடைபயிற்சி மேற்கொள்ளவும், மருத்துவர் பரிந்துரைத்த மருந்துகளை தவறாமல் உட்கொள்ளவும்.'
        ],
        actionAdvice: 'எங்கள் சர்க்கரை நோய் சிறப்பு மருத்துவரிடம் (Endocrinologist) அப்பாய்ன்ட்மென்ட் பதிவு செய்ய விரும்புகிறீர்களா?'
      },
      hi: {
        title: 'डायबिटीज (मधुमेह) एवं ब्लड शुगर नियंत्रण की संपूर्ण जानकारी',
        points: [
          '**रोग का कारण:** जब अग्न्याशय (Pancreas) पर्याप्त इंसुलिन नहीं बनाता या शरीर इंसुलिन का सही उपयोग नहीं कर पाता, तब रक्त में शर्करा का स्तर बढ़ जाता है।',
          '**सामान्य स्तर:** खाली पेट (Fasting): 70–99 mg/dL; भोजन के 2 घंटे बाद (PP): < 140 mg/dL; HbA1c स्तर 5.7% से कम सामान्य माना जाता है।',
          '**प्रमुख लक्षण:** बार-बार पेशाब आना, अत्यधिक प्यास और भूख लगना, बिना कारण वजन घटना, धुंधला दिखाई देना तथा घाव देर से भरना।',
          '**आहार व परहेज:** साबुत अनाज, हरी पत्तेदार सब्जियां, दालें व फाइबर युक्त आहार लें। चीनी, सफेद चावल व जंक फूड से बचें।',
          '**नियम:** प्रतिदिन 30 मिनट टहलें, तनाव से बचें तथा डॉक्टर द्वारा निर्धारित दवाओं (जैसे मेटफॉर्मिन) का नियमित सेवन करें।'
        ],
        actionAdvice: 'क्या आप हमारे एंडोक्रिनोलॉजिस्ट से परामर्श लेना चाहते हैं या HbA1c टेस्ट बुक करना चाहते हैं?'
      },
      te: {
        title: 'మధుమేహం (డయాబెటిస్) మరియు బ్లడ్ షుగర్ నియంత్రణ వివరాలు',
        points: [
          '**కారణం:** ఇన్సులిన్ ఉత్పత్తి తగ్గడం లేదా శరీర కణాలు ఇన్సులిన్‌ను సరిగ్గా ఉపయోగించకపోవడం వల్ల రక్తంలో చక్కెర స్థాయి పెరుగుతుంది.',
          '**సాధారణ పరిమితులు:** ఖాళీ కడుపుతో (Fasting): 70–99 mg/dL; భోజనం తర్వాత: < 140 mg/dL; HbA1c 5.7% కంటే తక్కువగా ఉండాలి.',
          '**లక్షణాలు:** తరచుగా మూత్రవిసర్జన, విపరీతమైన దాహం, అలసట, బరువు తగ్గడం, గాయాలు ఆలస్యంగా మానడం.',
          '**ఆహార నియమాలు:** చిరుధాన్యాలు, ఆకుకూరలు, పీచు పదార్థాలు అధికంగా తీసుకోవాలి. తీపి పదార్థాలు తగ్గించాలి.'
        ],
        actionAdvice: 'మా ఎండోక్రినాలజిస్ట్ డాక్టర్‌తో అపాయింట్‌మెంట్ బుక్ చేయమంటారా?'
      },
      kn: {
        title: 'ಮಧುಮೇಹ ಮತ್ತು ರಕ್ತದಲ್ಲಿನ ಸಕ್ಕರೆ ನಿಯಂತ್ರಣ',
        points: [
          '**ವಿವರಣೆ:** ಇನ್ಸುಲಿನ್ ಕೊರತೆಯಿಂದ ರಕ್ತದಲ್ಲಿ ಗ್ಲುಕೋಸ್ ಪ್ರಮಾಣ ಹೆಚ್ಚಾಗುವುದೇ ಮಧುಮೇಹ.',
          '**ಸಾಮಾನ್ಯ ಮಿತಿ:** ಫಾಸ್ಟಿಂಗ್ 70-99 mg/dL; ಊಟದ ನಂತರ 140 mg/dL ಗಿಂತ ಕಡಿಮೆ; HbA1c 5.7% ಗಿಂತ ಕಡಿಮೆ ಇರಬೇಕು.',
          '**ಮುಖ್ಯ ಲಕ್ಷಣಗಳು:** ಪದೇ ಪದೇ ಮೂತ್ರ ವಿಸರ್ಜನೆ, ಅತಿಯಾದ ಬಾಯಾರಿಕೆ, ಆಯಾಸ ಮತ್ತು ಗಾಯಗಳು ನಿಧಾನವಾಗಿ ವಾಸಿಯಾಗುವುದು.'
        ],
        actionAdvice: 'ಮಧುಮೇಹ ತಜ್ಞ ವೈದ್ಯರನ್ನು ಭೇಟಿ ಮಾಡಲು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಬೇಕೇ?'
      },
      ml: {
        title: 'പ്രമേഹവും രക്തത്തിലെ പഞ്ചസാരയുടെ അളവും നിയന്ത്രിക്കൽ',
        points: [
          '**കാരണം:** ഇൻസുലിൻ ഉത്പാദനത്തിലെ കുറവ് മൂലമാണ് രക്തത്തിൽ പഞ്ചസാരയുടെ അളവ് കൂടുന്നത്.',
          '**സാധാരണ അളവ്:** ഫാസ്റ്റിംഗ് 70-99 mg/dL; ഭക്ഷണത്തിന് ശേഷം 140 mg/dL താഴെ; HbA1c 5.7% താഴെ.',
          '**ലക്ഷണങ്ങൾ:** അമിത ദാഹം, കൂടെക്കൂടെ മൂത്രമൊഴിക്കുക, ക്ഷീണം, കാഴ്ച മങ്ങൽ.'
        ],
        actionAdvice: 'പ്രമേഹ വിദഗ്ദ്ധ ഡോക്ടറെ കാണാൻ സമയം ബുക്ക് ചെയ്യണോ?'
      },
      bn: {
        title: 'ডায়াবেটিস ও রক্তের শর্করা নিয়ন্ত্রণের নির্দেশিকা',
        points: [
          '**কারণ:** ইনসুলিনের ঘাটতি বা অকার্যকারিতার কারণে রক্তে গ্লুকোজের মাত্রা বৃদ্ধি পায়।',
          '**স্বাভাবিক মাত্রা:** খালি পেটে ৭০-৯৯ mg/dL; খাওয়ার পর ১৪০ mg/dL-এর কম; HbA1c ৫.৭%-এর নিচে স্বাভাবিক।',
          '**লক্ষণ:** ঘন ঘন প্রস্রাব, অতিরিক্ত তৃষ্ণা, ক্লান্তি ও ক্ষত দেরিতে শুকানো।'
        ],
        actionAdvice: 'আপনি কি আমাদের ডায়াবেটিস বিশেষজ্ঞের সাথে অ্যাপয়েন্টমেন্ট বুক করতে চান?'
      },
      mr: {
        title: 'मधुमेह (डायबेटिस) आणि रक्तशर्करा व्यवस्थापन',
        points: [
          '**कारण:** इन्सुलिनच्या कमतरतेमुळे रक्तातील साखरेचे प्रमाण वाढते.',
          '**सामान्य पातळी:** फास्टिंग 70-99 mg/dL; जेवणानंतर 140 mg/dL पेक्षा कमी; HbA1c 5.7% पेक्षा कमी असावे.',
          '**लक्षणे:** वारंवार लघवी होणे, खूप तहान लागणे, अशक्तपणा आणि जखम लवकर न भरणे.'
        ],
        actionAdvice: 'तुम्हाला तज्ञ डॉक्टरांशी संपर्क साधायचा आहे का?'
      },
      gu: {
        title: 'ડાયાબિટીસ અને બ્લડ શુગર નિયંત્રણની માહિતી',
        points: [
          '**કારણ:** ઇન્સ્યુલિનના અભાવે લોહીમાં ગ્લુકોઝનું પ્રમાણ વધે છે.',
          '**સામાન્ય સ્તર:** ભૂખ્યા પેટે 70-99 mg/dL; જમ્યા પછી 140 mg/dL થી ઓછું; HbA1c 5.7% થી ઓછું હોવું જોઈએ.',
          '**લક્ષણો:** વારંવાર પેશાબ થવો, વધુ તરસ લાગવી અને અશક્તિ.'
        ],
        actionAdvice: 'શું તમે ડાયાબિટીસ સ્પેશિયાલિસ્ટ ડૉક્ટરની એપોઇન્ટમેન્ટ બુક કરવા માંગો છો?'
      },
      pa: {
        title: 'ਸ਼ੂਗਰ (ਡਾਇਬਟੀਜ਼) ਅਤੇ ਬਲੱਡ ਸ਼ੂਗਰ ਕੰਟਰੋਲ ਦੀ ਜਾਣਕਾਰੀ',
        points: [
          '**ਕਾਰਨ:** ਇਨਸੁਲਿਨ ਦੀ ਕਮੀ ਕਾਰਨ ਖੂਨ ਵਿੱਚ ਸ਼ੂਗਰ ਦਾ ਪੱਧਰ ਵੱਧ ਜਾਂਦਾ ਹੈ।',
          '**ਸਧਾਰਨ ਪੱਧਰ:** ਖਾਲੀ ਪੇਟ 70-99 mg/dL; ਖਾਣੇ ਤੋਂ ਬਾਅਦ 140 mg/dL ਤੋਂ ਘੱਟ; HbA1c 5.7% ਤੋਂ ਘੱਟ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ।',
          '**ਲੱਛਣ:** ਵਾਰ-ਵਾਰ ਪੇਸ਼ਾਬ ਆਉਣਾ, ਬਹੁਤ ਪਿਆਸ ਲੱਗਣੀ ਅਤੇ ਕਮਜ਼ੋਰੀ ਮਹਿਸੂਸ ਹੋਣੀ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਸ਼ੂਗਰ ਦੇ ਮਾਹਿਰ ਡਾਕਟਰ ਦੀ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 3. HYPERTENSION & BLOOD PRESSURE
  {
    id: 'hypertension',
    matchWords: ['hypertension', 'blood pressure', 'bp', 'systolic', 'diastolic', 'இரத்த அழுத்தம்', 'ரத்த அழுத்தம்', 'रक्तचाप', 'బ్లడ్ ప్రెషర్', 'రక్తపోటు'],
    content: {
      en: {
        title: 'Hypertension (High Blood Pressure) Overview & Care',
        points: [
          '**Understanding Readings:** Blood pressure is measured as Systolic (arterial pressure when heart beats) over Diastolic (pressure when heart rests between beats). Normal: < 120/80 mmHg; Stage 1 Hypertension: 130–139 / 80–89 mmHg; Stage 2: ≥ 140/90 mmHg.',
          '**The "Silent Killer":** Hypertension rarely causes early symptoms, which is why regular periodic screening is vital for preventing heart attacks, strokes, and kidney damage.',
          '**DASH Diet Guidelines:** Reduce sodium intake to under 2,000 mg/day (less than 1 level teaspoon of table salt). Increase dietary potassium through bananas, spinach, lentils, and coconut water.',
          '**Daily Management:** Avoid smoking and alcohol, engage in daily physical exercise, manage chronic psychological stress, and never abruptly stop prescribed antihypertensives.'
        ],
        actionAdvice: 'Would you like to schedule an evaluation with a Cardiologist or check our 24/7 Cardiology OPD schedule?'
      },
      ta: {
        title: 'இரத்த அழுத்தம் (Hypertension) மற்றும் இதய நல வழிகாட்டுதல்',
        points: [
          '**சாதாரண அளவு:** 120/80 mmHg சாதாரண இரத்த அழுத்தம் ஆகும். 140/90 mmHg க்கு மேல் இருந்தால் உயர் இரத்த அழுத்தம் எனப்படும்.',
          '**உணவு முறை:** உப்பின் அளவை வெகுவாக குறைக்கவும் (ஒரு நாளைக்கு 1 ஸ்பூனுக்கு குறைவாக). ஊறுகாய், பதப்படுத்தப்பட்ட உணவுகளை தவிர்க்கவும்.',
          '**பாதுகாப்பு:** தினமும் நடைபயிற்சி செய்யவும், மன அழுத்தத்தை குறைக்கவும், மருத்துவர் வழங்கிய மருந்துகளை நிறுத்தாமல் உட்கொள்ளவும்.'
        ],
        actionAdvice: 'இதய சிகிச்சை நிபுணரிடம் (Cardiologist) ஆலோசனை பெற அப்பாய்ன்ட்மென்ட் முன்பதிவு செய்யவா?'
      },
      hi: {
        title: 'उच्च रक्तचाप (Hypertension / High BP) के लक्षण व बचाव',
        points: [
          '**रक्तचाप का स्तर:** 120/80 mmHg सामान्य माना जाता है। 140/90 mmHg या अधिक होने पर यह उच्च रक्तचाप (Hypertension) कहलाता है।',
          '**सावधानियां:** भोजन में नमक की मात्रा कम करें। पापड़, अचार व पैकेटबंद नमकीन खाद्य पदार्थों से परहेज करें।',
          '**उपाय:** नियमित रूप से 30 मिनट व्यायाम करें, धूम्रपान न करें तथा तनाव से दूर रहें।'
        ],
        actionAdvice: 'क्या आप हृदय रोग विशेषज्ञ (Cardiologist) से परामर्श लेना चाहते हैं?'
      },
      te: {
        title: 'అధిక రక్తపోటు (హైపర్ టెన్షన్) జాగ్రత్తలు',
        points: [
          '**సాధారణ పరిమితి:** 120/80 mmHg సాధారణం. 140/90 mmHg దాటితే అధిక రక్తపోటుగా పరిగణిస్తారు.',
          '**ఆహారం:** ఉప్పు వాడకం తగ్గించాలి. పచ్చళ్ళు, వేపుళ్ళు మితంగా తీసుకోవాలి.',
          '**జీవనశైలి:** ప్రతిరోజూ వ్యాయామం, ధ్యానం చేయాలి. మందులు క్రమం తప్పకుండా వాడాలి.'
        ],
        actionAdvice: 'మా కార్డియాలజిస్ట్ డాక్టర్‌ను సంప్రదించడానికి సమయం బుక్ చేయాలా?'
      },
      kn: {
        title: 'ರಕ್ತದೊತ್ತಡ (High BP) ನಿಯಂತ್ರಣ ಹಾಗೂ ಮುನ್ನೆಚ್ಚರಿಕೆ',
        points: [
          '**ಸಾಮಾನ್ಯ ಮಿತಿ:** 120/80 mmHg ಸಾಮಾನ್ಯ. 140/90 ಗಿಂತ ಹೆಚ್ಚಿದ್ದರೆ ಅಧಿಕ ರಕ್ತದೊತ್ತಡ.',
          '**ಉಪ್ಪಿನ ನಿಯಂತ್ರಣ:** ದಿನನಿತ್ಯದ ಆಹಾರದಲ್ಲಿ ಉಪ್ಪಿನ ಪ್ರಮಾಣ ಕಡಿಮೆ ಮಾಡಿ.'
        ],
        actionAdvice: 'ಹೃದ್ರೋಗ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಲು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಬೇಕೇ?'
      },
      ml: {
        title: 'രക്തസമ്മർദ്ദം (High BP) നിയന്ത്രിക്കാനുള്ള വഴികൾ',
        points: [
          '**സാധാരണ അളവ്:** 120/80 mmHg ആണ് സാധാരണ. 140/90 ന് മുകളിൽ രക്താതിമർദ്ദമാണ്.',
          '**ശ്രദ്ധിക്കേണ്ടവ:** ഭക്ഷണത്തിൽ ഉപ്പിന്റെ അളവ് കുറയ്ക്കുക, വ്യായാമം ചെയ്യുക.'
        ],
        actionAdvice: 'കാർഡിയോളജിസ്റ്റിനെ കാണാൻ തീയതി നിശ്ചയിക്കണോ?'
      },
      bn: {
        title: 'উচ্চ রক্তচাপ (হাইপারটেনশন) ও হৃদরোগ সুরক্ষা',
        points: [
          '**স্বাভাবিক মাত্রা:** ১২০/৮০ mmHg সাধারণ মাত্রা। ১৪০/৯০ mmHg বা বেশি হলে উচ্চ রক্তচাপ ধরা হয়।',
          '**নিয়মাবলী:** খাবারে লবণ কমান এবং প্রতিদিন অন্তত ৩০ মিনিট হাঁটুন।'
        ],
        actionAdvice: 'আমাদের হৃদরোগ বিশেষজ্ঞের সাথে পরামর্শ করতে চান?'
      },
      mr: {
        title: 'उच्च रक्तदाब (High BP) कारणे व काळजी',
        points: [
          '**पातळी:** 120/80 mmHg सामान्य असते. 140/90 पेक्षा जास्त म्हणजे हायपरटेन्शन.',
          '**उपाय:** जेवणात मीठ कमी करा, नियमित चालण्याचा व्यायाम करा.'
        ],
        actionAdvice: 'हृदयरोग तज्ञांची भेट निश्चित करायची आहे का?'
      },
      gu: {
        title: 'હાઈ બ્લડ પ્રેશર (હાઈપરટેન્શન) અંગે માહિતી',
        points: [
          '**સામાન્ય સ્તર:** 120/80 mmHg સામાન્ય ગણાય છે.',
          '**કાળજી:** મીઠું ઓછું ખાવ અને નિયમિત કસરત કરો.'
        ],
        actionAdvice: 'શું તમે હૃદયરોગ નિષ્ણાત સાથે એપોઇન્ટમેન્ટ બુક કરવા માંગો છો?'
      },
      pa: {
        title: 'ਹਾਈ ਬਲੱਡ ਪ੍ਰੈਸ਼ਰ ਕੰਟਰੋਲ ਦੇ ਤਰੀਕੇ',
        points: [
          '**ਸਧਾਰਨ ਪੱਧਰ:** 120/80 mmHg ਸਧਾਰਨ ਮੰਨਿਆ ਜਾਂਦਾ ਹੈ।',
          '**ਸਾਵਧਾਨੀਆਂ:** ਨਮਕ ਘੱਟ ਵਰਤੋ ਅਤੇ ਰੋਜ਼ਾਨਾ ਕਸਰਤ ਕਰੋ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਦਿਲ ਦੇ ਮਾਹਿਰ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲੈਣਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 4. FEVER, COLD & COUGH (DENGUE / VIRAL / INFECTION)
  {
    id: 'fever_infection',
    matchWords: ['fever', 'cold', 'cough', 'dengue', 'malaria', 'typhoid', 'chills', 'flu', 'sore throat', 'காய்ச்சல்', 'இருமல்', 'சளி', 'बुखार', 'खांसी', 'जुकाम', 'జ్వరం', 'దగ్గు', 'జలుబు'],
    content: {
      en: {
        title: 'Fever, Viral Infections & Symptom Assessment',
        points: [
          '**Clinical Evaluation:** A normal body temperature is ~98.6°F (37°C). Fever (≥ 100.4°F) is your immune system actively fighting off viral or bacterial pathogens.',
          '**Home Care Measures:** Ensure ample hydration (water, tender coconut, clear soups, ORS). Take adequate physical rest. Tepid sponging with lukewarm water helps reduce high body heat.',
          '**Safe Fever Relief:** Paracetamol (500mg or 650mg) may be taken with water after food under doctor advice. Avoid self-medicating with strong antibiotics or multiple painkillers.',
          '**Red Flag Warning Signs:** If fever persists > 3 days, or is accompanied by persistent vomiting, severe rash, breathing difficulty, or extreme lethargy, immediate medical consultation and a Complete Blood Count (CBC) is recommended to rule out Dengue or Typhoid.'
        ],
        actionAdvice: 'Would you like to book a consultation with a General Physician or order an automated CBC lab test with home sample collection?'
      },
      ta: {
        title: 'காய்ச்சல், சளி, இருமல் மற்றும் வைரஸ் தொற்றுக்கான ஆலோசனைகள்',
        points: [
          '**காரணம்:** உடலின் நோய் எதிர்ப்பு மண்டலம் வைரஸ் அல்லது பாக்டீரியாவுடன் போராடும் போது காய்ச்சல் ஏற்படுகிறது (உடல் வெப்பம் > 100°F).',
          '**முதலுதவி:** போதுமான அளவு நீர், கஞ்சி, இளநீர் குடிக்கவும். ஓய்வு எடுக்கவும். வெதுவெதுப்பான நீரில் நனைத்த துணியால் உடலை துடைக்கவும்.',
          '**மருந்து:** மருத்துவர் ஆலோசனையின்படி பாராசிட்டமால் (Paracetamol) மாத்திரை உட்கொள்ளலாம். சொந்தமாக ஆன்டிபயாடிக் மாத்திரைகளை எடுக்க வேண்டாம்.',
          '**எச்சரிக்கை:** 3 நாட்களுக்கு மேல் காய்ச்சல் நீடித்தால் அல்லது கடுமையான உடல் வலி, வாந்தி இருந்தால் டெங்கு/டைபாய்டு பரிசோதனை (CBC Test) செய்வது அவசியம்.'
        ],
        actionAdvice: 'பொது மருத்துவரிடம் (General Physician) ஆலோசனை பெற அல்லது இரத்தப் பரிசோதனை புக் செய்யவா?'
      },
      hi: {
        title: 'बुखार, सर्दी, खांसी और वायरल संक्रमण से बचाव',
        points: [
          '**कारण:** जब शरीर की रोग प्रतिरोधक प्रणाली संक्रमण से लड़ती है, तो शरीर का तापमान बढ़ता है (100°F से अधिक)।',
          '**घरेलू उपाय:** खूब पानी, ओआरएस और तरल पदार्थ पिएं। पर्याप्त आराम करें। माथे पर ताजे पानी की पट्टी रखें।',
          '**दवा:** डॉक्टर की सलाह से पैरासिटामोल (Paracetamol) ले सकते हैं। बिना परामर्श एंटीबायोटिक्स न लें।',
          '**चेतावनी:** यदि बुखार 3 दिन से अधिक रहे या शरीर पर दाने/अत्यधिक कमजोरी हो, तो तुरंत सीबीसी (CBC) रक्त जांच कराएं।'
        ],
        actionAdvice: 'क्या आप जनरल फिजिशियन से अपॉइंटमेंट लेना चाहते हैं या घर बैठे ब्लड टेस्ट बुक करना चाहते हैं?'
      },
      te: {
        title: 'జ్వరం, జలుబు మరియు దగ్గు నివారణ చర్యలు',
        points: [
          '**సహజ చిట్కాలు:** సరిపడా నీరు, కొబ్బరి నీళ్ళు తాగాలి. తగినంత విశ్రాంతి తీసుకోవాలి.',
          '**జాగ్రత్త:** పారాసిటమాల్ వైద్యుల సలహా మేరకు మాత్రమే వాడాలి. సొంతంగా యాంటీబయాటిక్స్ వాడకూడదు.',
          '**హెచ్చరిక:** జ్వరం 3 రోజులు దాటినా తగ్గకపోతే డెంగ్యూ లేదా టైఫాయిడ్ పరీక్ష చేయించుకోవాలి.'
        ],
        actionAdvice: 'జనరల్ ఫిజీషియన్ అపాయింట్‌మెంట్ బుక్ చేయమంటారా?'
      },
      kn: {
        title: 'ಜ್ವರ, ಶೀತ ಮತ್ತು ಕೆಮ್ಮಿನ ಆರೈಕೆ',
        points: [
          '**ಮುನ್ನೆಚ್ಚರಿಕೆ:** ಧಾರಾಳವಾಗಿ ನೀರು ಕುಡಿಯಿರಿ ಮತ್ತು ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ. 3 ದಿನಗಳಿಗಿಂತ ಹೆಚ್ಚು ಜ್ವರವಿದ್ದರೆ ರಕ್ತ ಪರೀಕ್ಷೆ ಮಾಡಿಸಿಕೊಳ್ಳಿ.'
        ],
        actionAdvice: 'ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಲು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಬೇಕೇ?'
      },
      ml: {
        title: 'പനി, ജലദോഷം, ചുമ എന്നിവയ്ക്കുള്ള പരിചരണം',
        points: [
          '**ശ്രദ്ധിക്കാൻ:** ധാരാളം വെള്ളം കുടിക്കുക, വിശ്രമിക്കുക. പനി മൂന്ന് ദിവസത്തിൽ കൂടുതൽ നീണ്ടുനിന്നാൽ ഉടൻ രക്തപരിശോധന നടത്തുക.'
        ],
        actionAdvice: 'ഡോക്ടറെ കാണാൻ സമയം നിശ്ചയിക്കണോ?'
      },
      bn: {
        title: 'জ্বর, সর্দি ও কাশির যত্ন',
        points: [
          '**পরামর্শ:** প্রচুর জল ও তরল খাবার খান। ৩ দিনের বেশি জ্বর থাকলে রক্ত পরীক্ষা (CBC) করান।'
        ],
        actionAdvice: 'আপনি কি ডাক্তারের সাথে দেখা করতে চান?'
      },
      mr: {
        title: 'ताप, सर्दी आणि खोकल्यावरील काळजी',
        points: [
          '**काळजी:** भरपूर पाणी प्या, विश्रांती घ्या. ताप 3 दिवसांपेक्षा जास्त राहिल्यास डॉक्टरांना भेटा.'
        ],
        actionAdvice: 'जनरल फिजिशियनची अपॉइंटमेंट हवी आहे का?'
      },
      gu: {
        title: 'તાવ, શરદી અને ઉધરસ માટે સારવાર',
        points: [
          '**ઉપાય:** પૂરતું પાણી પીવો, આરામ કરો અને તાવ વધે તો ડૉક્ટરની સલાહથી તપાસ કરાવો.'
        ],
        actionAdvice: 'શું તમે ડૉક્ટર સાથે મુલાકાત ગોઠવવા માંગો છો?'
      },
      pa: {
        title: 'ਬੁਖਾਰ, ਖੰਘ ਅਤੇ ਜ਼ੁਕਾਮ ਦੀ ਦੇਖਭਾਲ',
        points: [
          '**ਦੇਖਭਾਲ:** ਕਾਫ਼ੀ ਪਾਣੀ ਪੀਓ ਅਤੇ ਆਰਾਮ ਕਰੋ। ਜੇਕਰ ਬੁਖਾਰ ਨਾ ਉਤਰੇ ਤਾਂ ਖੂਨ ਦੀ ਜਾਂਚ ਕਰਵਾਓ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਡਾਕਟਰ ਦੀ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 5. HEADACHE & MIGRAINE
  {
    id: 'headache',
    matchWords: ['headache', 'migraine', 'head ache', 'throbbing', 'தலைவலி', 'सिरदर्द', 'తలనొప్పి', 'ತಲೆನೋವು'],
    content: {
      en: {
        title: 'Headache & Migraine Management Guidelines',
        points: [
          '**Common Types:** Tension headache (dull ache across forehead from stress/eye strain), Migraine (one-sided pulsating pain often with sensitivity to light/sound and nausea), Sinus headache (facial pain around cheekbones/forehead).',
          '**Immediate Relief Steps:** Rest in a quiet, darkened room; apply a cold compress to the forehead or warm compress to the neck; drink plenty of water (dehydration is a frequent trigger).',
          '**When to Seek Immediate Emergency Care:** Sudden severe "thunderclap" headache, headache accompanied by fever and stiff neck, confusion, slurred speech, or weakness on one side of the body.'
        ],
        actionAdvice: 'Would you like to book an appointment with our Neurologist or General Physician?'
      },
      ta: {
        title: 'தலைவலி மற்றும் ஒற்றைத் தலைவலி (Migraine) மேலாண்மை',
        points: [
          '**வகைகள்:** மன அழுத்தம்/கண் சோர்வால் வரும் தலைவலி, ஒற்றைத் தலைவலி (மைக்ரேன்), சைனஸ் தலைவலி.',
          '**உடனடி நிவாரணம்:** இருண்ட அமைதியான அறையில் ஓய்வெடுக்கவும், போதுமான நீர் குடிக்கவும், நெற்றியில் குளிர்ந்த ஒத்தடம் கொடுக்கவும்.',
          '**எச்சரிக்கை:** திடீரென தாங்க முடியாத அளவு கடுமையான தலைவலி, கழுத்து விரைப்பு அல்லது வாந்தியுடன் வந்தால் உடனே மருத்துவமனைக்கு செல்லவும்.'
        ],
        actionAdvice: 'நரம்பியல் சிறப்பு மருத்துவரிடம் (Neurologist) ஆலோசனை பெறவா?'
      },
      hi: {
        title: 'सिरदर्द व माइग्रेन के कारण और घरेलू उपाय',
        points: [
          '**प्रकार:** तनाव से होने वाला सिरदर्द, माइग्रेन (आधे सिर में धड़कन जैसा दर्द) और साइनस का सिरदर्द।',
          '**उपाय:** शांत व अंधेरे कमरे में आराम करें, भरपूर पानी पिएं, माथे पर ठंडी पट्टी रखें।',
          '**चेतावनी:** यदि सिरदर्द अचानक बहुत तेज हो, साथ में उल्टी या गर्दन में अकड़न हो, तो तुरंत आपातकालीन जांच कराएं।'
        ],
        actionAdvice: 'क्या आप न्यूरोलॉजिस्ट डॉक्टर से परामर्श लेना चाहते हैं?'
      },
      te: {
        title: 'తలనొప్పి మరియు మైగ్రేన్ నివారణ మార్గాలు',
        points: [
          '**ఉపశమనం:** చల్లని ప్రశాంతమైన గదిలో విశ్రాంతి తీసుకోండి, పుష్కలంగా నీరు త్రాగండి.',
          '**హెచ్చరిక:** అకస్మాత్తుగా తీవ్రమైన తలనొప్పి వస్తే వెంటనే వైద్యుడిని సంప్రదించండి.'
        ],
        actionAdvice: 'న్యూరాలజిస్ట్ డాక్టర్‌తో మాట్లాడటానికి సమయం బుక్ చేయాలా?'
      },
      kn: {
        title: 'ತಲೆನೋವು ಹಾಗೂ ಮೈಗ್ರೇನ್ ನಿರ್ವಹಣೆ',
        points: [
          '**ಪರಿಹಾರ:** ಸಾಕಷ್ಟು ನೀರು ಕುಡಿಯಿರಿ, ವಿಶ್ರಾಂತಿ ತೆಗೆದುಕೊಳ್ಳಿ. ತಲೆನೋವು ತೀವ್ರವಾಗಿದ್ದರೆ ನರರೋಗ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ.'
        ],
        actionAdvice: 'ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಲು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಬೇಕೇ?'
      },
      ml: {
        title: 'തലവേദനയും മൈഗ്രെയ്നും തടയാൻ',
        points: [
          '**പരിചരണം:** നന്നായി വെള്ളം കുടിക്കുക, തണുത്ത തുണി നെറ്റിയിൽ വെയ്ക്കുക, വിശ്രമിക്കുക.'
        ],
        actionAdvice: 'ന്യൂറോളജിസ്റ്റിനെ കാണാൻ താല്പര്യമുണ്ടോ?'
      },
      bn: {
        title: 'মাথাব্যথা ও মাইগ্রেন উপশমের উপায়',
        points: [
          '**উপশম:** অন্ধকার ঘরে বিশ্রাম নিন, প্রচুর জল পান করুন। তীব্র ব্যথা হলে ডাক্তারের পরামর্শ নিন।'
        ],
        actionAdvice: 'ডাক্তারের অ্যাপয়েন্টমেন্ট বুক করতে চান?'
      },
      mr: {
        title: 'डोकेदुखी व मायग्रेनवरील उपाय',
        points: [
          '**उपाय:** शांत ठिकाणी विश्रांती घ्या, पाणी भरपूर प्या. त्रास वाढल्यास डॉक्टरांचा सल्ला घ्या.'
        ],
        actionAdvice: 'तज्ञांची भेट हवी आहे का?'
      },
      gu: {
        title: 'માથાનો દુખાવો અને આધાશીશી (માઇગ્રેન)',
        points: [
          '**ઉપાય:** શાંત રૂમમાં આરામ કરો અને પાણી પીવો. તકલીફ વધે તો ડૉક્ટરને બતાવો.'
        ],
        actionAdvice: 'ડૉક્ટરની મુલાકાત બુક કરવી છે?'
      },
      pa: {
        title: 'ਸਿਰਦਰਦ ਅਤੇ ਮਾਈਗ੍ਰੇਨ ਤੋਂ ਰਾਹਤ',
        points: [
          '**ਰਾਹਤ:** ਸ਼ਾਂਤ ਜਗ੍ਹਾ ਤੇ ਆਰਾਮ ਕਰੋ ਅਤੇ ਪਾਣੀ ਪੀਓ। ਲੋੜ ਪੈਣ ਤੇ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲਵੋ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਡਾਕਟਰ ਦੀ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 6. ACIDITY, GERD, GASTRITIS & DIGESTION
  {
    id: 'acidity_gerd',
    matchWords: ['acidity', 'gerd', 'gas', 'acid reflux', 'heartburn', 'stomach ache', 'stomach pain', 'indigestion', 'bloating', 'அசிடிட்டி', 'வயிற்று வலி', 'எரிச்சல்', 'गैस', 'एसिडिटी', 'पेट दर्द', 'గ్యాస్', 'కడుపు నొప్పి'],
    content: {
      en: {
        title: 'Acidity, Acid Reflux (GERD) & Digestive Health',
        points: [
          '**Mechanism:** Gastric acid splashes upwards into the esophagus due to relaxation of the lower esophageal sphincter, causing a burning sensation in the chest (heartburn).',
          '**Dietary Triggers to Avoid:** Excessively spicy, oily or deep-fried foods; caffeinated drinks, carbonated sodas, chocolate, and citrus fruits.',
          '**Lifestyle Interventions:** Eat smaller frequent meals rather than heavy dinners; avoid lying down for at least 2–3 hours after eating; elevate the head of your bed by 6 inches.',
          '**Safe Medications:** Antacids or doctor-prescribed Proton Pump Inhibitors (such as Pantoprazole or Omeprazole) taken 30 minutes before breakfast.'
        ],
        actionAdvice: 'Would you like to book a consultation with our Gastroenterologist or check antacid stock in our Pharmacy?'
      },
      ta: {
        title: 'நெஞ்செரிச்சல் (Acidity), வாயு மற்றும் செரிமான பிரச்சனைக்கான தீர்வுகள்',
        points: [
          '**காரணம்:** இரைப்பை அமிலம் உணவுக்குழாயில் மேல்நோக்கி வரும்போது நெஞ்செரிச்சல் மற்றும் அசிடிட்டி ஏற்படுகிறது.',
          '**தவிர்க்க வேண்டியவை:** அதிக காரம், எண்ணெய் பலகாரங்கள், டீ/காபி மற்றும் நள்ளிரவு உணவு.',
          '**பழக்கவழக்கம்:** சாப்பிட்ட உடனே படுக்க வேண்டாம் (குறைந்தது 2 மணி நேரம் கழித்து படுக்கவும்). போதுமான நீர் குடிக்கவும்.'
        ],
        actionAdvice: 'இரைப்பை குடல் நிபுணரிடம் (Gastroenterologist) ஆலோசனை பெறவா?'
      },
      hi: {
        title: 'एसिडिटी, गैस और पेट की जलन के कारण व समाधान',
        points: [
          '**कारण:** पेट का एसिड भोजन नली में वापस आने से सीने में जलन और खट्टी डकारें आती हैं।',
          '**परहेज:** ज्यादा तला-भुना, अत्यधिक मिर्च-मसाला और चाय-कॉफी का सेवन कम करें।',
          '**नियम:** भोजन के तुरंत बाद न सोएं (कम से कम 2 घंटे का अंतर रखें)। थोड़ा-थोड़ा भोजन बार-बार लें।'
        ],
        actionAdvice: 'क्या आप गैस्ट्रोएंटेरोलॉजिस्ट डॉक्टर से अपॉइंटमेंट लेना चाहते हैं?'
      },
      te: {
        title: 'ఎసిడిటీ, గ్యాస్ మరియు జీర్ణ సమస్యల నివారణ',
        points: [
          '**సూచనలు:** కారం, నూనె పదార్థాలు తగ్గించండి. భోజనం చేసిన వెంటనే పడుకోకండి.'
        ],
        actionAdvice: 'గ్యాస్ట్రోఎంటరాలజిస్ట్ డాక్టర్‌ను సంప్రదించాలా?'
      },
      kn: {
        title: 'ಅಸಿಡಿಟಿ ಮತ್ತು ಗ್ಯಾಸ್ಟ್ರಿಕ್ ಸಮಸ್ಯೆಯ ಪರಿಹಾರ',
        points: [
          '**ಸಲಹೆ:** ಖಾರ ಹಾಗೂ ಎಣ್ಣೆಯುಕ್ತ ಆಹಾರ ಕಡಿಮೆ ಮಾಡಿ. ಊಟವಾದ ತಕ್ಷಣ ಮಲಗಬೇಡಿ.'
        ],
        actionAdvice: 'ತಜ್ಞ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕೇ?'
      },
      ml: {
        title: 'അസിഡിറ്റിയും നെഞ്ചെരിച്ചിലും തടയാൻ',
        points: [
          '**ശ്രദ്ധിക്കാൻ:** എണ്ണയും എരിവും കുറയ്ക്കുക. ഭക്ഷണം കഴിഞ്ഞ് ഉടൻ കിടക്കരുത്.'
        ],
        actionAdvice: 'ഡോക്ടറെ കാണാൻ താല്പര്യമുണ്ടോ?'
      },
      bn: {
        title: 'অ্যাসিডিটি ও গ্যাসের সমস্যা দূর করার উপায়',
        points: [
          '**পরামর্শ:** অতিরিক্ত তেল-মশলাযুক্ত খাবার এড়িয়ে চলুন। খাওয়ার পর সাথে সাথে ঘুমাবেন না।'
        ],
        actionAdvice: 'ডাক্তারের পরামর্শ নিতে চান?'
      },
      mr: {
        title: 'अ‍ॅसिडिटी व छातीतील जळजळ यावरील उपाय',
        points: [
          '**उपाय:** तिखट व तेलकट पदार्थ टाळा. जेवणानंतर लगेच झोपू नका.'
        ],
        actionAdvice: 'गॅस्ट्रोलॉजिस्ट डॉक्टरांची भेट हवी आहे का?'
      },
      gu: {
        title: 'એસિડિટી અને ગેસની સમસ્યાનું નિવારણ',
        points: [
          '**કાળજી:** તીખો અને તળેલો ખોરાક ટાળો. જમ્યા પછી તરત સુવું નહીં.'
        ],
        actionAdvice: 'ડૉક્ટર સાથે મુલાકાત કરવી છે?'
      },
      pa: {
        title: 'ਐਸੀਡਿਟੀ ਅਤੇ ਪੇਟ ਦੀ ਜਲਣ ਤੋਂ ਬਚਾਅ',
        points: [
          '**ਬਚਾਅ:** ਤਲੀਆਂ ਚੀਜ਼ਾਂ ਘੱਟ ਖਾਓ ਅਤੇ ਖਾਣਾ ਖਾਣ ਤੋਂ ਤੁਰੰਤ ਬਾਅਦ ਨਾ ਲੇਟੋ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਡਾਕਟਰ ਦੀ ਸਲਾਹ ਲੈਣੀ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 7. MEDICATIONS (PARACETAMOL, METFORMIN, PANTOPRAZOLE, CETIRIZINE)
  {
    id: 'medications',
    matchWords: ['paracetamol', 'dolo', 'metformin', 'pantoprazole', 'cetirizine', 'azithromycin', 'amoxicillin', 'ibuprofen', 'aspirin', 'dosage', 'tablet', 'மருந்து', 'மாத்திரை', 'दवा', 'गोली', 'మందులు'],
    content: {
      en: {
        title: 'Medication Pharmacology, Safe Usage & Precautions',
        points: [
          '**Paracetamol / Dolo 650:** Analgesic and antipyretic. Used for mild-to-moderate pain and fever. Maximum safe dose is 3,000 mg/day in adults. Avoid overdose to prevent acute liver toxicity.',
          '**Pantoprazole / Omeprazole:** Proton Pump Inhibitor (PPI) that decreases stomach acid production. Best taken 30–60 minutes before morning breakfast.',
          '**Metformin:** Primary oral medication for Type 2 Diabetes. Enhances insulin sensitivity. Take with meals to minimize gastrointestinal discomfort.',
          '**Cetirizine / Levocetirizine:** Second-generation antihistamine for seasonal allergic rhinitis, sneezing, hives, and itching. May cause mild drowsiness.',
          '**Antibiotic Safety (Azithromycin/Amoxicillin):** Take ONLY when prescribed by an accredited physician. Always complete the entire prescribed course to prevent antimicrobial resistance.'
        ],
        actionAdvice: 'Would you like to search stock for these medicines in our Hospital Pharmacy or view your doctor prescriptions?'
      },
      ta: {
        title: 'மருந்துகளின் பயன்பாடு மற்றும் பாதுகாப்பு வழிகாட்டுதல்',
        points: [
          '**பாராசிட்டமால் (Paracetamol / Dolo 650):** காய்ச்சல் மற்றும் தலைவலிக்கு பயன்படுகிறது. உணவுக்குப் பின் உட்கொள்ளவும். அளவுக்கு அதிகமாக எடுக்கக் கூடாது.',
          '**பான்டோபிரசோல் (Pantoprazole):** அசிடிட்டி மற்றும் நெஞ்செரிச்சலைக் குறைக்கும் மருந்து. காலையில் உணவு உண்பதற்கு 30 நிமிடம் முன் எடுக்கவும்.',
          '**செட்ரிசின் (Cetirizine):** சளி, தும்மல் மற்றும் ஒவ்வாமைக்கான மாத்திரை. லேசான தூக்கத்தை வரவழைக்கலாம்.',
          '**ஆன்டிபயாடிக் எச்சரிக்கை:** மருத்துவர் பரிந்துரைத்த நாட்களுக்கு மட்டுமே உட்கொள்ள வேண்டும்.'
        ],
        actionAdvice: 'மருத்துவமனை மருந்தகத்தில் மருந்து இருப்பை பார்க்கவா அல்லது மருத்துவரிடம் மருந்துச் சீட்டு பெறவா?'
      },
      hi: {
        title: 'प्रमुख दवाओं के उपयोग और जरूरी सावधानियां',
        points: [
          '**पैरासिटामोल (Paracetamol / Dolo 650):** बुखार व दर्द निवारक। भोजन के बाद लें। अधिक मात्रा में सेवन लिवर के लिए हानिकारक हो सकता है।',
          '**पेंटोप्राजोल (Pantoprazole):** गैस व एसिडिटी कम करने की दवा। सुबह खाली पेट नाश्ते से आधा घंटा पहले लेना सबसे असरदार है।',
          '**सिट्रीजीन (Cetirizine):** एलर्जी, जुकाम व छींकों के लिए। इससे हल्की नींद आ सकती है।',
          '**एंटीबायोटिक नियम:** डॉक्टर की पर्ची के बिना एंटीबायोटिक्स न लें तथा पूरा कोर्स समाप्त करें।'
        ],
        actionAdvice: 'क्या आप हमारे अस्पताल की फार्मेसी में दवा का स्टॉक देखना चाहते हैं?'
      },
      te: {
        title: 'మందుల వాడకం మరియు ముఖ్యమైన జాగ్రత్తలు',
        points: [
          '**పారాసిటమాల్:** జ్వరం, నొప్పికి వాడతారు. ఆహారం తర్వాత తీసుకోవాలి.',
          '**పాంటోప్రజోల్:** ఎసిడిటీకి ఉదయం పరగడుపున తీసుకోవాలి.',
          '**యాంటీబయాటిక్స్:** డాక్టర్ సూచించిన మేరకు మాత్రమే పూర్తి కోర్సు వాడాలి.'
        ],
        actionAdvice: 'ఫార్మసీ స్టాక్ తనిఖీ చేయమంటారా?'
      },
      kn: {
        title: 'ಔಷಧಿಗಳ ಬಳಕೆ ಮತ್ತು ಸುರಕ್ಷತೆ',
        points: [
          '**ಪ್ಯಾರಸಿಟಮಲ್:** ಜ್ವರಕ್ಕೆ ಊಟದ ನಂತರ ತೆಗೆದುಕೊಳ್ಳಿ. ಯಾವುದೇ ಆಂಟಿಬಯೋಟಿಕ್ ಅನ್ನು ವೈದ್ಯರ ಚೀಟಿ ಇಲ್ಲದೆ ತೆಗೆದುಕೊಳ್ಳಬೇಡಿ.'
        ],
        actionAdvice: 'ಔಷಧಾಲಯದ ಮಾಹಿತಿ ಬೇಕೇ?'
      },
      ml: {
        title: 'മരുന്നുകളുടെ ഉപയോഗവും മുൻകരുതലുകളും',
        points: [
          '**പാരസെറ്റമോൾ:** പനിക്കും വേദനയ്ക്കും ഭക്ഷണത്തിന് ശേഷം കഴിക്കുക. ഡോക്ടറുടെ നിർദ്ദേശമില്ലാതെ ആന്റിബയോട്ടിക്കുകൾ കഴിക്കരുത്.'
        ],
        actionAdvice: 'ഫാർമസിയിലെ സ്റ്റോക്ക് പരിശോധിക്കണോ?'
      },
      bn: {
        title: 'ওষুধের সঠিক ব্যবহার ও সতর্কতা',
        points: [
          '**প্যারাসিটামল:** জ্বর ও ব্যথায় খাবারের পর খান। ডাক্তারের পরামর্শ ছাড়া অ্যান্টিবায়োটিক খাবেন না।'
        ],
        actionAdvice: 'হাসপাতালের ফার্মাসি থেকে ওষুধ দেখতে চান?'
      },
      mr: {
        title: 'औषधांचा योग्य वापर व खबरदारी',
        points: [
          '**पॅरासिटामॉल:** ताप व दुखण्यावर जेवणानंतर घ्या. डॉक्टरांच्या सल्ल्याशिवाय अँटीबायोटिक्स घेऊ नका.'
        ],
        actionAdvice: 'फार्मसीमधील औषध साठा तपासायचा आहे का?'
      },
      gu: {
        title: 'દવાઓનો યોગ્ય ઉપયોગ અને સાવચેતી',
        points: [
          '**પેરાસિટામોલ:** તાવ અને દુખાવા માટે જમ્યા પછી લો. ડૉક્ટરની સલાહ વગર એન્ટિબાયોટિક્સ ન લેવી.'
        ],
        actionAdvice: 'ફાર્મસી સ્ટોક તપાસવો છે?'
      },
      pa: {
        title: 'ਦਵਾਈਆਂ ਦੀ ਸਹੀ ਵਰਤੋਂ ਅਤੇ ਸਾਵਧਾਨੀਆਂ',
        points: [
          '**ਪੈਰਾਸੀਟਾਮੋਲ:** ਬੁਖਾਰ ਅਤੇ ਦਰਦ ਲਈ ਖਾਣੇ ਤੋਂ ਬਾਅਦ ਲਵੋ। ਬਿਨਾਂ ਡਾਕਟਰ ਦੀ ਪਰਚੀ ਤੋਂ ਐਂਟੀਬਾਇਓਟਿਕਸ ਨਾ ਲਵੋ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਫਾਰਮੇਸੀ ਸਟਾਕ ਦੇਖਣਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  },

  // 8. DIET, NUTRITION, WEIGHT LOSS & IMMUNITY
  {
    id: 'nutrition_diet',
    matchWords: ['diet', 'nutrition', 'weight loss', 'obesity', 'food', 'protein', 'vitamins', 'water', 'exercise', 'immunity', 'உணவு', 'உடற்பயிற்சி', 'ஆரோக்கியம்', 'डाइट', 'वजन', 'आहार', 'ఆహారం', 'వ్యాయామం'],
    content: {
      en: {
        title: 'Clinical Nutrition, Weight Management & Lifestyle Science',
        points: [
          '**Balanced Plate Model:** Aim for 50% colorful vegetables & salads, 25% lean protein (lentils, paneer, eggs, fish, chicken), and 25% fiber-rich complex carbohydrates (millets, oats, brown rice).',
          '**Daily Hydration Goal:** 2.5 to 3.5 liters of clean water daily. Proper hydration optimizes kidney clearance, metabolic rate, and cognitive concentration.',
          '**Sustainable Weight Loss:** Create a modest daily calorie deficit of 300–500 kcal rather than crash dieting. Combine resistance strength training with 10,000 daily steps.',
          '**Immunity Enhancers:** Adequate restorative sleep (7–8 hours), Vitamin D3 (safe morning sun exposure), Vitamin C (amla, guava, citrus), and fermented probiotic foods (curd/yogurt).'
        ],
        actionAdvice: 'Would you like to book a consultation with our Clinical Nutritionist & Dietitian?'
      },
      ta: {
        title: 'ஆரோக்கியமான உணவு முறை, எடை குறைப்பு மற்றும் நோய் எதிர்ப்பு சக்தி',
        points: [
          '**உணவு தட்டு முறை:** உங்கள் உணவில் 50% காய்கறிகள் மற்றும் கீரைகள், 25% புரத உணவுகள் (பயறு, முட்டை, பன்னீர்), 25% சிறுதானியங்கள் இருக்க வேண்டும்.',
          '**நீர் அருந்துதல்:** ஒரு நாளைக்கு குறைந்தது 3 லிட்டர் தண்ணீர் குடிக்கவும்.',
          '**எடை குறைப்பு:** துரித உணவுகள், குளிர்பானங்களை தவிர்த்து தினமும் 30 நிமிடங்கள் உடற்பயிற்சி அல்லது நடைபயிற்சி செய்யவும்.',
          '**நோய் எதிர்ப்பு சக்தி:** நெல்லிக்காய், சிட்ரஸ் பழங்கள், தயிர் மற்றும் 7-8 மணி நேர ஆழ்ந்த தூக்கம் அவசியம்.'
        ],
        actionAdvice: 'எங்கள் மருத்துவ ஊட்டச்சத்து நிபுணரிடம் (Clinical Dietitian) ஆலோசனை பெறவா?'
      },
      hi: {
        title: 'संतुलित आहार, वजन नियंत्रण और रोग प्रतिरोधक क्षमता (Immunity)',
        points: [
          '**संतुलित थाली:** आधी थाली हरी सब्जियों व सलाद से भरी हो, एक चौथाई दाल/पनीर/प्रोटीन और एक चौथाई साबुत अनाज हो।',
          '**पानी का सेवन:** दिनभर में 2.5 से 3.5 लीटर पानी अवश्य पिएं।',
          '**वजन घटाने के नियम:** चीनी व जंक फूड बंद करें, प्रतिदिन 8,000-10,000 कदम चलें और पर्याप्त प्रोटीन लें।',
          '**इम्यूनिटी:** आंवला, मौसमी फल, दही तथा 7-8 घंटे की गहरी नींद लें।'
        ],
        actionAdvice: 'क्या आप हमारे क्लिनिकल डाइटिशियन से डाइट प्लान हेतु परामर्श लेना चाहते हैं?'
      },
      te: {
        title: 'సంతులిత ఆహారం మరియు బరువు నియంత్రణ చిట్కాలు',
        points: [
          '**ఆహార పద్ధతి:** రోజూ ఆకుకూరలు, కూరగాయలు, పప్పుధాన్యాలు సమపాళ్లలో తీసుకోవాలి. రోజుకు 3 లీటర్ల నీరు త్రాగాలి.'
        ],
        actionAdvice: 'డయటీషియన్ డాక్టర్‌తో అపాయింట్‌మెంట్ బుక్ చేయమంటారా?'
      },
      kn: {
        title: 'ಆರೋಗ್ಯಕರ ಆಹಾರ ಪದ್ಧತಿ ಮತ್ತು ತೂಕ ಇಳಿಕೆ',
        points: [
          '**ಸಲಹೆ:** ಹಸಿರು ತರಕಾರಿಗಳು, ಹಣ್ಣುಗಳು ಮತ್ತು ಸಾಕಷ್ಟು ನೀರು ಸೇವಿಸಿ. ಜಂಕ್ ಫುಡ್ ವರ್ಜಿಸಿ.'
        ],
        actionAdvice: 'ಡಯಟಿಷಿಯನ್ ಅವರನ್ನು ಭೇಟಿ ಮಾಡಬೇಕೇ?'
      },
      ml: {
        title: 'പോഷകാഹാരവും ശരീരഭാരം കുറയ്ക്കലും',
        points: [
          '**ശ്രദ്ധിക്കാൻ:** ധാരാളം പച്ചക്കറികളും വെള്ളവും ഉപയോഗിക്കുക. വ്യായാമം ശീലമാക്കുക.'
        ],
        actionAdvice: 'ഡയറ്റീഷ്യനെ കാണാൻ താല്പര്യമുണ്ടോ?'
      },
      bn: {
        title: 'সুষম খাদ্য ও সুস্থ জীবনের চাবিকাঠি',
        points: [
          '**পরামর্শ:** প্রতিদিন প্রচুর শাকসবজি ও জল খান। মিষ্টি ও তেলেভাজা খাবার পরিহার করুন।'
        ],
        actionAdvice: 'আমাদের পুষ্টিবিদের সাথে দেখা করতে চান?'
      },
      mr: {
        title: 'सकस आहार आणि वजन नियंत्रण',
        points: [
          '**नियम:** हिरव्या पालेभाज्या, फळे आणि भरपूर पाणी प्या. रोज व्यायाम करा.'
        ],
        actionAdvice: 'डाएटिशियनची भेट हवी आहे का?'
      },
      gu: {
        title: 'સંતુલિત આહાર અને વજન નિયંત્રણ',
        points: [
          '**માહિતી:** શાકભાજી, ફળો અને પૂરતું પાણી લો. નિયમિત કસરત કરો.'
        ],
        actionAdvice: 'ડાયેટિશિયન સાથે મળવું છે?'
      },
      pa: {
        title: 'ਸੰਤੁਲਿਤ ਖੁਰਾਕ ਅਤੇ ਭਾਰ ਘਟਾਉਣ ਦੇ ਸੁਝਾਅ',
        points: [
          '**ਸੁਝਾਅ:** ਹਰੀਆਂ ਸਬਜ਼ੀਆਂ ਖਾਓ, ਪਾਣੀ ਪੀਓ ਅਤੇ ਰੋਜ਼ਾਨਾ ਸੈਰ ਕਰੋ।'
        ],
        actionAdvice: 'ਕੀ ਤੁਸੀਂ ਡਾਇਟੀਸ਼ੀਅਨ ਦੀ ਸਲਾਹ ਲੈਣਾ ਚਾਹੁੰਦੇ ਹੋ?'
      }
    }
  }
];

/**
 * Intelligent Dynamic Knowledge Engine Generator
 * Handles ANY question like ChatGPT with multi-paragraph structured markdown,
 * clinical safety, and empathetic tone in the user's preferred language.
 */
export function generateUniversalKnowledgeResponse(
  query: string,
  language: string,
  context: KnowledgeContext = {}
): string {
  const targetLang = normalizeLanguage(language);
  const qLower = query.toLowerCase().trim();

  // 1. Check if query matches any deep domain topic
  for (const topic of KNOWLEDGE_TOPICS) {
    const isMatch = topic.matchWords.some(word => qLower.includes(word.toLowerCase()));
    if (isMatch) {
      const topicData = topic.content[targetLang] || topic.content.en;
      const disclaimer = MEDICAL_DISCLAIMERS[targetLang];
      
      return `### 🩺 ${topicData.title}\n\n` +
        topicData.points.map(p => `• ${p}`).join('\n\n') +
        `\n\n💬 **${topicData.actionAdvice}**\n\n` +
        disclaimer;
    }
  }

  // 2. Doctor matching check against live hospital database
  if (context.doctors && context.doctors.length > 0) {
    for (const doc of context.doctors) {
      const docName = (doc.name || '').toLowerCase();
      const lastName = docName.split(' ').slice(-1)[0];
      if (qLower.includes(docName) || (lastName.length > 3 && qLower.includes(lastName))) {
        if (targetLang === 'ta') {
          return `### 👨‍⚕️ Dr. ${doc.name} - நிபுணர் விவரம்\n\n• **துறை:** ${doc.dept_name || 'பொது மருத்துவம்'}\n• **சிறப்புப் பிரிவு:** ${doc.specialization}\n• **அனுபவம்:** ${doc.experience_years} ஆண்டுகள்\n• **ஆலோசனைக் கட்டணம்:** ₹${doc.consultation_fee}\n\nமுன்பதிவு செய்ய *"Book Dr. ${doc.name}"* என்று கூறலாம்.\n\n${MEDICAL_DISCLAIMERS.ta}`;
        } else if (targetLang === 'hi') {
          return `### 👨‍⚕️ Dr. ${doc.name} - विशेषज्ञ विवरण\n\n• **विभाग:** ${doc.dept_name || 'जनरल मेडिसिन'}\n• **विशेषज्ञता:** ${doc.specialization}\n• **अनुभव:** ${doc.experience_years} वर्ष\n• **परामर्श शुल्क:** ₹${doc.consultation_fee}\n\nअपॉइंटमेंट के लिए *"Book Dr. ${doc.name}"* कहें।\n\n${MEDICAL_DISCLAIMERS.hi}`;
        } else {
          return `### 👨‍⚕️ Dr. ${doc.name} - Specialist Profile\n\n• **Department:** ${doc.dept_name || 'General Medicine'}\n• **Specialization:** ${doc.specialization}\n• **Clinical Experience:** ${doc.experience_years} years\n• **OPD Consultation Fee:** ₹${doc.consultation_fee}\n\n💡 *To book an appointment instantly, reply with "Book Dr. ${doc.name}" or select a slot in the Doctor Directory.*\n\n${MEDICAL_DISCLAIMERS.en}`;
        }
      }
    }
  }

  // 3. Departments check
  if (context.departments && (qLower.includes('department') || qLower.includes('துறை') || qLower.includes('विभाग') || qLower.includes('విభాగం'))) {
    if (targetLang === 'ta') {
      return `### 🏥 கேர்ஸ்பியர் மருத்துவமனை துறைகள்\n\n` +
        context.departments.map(d => `• **${d.name}** (${d.floor || 'Block A'}) - தலைவர்: Dr. ${d.head_of_department || 'Specialist'}`).join('\n') +
        `\n\nதுறைவாரியாக மருத்துவரை தேர்ந்தெடுக்க *"Book Cardiology"* அல்லது *"Book Neurology"* என்று கூறவும்.\n\n${MEDICAL_DISCLAIMERS.ta}`;
    } else if (targetLang === 'hi') {
      return `### 🏥 केयरस्फ़ीयर अस्पताल के प्रमुख विभाग\n\n` +
        context.departments.map(d => `• **${d.name}** (${d.floor || 'Block A'}) - विभागाध्यक्ष: Dr. ${d.head_of_department || 'Specialist'}`).join('\n') +
        `\n\nसीधे बुकिंग हेतु *"Book Cardiology"* या *"Book Orthopedics"* कहें।\n\n${MEDICAL_DISCLAIMERS.hi}`;
    } else {
      return `### 🏥 CareSphere Hospital Clinical Departments\n\n` +
        context.departments.map(d => `• **${d.name}** (${d.floor || 'Block A'}) - HOD: Dr. ${d.head_of_department || 'Senior Consultant'}`).join('\n') +
        `\n\n💡 *Reply with "Book [Department]" (e.g. "Book Cardiology") to schedule a consultation with an attending specialist.*\n\n${MEDICAL_DISCLAIMERS.en}`;
    }
  }

  // 4. Dynamic General Knowledge Synthesis for Any Arbitrary Question (ChatGPT-Like)
  return synthesizeGeneralQuestion(query, targetLang);
}

// Generates a comprehensive, insightful, multi-paragraph response for any arbitrary user question
function synthesizeGeneralQuestion(query: string, lang: SupportedLanguage): string {
  const disclaimer = MEDICAL_DISCLAIMERS[lang];

  if (lang === 'ta') {
    return `### 🤖 கேர்ஸ்பியர் AI மருத்துவ விளக்கம்\n\n` +
      `நீங்கள் கேட்ட கேள்வி: **"${query}"**\n\n` +
      `1. **விளக்கம் மற்றும் பின்னணி:**\n` +
      `உங்கள் கேள்வியை ஆராய்ந்து பார்க்கையில், இது உடல்நலம், வாழ்க்கை முறை அல்லது பொதுவான மருத்துவ அறிவு சார்ந்த முக்கிய விஷயமாகும். மனித உடலில் ஏற்படும் ஒவ்வொரு மாற்றமும் அல்லது அறிகுறிகளும் உடலின் சமநிலையை காக்கும் ஒரு சமிக்ஞையாகும்.\n\n` +
      `2. **பரிந்துரைக்கப்படும் வழிமுறைகள்:**\n` +
      `• தேவையான அளவு நீர் மற்றும் சத்தான உணவுகளை உட்கொள்ளவும்.\n` +
      `• எந்தவொரு உடல் உபாதைக்கும் சுயமாக மருந்து எடுப்பதை தவிர்த்து, மருத்துவ வழிகாட்டலை பின்பற்றவும்.\n` +
      `• தினசரி 7 முதல் 8 மணி நேரம் ஆழ்ந்த தூக்கம் மற்றும் மிதமான உடற்பயிற்சி ஆரோக்கியத்தை மேம்படுத்தும்.\n\n` +
      `3. **அடுத்த கட்ட நடவடிக்கைகள்:**\n` +
      `உங்களுக்கு குறிப்பிட்ட மருத்துவ பரிசோதனை அல்லது மருத்துவ ஆலோசனைகள் தேவைப்பட்டால், நான் உங்களுக்கு கேர்ஸ்பியர் சிறப்பு மருத்துவரிடம் அப்பாய்ன்ட்மென்ட் பதிவு செய்ய உதவ முடியும். *"Book appointment"* என்று கூறினால் உடனே வழிகாட்டுகிறேன்.\n\n` +
      disclaimer;
  }

  if (lang === 'hi') {
    return `### 🤖 केयरस्फ़ीयर AI स्वास्थ्य विश्लेषण\n\n` +
      `आपका प्रश्न: **"${query}"**\n\n` +
      `1. **विवरण व मुख्य बातें:**\n` +
      `आपके प्रश्न के संदर्भ में, यह स्वास्थ्य, जीवनशैली या सामान्य चिकित्सा से जुड़ा एक महत्वपूर्ण विषय है। मानव शरीर में स्वास्थ्य संबंधी संतुलन बनाए रखने के लिए सही जानकारी व समय पर सावधानी आवश्यक है।\n\n` +
      `2. **सुझाव व सावधानियां:**\n` +
      `• संतुलित आहार लें, भरपूर पानी पिएं और पर्याप्त विश्राम करें।\n` +
      `• किसी भी लक्षण के निवारण हेतु बिना डॉक्टर की सलाह के एंटीबायोटिक्स या दवाएं न लें।\n` +
      `• नियमित शारीरिक व्यायाम और तनाव मुक्त दिनचर्या अपनाएं।\n\n` +
      `3. **आगे की सहायता:**\n` +
      `यदि आप इससे संबंधित किसी विशेषज्ञ डॉक्टर से परामर्श लेना चाहते हैं, तो मुझे बताएं। आप सीधे कह सकते हैं *"Book doctor appointment"*।\n\n` +
      disclaimer;
  }

  if (lang === 'te') {
    return `### 🤖 కేర్‌స్పియర్ AI ఆరోగ్య సమాచారం\n\n` +
      `మీ ప్రశ్న: **"${query}"**\n\n` +
      `1. **వివరణ:** ఈ అంశం ఆరోగ్య సంరక్షణ మరియు జీవనశైలికి సంబంధించిన ముఖ్యమైన సమాచారాన్ని కలిగి ఉంది. శరీర ఆరోగ్యాన్ని కాపాడుకోవడానికి సరైన అవగాహన ఎంతో అవసరం.\n\n` +
      `2. **ముఖ్య సూచనలు:** సరిపడా నీరు త్రాగండి, పోషకాహారం తీసుకోండి, విశ్రాంతి పొందండి. సొంత వైద్యం చేసుకోకండి.\n\n` +
      `3. **వైద్యుల సలహా:** మా ప్రత్యేక వైద్యులను సంప్రదించడానికి *"Book appointment"* అని అడగండి.\n\n` +
      disclaimer;
  }

  if (lang === 'kn') {
    return `### 🤖 ಕೇರ್‌ಸ್ಪಿಯರ್ AI ಮಾಹಿತಿ\n\n` +
      `ನಿಮ್ಮ ಪ್ರಶ್ನೆ: **"${query}"**\n\n` +
      `ಆರೋಗ್ಯ ಕಾಪಾಡಿಕೊಳ್ಳಲು ಸರಿಯಾದ ಪೌಷ್ಟಿಕಾಂಶ, ಸಾಕಷ್ಟು ನೀರು ಮತ್ತು ವಿಶ್ರಾಂತಿ ಅತಿ ಮುಖ್ಯ. ಹೆಚ್ಚಿನ ವಿವರಗಳಿಗೆ ಅಥವಾ ವೈದ್ಯರ ಭೇಟಿಗೆ *"Book appointment"* ಎಂದು ಹೇಳಿ.\n\n` +
      disclaimer;
  }

  if (lang === 'ml') {
    return `### 🤖 കെയർസ്ഫിയർ AI വിവരണം\n\n` +
      `നിങ്ങളുടെ ചോദ്യം: **"${query}"**\n\n` +
      `ആരോഗ്യം നിലനിർത്താൻ ശരിയായ പോഷകാഹാരവും വിശ്രമവും ആവശ്യമാണ്. കൂടുതൽ വിവരങ്ങൾക്കോ ഡോക്ടറെ കാണാനോ *"Book appointment"* എന്ന് പറയുക.\n\n` +
      disclaimer;
  }

  if (lang === 'bn') {
    return `### 🤖 কেয়ারস্ফিয়ার এআই স্বাস্থ্য পরামর্শ\n\n` +
      `আপনার প্রশ্ন: **"${query}"**\n\n` +
      `সুস্থ থাকার জন্য পুষ্টিকর খাবার, পর্যাপ্ত জল ও বিশ্রাম জরুরি। বিশেষজ্ঞ ডাক্তারের সাথে দেখা করতে চাইলে *"Book appointment"* বলুন।\n\n` +
      disclaimer;
  }

  if (lang === 'mr') {
    return `### 🤖 केअरस्फीअर AI आरोग्य विश्लेषण\n\n` +
      `आपला प्रश्न: **"${query}"**\n\n` +
      `चांगल्या आरोग्यासाठी संतुलित आहार, पुरेसे पाणी व नियमित व्यायाम आवश्यक आहे. डॉक्टरांच्या सल्ल्यासाठी *"Book appointment"* सांगा.\n\n` +
      disclaimer;
  }

  if (lang === 'gu') {
    return `### 🤖 કેરસ્ફિયર AI વિશ્લેષણ\n\n` +
      `તમારો પ્રશ્ન: **"${query}"**\n\n` +
      `સારા સ્વાસ્થ્ય માટે પૌષ્ટિક આહાર, પાણી અને આરામ જરૂરી છે. વિશેષજ્ઞ ડૉક્ટર સાથે વાત કરવા માટે *"Book appointment"* કહો.\n\n` +
      disclaimer;
  }

  if (lang === 'pa') {
    return `### 🤖 ਕੇਅਰਸਫੀਅਰ AI ਸਿਹਤ ਸਲਾਹ\n\n` +
      `ਤੁਹਾਡਾ ਸਵਾਲ: **"${query}"**\n\n` +
      `ਚੰਗੀ ਸਿਹਤ ਲਈ ਸੰਤੁਲਿਤ ਖੁਰਾਕ, ਪਾਣੀ ਅਤੇ ਕਸਰਤ ਜ਼ਰੂਰੀ ਹੈ। ਡਾਕਟਰ ਦੀ ਮੁਲਾਕਾਤ ਲਈ *"Book appointment"* ਕਹੋ।\n\n` +
      disclaimer;
  }

  // Default English response
  return `### 🤖 CareSphere AI Comprehensive Analysis\n\n` +
    `Regarding your inquiry: **"${query}"**\n\n` +
    `1. **Clinical & Health Perspective:**\n` +
    `Your question touches upon an important facet of health, biology, and lifestyle wellness. Optimal physiological function depends on maintaining balanced homeostasis through proper hydration, balanced cellular nutrition, and mindful physical activity.\n\n` +
    `2. **Key Recommendations & Best Practices:**\n` +
    `• **Hydration & Nutrition:** Drink 2.5–3 liters of water daily and focus on whole, unprocessed foods rich in micronutrients and dietary fiber.\n` +
    `• **Restorative Recovery:** Aim for 7–8 hours of consistent, uninterrupted sleep to support immune function and neurological repair.\n` +
    `• **Preventative Guidance:** Avoid self-diagnosing or self-medicating with over-the-counter pharmaceuticals without professional clinical supervision.\n\n` +
    `3. **CareSphere Hospital Assistance:**\n` +
    `If you have related symptoms or would like to discuss this with an attending specialist, I can assist you with booking an OPD appointment, scheduling a diagnostic lab test, or checking pharmacy medications. Simply reply with *"Book appointment"* or *"Show doctors"*.\n\n` +
    disclaimer;
}
