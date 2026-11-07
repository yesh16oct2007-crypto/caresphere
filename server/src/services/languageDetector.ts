/**
 * CareSphere Multilingual Language & Dialect Detector
 * Supports native scripts & transliterated Roman scripts (Tanglish, Hinglish, Tenglish, Manglish, Kanglish)
 */

export interface DetectedLanguage {
  lang: 'en' | 'ta' | 'hi' | 'te' | 'kn' | 'ml' | 'bn' | 'mr' | 'gu' | 'pa';
  name: string;
  isTransliterated: boolean;
  script: 'native' | 'latin';
}

const SCRIPT_RANGES: Record<string, { regex: RegExp; lang: DetectedLanguage['lang']; name: string }> = {
  tamil: { regex: /[\u0B80-\u0BFF]/, lang: 'ta', name: 'Tamil' },
  telugu: { regex: /[\u0C00-\u0C7F]/, lang: 'te', name: 'Telugu' },
  kannada: { regex: /[\u0C80-\u0CFF]/, lang: 'kn', name: 'Kannada' },
  malayalam: { regex: /[\u0D00-\u0D7F]/, lang: 'ml', name: 'Malayalam' },
  bengali: { regex: /[\u0980-\u09FF]/, lang: 'bn', name: 'Bengali' },
  gujarati: { regex: /[\u0A80-\u0AFF]/, lang: 'gu', name: 'Gujarati' },
  punjabi: { regex: /[\u0A00-\u0A7F]/, lang: 'pa', name: 'Punjabi' },
  devanagari: { regex: /[\u0900-\u097F]/, lang: 'hi', name: 'Hindi' }
};

// Transliterated keyword patterns (written in English alphabets)
const TRANSLITERATION_PATTERNS: Record<DetectedLanguage['lang'], string[]> = {
  hi: [
    'karna hai', 'dikhao', 'mera', 'meri', 'mere', 'dawa', 'dawai', 'apna', 'doctor ko', 'humein',
    'kya', 'nahi', 'kardo', 'chahiye', 'kaise', 'kab', 'batayein', 'batao', 'aaj', 'kal', 'parcha',
    'mujhe', 'kripya', 'dekho', 'bimar', 'dard', 'sehat', 'haalat', 'karein', 'puchna', 'theek'
  ],
  ta: [
    'ennoda', 'ungaloda', 'marunthu', 'maruthuvar', 'venum', 'kaatunga', 'kaatu', 'eppadi', 'solunga',
    'iruku', 'mudiyuma', 'pannunga', 'thethi', 'neram', 'valikuthu', 'valikudhu', 'udhavi', 'theriyuma',
    'paakanum', 'pakanum', 'doctor kitta', 'appointment eduka', 'rathu', 'vendaam', 'aam', 'illa'
  ],
  te: [
    'naaku', 'cheyandi', 'mandulu', 'eppudu', 'ela', 'chupinchu', 'chudu', 'doctor gari', 'undha',
    'kavali', 'noppi', 'kudaradhu', 'marchandi', 'avunu', 'kaadhu', 'sahayam', 'theeyandi', 'ivvandi'
  ],
  ml: [
    'ente', 'enthu', 'marunnu', 'kaanikku', 'eppo', 'parayamo', 'venam', 'doctorude', 'vedhana',
    'aashupathri', 'undoo', 'chodhikkan', 'sahayam', 'aano', 'venda'
  ],
  kn: [
    'nanna', 'nange', 'madbeku', 'thogobeku', 'hege', 'yavaga', 'torsi', 'beku', 'aushadhi',
    'novvu', 'doctor kade', 'heli', 'illa', 'houdu', 'madona'
  ],
  bn: [
    'aamar', 'daktar', 'dekhun', 'oshudh', 'kobe', 'kothay', 'kemon', 'dorkar', 'shomosya', 'bolun'
  ],
  mr: [
    'majhe', 'aushadh', 'dakhva', 'kashi', 'kadhi', 'sangave', 'tras', 'havay', 'nakoy', 'dava'
  ],
  gu: [
    'maru', 'dava', 'batavo', 'kyare', 'kevi', 'doktar', 'dukhavo', 'madad', 'joie'
  ],
  pa: [
    'mera', 'meri', 'dawai', 'dasso', 'kado', 'kivein', 'takleef', 'madad', 'chahidi'
  ],
  en: []
};

/**
 * Detect language from message text with script and transliteration detection
 */
export function detectLanguage(
  text: string,
  preferredFallback: DetectedLanguage['lang'] = 'en'
): DetectedLanguage {
  if (!text || typeof text !== 'string') {
    return { lang: preferredFallback, name: 'English', isTransliterated: false, script: 'latin' };
  }

  const cleanText = text.trim();

  // 1. Check Unicode native scripts first
  for (const [scriptName, entry] of Object.entries(SCRIPT_RANGES)) {
    if (entry.regex.test(cleanText)) {
      return {
        lang: entry.lang,
        name: entry.name,
        isTransliterated: false,
        script: 'native'
      };
    }
  }

  // 2. Check transliterated Roman script (Tanglish, Hinglish, etc.)
  const lowerText = cleanText.toLowerCase();

  for (const [langKey, keywords] of Object.entries(TRANSLITERATION_PATTERNS)) {
    const lang = langKey as DetectedLanguage['lang'];
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        const langNames: Record<string, string> = {
          hi: 'Hindi (Hinglish)',
          ta: 'Tamil (Tanglish)',
          te: 'Telugu (Tenglish)',
          kn: 'Kannada (Kanglish)',
          ml: 'Malayalam (Manglish)',
          bn: 'Bengali',
          mr: 'Marathi',
          gu: 'Gujarati',
          pa: 'Punjabi',
          en: 'English'
        };
        return {
          lang,
          name: langNames[lang] || 'English',
          isTransliterated: true,
          script: 'latin'
        };
      }
    }
  }

  // 3. Fallback to user preferred language
  const languageNames: Record<string, string> = {
    en: 'English',
    ta: 'Tamil',
    hi: 'Hindi',
    te: 'Telugu',
    kn: 'Kannada',
    ml: 'Malayalam',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati',
    pa: 'Punjabi'
  };

  return {
    lang: preferredFallback,
    name: languageNames[preferredFallback] || 'English',
    isTransliterated: false,
    script: 'latin'
  };
}
