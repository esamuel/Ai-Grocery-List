
import React, { useState, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { MicIcon } from './icons/MicIcon';

interface ItemInputProps {
  onAddItem: (itemText: string) => Promise<boolean>;
  isProcessing: boolean;
  language: 'en' | 'he' | 'es';
  placeholders: {
    main: string;
    adding: string;
    add: string;
  }
}

export const ItemInput: React.FC<ItemInputProps> = ({ onAddItem, isProcessing, language, placeholders }) => {
  const [inputValue, setInputValue] = useState('');
  const { isListening, transcript, detectedLanguage, startListening, stopListening, hasRecognitionSupport } = useSpeechRecognition();
  const [voiceSession, setVoiceSession] = useState(false);

  // Normalize voice/typed input:
  // - collapse duplicate tokens like "milk milk" -> "milk"
  // - split by commas and common conjunctions (and/ו/y)
  // - trim punctuation, dedupe items, preserve original order
  const segmentAndClean = (raw: string): string => {
    if (!raw) return '';
    let text = raw
      .replace(/[\u200E\u200F]/g, '') // bidi marks
      .replace(/\s*,\s*/g, ', ')      // normalize commas
      .replace(/\s+/g, ' ')            // collapse spaces
      .trim();

    // Remove immediate duplicated words (e.g., "milk milk meat")
    text = text.replace(/\b(\w+)(\s+\1)+\b/gi, '$1');

    // Split by commas or language-specific conjunctions
    const parts = text
      .split(/,|\band\b|\bwith\b|\by\b|\sו\s/gi)
      .map(p => p.replace(/[.!?;:\-]+$/g, '').trim())
      .filter(p => p.length > 0);

    // Dedupe while preserving order (case-insensitive compare)
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const p of parts) {
      const key = p.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(p);
      }
    }
    return unique.join(', ');
  };

  useEffect(() => {
    if (voiceSession) {
      // Replace the input with the cleaned transcript instead of appending,
      // because `transcript` already accumulates and appending causes repeats.
      const cleaned = segmentAndClean(transcript);
      setInputValue(cleaned);
    }
  }, [transcript, voiceSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = segmentAndClean(inputValue);
    if (cleaned && !isProcessing) {
      const success = await onAddItem(cleaned);
      if (success) {
        setInputValue('');
      }
    }
  };
  
  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setVoiceSession(true);
      startListening(language);
    }
  };

  // When mic stops after a voice session, auto-add the captured text
  useEffect(() => {
    const autoSubmit = async () => {
      if (!isListening && voiceSession) {
        const cleaned = segmentAndClean(inputValue);
        if (cleaned && !isProcessing) {
          const ok = await onAddItem(cleaned);
          if (ok) setInputValue('');
        }
        setVoiceSession(false);
      }
    };
    void autoSubmit();
  }, [isListening]);

  return (
    <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom">
      {/* Form with optimal responsive design for all phone sizes */}
      <form onSubmit={handleSubmit} className="w-full flex items-center gap-0.5 sm:gap-1 md:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 max-w-full lg:max-w-3xl lg:mx-auto">
        {/* Input Field - Responsive across all sizes */}
        {/* Note: text-base (16px) on mobile prevents iOS auto-zoom on focus */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholders.main}
          className="flex-grow bg-gray-100 border border-gray-300 rounded-full py-1.5 sm:py-2 md:py-3 px-3 sm:px-4 md:px-6 text-base sm:text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
          disabled={isProcessing}
        />
        
        {/* Mic Button - Responsive sizing */}
        {hasRecognitionSupport && (
          <div className="flex-shrink-0 flex items-center gap-0.5 sm:gap-1">
            {isListening && detectedLanguage && (
              <span className="text-xs bg-blue-100 text-blue-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium whitespace-nowrap text-2xs sm:text-xs">
                {detectedLanguage.toUpperCase()}
              </span>
            )}
            <button
              type="button"
              onClick={handleMicClick}
              className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-colors duration-200 ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              disabled={isProcessing}
              title={isListening ? `Listening in ${detectedLanguage.toUpperCase()}` : 'Start voice input'}
            >
              <MicIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </div>
        )}
        
        {/* Add/Submit Button - Fully responsive */}
        <button
          type="submit"
          className="flex-shrink-0 bg-blue-500 text-white font-semibold py-1.5 sm:py-2 md:py-3 px-2.5 sm:px-4 md:px-6 rounded-full hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base whitespace-nowrap"
          disabled={isProcessing || !inputValue.trim()}
        >
          {isProcessing ? placeholders.adding : placeholders.add}
        </button>
      </form>
    </div>
  );
};
