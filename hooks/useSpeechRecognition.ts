import { useState, useEffect, useRef } from 'react';

// FIX: Add comprehensive type definitions for the Web Speech API to resolve TypeScript errors,
// as these are not yet part of the standard DOM library typings.
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

// Polyfill for browsers that might have prefixed versions
// FIX: Cast `window` to `any` to access non-standard, vendor-prefixed properties
// and apply the correct type to the `SpeechRecognition` constant.
const SpeechRecognition: SpeechRecognitionStatic | undefined = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// Language codes for speech recognition
const LANGUAGE_CODES = {
  en: 'en-US',
  he: 'he-IL', 
  es: 'es-ES'
} as const;

// Language detection patterns (enhanced heuristics)
const LANGUAGE_PATTERNS = {
  he: /[\u0590-\u05FF\u200F\u200E]/,  // Hebrew Unicode range + RTL marks
  es: /[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/,         // Spanish specific characters
  en: /^[a-zA-Z\s.,!?'-]+$/           // English (fallback)
};

// Common words for better language detection
const LANGUAGE_WORDS = {
  he: ['של', 'את', 'על', 'אני', 'זה', 'לא', 'כל', 'יש', 'היה', 'עם', 'או', 'אם', 'רק', 'גם', 'כמו', 'אבל', 'מה', 'איך', 'למה', 'איפה', 'מתי', 'מי'],
  es: ['de', 'la', 'que', 'el', 'en', 'y', 'a', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'un', 'una'],
  en: ['the', 'of', 'and', 'to', 'in', 'is', 'you', 'that', 'it', 'he', 'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'i', 'at', 'be', 'this', 'have', 'from']
};

type Language = 'en' | 'he' | 'es';

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<Language>('en');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentLanguageRef = useRef<Language>('en');

  // Enhanced function to detect language from text
  const detectLanguage = (text: string): Language => {
    const cleanText = text.toLowerCase().trim();
    
    // Check for Hebrew characters first (most distinctive)
    if (LANGUAGE_PATTERNS.he.test(text)) {
      console.log('Hebrew detected by characters:', text);
      return 'he';
    }
    
    // Check for Spanish characters
    if (LANGUAGE_PATTERNS.es.test(text)) {
      console.log('Spanish detected by characters:', text);
      return 'es';
    }
    
    // Check for common words in each language
    const words = cleanText.split(/\s+/);
    let hebrewScore = 0;
    let spanishScore = 0;
    let englishScore = 0;
    
    words.forEach(word => {
      if (LANGUAGE_WORDS.he.includes(word)) hebrewScore++;
      if (LANGUAGE_WORDS.es.includes(word)) spanishScore++;
      if (LANGUAGE_WORDS.en.includes(word)) englishScore++;
    });
    
    console.log('Language scores:', { he: hebrewScore, es: spanishScore, en: englishScore });
    
    // Return language with highest score
    if (hebrewScore > spanishScore && hebrewScore > englishScore) return 'he';
    if (spanishScore > englishScore) return 'es';
    
    return 'en'; // Default fallback
  };

  // Function to create recognition instance with specific language
  const createRecognition = (language: Language) => {
    if (!SpeechRecognition) return null;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_CODES[language];
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          // Detect language from final transcript
          const detectedLang = detectLanguage(transcript);
          if (detectedLang !== currentLanguageRef.current) {
            console.log(`Language detected: ${detectedLang}, switching from ${currentLanguageRef.current}`);
            setDetectedLanguage(detectedLang);
            currentLanguageRef.current = detectedLang;
            // Restart recognition with new language
            setTimeout(() => {
              if (isListening) {
                recognition.stop();
                startWithLanguage(detectedLang);
              }
            }, 100);
            return;
          }
        } else {
          interimTranscript += transcript;
        }
      }
      
      if (finalTranscript) {
        setTranscript(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('Speech recognition error:', event.error);
      setError(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return recognition;
  };

  // Function to start recognition with specific language
  const startWithLanguage = (language: Language) => {
    const recognition = createRecognition(language);
    if (recognition) {
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    }
  };

  useEffect(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = (preferredLanguage: Language = 'en') => {
    if (!isListening) {
      setTranscript(''); // Clear previous transcript
      setDetectedLanguage(preferredLanguage);
      currentLanguageRef.current = preferredLanguage;
      
      // Try multi-language recognition for better detection
      const multiLangCode = `${LANGUAGE_CODES[preferredLanguage]},${LANGUAGE_CODES.en},${LANGUAGE_CODES.he},${LANGUAGE_CODES.es}`;
      
      if (!SpeechRecognition) return;
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = multiLangCode; // Set multiple languages
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            
            // Detect language from final transcript
            const detectedLang = detectLanguage(transcript);
            console.log(`Detected language: ${detectedLang} from text: "${transcript}"`);
            
            if (detectedLang !== currentLanguageRef.current) {
              console.log(`Language changed from ${currentLanguageRef.current} to ${detectedLang}`);
              setDetectedLanguage(detectedLang);
              currentLanguageRef.current = detectedLang;
            }
          }
        }
        
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error:', event.error);
        setError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      setError(null);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { 
    isListening, 
    transcript, 
    error, 
    detectedLanguage,
    startListening, 
    stopListening, 
    hasRecognitionSupport: !!SpeechRecognition 
  };
};
