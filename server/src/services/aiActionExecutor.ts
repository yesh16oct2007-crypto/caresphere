import { db } from '../db/database.js';
import { createNotification } from './notificationService.js';
import { SessionContext } from './conversationMemory.js';

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

// Multilingual labels for action replies
const ACTION_STRINGS: Record<string, Record<string, string>> = {
  login_required: {
    en: 'Please log in to your CareSphere account to access your personal records, appointments, or medical actions.',
    ta: 'உங்கள் அப்பாய்ன்ட்மென்ட் அல்லது மருத்துவ பதிவுகளைப் பார்க்க தயவுசெய்து உங்கள் கணக்கில் உள்நுழையவும்.',
    hi: 'अपनी व्यक्तिगत अपॉइंटमेंट या मेडिकल रिकॉर्ड देखने के लिए कृपया अपने केयरस्फ़ीयर खाते में लॉगिन करें।',
    te: 'మీ అపాయింట్‌మెంట్లు లేదా మెడికల్ రికార్డులను చూడటానికి దయచేసి లాగిన్ అవ్వండి.',
    kn: 'ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಅಥವಾ ಮೆಡಿಕಲ್ ರೆಕಾರ್ಡ್ ನೋಡಲು ದಯವಿಟ್ಟು ಲಾಗಿನ್ ಆಗಿ.',
    ml: 'നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റുകൾ കാണാൻ ദയവായി ലോഗിൻ ചെയ്യുക.'
  },
  no_appointments: {
    en: 'You do not have any active appointments scheduled at this moment. You can book an appointment with our specialists anytime!',
    ta: 'தற்போது உங்களுக்கு எந்த ஒரு அப்பாய்ன்ட்மென்ட்டும் இல்லை. எங்கள் சிறப்பு மருத்துவரிடம் நீங்கள் எப்போது வேண்டுமானாலும் முன்பதிவு செய்யலாம்!',
    hi: 'वर्तमान में आपकी कोई आगामी अपॉइंटमेंट निर्धारित नहीं है। आप जब चाहें हमारे विशेषज्ञों के साथ अपॉइंटमेंट बुक कर सकते हैं!',
    te: 'ప్రస్తుతం మీకు ఎలాంటి అపాయింట్‌మెంట్‌లు షెడ్యూల్ చేయబడలేదు. మీరు ఎప్పుడైనా వైద్యుడిని బుక్ చేసుకోవచ్చు!',
    kn: 'ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಯಾವುದೇ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್‌ಗಳಿಲ್ಲ. ನೀವು ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ತಜ್ಞ ವೈದ್ಯರನ್ನು ಬುಕ್ ಮಾಡಬಹುದು!',
    ml: 'നിലവിൽ നിങ്ങൾക്ക് അപ്പോയിന്റ്മെന്റുകൾ ഒന്നും ഷെഡ്യൂൾ ചെയ്തിട്ടില്ല.'
  },
  cancelled_success: {
    en: 'Your appointment has been successfully cancelled. A confirmation notification has been sent.',
    ta: 'உங்கள் அப்பாய்ன்ட்மென்ட் வெற்றிகரமாக ரத்து செய்யப்பட்டது. உறுதிப்படுத்தல் அறிவிப்பு அனுப்பப்பட்டுள்ளது.',
    hi: 'आपकी अपॉइंटमेंट सफलतापूर्वक रद्द कर दी गई है। पुष्टि सूचना भेज दी गई है।',
    te: 'మీ అపాయింట్‌మెంట్ విజయవంతంగా రద్దు చేయబడింది.',
    kn: 'ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಯಶಸ್ವಿಯಾಗಿ ರದ್ದುಗೊಂಡಿದೆ.',
    ml: 'നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് വിജയകരമായി റദ്ദാക്കി.'
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
  const langKey = ACTION_STRINGS.login_required[language] ? language : 'en';

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
    } else {
      reply = `Here are your upcoming appointments (${appointments.length}):\n\n` +
        appointments.map((a, i) => `${i + 1}. **Dr. ${a.doctor_name}** (${a.specialization})\n   • **Date & Time:** ${a.appointment_date} at ${a.appointment_time}\n   • **Hospital:** ${a.hospital_name || 'CareSphere'} (${a.floor}, ${a.room_number})\n   • **Type:** ${a.consultation_type === 'online_video' ? 'Online Teleconsult' : 'In-Person OPD'}\n   • **Reference No:** \`${a.reference_no}\``).join('\n\n') +
        `\n\n💡 *To cancel or reschedule, reply with "Cancel the 1st one" or "Cancel Dr. ${appointments[0].doctor_name}".*`;
    }

    return {
      action,
      success: true,
      reply,
      data: { appointments },
      updated_context: {
        referenced_appointments: referencedList
      },
      suggested_actions: appointments.length > 1
        ? ['Cancel 1st Appointment', 'Cancel 2nd Appointment', 'Reschedule', 'Book New Doctor']
        : ['Cancel Appointment', 'Reschedule', 'View Medical Records']
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
      return {
        action,
        success: false,
        reply: langKey === 'ta'
          ? 'ரத்து செய்வதற்கு எந்த ஒரு அப்பாய்ன்ட்மென்ட்டும் காணப்படவில்லை. உங்கள் அப்பாய்ன்ட்மென்ட்களைப் பார்க்க "Show my appointments" என்று சொல்லுங்கள்.'
          : langKey === 'hi'
          ? 'रद्द करने के लिए कोई सक्रिय अपॉइंटमेंट नहीं मिली। अपने अपॉइंटमेंट्स देखने के लिए "मेरी अपॉइंटमेंट दिखाओ" कहें।'
          : 'Could not find an active appointment to cancel. Say "Show my appointments" to view your scheduled visits.',
        suggested_actions: ['Show my appointments', 'Book Doctor Appointment']
      };
    }

    // Check if confirmation was given or if we should confirm first
    if (!params.confirmed) {
      return {
        action,
        success: true,
        requires_confirmation: true,
        reply: langKey === 'ta'
          ? `நீங்கள் Dr. ${targetDocName} உடனான அப்பாய்ன்ட்மென்ட்டை ரத்து செய்ய விரும்புகிறீர்களா? உறுதிப்படுத்த **"ஆம், ரத்து செய்"** அல்லது **"இல்லை"** என்று கூறவும்.`
          : langKey === 'hi'
          ? `क्या आप Dr. ${targetDocName} के साथ अपनी अपॉइंटमेंट रद्द करना चाहते हैं? कृपया पुष्टि करने के लिए **"हाँ, रद्द करें"** या **"नहीं"** कहें।`
          : `Are you sure you want to cancel your appointment with Dr. ${targetDocName}? Reply **"Yes, cancel"** to confirm or **"No"** to keep it.`,
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
      suggested_actions: ['Book Another Appointment', 'Show My Appointments', 'Home']
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

    // If no specific doctor found, present options
    if (!doctor) {
      const availableDocs = db.prepare(`
        SELECT dp.id, u.name, dp.specialization, dp.consultation_fee, dp.room_number, dp.floor, dp.hospital_id
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE dp.verification_status IN ('verified', 'approved') AND (? IS NULL OR dp.hospital_id = ?)
        LIMIT 3
      `).all(hospId, hospId) as any[];

      const reply = langKey === 'ta'
        ? `எந்த மருத்துவரிடம் முன்பதிவு செய்ய விரும்புகிறீர்கள்? கிடைக்கக்கூடிய மருத்துவர்கள்:\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - கட்டணம்: ₹${d.consultation_fee}`).join('\n') +
          `\n\nஎடுத்துக்காட்டாக "Dr. ${availableDocs[0]?.name || 'Sharma'} உடன் நாளை 10 மணிக்கு முன்பதிவு செய்" என்று கூறவும்.`
        : langKey === 'hi'
        ? `आप किस डॉक्टर के साथ अपॉइंटमेंट बुक करना चाहते हैं? उपलब्ध विशेषज्ञ:\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - परामर्श शुल्क: ₹${d.consultation_fee}`).join('\n') +
          `\n\nउदाहरण के लिए "Dr. ${availableDocs[0]?.name || 'Sharma'} के साथ कल सुबह 10 बजे बुक करो" कहें।`
        : `Which doctor or specialty would you like to book? Here are available specialists in your hospital:\n\n` +
          availableDocs.map(d => `• **Dr. ${d.name}** (${d.specialization}) - Chamber: ${d.room_number} - Fee: ₹${d.consultation_fee}`).join('\n') +
          `\n\nReply with your preferred doctor and time (e.g. "Book Dr. ${availableDocs[0]?.name || 'Specialist'} for tomorrow at 10:00 AM").`;

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
    const bookingTime = params.time || '10:00';
    const consultationType = params.consultation_type || 'in_person';

    // Generate unique reference number
    const refNo = `CS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const effectiveHospId = doctor.hospital_id || hospId || 1;

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

      createNotification(
        user.id,
        'Appointment Confirmed',
        `Your appointment with Dr. ${doctor.name} on ${bookingDate} at ${bookingTime} is confirmed. Ref: ${refNo}`,
        { refNo, doctorName: doctor.name, date: bookingDate, time: bookingTime },
        'appointment'
      );

      const reply = langKey === 'ta'
        ? `✅ **அப்பாய்ன்ட்மென்ட் வெற்றிகரமாக பதிவு செய்யப்பட்டது!**\n\n• மருத்துவர்: **Dr. ${doctor.name}** (${doctor.specialization})\n• தேதி & நேரம்: **${bookingDate} @ ${bookingTime}**\n• அறை: **${doctor.floor}, ${doctor.room_number}**\n• ஆலோசனைக் கட்டணம்: **₹${doctor.consultation_fee}**\n• குறிப்பு எண்: \`${refNo}\``
        : langKey === 'hi'
        ? `✅ **अपॉइंटमेंट सफलतापूर्वक बुक हो गई है!**\n\n• डॉक्टर: **Dr. ${doctor.name}** (${doctor.specialization})\n• तारीख व समय: **${bookingDate} @ ${bookingTime}**\n• कमरा: **${doctor.floor}, ${doctor.room_number}**\n• शुल्क: **₹${doctor.consultation_fee}**\n• संदर्भ संख्या: \`${refNo}\``
        : `✅ **Appointment Successfully Booked!**\n\n• **Doctor:** Dr. ${doctor.name} (${doctor.specialization})\n• **Date & Time:** ${bookingDate} at ${bookingTime}\n• **Location:** ${doctor.floor}, ${doctor.room_number}\n• **Consultation Fee:** ₹${doctor.consultation_fee}\n• **Reference Number:** \`${refNo}\`\n\n*A confirmation notification has been sent to your dashboard.*`;

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
        suggested_actions: ['Show My Appointments', 'Hospital Directions', 'View Prescriptions']
      };
    } catch (bookingErr: any) {
      if (String(bookingErr).includes('UNIQUE constraint failed')) {
        return {
          action,
          success: false,
          reply: `The slot on ${bookingDate} at ${bookingTime} is already reserved. Please choose another time slot like 10:30 AM or 02:00 PM.`
        };
      }
      throw bookingErr;
    }
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
      return {
        action,
        success: true,
        reply: langKey === 'ta'
          ? 'உங்கள் கணக்கில் இன்னும் எந்த மருத்துவ ஆவணங்களும் பதிவேற்றப்படவில்லை. "Medical Records" பகுதியில் பதிவேற்றலாம்.'
          : langKey === 'hi'
          ? 'आपके खाते में अभी कोई मेडिकल रिकॉर्ड नहीं है। आप मेडिकल रिकॉर्ड्स टैब से रिपोर्ट अपलोड कर सकते हैं।'
          : 'You do not have any uploaded medical records yet. You can upload lab results, scans, and discharge summaries in the Medical Records section.',
        data: { records: [] },
        suggested_actions: ['Upload Medical Record', 'Book Lab Test', 'View Prescriptions']
      };
    }

    const reply = langKey === 'ta'
      ? `உங்கள் மருத்துவ ஆவணங்கள் (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}** (${r.document_type})\n   • தேதி: ${r.record_date} | கோப்பு: ${r.file_name}`).join('\n\n')
      : langKey === 'hi'
      ? `आपके मेडिकल रिकॉर्ड्स (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}** (${r.document_type})\n   • तारीख: ${r.record_date} | फ़ाइल: ${r.file_name}`).join('\n\n')
      : `Here are your recent digital medical records (${records.length}):\n\n` +
        records.map((r, i) => `${i + 1}. **${r.title}**\n   • Type: \`${r.document_type}\`\n   • Date: ${r.record_date}\n   • File: ${r.file_name} (${Math.round(r.file_size / 1024)} KB)`).join('\n\n') +
        `\n\n*All records are encrypted and compliant with ABDM standards.*`;

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
      return {
        action,
        success: true,
        reply: `No inventory match found for "${queryTerm || 'medicines'}". Our central pharmacy network is available 24/7.`,
        suggested_actions: ['Show All Medicines', 'Order Prescribed Medicines']
      };
    }

    const reply = `**Hospital Pharmacy Inventory (${medicines.length} in stock):**\n\n` +
      medicines.map(m => `• **${m.name}** (${m.generic_name} ${m.strength}) - ${m.dosage_form}\n  Price: ₹${m.selling_price} | Availability: ✅ In Stock (${m.stock_quantity} available)`).join('\n\n') +
      `\n\n*Only prescribed medications with valid doctor signature can be dispensed.*`;

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

    const reply = `**Dr. ${user.name}'s Upcoming Patient Schedule (${appts.length}):**\n\n` +
      (appts.length === 0 ? 'No patients scheduled for today or upcoming days.' : appts.map((a, i) => `${i + 1}. **${a.patient_name}** - ${a.appointment_date} @ ${a.appointment_time} (Status: ${a.status})`).join('\n'));

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

    const reply = `**Pending Doctor Credential Applications (${pending.length}):**\n\n` +
      (pending.length === 0
        ? '✅ All doctor applications are fully verified and approved. No pending reviews!'
        : pending.map((p, i) => `${i + 1}. **Dr. ${p.name}** (${p.specialization}) - Reg: \`${p.registration_number}\` - ${p.qualifications}`).join('\n') +
          `\n\n*Review their AI verification audit in the Doctor Verification section.*`);

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
