export type InputLanguage = 'en' | 'he' | 'es';

export const detectInputLanguage = (text: string): InputLanguage => {
  // Hebrew Unicode range
  if (/[\u0590-\u05FF]/.test(text)) return 'he';
  // Spanish specific characters
  if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text)) return 'es';
  // Default to English
  return 'en';
};
