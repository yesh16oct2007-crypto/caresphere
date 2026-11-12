import { db } from '../db/database.js';
import { createNotification } from './notificationService.js';
import { SessionContext } from './conversationMemory.js';
import { normalizeLanguage, SupportedLanguage } from './aiKnowledgeBrain.js';

export interface ActionExecutionResult {
  action: string;
  success: boolean;
  reply: string;
  data?: any;
  requires_confirmation?: boolean;
  confirmation_prompt?: string;
  updated_context?: SessionContext;
  suggested_actions?: string[];
}

export interface UserContext {
  id: number;
  name: string;
  email: string;
  role: string;
  hospital_id?: number | null;
  preferred_language?: string;
}

// Multilingual labels for action replies across all 10 supported regional languages
const ACTION_STRINGS: Record<string, Record<SupportedLanguage, string>> = {
  login_required: {
    en: 'Please log in to your CareSphere account to access your personal records, appointments, or medical actions.',
    ta: 'உங்கள் அப்பாய்ன்ட்மென்ட் அல்லது மருத்துவ பதிவுகளைப் பார்க்க தயவுசெய்து உங்கள் கணக்கில் உள்நுழையவும்.',
    hi: 'अपनी व्यक्तिगत अपॉइंटमेंट या मेडिकल रिकॉर्ड देखने के लिए कृपया अपने केयरस्फ़ीयर खाते में लॉगिन करें।',
    te: 'మీ అపాయింట్‌మెంట్లు లేదా మెడికల్ రికార్డులను చూడటానికి దయచేసి లాగిన్ అవ్వండి.',
    kn: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅಥವಾ ಮೆಡಿಕಲ್ ರೆಕಾರ್ಡ್ ನೋಡಲು ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಆಗಿ.',
    ml: 'നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റുകൾ കാണാൻ ദയവായി ലോഗിൻ ചെയ്യുക.',
    bn: 'আপনার ব্যক্তিগত অ্যাপয়েন্টমেন্ট বা মেডিকেল রেকর্ড দেখতে দয়া করে লগইন করুন।',
    mr: 'आपल्या वैयक्तिक अपॉइंटमेंट किंवा वैद्यकीय नोंदी पाहण्यासाठी कृपया लॉगिन करा.',
    gu: 'તમારી અંગત એપોઇન્ટમેન્ટ્સ અથવા મેડિકલ રેકોર્ડ્સ જોવા માટે કૃપા કરીને લૉગિન કરો.',
    pa: 'ਆਪਣੀ ਨਿੱਜੀ ਮੁਲਾਕਾਤ ਜਾਂ ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਦੇਖਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਲੌਗਇਨ ਕਰੋ।'
  },
  no_appointments: {
    en: 'You do not have any active appointments scheduled at this moment. You can book an appointment with our specialists anytime!',
    ta: 'தற்போது உங்களுக்கு எந்த ஒரு அப்பாய்ன்ட்மென்ட்டும் இல்லை. எங்கள் சிறப்பு மருத்துவரிடம் நீங்கள் எப்போது வேண்டுமானாலும் முன்பதிவு செய்யலாம்!',
    hi: 'वर्तमान में आपकी कोई आगामी अपॉइंटमेंट निर्धारित नहीं है। आप जब चाहें हमारे विशेषज्ञों के साथ अपॉइंटमेंट बुक कर सकते हैं!',
    te: 'ప్రస్తుతం మీకు ఎలాంటి అపాయింట్‌మెంట్‌లు షెడ్యూల్ చేయబడలేదు. మీరు ఎప్పుడైనా వైద్యుడిని బుక్ చేసుకోవచ్చు!',
    kn: 'ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಯಾವುದೇ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳಿಲ್ಲ. ನೀವು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ತಜ್ಞ ವೈದ್ಯರನ್ನು ಬುಕ್ ಮಾಡಬಹುದು!',
    ml: 'നിലവിൽ നിങ്ങൾക്ക് അപ്പോയിന്റ്മെന്റുകൾ ഒന്നും ഷెഡ്യൂൾ ചെയ്തിട്ടില്ല. ഏതുസമയത്തും ബുക്ക് ചെയ്യാം!',
    bn: 'বর্তমানে আপনার কোনো নির্ধারিত অ্যাপয়েন্টমেন্ট নেই। আপনি যেকোনো সময় বিশেষজ্ঞ ডাক্তারের সাথে বুক করতে পারেন!',
    mr: 'सध्या आपली कोणतीही आगामी अपॉइंटमेंट नाही. आपण कधीही तज्ञ डॉक्टरांची भेट बुक करू शकता!',
    gu: 'હાલમાં તમારી કોઈ સક્રિય એપોઇન્ટમેન્ટ નથી. તમે ગમે ત્યારે નિષ્ણાત ડૉક્ટરની મુલાકાત બુક કરી શકો છો!',
    pa: 'ਇਸ ਸਮੇਂ ਤੁਹਾਡੀ ਕੋਈ ਆਗਾਮੀ ਮੁਲਾਕਾਤ ਨਿਰਧਾਰਤ ਨਹੀਂ ਹੈ। ਤੁਸੀਂ ਕਦੇ ਵੀ ਮਾਹਿਰ ਡਾਕਟਰ ਬੁੱਕ ਕਰ ਸਕਦੇ ਹੋ!'
  },
  cancelled_success: {
    en: 'Your appointment has been successfully cancelled. A confirmation notification has been sent.',
    ta: 'உங்கள் அப்பாய்ன்ட்மென்ட் வெற்றிகரமாக ரத்து செய்யப்பட்டது. உறுதிப்படுத்தல் அறிவிப்பு அனுப்பப்பட்டுள்ளது.',
    hi: 'आपकी अपॉइंटमेंट सफलतापूर्वक रद्द कर दी गई है। पुष्टि सूचना भेज दी गई है।',
    te: 'మీ అపాయింట్‌మెంట్ విజయవంతంగా రద్దు చేయబడింది. ధృవీకరణ నోటిఫికేషన్ పంపబడింది.',
    kn: 'ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ ರದ್ದುಗೊಂಡಿದೆ. ದೃಢೀಕರಣ ಅಧಿಸೂಚನೆ ಕಳುಹಿಸಲಾಗಿದೆ.',
    ml: 'നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് വിജയകരമായി റദ്ദാക്കി. സ്ഥിരീകരണ സന്ദേശം അയച്ചിട്ടുണ്ട്.',
    bn: 'আপনার অ্যাপয়েন্টমেন্ট সফলভাবে বাতিল করা হয়েছে। একটি নিশ্চিতকরণ বিজ্ঞপ্তি পাঠানো হয়েছে।',
    mr: 'आपली अपॉइंटमेंट यशस्वीरीत्या रद्द करण्यात आली आहे. पुष्टीकरण सूचना पाठवली आहे.',
    gu: 'તમારી એપોઇન્ટમેન્ટ સફળતાપૂર્વક રદ કરવામાં આવી છે. પુષ્ટિ સૂચના મોકલી દેવાઈ છે.',
    pa: 'ਤੁਹਾਡੀ ਮੁਲਾਕਾਤ ਸਫਲਤਾਪੂਰਵਕ ਰੱਦ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਪੁਸ਼ਟੀ ਸੂਚਨਾ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ।'
  }
};

const ACTION_SUGGESTIONS: Record<string, Record<SupportedLanguage, string[]>> = {
  appointments_exist: {
    en: ['Cancel 1st Appointment', 'Cancel 2nd Appointment', 'Reschedule', 'Book New Doctor'],
    ta: ['1வது அப்பாய்ன்ட்மென்ட் ரத்து செய்', '2வது அப்பாய்ன்ட்மென்ட் ரத்து செய்', 'நேரம் மாற்று', 'புதிய மருத்துவர் முன்பதிவு'],
    hi: ['पहली अपॉइंटमेंट रद्द करें', 'दूसरी अपॉइंटमेंट रद्द करें', 'रीशेड्यूल करें', 'नया डॉक्टर बुक करें'],
    te: ['1వ అపాయింట్‌మెంట్ రద్దు', '2వ అపాయింట్‌మెంట్ రద్దు', 'రీషెడ్యూల్', 'కొత్త డాక్టర్ బుకింగ్'],
    kn: ['1ನೇ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರದ್ದು', '2ನೇ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರದ್ದು', 'ರೀಶೆಡ್ಯೂಲ್', 'ಹೊಸ ವೈದ್ಯರ ಬುಕಿಂಗ್'],
    ml: ['1-ാം അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കുക', '2-ാം അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കുക', 'സമയം മാറ്റുക', 'പുതിയ ബുക്കിംഗ്'],
    bn: ['১ম অ্যাপয়েন্টমেন্ট বাতিল', '২য় অ্যাপয়েন্টমেন্ট বাতিল', 'পুনর্নির্ধারণ', 'নতুন ডাক্তার বুক করুন'],
    mr: ['पहिली अपॉइंटमेंट रद्द करा', 'दुसरी अपॉइंटमेंट रद्द करा', 'पुनर्निर्धारित करा', 'नवीन डॉक्टर बुक करा'],
    gu: ['પ્રથમ એપોઇન્ટમેન્ટ રદ કરો', 'બીજી એપોઇન્ટમેન્ટ રદ કરો', 'રીશેડ્યૂલ', 'નવા ડૉક્ટર બુક કરો'],
    pa: ['ਪਹਿਲੀ ਮੁਲਾਕਾਤ ਰੱਦ ਕਰੋ', 'ਦੂਜੀ ਮੁਲਾਕਾਤ ਰੱਦ ਕਰੋ', 'ਰੀਸ਼ਡਿਊਲ', 'ਨਵਾਂ ਡਾਕਟਰ ਬੁੱਕ ਕਰੋ']
  },
  booking_success: {
    en: ['Show My Appointments', 'Hospital Directions', 'View Prescriptions'],
    ta: ['என் அப்பாய்ன்ட்மென்ட்கள்', 'மருத்துவமனை வழிகாட்டி', 'மருந்து சீட்டுகள்'],
    hi: ['मेरी अपॉइंटमेंट दिखाओ', 'अस्पताल दिशा-निर्देश', 'पर्चे देखें'],
    te: ['నా అపాయింట్‌మెంట్‌లు', 'ఆసుపత్రి దిశలు', 'ప్రిస్క్రిప్షన్లు'],
    kn: ['ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು', 'ಆಸ್ಪತ್ರೆ ಮಾರ್ಗ', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ಗಳು'],
    ml: ['എന്റെ അപ്പോയിന്റ്മെന്റുകൾ', 'ആശുപത്രി വഴി', 'കുറിപ്പടികൾ'],
    bn: ['আমার অ্যাপয়েন্টমেন্ট', 'হাসপাতালের দিকনির্দেশ', 'প্রেসক্রিপশন দেখুন'],
    mr: ['माझ्या अपॉइंटमेंट्स', 'रुग्णालय मार्ग', 'प्रिस्क्रिप्शन पहा'],
    gu: ['મારી એપોઇન્ટમેન્ટ્સ', 'હોસ્પિટલ દિશાઓ', 'પ્રિસ્ક્રિપ્શન્સ'],
    pa: ['ਮੇਰੀਆਂ ਮੁਲਾਕਾਤਾਂ', 'ਹਸਪਤਾਲ ਰਸਤਾ', 'ਨੁਸਖ਼ੇ ਵੇਖੋ']
  },
  cancelled: {
    en: ['Book Another Appointment', 'Show My Appointments', 'Home'],
    ta: ['வேறொரு முன்பதிவு செய்', 'என் அப்பாய்ன்ட்மென்ட்கள்', 'முகப்பு'],
    hi: ['दूसरी अपॉइंटमेंट बुक करें', 'मेरी अपॉइंटमेंट दिखाओ', 'होम'],
    te: ['మరొక అపాయింట్‌మెంట్ బుక్ చేయండి', 'నా అపాయింట్‌మెంట్‌లు', 'హోమ్'],
    kn: ['ಮತ್ತೊಂದು ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಬುಕ್ ಮಾಡಿ', 'ನನ್ನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು', 'ಮುಖಪುಟ'],
    ml: ['മറ്റൊരു അപ്പോയിന്റ്മെന്റ് ബുക്ക് ചെയ്യുക', 'എന്റെ അപ്പോയിന്റ്മെന്റുകൾ', 'ഹോം'],
    bn: ['আরেকটি অ্যাপয়েন্টমেন্ট বুক করুন', 'আমার অ্যাপয়েন্টমেন্ট', 'হোম'],
    mr: ['दुसरी अपॉइंटमेंट बुक करा', 'माझ्या अपॉइंटमेंट्स', 'होम'],
    gu: ['બીજી એપોઇન્ટમેન્ટ બુક કરો', 'મારી એપોઇન્ટમેન્ટ્સ', 'હોમ'],
    pa: ['ਹੋਰ ਮੁਲਾਕਾਤ ਬੁੱਕ ਕਰੋ', 'ਮੇਰੀਆਂ ਮੁਲਾਕਾਤਾਂ', 'ਹੋਮ']
  }
};

/**
 * Execute authorized user-requested actions on the live CareSphere backend
 */
export async function executeAIAction(
  action: string,
  params: Record<string, any> = {},
  user: UserContext | null,
  language: string = 'en',
  sessionContext: SessionContext | null = null
): Promise<ActionExecutionResult> {
  const langKey = normalizeLanguage(language);

  // 1. PATIENT: SHOW APPOINTMENTS
  if (action === 'SHOW_MY_APPOINTMENTS') {
    if (!user) {
      return {
        action,
        success: false,
        reply: ACTION_STRINGS.login_required[langKey] || ACTION_STRINGS.login_required.en,
        suggested_actions: ['Login', 'Find Doctors', 'Emergency Help']
      };
    }

    const appointments = db.prepare(`
      SELECT 
        a.id,
        a.reference_no,
        a.appointment_date,
        a.appointment_time,
        a.consultation_type,
        a.status,
        u_doc.name as doctor_name,
        dp.specialization,
        dp.room_number,
        dp.floor,
        h.name as hospital_name
      FROM appointments a
      JOIN doctor_profiles dp ON a.doctor_id = dp.id
      JOIN users u_doc ON dp.user_id = u_doc.id
      LEFT JOIN hospitals h ON a.hospital_id = h.id
      WHERE a.patient_id = ? AND a.status IN ('scheduled', 'confirmed')
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
      LIMIT 5
    `).all(user.id) as any[];

    if (appointments.length === 0) {
      return {
        action,
        success: true,
        reply: ACTION_STRINGS.no_appointments[langKey] || ACTION_STRINGS.no_appointments.en,
        data: { appointments: [] },
        suggested_actions: ['Book Doctor Appointment', 'View Departments', 'Available Medicines']
      };
    }

    // Build context references so user can say "cancel the 2nd one"
    const referencedList = appointments.map((appt, i) => ({
      index: i + 1,
      id: appt.id,
      doctor_name: appt.doctor_name,
      date: appt.appointment_date,
      time: appt.appointment_time
    }));

    let reply = '';
    if (langKey === 'ta') {
      reply = `உங்களுடைய வரவிருக்கும் அப்பாய்ன்ட்மென்ட்கள் (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • தேதி & நேரம்: ${a.appointment_date} @ ${a.appointment_time}\n   • மருத்துவமனை: ${a.hospital_name || 'CareSphere'} (${a.floor}, ${a.room_number})\n   • நிலை: ${a.status} (${a.consultation_type === 'online_video' ? 'வீடியோ' : 'நேரில்'})\n   • குறிப்பு எண்: \`${a.reference_no}\``).join('\n\n') +
        `\n\nரத்து செய்ய விரும்பினால், "ரெண்டாவது அப்பாய்ன்ட்மென்ட் ரத்து செய்" அல்லது "முதல் அப்பாய்ன்ட்மென்ட் ரத்து செய்" என்று கூறலாம்.`;
    } else if (langKey === 'hi') {
      reply = `आपकी आगामी अपॉइंटमेंट्स (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • तारीख व समय: ${a.appointment_date} @ ${a.appointment_time}\n   • अस्पताल: ${a.hospital_name || 'CareSphere'} (${a.floor}, ${a.room_number})\n   • स्टेटस: ${a.status} (${a.consultation_type === 'online_video' ? 'ऑनलाइन' : 'व्यक्तिगत'})\n   • संदर्भ: \`${a.reference_no}\``).join('\n\n') +
        `\n\nयदि आप किसी को रद्द करना चाहते हैं, तो कहें "पहली अपॉइंटमेंट कैंसल करो" या "दूसरी कैंसल करो"।`;
    } else if (langKey === 'te') {
      reply = `మీ రాబోయే అపాయింట్‌మెంట్‌లు (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • తేదీ & సమయం: ${a.appointment_date} @ ${a.appointment_time}\n   • ఆసుపత్రి: ${a.hospital_name || 'CareSphere'} (${a.room_number})\n   • రెఫరెన్స్: \`${a.reference_no}\``).join('\n\n') +
        `\n\nరద్దు చేయడానికి "రెండోది కాన్సిల్ చేయండి" అని చెప్పవచ్చు.`;
    } else if (langKey === 'kn') {
      reply = `ನಿಮ್ಮ ಮುಂಬರುವ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳು (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • ದಿನಾಂಕ & ಸಮಯ: ${a.appointment_date} @ ${a.appointment_time}\n   • ಆಸ್ಪತ್ರೆ: ${a.hospital_name || 'CareSphere'} (${a.room_number})`).join('\n\n');
    } else if (langKey === 'ml') {
      reply = `നിങ്ങളുടെ വരാനിരിക്കുന്ന അപ്പോയിന്റ്മെന്റുകൾ (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • തീയതി: ${a.appointment_date} @ ${a.appointment_time}\n   • ആശുപത്രി: ${a.hospital_name || 'CareSphere'}`).join('\n\n');
    } else if (langKey === 'bn') {
      reply = `আপনার আসন্ন অ্যাপয়েন্টমেন্টসমূহ (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • তারিখ ও সময়: ${a.appointment_date} @ ${a.appointment_time}\n   • হাসপাতাল: ${a.hospital_name || 'CareSphere'}`).join('\n\n');
    } else if (langKey === 'mr') {
      reply = `आपल्या आगामी अपॉइंटमेंट्स (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • तारीख व वेळ: ${a.appointment_date} @ ${a.appointment_time}\n   • रुग्णालय: ${a.hospital_name || 'CareSphere'}`).join('\n\n');
    } else if (langKey === 'gu') {
      reply = `તમારી આગામી એપોઇન્ટમેન્ટ્સ (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • તારીખ અને સમય: ${a.appointment_date} @ ${a.appointment_time}\n   • હોસ્પિટલ: ${a.hospital_name || 'CareSphere'}`).join('\n\n');
    } else if (langKey === 'pa') {
      reply = `ਤੁਹਾਡੀਆਂ ਆਗਾਮੀ ਮੁਲਾਕਾਤਾਂ (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • ਮਿਤੀ ਅਤੇ ਸਮਾਂ: ${a.appointment_date} @ ${a.appointment_time}\n   • ਹਸਪਤਾਲ: ${a.hospital_name || 'CareSphere'}`).join('\n\n');
    } else {
      reply = `Here are your upcoming appointments (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • **Date & Time:** ${a.appointment_date} at ${a.appointment_time}\n   • **Hospital:** ${a.hospital_name || 'CareSphere'} (${a.floor}, ${a.room_number})\n   • **Type:** ${a.consultation_type === 'online_video' ? 'Online Teleconsult' : 'In-Person OPD'}\n   • **Reference No:** \`${a.reference_no}\``).join('\n\n') +
        `\n\n💡 *To cancel or reschedule, reply with "Cancel the 1st one" or "Cancel Dr. ${appointments[0].doctor_name}".*`;
    }

    const suggestions = ACTION_SUGGESTIONS.appointments_exist[langKey] || ACTION_SUGGESTIONS.appointments_exist.en;

    return {
      action,
      success: true,
      reply,
      data: { appointments },
      updated_context: {
        referenced_appointments: referencedList
      },
      suggested_actions: suggestions
    };
  }

  // 2. PATIENT: CANCEL APPOINTMENT
  if (action === 'CANCEL_APPOINTMENT') {
    if (!user) {
      return {
        action,
        success: false,
        reply: ACTION_STRINGS.login_required[langKey] || ACTION_STRINGS.login_required.en
      };
    }

    let targetApptId: number | null = null;
    let targetDocName: string = '';

    const targetIdx = params.target_index !== undefined ? Number(params.target_index) + 1 : (params.index ? Number(params.index) : null);

    // Check if target is explicitly given by index (e.g. 1st, 2nd)
    if (targetIdx && sessionContext?.referenced_appointments) {
      const match = sessionContext.referenced_appointments.find(r => r.index === targetIdx);
      if (match) {
        targetApptId = match.id;
        targetDocName = match.doctor_name;
      }
    }

    // Check if target doctor name provided
    if (!targetApptId && params.doctor_name) {
      const docLower = String(params.doctor_name).toLowerCase();
      const appt = db.prepare(`
        SELECT a.id, u_doc.name as doctor_name
        FROM appointments a
        JOIN doctor_profiles dp ON a.doctor_id = dp.id
        JOIN users u_doc ON dp.user_id = u_doc.id
        WHERE a.patient_id = ? AND a.status IN ('scheduled', 'confirmed')
          AND LOWER(u_doc.name) LIKE ?
        LIMIT 1
      `).get(user.id, `%${docLower}%`) as any;

      if (appt) {
        targetApptId = appt.id;
        targetDocName = appt.doctor_name;
      }
    }

    // If still not resolved, take the latest scheduled appointment
    if (!targetApptId) {
      const latestAppt = db.prepare(`
        SELECT a.id, u_doc.name as doctor_name, a.appointment_date, a.appointment_time
        FROM appointments a
        JOIN doctor_profiles dp ON a.doctor_id = dp.id
        JOIN users u_doc ON dp.user_id = u_doc.id
        WHERE a.patient_id = ? AND a.status IN ('scheduled', 'confirmed')
        ORDER BY a.appointment_date ASC LIMIT 1
      `).get(user.id) as any;

      if (latestAppt) {
        targetApptId = latestAppt.id;
        targetDocName = latestAppt.doctor_name;
      }
    }

    if (!targetApptId) {
      const notFoundMap: Record<SupportedLanguage, string> = {
        en: 'Could not find an active appointment to cancel. Say "Show my appointments" to view your scheduled visits.',
        ta: 'ரத்து செய்வதற்கு எந்த ஒரு அப்பாய்ன்ட்மென்ட்டும் காணப்படவில்லை. உங்கள் அப்பாய்ன்ட்மென்ட்களைப் பார்க்க "Show my appointments" என்று சொல்லுங்கள்.',
        hi: 'रद्द करने के लिए कोई सक्रिय अपॉइंटमेंट नहीं मिली। अपने अपॉइंटमेंट्स देखने के लिए "मेरी अपॉइंटमेंट दिखाओ" कहें।',
        te: 'రద్దు చేయడానికి ఎటువంటి సక్రియ అపాయింట్‌మెంట్ కనుగొనబడలేదు.',
        kn: 'ರದ್ದುಗೊಳಿಸಲು ಯಾವುದೇ ಸಕ್ರಿಯ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಕಂಡುಬಂದಿಲ್ಲ.',
        ml: 'റദ്ദാക്കാൻ സജീവമായ അപ്പോയിന്റ്മെന്റുകൾ ഒന്നും കണ്ടെത്തിയില്ല.',
        bn: 'বাতিল করার মতো কোনো সক্রিয় অ্যাপয়েন্টমেন্ট পাওয়া যায়নি।',
        mr: 'रद्द करण्यासाठी कोणतीही सक्रिय अपॉइंटमेंट आढळली नाही.',
        gu: 'રદ કરવા માટે કોઈ સક્રિય એપોઇન્ટમેન્ટ મળી નથી.',
        pa: 'ਰੱਦ ਕਰਨ ਲਈ ਕੋਈ ਸਰਗਰਮ ਮੁਲਾਕਾਤ ਨਹੀਂ ਮਿਲੀ।'
      };

      return {
        action,
        success: false,
        reply: notFoundMap[langKey] || notFoundMap.en,
        suggested_actions: ['Show my appointments', 'Book Doctor Appointment']
      };
    }

    // Check if confirmation was given or if we should confirm first
    if (!params.confirmed) {
      const confirmPrompts: Record<SupportedLanguage, string> = {
        en: `Are you sure you want to cancel your appointment with Dr. ${targetDocName}? Reply **"Yes, cancel"** to confirm or **"No"** to keep it.`,
        ta: `நீங்கள் Dr. ${targetDocName} உடனான அப்பாய்ன்ட்மென்ட்டை ரத்து செய்ய விரும்புகிறீர்களா? உறுதிப்படுத்த **"ஆம், ரத்து செய்"** அல்லது **"இல்லை"** என்று கூறவும்.`,
        hi: `क्या आप Dr. ${targetDocName} के साथ अपनी अपॉइंटमेंट रद्द करना चाहते हैं? कृपया पुष्टि करने के लिए **"हाँ, रद्द करें"** या **"नहीं"** कहें।`,
        te: `మీరు Dr. ${targetDocName} తో అపాయింట్‌మెంట్‌ను రద్దు చేయాలనుకుంటున్నారా? దయచేసి **"అవును, రద్దు చేయి"** లేదా **"వద్దు"** అని చెప్పండి.`,
        kn: `ನೀವು Dr. ${targetDocName} ಅವರೊಂದಿಗಿನ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ರದ್ದುಗೊಳಿಸಲು ಖಚಿತವಾಗಿ ಬಯಸುವಿರಾ? **"ಹೌದು, ರದ್ದುಮಾಡಿ"** ಎಂದು ಉತ್ತರಿಸಿ.`,
        ml: `Dr. ${targetDocName} യുമായുള്ള അപ്പോയിന്റ്മെന്റ് റദ്ദാക്കാൻ ആഗ്രഹിക്കുന്നുണ്ടോ? സ്ഥിരീകരിക്കാൻ **"അതെ, റദ്ദാക്കുക"** എന്ന് പറയുക.`,
        bn: `আপনি কি নিশ্চিতভাবে Dr. ${targetDocName}-এর সাথে অ্যাপয়েন্টমেন্ট বাতিল করতে চান? **"হ্যাঁ, বাতিল করুন"** বলুন।`,
        mr: `तुम्हाला Dr. ${targetDocName} यांच्यासोबतची अपॉइंटमेंट रद्द करायची आहे का? **"होय, रद्द करा"** सांगा.`,
        gu: `શું તમે Dr. ${targetDocName} સાથેની એપોઇન્ટમેન્ટ રદ કરવા માંગો છો? **"હા, રદ કરો"** કહો.`,
        pa: `ਕੀ ਤੁਸੀਂ Dr. ${targetDocName} ਨਾਲ ਮੁਲਾਕਾਤ ਰੱਦ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? **"ਹਾਂ, ਰੱਦ ਕਰੋ"** ਕਹੋ।`
      };

      return {
        action,
        success: true,
        requires_confirmation: true,
        reply: confirmPrompts[langKey] || confirmPrompts.en,
        data: { target_appointment_id: targetApptId, doctor_name: targetDocName },
        updated_context: {
          pending_action: {
            action: 'CANCEL_APPOINTMENT',
            params: { target_appointment_id: targetApptId, confirmed: true },
            prompt_in_lang: `Cancel appointment #${targetApptId}`
          }
        },
        suggested_actions: ['Yes, cancel appointment', 'No, keep appointment']
      };
    }

    // Execute cancellation in database
    const finalId = params.target_appointment_id || targetApptId;
    db.prepare(`
      UPDATE appointments
      SET status = 'cancelled',
          cancellation_reason = 'Cancelled by patient via CareSphere AI Assistant',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND patient_id = ?
    `).run(finalId, user.id);

    createNotification(
      user.id,
      'Appointment Cancelled',
      `Your appointment has been successfully cancelled via AI Assistant.`,
      { appointment_id: finalId },
      'info'
    );

    return {
      action,
      success: true,
      reply: ACTION_STRINGS.cancelled_success[langKey] || ACTION_STRINGS.cancelled_success.en,
      suggested_actions: ACTION_SUGGESTIONS.cancelled[langKey] || ACTION_SUGGESTIONS.cancelled.en
    };
  }

  // 3. PATIENT: BOOK APPOINTMENT
  if (action === 'BOOK_APPOINTMENT') {
    if (!user) {
      return {
        action,
        success: false,
        reply: ACTION_STRINGS.login_required[langKey] || ACTION_STRINGS.login_required.en
      };
    }

    const hospId = user.hospital_id || null;

    // Search doctor by name or specialization
    let doctor: any = null;
    if (params.doctor_name) {
      const docClean = String(params.doctor_name).toLowerCase().replace(/^dr\.?\s*/, '').trim();
      const docQuery = `%${docClean}%`;
      if (hospId) {
        doctor = db.prepare(`
          SELECT dp.id, u.name, dp.specialization, dp.consultation_fee, dp.department_id, dp.room_number, dp.floor, dp.hospital_id
          FROM doctor_profiles dp
          JOIN users u ON dp.user_id = u.id
          WHERE dp.verification_status IN ('verified', 'approved') AND dp.hospital_id = ?
            AND LOWER(u.name) LIKE ?
          LIMIT 1
        `).get(hospId, docQuery);
      }
      if (!doctor) {
        doctor = db.prepare(`
          SELECT dp.id, u.name, dp.specialization, dp.consultation_fee, dp.department_id, dp.room_number, dp.floor, dp.hospital_id
          FROM doctor_profiles dp
          JOIN users u ON dp.user_id = u.id
          WHERE dp.verification_status IN ('verified', 'approved')
            AND LOWER(u.name) LIKE ?
          LIMIT 1
        `).get(docQuery);
      }
    }

    if (!doctor && params.specialization) {
      doctor = db.prepare(`
        SELECT dp.id, u.name, dp.specialization, dp.consultation_fee, dp.department_id, dp.room_number, dp.floor, dp.hospital_id
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE dp.verification_status IN ('verified', 'approved') AND (? IS NULL OR dp.hospital_id = ?)
          AND LOWER(dp.specialization) LIKE ?
        LIMIT 1
      `).get(hospId, hospId, `%${String(params.specialization).toLowerCase()}%`);
    }

    // If no specific doctor found, present available options
    if (!doctor) {
      const availableDocs = db.prepare(`
        SELECT dp.id, u.name, dp.specialization, dp.consultation_fee, dp.room_number, dp.floor, dp.hospital_id
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE dp.verification_status IN ('verified', 'approved') AND (? IS NULL OR dp.hospital_id = ?)
        LIMIT 3
      `).all(hospId, hospId) as any[];

      let reply = '';
      if (langKey === 'ta') {
        reply = `எந்த மருத்துவரிடம் முன்பதிவு செய்ய விரும்புகிறீர்கள்? கிடைக்கக்கூடிய மருத்துவர்கள்:\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - கட்டணம்: ₹${d.consultation_fee}`).join('\n') +
          `\n\nஎடுத்துக்காட்டாக "Dr. ${availableDocs[0]?.name || 'Specialist'} உடன் நாளை 10 மணிக்கு முன்பதிவு செய்" என்று கூறவும்.`;
      } else if (langKey === 'hi') {
        reply = `आप किस डॉक्टर के साथ अपॉइंटमेंट बुक करना चाहते हैं? उपलब्ध विशेषज्ञ:\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - परामर्श शुल्क: ₹${d.consultation_fee}`).join('\n') +
          `\n\nउदाहरण के लिए "Dr. ${availableDocs[0]?.name || 'Specialist'} के साथ कल सुबह 10 बजे बुक करो" कहें।`;
      } else if (langKey === 'te') {
        reply = `మీరు ఏ వైద్యుడితో అపాయింట్‌మెంట్ బుక్ చేయాలనుకుంటున్నారు? అందుబాటులో ఉన్న వైద్యులు:\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - ఫీజు: ₹${d.consultation_fee}`).join('\n');
      } else {
        reply = `Which doctor or specialty would you like to book? Here are available specialists in your hospital:\n\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - Chamber: ${d.room_number} - Fee: ₹${d.consultation_fee}`).join('\n') +
          `\n\nReply with your preferred doctor and time (e.g. "Book Dr. ${availableDocs[0]?.name || 'Specialist'} for tomorrow at 10:00 AM").`;
      }

      return {
        action,
        success: true,
        reply,
        data: { available_doctors: availableDocs },
        suggested_actions: availableDocs.map(d => `Book Dr. ${d.name}`)
      };
    }

    // Default tomorrow date if not passed
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingDate = params.date || tomorrow.toISOString().split('T')[0];
    let bookingTime = params.time || '10:00';
    const consultationType = params.consultation_type || 'in_person';

    // Generate unique reference number & handle concurrent slot collision retry
    let refNo = `CS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveHospId = doctor.hospital_id || hospId || 1;

    let inserted = false;
    let attempts = 0;

    while (!inserted && attempts < 6) {
      try {
        db.prepare(`
          INSERT INTO appointments (
            reference_no, patient_id, doctor_id, department_id, hospital_id,
            appointment_date, appointment_time, consultation_type, status, patient_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'Booked autonomously via CareSphere AI Assistant')
        `).run(
          refNo,
          user.id,
          doctor.id,
          doctor.department_id || 1,
          effectiveHospId,
          bookingDate,
          bookingTime,
          consultationType
        );
        inserted = true;
      } catch (bookingErr: any) {
        if (String(bookingErr).includes('UNIQUE constraint failed') && attempts < 5) {
          attempts++;
          // Shift time by 30 mins to seamlessly allocate next open slot
          const [h, m] = bookingTime.split(':').map(Number);
          const totalMins = (h || 10) * 60 + (m || 0) + 30;
          bookingTime = `${String(Math.floor(totalMins / 60) % 24).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
          refNo = `CS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        } else {
          throw bookingErr;
        }
      }
    }

    createNotification(
      user.id,
      'Appointment Confirmed',
      `Your appointment with Dr. ${doctor.name} on ${bookingDate} at ${bookingTime} is confirmed. Ref: ${refNo}`,
      { refNo, doctorName: doctor.name, date: bookingDate, time: bookingTime },
      'appointment'
    );

    let reply = '';
    if (langKey === 'ta') {
      reply = `✅ **அப்பாய்ன்ட்மென்ட் வெற்றிகரமாக பதிவு செய்யப்பட்டது!**\n\n• மருத்துவர்: **Dr. ${doctor.name}** (${doctor.specialization})\n• தேதி & நேரம்: **${bookingDate} @ ${bookingTime}**\n• அறை: **${doctor.floor}, ${doctor.room_number}**\n• ஆலோசனைக் கட்டணம்: **₹${doctor.consultation_fee}**\n• குறிப்பு எண்: \`${refNo}\``;
    } else if (langKey === 'hi') {
      reply = `✅ **अपॉइंटमेंट सफलतापूर्वक बुक हो गई है!**\n\n• डॉक्टर: **Dr. ${doctor.name}** (${doctor.specialization})\n• तारीख व समय: **${bookingDate} @ ${bookingTime}**\n• कमरा: **${doctor.floor}, ${doctor.room_number}**\n• शुल्क: **₹${doctor.consultation_fee}**\n• संदर्भ संख्या: \`${refNo}\``;
    } else if (langKey === 'te') {
      reply = `✅ **అపాయింట్‌మెంట్ విజయవంతంగా బుక్ చేయబడింది!**\n\n• డాక్టర్: **Dr. ${doctor.name}** (${doctor.specialization})\n• తేదీ & సమయం: **${bookingDate} @ ${bookingTime}**\n• గది: **${doctor.floor}, ${doctor.room_number}**\n• ఫీజు: **₹${doctor.consultation_fee}**\n• రెఫరెన్స్ నంబర్: \`${refNo}\``;
    } else if (langKey === 'kn') {
      reply = `✅ **ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ ಬುಕ್ ಆಗಿದೆ!**\n\n• ವೈದ್ಯರು: **Dr. ${doctor.name}** (${doctor.specialization})\n• ದಿನಾಂಕ & ಸಮಯ: **${bookingDate} @ ${bookingTime}**\n• ಶುಲ್ಕ: **₹${doctor.consultation_fee}**\n• ರೆಫರೆನ್ಸ್ ಸಂಖ್ಯೆ: \`${refNo}\``;
    } else if (langKey === 'ml') {
      reply = `✅ **അപ്പോയിന്റ്മെന്റ് വിജയകരമായി ബുക്ക് ചെയ്തു!**\n\n• ഡോക്ടർ: **Dr. ${doctor.name}** (${doctor.specialization})\n• തീയതി: **${bookingDate} @ ${bookingTime}**\n• റഫറൻസ് നമ്പർ: \`${refNo}\``;
    } else if (langKey === 'bn') {
      reply = `✅ **অ্যাপয়েন্টমেন্ট সফলভাবে বুক করা হয়েছে!**\n\n• ডাক্তার: **Dr. ${doctor.name}** (${doctor.specialization})\n• তারিখ ও সময়: **${bookingDate} @ ${bookingTime}**\n• রেফারেন্স নম্বর: \`${refNo}\``;
    } else if (langKey === 'mr') {
      reply = `✅ **अपॉइंटमेंट यशस्वीरीत्या बुक झाली आहे!**\n\n• डॉक्टर: **Dr. ${doctor.name}** (${doctor.specialization})\n• तारीख व वेळ: **${bookingDate} @ ${bookingTime}**\n• संदर्भ क्रमांक: \`${refNo}\``;
    } else if (langKey === 'gu') {
      reply = `✅ **એપોઇન્ટમેન્ટ સફળતાપૂર્વક બુક થઈ ગઈ છે!**\n\n• ડૉક્ટર: **Dr. ${doctor.name}** (${doctor.specialization})\n• તારીખ અને સમય: **${bookingDate} @ ${bookingTime}**\n• સંદર્ભ નંબર: \`${refNo}\``;
    } else if (langKey === 'pa') {
      reply = `✅ **ਮੁਲਾਕਾਤ ਸਫਲਤਾਪੂਰਵਕ ਬੁੱਕ ਹੋ ਗਈ ਹੈ!**\n\n• ਡਾਕਟਰ: **Dr. ${doctor.name}** (${doctor.specialization})\n• ਮਿਤੀ ਅਤੇ ਸਮਾਂ: **${bookingDate} @ ${bookingTime}**\n• ਹਵਾਲਾ ਨੰਬਰ: \`${refNo}\``;
    } else {
      reply = `✅ **Appointment Successfully Booked!**\n\n• **Doctor:** Dr. ${doctor.name} (${doctor.specialization})\n• **Date & Time:** ${bookingDate} at ${bookingTime}\n• **Location:** ${doctor.floor}, ${doctor.room_number}\n• **Consultation Fee:** ₹${doctor.consultation_fee}\n• **Reference Number:** \`${refNo}\`\n\n*A confirmation notification has been sent to your dashboard.*`;
    }

    const apptRecord = {
      reference_number: refNo,
      reference_no: refNo,
      doctor_name: doctor.name,
      specialization: doctor.specialization,
      date: bookingDate,
      time: bookingTime,
      room_number: `${doctor.floor || 'Chamber'}, ${doctor.room_number || 'Room 101'}`
    };

    return {
      action,
      success: true,
      reply,
      data: {
        reference_no: refNo,
        doctor_name: doctor.name,
        date: bookingDate,
        time: bookingTime,
        appointment: apptRecord
      },
      suggested_actions: ACTION_SUGGESTIONS.booking_success[langKey] || ACTION_SUGGESTIONS.booking_success.en
    };
  }

  // 4. PATIENT: SHOW MEDICAL RECORDS
  if (action === 'SHOW_MEDICAL_RECORDS') {
    if (!user) {
      return { action, success: false, reply: ACTION_STRINGS.login_required[langKey] || ACTION_STRINGS.login_required.en };
    }

    const records = db.prepare(`
      SELECT id, title, document_type, record_date, file_name, file_size
      FROM medical_records
      WHERE patient_id = ?
      ORDER BY record_date DESC
      LIMIT 5
    `).all(user.id) as any[];

    if (records.length === 0) {
      const emptyRecMap: Record<SupportedLanguage, string> = {
        en: 'You do not have any uploaded medical records yet. You can upload lab results, scans, and discharge summaries in the Medical Records section.',
        ta: 'உங்கள் கணக்கில் இன்னும் எந்த மருத்துவ ஆவணங்களும் பதிவேற்றப்படவில்லை. "Medical Records" பகுதியில் பதிவேற்றலாம்.',
        hi: 'आपके खाते में अभी कोई मेडिकल रिकॉर्ड नहीं है। आप मेडिकल रिकॉर्ड्स टैब से रिपोर्ट अपलोड कर सकते हैं।',
        te: 'మీ ఖాతాలో ఇంకా ఎటువంటి వైద్య రికార్డులు అప్‌లోడ్ చేయబడలేదు.',
        kn: 'ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿ ಯಾವುದೇ ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳಿಲ್ಲ.',
        ml: 'നിങ്ങളുടെ അക്കൗണ്ടിൽ മെഡിക്കൽ റെക്കോർഡുകൾ ഒന്നും അപ്‌ലോഡ് ചെയ്തിട്ടില്ല.',
        bn: 'আপনার অ্যাকাউন্টে এখনও কোনো মেডিকেল রেকর্ড নেই।',
        mr: 'आपल्या खात्यावर अद्याप कोणतेही वैद्यकीय रेकॉर्ड उपलब्ध नाहीत.',
        gu: 'તમારા ખાતામાં હજી કોઈ મેડિકલ રેકોર્ડ અપલોડ કરેલ નથી.',
        pa: 'ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਕੋਈ ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਨਹੀਂ ਹੈ।'
      };

      return {
        action,
        success: true,
        reply: emptyRecMap[langKey] || emptyRecMap.en,
        data: { records: [] },
        suggested_actions: ['Upload Medical Record', 'Book Lab Test', 'View Prescriptions']
      };
    }

    let reply = '';
    if (langKey === 'ta') {
      reply = `உங்கள் மருத்துவ ஆவணங்கள் (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}** (${r.document_type})\n   • தேதி: ${r.record_date} | கோப்பு: ${r.file_name}`).join('\n\n');
    } else if (langKey === 'hi') {
      reply = `आपके मेडिकल रिकॉर्ड्स (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}** (${r.document_type})\n   • तारीख: ${r.record_date} | फ़ाइल: ${r.file_name}`).join('\n\n');
    } else if (langKey === 'te') {
      reply = `మీ వైద్య రికార్డులు (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}** (${r.document_type})\n   • తేదీ: ${r.record_date} | ఫైల్: ${r.file_name}`).join('\n\n');
    } else {
      reply = `Here are your recent digital medical records (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}**\n   • Type: \`${r.document_type}\`\n   • Date: ${r.record_date}\n   • File: ${r.file_name} (${Math.round(r.file_size / 1024)} KB)`).join('\n\n') +
        `\n\n*All records are encrypted and compliant with ABDM standards.*`;
    }

    return {
      action,
      success: true,
      reply,
      data: { records },
      suggested_actions: ['Explain my report', 'Share with Doctor', 'Book Doctor Appointment']
    };
  }

  // 5. PATIENT: SHOW MEDICINES
  if (action === 'SHOW_AVAILABLE_MEDICINES') {
    const hospId = user?.hospital_id || 1;
    const queryTerm = params.medicine_name ? String(params.medicine_name).toLowerCase() : '';

    let query = `
      SELECT m.id, m.name, m.generic_name, m.strength, m.dosage_form, pi.selling_price, pi.stock_quantity
      FROM pharmacy_inventory pi
      JOIN medicines m ON pi.medicine_id = m.id
      JOIN pharmacies p ON pi.pharmacy_id = p.id
      WHERE (p.hospital_id = ? OR ? IS NULL) AND pi.is_available = 1
    `;
    const qParams: any[] = [hospId, hospId];

    if (queryTerm) {
      query += ` AND (LOWER(m.name) LIKE ? OR LOWER(m.generic_name) LIKE ?)`;
      qParams.push(`%${queryTerm}%`, `%${queryTerm}%`);
    }

    query += ` ORDER BY pi.stock_quantity DESC LIMIT 5`;

    const medicines = db.prepare(query).all(...qParams) as any[];

    if (medicines.length === 0) {
      const emptyMedMap: Record<SupportedLanguage, string> = {
        en: `No inventory match found for "${queryTerm || 'medicines'}". Our central pharmacy network is available 24/7.`,
        ta: `"${queryTerm || 'மருந்துகள்'}" என்ற பெயரில் கையிருப்பு இல்லை. எங்கள் 24/7 மருந்தக நெட்வொர்க் எப்போதும் சேவையில் உள்ளது.`,
        hi: `"${queryTerm || 'दवा'}" के लिए कोई स्टॉक नहीं मिला। हमारा केंद्रीय फार्मेसी नेटवर्क 24/7 खुला है।`,
        te: `"${queryTerm || 'మందులు'}" కోసం స్టాక్ కనుగొనబడలేదు. మా 24/7 ఫార్మసీ సేవ అందుబాటులో ఉంది.`,
        kn: `ಔಷಧಿ ಲಭ್ಯವಿಲ್ಲ. ನಮ್ಮ 24/7 ಔಷಧಾಲಯ ಸದಾ ತೆರೆದಿರುತ್ತದೆ.`,
        ml: `മരുന്നുകൾ സ്റ്റോക്കില്ല. ഞങ്ങളുടെ 24/7 ഫാർമസി ലഭ്യമാണ്.`,
        bn: `এই ওষুধটি স্টকে নেই। আমাদের ২৪/৭ ফার্মেসি উন্মুক্ত আছে।`,
        mr: `औषध साठ्यात आढळले नाही. आमची २४/७ फार्मसी खुली आहे.`,
        gu: `દવા સ્ટોકમાં નથી. અમારી 24/7 ફાર્મસી સેવા ચાલુ છે.`,
        pa: `ਦਵਾਈ ਸਟਾਕ ਵਿੱਚ ਨਹੀਂ ਹੈ। ਸਾਡੀ 24/7 ਫਾਰਮੇਸੀ ਉਪਲਬਧ ਹੈ।`
      };

      return {
        action,
        success: true,
        reply: emptyMedMap[langKey] || emptyMedMap.en,
        suggested_actions: ['Show All Medicines', 'Order Prescribed Medicines']
      };
    }

    let reply = '';
    if (langKey === 'ta') {
      reply = `**மருத்துவமனை மருந்தக இருப்பு விவரம் (${medicines.length} மருந்துகள்):**\n\n` +
        medicines.map(m => `• **${m.name}** (${m.generic_name} ${m.strength}) - ${m.dosage_form}\n  விலை: ₹${m.selling_price} | இருப்பு: ✅ கையிருப்பு உள்ளது (${m.stock_quantity})`).join('\n\n') +
        `\n\n*மருத்துவரின் பரிந்துரை சீட்டுடன் மட்டுமே மருந்துகள் வழங்கப்படும்.*`;
    } else if (langKey === 'hi') {
      reply = `**अस्पताल फार्मेसी इन्वेंटरी (${medicines.length} दवाएं उपलब्ध):**\n\n` +
        medicines.map(m => `• **${m.name}** (${m.generic_name} ${m.strength}) - ${m.dosage_form}\n  मूल्य: ₹${m.selling_price} | उपलब्धता: ✅ स्टॉक में उपलब्ध (${m.stock_quantity})`).join('\n\n') +
        `\n\n*वैध डॉक्टर पर्चे पर ही दवाएं वितरित की जाएंगी।*`;
    } else if (langKey === 'te') {
      reply = `**ఆసుపత్రి ఫార్మసీ నిల్వలు (${medicines.length} అందుబాటులో ఉన్నాయి):**\n\n` +
        medicines.map(m => `• **${m.name}** (${m.generic_name} ${m.strength})\n  ధర: ₹${m.selling_price} | నిల్వ: ✅ అందుబాటులో ఉంది (${m.stock_quantity})`).join('\n\n');
    } else {
      reply = `**Hospital Pharmacy Inventory (${medicines.length} in stock):**\n\n` +
        medicines.map(m => `• **${m.name}** (${m.generic_name} ${m.strength}) - ${m.dosage_form}\n  Price: ₹${m.selling_price} | Availability: ✅ In Stock (${m.stock_quantity} available)`).join('\n\n') +
        `\n\n*Only prescribed medications with valid doctor signature can be dispensed.*`;
    }

    return {
      action,
      success: true,
      reply,
      data: { medicines },
      suggested_actions: ['Order Prescribed Medicines', 'Check Another Medicine', 'View Prescriptions']
    };
  }

  // 6. DOCTOR: SHOW APPOINTMENTS
  if (action === 'SHOW_DOCTOR_APPOINTMENTS') {
    if (!user || user.role !== 'doctor') {
      return { action, success: false, reply: 'Access restricted to authorized medical doctors.' };
    }

    const docProfile = db.prepare('SELECT id FROM doctor_profiles WHERE user_id = ?').get(user.id) as any;
    if (!docProfile) {
      return { action, success: false, reply: 'Doctor profile not found.' };
    }

    const appts = db.prepare(`
      SELECT a.id, a.reference_no, a.appointment_date, a.appointment_time, a.status, u_pat.name as patient_name, u_pat.phone
      FROM appointments a
      JOIN users u_pat ON a.patient_id = u_pat.id
      WHERE a.doctor_id = ? AND a.appointment_date >= date('now')
      ORDER BY a.appointment_date ASC, a.appointment_time ASC
      LIMIT 8
    `).all(docProfile.id) as any[];

    let reply = '';
    if (langKey === 'ta') {
      reply = `**Dr. ${user.name} அவர்களின் நோயாளிகள் அட்டவணை (${appts.length}):**\n\n` +
        (appts.length === 0 ? 'இன்றோ அல்லது வரும் நாட்களிலோ நோயாளிகள் முன்பதிவு இல்லை.' : appts.map((a, i) => `${i + 1}. **${a.patient_name}** - ${a.appointment_date} @ ${a.appointment_time} (நிலை: ${a.status})`).join('\n'));
    } else if (langKey === 'hi') {
      reply = `**Dr. ${user.name} का आगामी मरीज शेड्यूल (${appts.length}):**\n\n` +
        (appts.length === 0 ? 'आज या आगामी दिनों के लिए कोई मरीज निर्धारित नहीं है।' : appts.map((a, i) => `${i + 1}. **${a.patient_name}** - ${a.appointment_date} @ ${a.appointment_time} (स्थिति: ${a.status})`).join('\n'));
    } else {
      reply = `**Dr. ${user.name}'s Upcoming Patient Schedule (${appts.length}):**\n\n` +
        (appts.length === 0 ? 'No patients scheduled for today or upcoming days.' : appts.map((a, i) => `${i + 1}. **${a.patient_name}** - ${a.appointment_date} @ ${a.appointment_time} (Status: ${a.status})`).join('\n'));
    }

    return {
      action,
      success: true,
      reply,
      data: { schedule: appts },
      suggested_actions: ['Display Today Schedule', 'View Shared Records']
    };
  }

  // 7. HOSPITAL ADMIN: PENDING DOCTORS
  if (action === 'SHOW_PENDING_DOCTORS') {
    if (!user || (user.role !== 'admin' && user.role !== 'hospital_admin' && user.role !== 'superadmin')) {
      return { action, success: false, reply: 'Access restricted to hospital administrators.' };
    }

    const isHospitalAdmin = user.role === 'hospital_admin';
    const targetHospId = isHospitalAdmin ? user.hospital_id : (user.hospital_id || 1);

    const pending = db.prepare(`
      SELECT dp.id, u.name, dp.specialization, dp.registration_number, dp.qualifications, dp.hospital_id, u.created_at
      FROM doctor_profiles dp
      JOIN users u ON dp.user_id = u.id
      WHERE dp.verification_status = 'pending' AND (? IS NULL OR dp.hospital_id = ?)
    `).all(targetHospId, targetHospId) as any[];

    let reply = '';
    if (langKey === 'ta') {
      reply = `**சரிபார்ப்பு நிலுவையில் உள்ள மருத்துவர்கள் (${pending.length}):**\n\n` +
        (pending.length === 0
          ? '✅ அனைத்து மருத்துவர்களின் சான்றிதழ்களும் சரிபார்க்கப்பட்டுவிட்டன. நிலுவையில் இல்லை!'
          : pending.map((p, i) => `${i + 1}. **Dr. ${p.name}** (${p.specialization}) - Reg: \`${p.registration_number}\``).join('\n') +
            `\n\n*Doctor Verification பகுதியில் முழு விவரங்களை மதிப்பாய்வு செய்யலாம்.*`);
    } else if (langKey === 'hi') {
      reply = `**सत्यापन हेतु लंबित डॉक्टर आवेदन (${pending.length}):**\n\n` +
        (pending.length === 0
          ? '✅ सभी डॉक्टर आवेदन सत्यापित एवं स्वीकृत हैं। कोई समीक्षा लंबित नहीं है!'
          : pending.map((p, i) => `${i + 1}. **Dr. ${p.name}** (${p.specialization}) - Reg: \`${p.registration_number}\``).join('\n') +
            `\n\n*डॉक्टर वेरिफिकेशन सेक्शन में पूरा ऑडिट देखें।*`);
    } else {
      reply = `**Pending Doctor Credential Applications (${pending.length}):**\n\n` +
        (pending.length === 0
          ? '✅ All doctor applications are fully verified and approved. No pending reviews!'
          : pending.map((p, i) => `${i + 1}. **Dr. ${p.name}** (${p.specialization}) - Reg: \`${p.registration_number}\` - ${p.qualifications}`).join('\n') +
            `\n\n*Review their AI verification audit in the Doctor Verification section.*`);
    }

    return {
      action,
      success: true,
      reply,
      data: { pending_doctors: pending, doctors: pending },
      suggested_actions: ['View Doctor Verification', 'Hospital Analytics', 'Today Appointments']
    };
  }

  // Fallback
  return {
    action,
    success: false,
    reply: 'Unrecognized action request.'
  };
}
