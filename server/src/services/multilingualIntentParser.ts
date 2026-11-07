/**
 * CareSphere Multilingual Intent & Entity Parser
 * Resilient against typos, spelling errors, mixed languages (Tanglish, Hinglish, Tenglish),
 * and conversational follow-up references.
 */

export interface ParsedIntent {
  intent: 
    | 'SHOW_MY_APPOINTMENTS'
    | 'BOOK_APPOINTMENT'
    | 'CANCEL_APPOINTMENT'
    | 'RESCHEDULE_APPOINTMENT'
    | 'SHOW_MEDICAL_RECORDS'
    | 'SHOW_AVAILABLE_MEDICINES'
    | 'EXPLAIN_MEDICAL_REPORT'
    | 'EMERGENCY_SOS'
    | 'SHOW_DOCTOR_APPOINTMENTS'
    | 'SHOW_PENDING_DOCTORS'
    | 'CONFIRM_ACTION'
    | 'REJECT_ACTION'
    | 'GENERAL_CONVERSATION';
  confidence: number;
  entities: {
    doctor_name?: string;
    specialization?: string;
    index?: number;
    target_index?: number; // 0-based index compatibility
    date?: string;
    time?: string;
    medicine_name?: string;
  };
}

// Normalized token cleanup
function normalizeTokens(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF\u0C00-\u0C7F\u0900-\u097F\u0D00-\u0D7F\u0C80-\u0CFF:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse user query to detect intent and extract actionable entities
 */
export function parseMultilingualIntent(text: string): ParsedIntent {
  const norm = normalizeTokens(text);
  const entities: ParsedIntent['entities'] = {};

  // 1. EXTRACT ENTITIES: Index extraction (check 2nd & 3rd before 1st/one)
  if (
    /\b(2nd|second|two|dusra|irandavathu|rendavathu|rendodi|randaam)\b/.test(norm) ||
    norm.includes('இரண்டாவது') ||
    norm.includes('दूसरा') ||
    norm.includes('రెండవ')
  ) {
    entities.index = 2;
    entities.target_index = 1;
  } else if (
    /\b(3rd|third|three|teesra|moondravathu|moododi|moonnam)\b/.test(norm) ||
    norm.includes('மூன்றாவது') ||
    norm.includes('तीसरा')
  ) {
    entities.index = 3;
    entities.target_index = 2;
  } else if (
    /\b(1st|first|pehla|mudhal|modhati|onnam)\b/.test(norm) ||
    norm.includes('முதல்') ||
    norm.includes('पहला') ||
    norm.includes('మొదటి') ||
    (/\b(one)\b/.test(norm) && !norm.includes('second') && !norm.includes('third'))
  ) {
    entities.index = 1;
    entities.target_index = 0;
  }

  // 2. EXTRACT ENTITIES: Doctor name
  // First look for explicit "dr. <name>" or "dr <name>"
  const drMatch = norm.match(/\bdr\.?\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (drMatch && drMatch[1]) {
    const rawCandidate = drMatch[1].trim();
    const candidate = rawCandidate.replace(/\s+(appointment|on|at|ko|kude|kitta|gari|se|kooda|tomorrow|today|naale|kal|repu)$/i, '').trim();
    if (candidate && !['appointment', 'visit', 'booking', 'slot', 'consultation'].includes(candidate)) {
      entities.doctor_name = candidate;
    }
  }

  // If no "dr <name>", look for generic "doctor / docter / daktar / maruthuvar <name>"
  if (!entities.doctor_name) {
    const genericMatches = Array.from(norm.matchAll(/(?:doctor|docter|daktar|maruthuvar)\s+([a-z]+(?:\s+[a-z]+)?)/gi));
    for (const m of genericMatches) {
      const rawCandidate = m[1].trim();
      const firstWord = rawCandidate.split(' ')[0];
      if (!['appointment', 'appointments', 'visit', 'booking', 'slot', 'consultation', 'ko', 'kude', 'kitta', 'gari', 'se', 'the', 'my', 'eduka'].includes(firstWord)) {
        const candidate = rawCandidate.replace(/\s+(appointment|on|at|ko|kude|kitta|gari|se|kooda|tomorrow|today|naale|kal|repu)$/i, '').trim();
        if (candidate) {
          entities.doctor_name = candidate;
          break;
        }
      }
    }
  }

  // 3. EXTRACT ENTITIES: Specialization
  const specKeywords: Record<string, string> = {
    cardio: 'Cardiology',
    heart: 'Cardiology',
    neuro: 'Neurology',
    ortho: 'Orthopedics',
    bone: 'Orthopedics',
    derm: 'Dermatology',
    skin: 'Dermatology',
    pedia: 'Pediatrics',
    child: 'Pediatrics',
    gyn: 'Gynecology',
    women: 'Gynecology',
    dental: 'Dentistry',
    teeth: 'Dentistry',
    eye: 'Ophthalmology'
  };
  for (const [kw, spec] of Object.entries(specKeywords)) {
    if (norm.includes(kw)) {
      entities.specialization = spec;
      break;
    }
  }

  // 4. EXTRACT ENTITIES: Date & Time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const todayStr = new Date().toISOString().split('T')[0];

  if (/\b(tomorrow|kal|naale|naalai|repu|nale)\b/.test(norm) || norm.includes('நாளை') || norm.includes('कल') || norm.includes('రేపు')) {
    entities.date = tomorrowStr;
  } else if (/\b(today|aaj|inniku|eeroju|ivathu)\b/.test(norm) || norm.includes('இன்று') || norm.includes('आज') || norm.includes('ఈరోజు')) {
    entities.date = todayStr;
  } else {
    // Check for explicit YYYY-MM-DD
    const dateMatch = norm.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      entities.date = dateMatch[1];
    }
  }

  const timeMatch = norm.match(/\b(0?[1-9]|1[0-2])(?::([0-5][0-9]))?\s*(am|pm)\b/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] || '00';
    const ampm = timeMatch[3].toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    entities.time = `${String(hour).padStart(2, '0')}:${minute}`;
  } else if (norm.includes('morning') || norm.includes('kaalai') || norm.includes('subah') || norm.includes('udayam')) {
    entities.time = '10:00';
  } else if (norm.includes('afternoon') || norm.includes('madhyanam') || norm.includes('dopahar')) {
    entities.time = '14:30';
  } else if (norm.includes('evening') || norm.includes('maalaai') || norm.includes('shaam') || norm.includes('sayantram')) {
    entities.time = '17:00';
  }

  // 5. EXTRACT ENTITIES: Medicine name
  const medNames = ['paracetamol', 'amoxicillin', 'azithromycin', 'metformin', 'pantoprazole', 'atorvastatin', 'cetirizine', 'ibuprofen', 'aspirin', 'dolo'];
  for (const m of medNames) {
    if (norm.includes(m)) {
      entities.medicine_name = m;
      break;
    }
  }

  // 6. CONFIRMATION CHECK
  if (
    (/\b(yes|confirm|confirmed|proceed|ok|sure|yeah|yep|haa|haan|theek hai|aam|sari|avunu|sare|houdu)\b/i.test(norm) &&
      !/\b(no|not|dont|never|nahi|illa|illai|vendaam|kaadhu|vaddu)\b/i.test(norm)) ||
    norm === 'ஆம்' ||
    norm === 'हाँ' ||
    norm === 'అవును' ||
    norm.includes('yes cancel') ||
    norm.includes('haan cancel') ||
    norm.includes('yes please') ||
    norm.includes('please confirm') ||
    norm.includes('confirm pannunga') ||
    norm.includes('haan kardo')
  ) {
    return { intent: 'CONFIRM_ACTION', confidence: 0.95, entities };
  }

  // 7. REJECTION / ABORTION CHECK
  if (
    /\b(no|dont|stop|abort|never mind|dont cancel|nahi|illa|illai|vendaam|kaadhu|vaddu)\b/i.test(norm) ||
    norm === 'இல்லை' ||
    norm === 'नहीं' ||
    norm === 'వద్దు' ||
    norm.includes('dont cancel') ||
    norm.includes('nahi karo') ||
    norm.includes('mat karo')
  ) {
    return { intent: 'REJECT_ACTION', confidence: 0.95, entities };
  }

  // 8. EMERGENCY SOS
  if (
    /\b(emergency|sos|heart attack|chest pain|cannot breathe|bleeding|stroke|choking)\b/.test(norm) ||
    norm.includes('நெஞ்சு வலி') ||
    norm.includes('சீने में दर्द') ||
    norm.includes('గుండె నొప్పి') ||
    norm.includes('ఆపాతకాల') ||
    norm.includes('அவசரம்')
  ) {
    return { intent: 'EMERGENCY_SOS', confidence: 0.98, entities };
  }

  // 9. CANCEL APPOINTMENT INTENT (Typos: cancl, cncl, cancil)
  if (
    /\b(cancel|cancl|cncl|cancil|delete|rathu|vendaam)\b/.test(norm) ||
    norm.includes('रद्द') ||
    norm.includes('कैंसल') ||
    norm.includes('ரத்து') ||
    norm.includes('రద్దు') ||
    (norm.includes('cancel') &&
      (norm.includes('appointment') ||
        norm.includes('one') ||
        norm.includes('second') ||
        norm.includes('first') ||
        entities.index !== undefined))
  ) {
    return { intent: 'CANCEL_APPOINTMENT', confidence: 0.92, entities };
  }

  // 10. RESCHEDULE APPOINTMENT INTENT
  if (
    /\b(reschedule|postpone|prepone|change time|change date|thethi maathu|samay badlo)\b/.test(norm) ||
    norm.includes('पुनર્નિર્ધારણ') ||
    norm.includes('రీషెడ్యూల్')
  ) {
    return { intent: 'RESCHEDULE_APPOINTMENT', confidence: 0.88, entities };
  }

  // 11. BOOK APPOINTMENT INTENT (Typos: bok, buk, boking, apointmnt, doctar)
  if (
    (/\b(book|boking|bok|buk|schedule|fix|reserve|need|want|venum|chahiye|kavali|madbeku)\b/.test(norm) &&
      /\b(appointment|apointmnt|apointment|doctor|docter|daktar|visit|slot|consultation|specialist|specialist)\b/.test(norm)) ||
    norm.includes('முன்பதிவு') ||
    norm.includes('புக்கிங்') ||
    norm.includes('பண்ணு') ||
    norm.includes('बुक') ||
    norm.includes('బుక్') ||
    norm.includes('doctor se milna') ||
    norm.includes('doctor kude') ||
    norm.includes('appointment book') ||
    (norm.includes('appointment') && norm.includes('book'))
  ) {
    return { intent: 'BOOK_APPOINTMENT', confidence: 0.90, entities };
  }

  // 12. SHOW APPOINTMENTS INTENT (Typos: apointment, appts)
  if (
    (/\b(show|check|view|list|my|upcoming|dikhao|kaatu|kaatunga|chupinchu|torsi|kaanikku)\b/.test(norm) &&
      /\b(appointment|appointments|apointment|apointmnt|appts|status|schedule|shedule)\b/.test(norm)) ||
    norm.includes('अपॉइंटमेंट दिखाओ') ||
    norm.includes('அப்பாய்ன்ட்மென்ட் காட்டு') ||
    norm.includes('அப்பாய்ன்ட்மென்ட்') ||
    norm.includes('అపాయింట్‌మెంట్లు') ||
    norm === 'show my appointments' ||
    norm === 'my appointments' ||
    norm === 'appointments'
  ) {
    return { intent: 'SHOW_MY_APPOINTMENTS', confidence: 0.92, entities };
  }

  // 13. MEDICAL RECORDS INTENT
  if (
    (/\b(records|record|reports|report|document|documents|parcha|lab results|files)\b/.test(norm) &&
      /\b(show|view|my|my records|dikhao|kaatu|chupinchu)\b/.test(norm)) ||
    norm.includes('மருத்துவ அறிக்கை') ||
    norm.includes('मेडिकल रिकॉर्ड') ||
    norm.includes('మెడికల్ రికార్డులు') ||
    norm.includes('report dikhao') ||
    norm.includes('records kaatunga') ||
    norm === 'show my medical records' ||
    norm === 'medical records'
  ) {
    return { intent: 'SHOW_MEDICAL_RECORDS', confidence: 0.88, entities };
  }

  // 14. EXPLAIN REPORT INTENT
  if (
    /\b(explain|understand|meaning|hba1c|glucose|biomarker|samjhao|vilakkam|ardham)\b/.test(norm) &&
    (norm.includes('report') || norm.includes('test') || norm.includes('result') || norm.includes('val') || norm.includes('sugar') || norm.includes('bp'))
  ) {
    return { intent: 'EXPLAIN_MEDICAL_REPORT', confidence: 0.86, entities };
  }

  // 15. PHARMACY MEDICINES INTENT
  if (
    /\b(medicine|medicines|medisin|drug|drugs|dawa|dawai|marunthu|mandulu|aushadh|pharmacy|stock|available|availability)\b/.test(norm)
  ) {
    return { intent: 'SHOW_AVAILABLE_MEDICINES', confidence: 0.84, entities };
  }

  // 16. DOCTOR SCHEDULE
  if (norm.includes('patient schedule') || norm.includes('my opd') || norm.includes('my patients') || norm.includes('today schedule')) {
    return { intent: 'SHOW_DOCTOR_APPOINTMENTS', confidence: 0.88, entities };
  }

  // 17. ADMIN INTENTS
  if (norm.includes('pending doctor') || norm.includes('pending applications') || norm.includes('pending registration') || norm.includes('pending registrations')) {
    return { intent: 'SHOW_PENDING_DOCTORS', confidence: 0.90, entities };
  }

  return { intent: 'GENERAL_CONVERSATION', confidence: 0.5, entities };
}
