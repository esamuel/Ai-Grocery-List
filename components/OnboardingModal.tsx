import React, { useState } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'he' | 'es';
  translations: {
    welcome: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    step4Title: string;
    step4Desc: string;
    step5Title: string;
    step5Desc: string;
    step6Title: string;
    step6Desc: string;
    next: string;
    previous: string;
    getStarted: string;
    skip: string;
  };
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, language, translations }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const getGuideContent = () => {
    switch (language) {
      case 'he':
        return {
          quickStartTitle: "📝 שלבי התחלה מהירה:",
          step1Title: "הגדרת משתמש ראשי:",
          step1Content: "• צרו חשבון עם האימייל שלכם\n• אתם הופכים לבעלי הרשימה אוטומטית",
          step2Title: "הוספת בני משפחה:",
          step2Content: "• לחצו על כפתור \"הוסף משפחה\" (רק אתם רואים את זה)\n• הזינו כתובת אימייל של בן המשפחה\n• הם חייבים ליצור חשבון משלהם קודם",
          step3Title: "גישה לבני משפחה:",
          step3Content: "• בן המשפחה מתנתק ונכנס שוב\n• הם רואים אוטומטית את הרשימה המשותפת שלכם\n• שינויים מסתנכרנים מיידית בין כל המכשירים",
          step4Title: "התחלת קנייה ביחד:",
          step4Content: "• כל אחד יכול להוסיף/להשלים פריטים\n• פריטים שהושלמו עוברים אוטומטית למועדפים\n• השתמשו בקלט קולי בכל שפה",
          proTip: "💡 טיפ מקצועי:",
          proTipContent: "בני משפחה לא יראו את כפתור \"הוסף משפחה\" - רק אתם (הבעלים) יכולים להזמין אחרים. זה מונע בלבול ושומר על הרשימה מאורגנת!"
        };
      case 'es':
        return {
          quickStartTitle: "📝 Pasos de Inicio Rápido:",
          step1Title: "Configuración Usuario Principal:",
          step1Content: "• Crea cuenta con tu correo electrónico\n• Te conviertes en propietario de la lista automáticamente",
          step2Title: "Agregar Miembros de Familia:",
          step2Content: "• Haz clic en botón \"Agregar Familia\" (solo tú lo ves)\n• Ingresa dirección de correo del familiar\n• Deben crear su propia cuenta primero",
          step3Title: "Acceso de Miembros de Familia:",
          step3Content: "• El familiar cierra sesión y vuelve a entrar\n• Ven automáticamente tu lista compartida\n• Los cambios se sincronizan instantáneamente en todos los dispositivos",
          step4Title: "Comenzar a Comprar Juntos:",
          step4Content: "• Cualquiera puede agregar/completar artículos\n• Artículos completados se mueven automáticamente a favoritos\n• Usa entrada de voz en cualquier idioma",
          proTip: "💡 Consejo Pro:",
          proTipContent: "Los miembros de familia no verán el botón \"Agregar Familia\" - solo tú (el propietario) puedes invitar a otros. ¡Esto previene confusión y mantiene tu lista organizada!"
        };
      default: // English
        return {
          quickStartTitle: "📝 Quick Start Steps:",
          step1Title: "Main User Setup:",
          step1Content: "• Create account with your email\n• You become the list owner automatically",
          step2Title: "Add Family Members:",
          step2Content: "• Click \"Add Family\" button (only you see this)\n• Enter family member's email address\n• They must create their own account first",
          step3Title: "Family Member Access:",
          step3Content: "• Family member signs out and back in\n• They automatically see your shared list\n• Changes sync instantly between all devices",
          step4Title: "Start Shopping Together:",
          step4Content: "• Anyone can add/complete items\n• Completed items auto-move to favorites\n• Use voice input in any language",
          proTip: "💡 Pro Tip:",
          proTipContent: "Family members won't see the \"Add Family\" button - only you (the owner) can invite others. This prevents confusion and keeps your list organized!"
        };
    }
  };

  const steps = [
    {
      title: translations.step1Title,
      description: translations.step1Desc,
      icon: '🛒',
      image: '🎯'
    },
    {
      title: translations.step2Title,
      description: translations.step2Desc,
      icon: '🎤',
      image: '🗣️'
    },
    {
      title: translations.step3Title,
      description: translations.step3Desc,
      icon: '🤖',
      image: '📝'
    },
    {
      title: translations.step4Title,
      description: translations.step4Desc,
      icon: '👨‍👩‍👧‍👦',
      image: '🔗'
    },
    {
      title: translations.step5Title,
      description: translations.step5Desc,
      icon: '⭐',
      image: '💾'
    },
    {
      title: translations.step6Title,
      description: translations.step6Desc,
      icon: '📋',
      image: '🚀',
      isGuide: true
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    onClose();
  };

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-2xl p-6 w-full relative max-h-[90vh] overflow-y-auto ${currentStepData.isGuide ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* Skip button */}
        <button
          onClick={skipOnboarding}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-sm"
        >
          {translations.skip}
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {currentStep === 0 ? translations.welcome : currentStepData.title}
          </h1>
          {currentStep === 0 && (
            <p className="text-gray-600">{translations.subtitle}</p>
          )}
        </div>

        {/* Step content */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">{currentStepData.icon}</div>
          <div className="text-4xl mb-4">{currentStepData.image}</div>
          
          {currentStepData.isGuide ? (
            <div className="text-left space-y-4">
              <p className="text-gray-700 leading-relaxed mb-6 text-center">{currentStepData.description}</p>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-4 text-center">{getGuideContent().quickStartTitle}</h4>
                <div className="space-y-4 text-sm text-blue-700">
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1 flex-shrink-0">1</span>
                    <div>
                      <strong className="block mb-1">{getGuideContent().step1Title}</strong>
                      {getGuideContent().step1Content.split('\n').map((line, i) => (
                        <div key={i} className="mb-0.5">{line}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1 flex-shrink-0">2</span>
                    <div>
                      <strong className="block mb-1">{getGuideContent().step2Title}</strong>
                      {getGuideContent().step2Content.split('\n').map((line, i) => (
                        <div key={i} className="mb-0.5">{line}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1 flex-shrink-0">3</span>
                    <div>
                      <strong className="block mb-1">{getGuideContent().step3Title}</strong>
                      {getGuideContent().step3Content.split('\n').map((line, i) => (
                        <div key={i} className="mb-0.5">{line}</div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="bg-blue-200 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mt-1 flex-shrink-0">4</span>
                    <div>
                      <strong className="block mb-1">{getGuideContent().step4Title}</strong>
                      {getGuideContent().step4Content.split('\n').map((line, i) => (
                        <div key={i} className="mb-0.5">{line}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-green-800 text-sm text-center">
                  <strong>{getGuideContent().proTip}</strong> {getGuideContent().proTipContent}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 leading-relaxed">{currentStepData.description}</p>
          )}
        </div>

        {/* Progress indicators */}
        <div className="flex justify-center mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {translations.previous}
          </button>

          <button
            onClick={nextStep}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {currentStep === steps.length - 1 ? translations.getStarted : translations.next}
          </button>
        </div>
      </div>
    </div>
  );
};
