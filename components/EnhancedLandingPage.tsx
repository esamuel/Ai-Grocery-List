import React, { useState } from 'react';
import { AppScreenshot } from './AppScreenshots';

interface EnhancedLandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  language: 'en' | 'he' | 'es' | 'ru';
  onLanguageChange: (lang: 'en' | 'he' | 'es' | 'ru') => void;
}

export const EnhancedLandingPage: React.FC<EnhancedLandingPageProps> = ({
  onGetStarted,
  onLogin,
  language,
  onLanguageChange
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePricingPlan, setActivePricingPlan] = useState<'monthly' | 'yearly'>('monthly');

  const translations = {
    en: {
      nav: {
        home: 'Home',
        features: 'Features',
        pricing: 'Pricing',
        about: 'About',
        faq: 'FAQ',
        contact: 'Contact',
        login: 'Login',
        getStarted: 'Get Started Free'
      },
      hero: {
        title: 'Smart Grocery Shopping Made Simple',
        subtitle: 'AI-powered grocery lists that save you time and money. Track prices, share with family, and never forget an item again.',
        cta: 'Start Free Today',
        secondaryCta: 'Watch Demo'
      },
      features: {
        title: 'Everything You Need for Smarter Shopping',
        subtitle: 'Powerful features to transform your grocery shopping experience',
        items: [
          {
            icon: '🤖',
            title: 'AI-Powered Smart Lists',
            description: 'Automatically categorize items and get intelligent suggestions based on your shopping history'
          },
          {
            icon: '💰',
            title: 'Price Tracking',
            description: 'Track prices across stores and get alerts when your favorite items go on sale'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'Family Sharing',
            description: 'Collaborate with family members in real-time. Everyone stays synced automatically'
          },
          {
            icon: '📊',
            title: 'Spending Insights',
            description: 'Visualize your spending patterns and get tips to save money on groceries'
          },
          {
            icon: '🎤',
            title: 'Voice Input',
            description: 'Add items hands-free while cooking or on the go with voice recognition'
          },
          {
            icon: '📱',
            title: 'Works Everywhere',
            description: 'Access your lists from any device - phone, tablet, or computer'
          }
        ]
      },
      pricing: {
        title: 'Simple, Transparent Pricing',
        subtitle: 'Choose the plan that works best for you',
        monthly: 'Monthly',
        yearly: 'Yearly',
        save20: 'Save 20%',
        plans: [
          {
            name: 'Free',
            price: '$0',
            period: 'forever',
            description: 'Perfect for getting started',
            features: [
              'Unlimited grocery items',
              'AI categorization',
              'Basic price tracking',
              '1 shared list',
              'Mobile & web access'
            ],
            cta: 'Get Started',
            popular: false
          },
          {
            name: 'Pro',
            monthlyPrice: '$4.99',
            yearlyPrice: '$47.99',
            period: 'per month',
            description: 'For power users',
            features: [
              'Everything in Free',
              'Unlimited shared lists',
              'Advanced price tracking',
              'Spending insights & analytics',
              'Price alerts',
              'Export to CSV',
              'Priority support'
            ],
            cta: 'Start Pro Trial',
            popular: true
          },
          {
            name: 'Family',
            monthlyPrice: '$7.99',
            yearlyPrice: '$76.99',
            period: 'per month',
            description: 'For families',
            features: [
              'Everything in Pro',
              'Up to 6 family members',
              'Recipe management',
              'Meal planning',
              'Family activity tracking',
              'Shared budgets'
            ],
            cta: 'Start Family Trial',
            popular: false
          }
        ]
      },
      about: {
        title: 'About AI Grocery Lists',
        subtitle: 'Making grocery shopping smarter, one list at a time',
        story: 'We created AI Grocery Lists to solve a problem we faced ourselves - forgetting items, overspending, and the hassle of coordinating shopping with family members. Our mission is to help millions of families save time and money through intelligent grocery management.',
        mission: {
          title: 'Our Mission',
          description: 'To empower families worldwide with AI-driven tools that make grocery shopping effortless, budget-friendly, and sustainable.'
        },
        values: [
          {
            title: 'Privacy First',
            description: 'Your data is yours. We never sell your information to third parties.'
          },
          {
            title: 'Always Improving',
            description: 'We continuously add features based on user feedback and the latest AI technology.'
          },
          {
            title: 'Family Focused',
            description: 'Built by families, for families. We understand the challenges of household management.'
          }
        ]
      },
      faq: {
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know',
        items: [
          {
            question: 'Is AI Grocery Lists really free?',
            answer: 'Yes! Our free plan includes unlimited grocery items, AI categorization, and basic features. You can upgrade to Pro or Family plans for advanced features like price tracking and family sharing.'
          },
          {
            question: 'How does price tracking work?',
            answer: 'As you shop and enter prices, our AI learns your purchase patterns and tracks price changes. You\'ll get alerts when items you frequently buy go on sale at your favorite stores.'
          },
          {
            question: 'Can I share lists with family members?',
            answer: 'Absolutely! Free users can share 1 list, while Pro and Family users get unlimited shared lists. All changes sync in real-time across all devices.'
          },
          {
            question: 'Is my data secure?',
            answer: 'Yes. We use bank-level encryption to protect your data. Your grocery lists and purchase history are private and never shared with third parties.'
          },
          {
            question: 'What devices does it work on?',
            answer: 'AI Grocery Lists works on all devices - iPhone, Android, iPad, and desktop browsers. Install our PWA for app-like experience without downloading anything.'
          },
          {
            question: 'Can I cancel my subscription anytime?',
            answer: 'Yes, you can cancel your Pro or Family subscription at any time. You\'ll continue to have access until the end of your billing period, then automatically switch to the free plan.'
          }
        ]
      },
      contact: {
        title: 'Get In Touch',
        subtitle: 'We\'re here to help',
        email: 'support@aigrocerylists.com',
        form: {
          name: 'Your Name',
          email: 'Your Email',
          message: 'Your Message',
          send: 'Send Message',
          sending: 'Sending...',
          success: 'Message sent successfully!',
          error: 'Failed to send. Please try again.'
        }
      },
      footer: {
        product: 'Product',
        company: 'Company',
        legal: 'Legal',
        social: 'Follow Us',
        copyright: '© 2025 AI Grocery Lists. All rights reserved.',
        links: {
          features: 'Features',
          pricing: 'Pricing',
          about: 'About Us',
          blog: 'Blog',
          privacy: 'Privacy Policy',
          terms: 'Terms of Service',
          contact: 'Contact'
        }
      }
    },
    he: {
      nav: {
        home: 'בית',
        features: 'תכונות',
        pricing: 'תמחור',
        about: 'אודות',
        faq: 'שאלות נפוצות',
        contact: 'צור קשר',
        login: 'התחברות',
        getStarted: 'התחל בחינם'
      },
      hero: {
        title: 'קניות מכולת חכמות בפשטות',
        subtitle: 'רשימות מכולת מבוססות בינה מלאכותית שחוסכות לך זמן וכסף. עקוב אחר מחירים, שתף עם המשפחה, ולעולם אל תשכח פריט.',
        cta: 'התחל בחינם היום',
        secondaryCta: 'צפה בהדגמה'
      },
      features: {
        title: 'כל מה שאתה צריך לקניות חכמות יותר',
        subtitle: 'תכונות רבות עוצמה לשינוי חוויית הקניות שלך',
        items: [
          {
            icon: '🤖',
            title: 'רשימות חכמות מבוססות AI',
            description: 'סיווג אוטומטי של פריטים והצעות חכמות על בסיס היסטוריית הקניות שלך'
          },
          {
            icon: '💰',
            title: 'מעקב מחירים',
            description: 'עקוב אחר מחירים בחנויות ושונות וקבל התראות כשהפריטים האהובים עליך במבצע'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'שיתוף משפחתי',
            description: 'שתף פעולה עם בני משפחה בזמן אמת. כולם מסונכרנים אוטומטית'
          },
          {
            icon: '📊',
            title: 'תובנות הוצאות',
            description: 'הצג דפוסי הוצאות וקבל טיפים לחסוך כסף על מכולת'
          },
          {
            icon: '🎤',
            title: 'קלט קולי',
            description: 'הוסף פריטים בקול תוך כדי בישול או בדרכים'
          },
          {
            icon: '📱',
            title: 'עובד בכל מקום',
            description: 'גש לרשימות שלך מכל מכשיר - טלפון, טאבלט או מחשב'
          }
        ]
      },
      pricing: {
        title: 'תמחור פשוט ושקוף',
        subtitle: 'בחר את התוכנית המתאימה לך',
        monthly: 'חודשי',
        yearly: 'שנתי',
        save20: 'חסוך 20%',
        plans: [
          {
            name: 'חינם',
            price: '₪0',
            period: 'לנצח',
            description: 'מושלם להתחלה',
            features: [
              'פריטי מכולת ללא הגבלה',
              'סיווג AI',
              'מעקב מחירים בסיסי',
              'רשימה משותפת אחת',
              'גישה ממובייל ואינטרנט'
            ],
            cta: 'התחל',
            popular: false
          },
          {
            name: 'Pro',
            monthlyPrice: '₪19.99',
            yearlyPrice: '₪191.99',
            period: 'לחודש',
            description: 'למשתמשים מתקדמים',
            features: [
              'כל התכונות בחינם',
              'רשימות משותפות ללא הגבלה',
              'מעקב מחירים מתקדם',
              'תובנות והנליטיקה של הוצאות',
              'התראות מחירים',
              'ייצוא ל-CSV',
              'תמיכה עדיפה'
            ],
            cta: 'התחל ניסיון Pro',
            popular: true
          },
          {
            name: 'משפחה',
            monthlyPrice: '₪31.99',
            yearlyPrice: '₪307.99',
            period: 'לחודש',
            description: 'למשפחות',
            features: [
              'כל התכונות ב-Pro',
              'עד 6 בני משפחה',
              'ניהול מתכונים',
              'תכנון ארוחות',
              'מעקב פעילות משפחתית',
              'תקציבים משותפים'
            ],
            cta: 'התחל ניסיון משפחתי',
            popular: false
          }
        ]
      },
      about: {
        title: 'אודות רשימות מכולת AI',
        subtitle: 'הופכים קניות מכולת לחכמות יותר, רשימה אחת בכל פעם',
        story: 'יצרנו את רשימות מכולת AI כדי לפתור בעיה שעמדה בפנינו - שכחת פריטים, הוצאת יתר, והטרחה של תיאום קניות עם בני משפחה. המשימה שלנו היא לעזור למיליוני משפחות לחסוך זמן וכסף דרך ניהול מכולת חכם.',
        mission: {
          title: 'המשימה שלנו',
          description: 'להעצים משפחות ברחבי העולם עם כלים מבוססי AI שהופכים קניות מכולת לקלות, חסכוניות ובעלות קיימות.'
        },
        values: [
          {
            title: 'פרטיות ראשונה',
            description: 'הנתונים שלך הם שלך. אנחנו אף פעם לא מוכרים את המידע שלך לצדדים שלישיים.'
          },
          {
            title: 'תמיד משתפרים',
            description: 'אנחנו מוסיפים תכונות בהתמדה על בסיס משוב משתמשים וטכנולוגיית AI המתקדמת ביותר.'
          },
          {
            title: 'ממוקד משפחה',
            description: 'נבנה על ידי משפחות, למשפחות. אנחנו מבינים את האתגרים של ניהול משק בית.'
          }
        ]
      },
      faq: {
        title: 'שאלות נפוצות',
        subtitle: 'כל מה שאתה צריך לדעת',
        items: [
          {
            question: 'האם רשימות מכולת AI באמת חינם?',
            answer: 'כן! התוכנית החינמית שלנו כוללת פריטי מכולת ללא הגבלה, סיווג AI, ותכונות בסיסיות. אתה יכול לשדרג ל-Pro או תוכניות משפחתיות לתכונות מתקדמות כמו מעקב מחירים ושיתוף משפחתי.'
          },
          {
            question: 'איך עובד מעקב מחירים?',
            answer: 'כשאתה קונה ומזין מחירים, ה-AI שלנו לומד את דפוסי הקניות שלך ועוקב אחר שינויי מחירים. תקבל התראות כשפריטים שאתה קונה לעתים קרובות במבצע בחנויות האהובות עליך.'
          },
          {
            question: 'האם אני יכול לשתף רשימות עם בני משפחה?',
            answer: 'כן! כל התוכניות מאפשרות שיתוף רשימות. התוכנית החינמית כוללת רשימה משותפת אחת, בעוד Pro ומשפחה מציעים רשימות משותפות ללא הגבלה עם סנכרון בזמן אמת.'
          },
          {
            question: 'האם הנתונים שלי מאובטחים?',
            answer: 'לגמרי. אנחנו משתמשים בהצפנה ברמת תעשייה ואף פעם לא שותפים או מוכרים את הנתונים שלך. הפרטיות שלך היא בראש סדר העדיפויות שלנו.'
          },
          {
            question: 'האם אני יכול לבטל בכל עת?',
            answer: 'כן, אתה יכול לבטל את המנוי שלך בכל עת. אין התחייבויות ארוכות טווח או עמלות ביטול.'
          },
          {
            question: 'האם יש אפליקציה למובייל?',
            answer: 'כן! האפליקציה שלנו עובדת בצורה מושלמת על כל המכשירים - iOS, אנדרואיד, ואינטרנט. התקן אותה כאפליקציה ביתית לחוויה דמוית אפליקציה.'
          }
        ]
      },
      contact: {
        title: 'צור קשר',
        subtitle: 'יש לך שאלות? אנחנו כאן לעזור',
        email: 'שלח לנו דוא"ל',
        form: {
          name: 'שם',
          email: 'דוא"ל',
          message: 'הודעה',
          send: 'שלח הודעה'
        }
      },
      footer: {
        product: 'מוצר',
        company: 'חברה',
        legal: 'משפטי',
        links: {
          features: 'תכונות',
          pricing: 'תמחור',
          about: 'אודות',
          contact: 'צור קשר',
          privacy: 'מדיניות פרטיות',
          terms: 'תנאי שירות'
        },
        copyright: '© 2025 AI Grocery Lists. כל הזכויות שמורות.'
      }
    },
    es: {
      nav: {
        home: 'Inicio',
        features: 'Características',
        pricing: 'Precios',
        about: 'Acerca de',
        faq: 'Preguntas',
        contact: 'Contacto',
        login: 'Iniciar sesión',
        getStarted: 'Comenzar gratis'
      },
      hero: {
        title: 'Compras inteligentes hechas simples',
        subtitle: 'Listas de compras impulsadas por IA que te ahorran tiempo y dinero. Rastrea precios, comparte con la familia y nunca olvides un artículo.',
        cta: 'Comienza gratis hoy',
        secondaryCta: 'Ver demo'
      },
      features: {
        title: 'Todo lo que necesitas para compras más inteligentes',
        subtitle: 'Funciones poderosas para transformar tu experiencia de compras',
        items: [
          {
            icon: '🤖',
            title: 'Listas inteligentes con IA',
            description: 'Categoriza artículos automáticamente y obtén sugerencias inteligentes basadas en tu historial de compras'
          },
          {
            icon: '💰',
            title: 'Seguimiento de precios',
            description: 'Rastrea precios en diferentes tiendas y recibe alertas cuando tus artículos favoritos estén en oferta'
          },
          {
            icon: '👨‍👩‍👧‍👦',
            title: 'Compartir en familia',
            description: 'Colabora con miembros de la familia en tiempo real. Todos se sincronizan automáticamente'
          },
          {
            icon: '📊',
            title: 'Análisis de gastos',
            description: 'Visualiza tus patrones de gasto y obtén consejos para ahorrar dinero en compras'
          },
          {
            icon: '🎤',
            title: 'Entrada por voz',
            description: 'Agrega artículos con las manos libres mientras cocinas o estás en movimiento'
          },
          {
            icon: '📱',
            title: 'Funciona en todas partes',
            description: 'Accede a tus listas desde cualquier dispositivo: teléfono, tablet o computadora'
          }
        ]
      },
      pricing: {
        title: 'Precios simples y transparentes',
        subtitle: 'Elige el plan que funcione mejor para ti',
        monthly: 'Mensual',
        yearly: 'Anual',
        save20: 'Ahorra 20%',
        plans: [
          {
            name: 'Gratis',
            price: '$0',
            period: 'para siempre',
            description: 'Perfecto para comenzar',
            features: [
              'Artículos de compras ilimitados',
              'Categorización IA',
              'Seguimiento de precios básico',
              '1 lista compartida',
              'Acceso móvil y web'
            ],
            cta: 'Comenzar',
            popular: false
          },
          {
            name: 'Pro',
            monthlyPrice: '$4.99',
            yearlyPrice: '$47.99',
            period: 'por mes',
            description: 'Para usuarios avanzados',
            features: [
              'Todo en Gratis',
              'Listas compartidas ilimitadas',
              'Seguimiento avanzado de precios',
              'Análisis de gastos',
              'Alertas de precios',
              'Exportar a CSV',
              'Soporte prioritario'
            ],
            cta: 'Iniciar prueba Pro',
            popular: true
          },
          {
            name: 'Familia',
            monthlyPrice: '$7.99',
            yearlyPrice: '$76.99',
            period: 'por mes',
            description: 'Para familias',
            features: [
              'Todo en Pro',
              'Hasta 6 miembros',
              'Gestión de recetas',
              'Planificación de comidas',
              'Seguimiento de actividades',
              'Presupuestos compartidos'
            ],
            cta: 'Iniciar prueba familiar',
            popular: false
          }
        ]
      },
      about: {
        title: 'Acerca de AI Grocery Lists',
        subtitle: 'Haciendo las compras más inteligentes, una lista a la vez',
        story: 'Creamos AI Grocery Lists para resolver un problema que enfrentamos nosotros mismos: olvidar artículos, gastar de más y la molestia de coordinar las compras con los miembros de la familia. Nuestra misión es ayudar a millones de familias a ahorrar tiempo y dinero a través de la gestión inteligente de compras.',
        mission: {
          title: 'Nuestra misión',
          description: 'Empoderar a familias en todo el mundo con herramientas impulsadas por IA que hacen las compras sin esfuerzo, económicas y sostenibles.'
        },
        values: [
          {
            title: 'Privacidad primero',
            description: 'Tus datos son tuyos. Nunca vendemos tu información a terceros.'
          },
          {
            title: 'Siempre mejorando',
            description: 'Agregamos continuamente funciones basadas en comentarios de usuarios y la última tecnología de IA.'
          },
          {
            title: 'Enfoque familiar',
            description: 'Construido por familias, para familias. Entendemos los desafíos de la gestión del hogar.'
          }
        ]
      },
      faq: {
        title: 'Preguntas frecuentes',
        subtitle: 'Todo lo que necesitas saber',
        items: [
          {
            question: '¿AI Grocery Lists es realmente gratis?',
            answer: '¡Sí! Nuestro plan gratuito incluye artículos de compras ilimitados, categorización IA y funciones básicas. Puedes actualizar a planes Pro o Familiar para funciones avanzadas como seguimiento de precios y compartir en familia.'
          },
          {
            question: '¿Cómo funciona el seguimiento de precios?',
            answer: 'A medida que compras e ingresas precios, nuestra IA aprende tus patrones de compra y rastrea cambios de precios. Recibirás alertas cuando los artículos que compras frecuentemente estén en oferta en tus tiendas favoritas.'
          },
          {
            question: '¿Puedo compartir listas con miembros de la familia?',
            answer: '¡Sí! Todos los planes permiten compartir listas. El plan gratuito incluye 1 lista compartida, mientras que Pro y Familia ofrecen listas compartidas ilimitadas con sincronización en tiempo real.'
          },
          {
            question: '¿Están seguros mis datos?',
            answer: 'Absolutamente. Usamos encriptación de nivel industrial y nunca compartimos o vendemos tus datos. Tu privacidad es nuestra máxima prioridad.'
          },
          {
            question: '¿Puedo cancelar en cualquier momento?',
            answer: 'Sí, puedes cancelar tu suscripción en cualquier momento. No hay compromisos a largo plazo ni tarifas de cancelación.'
          },
          {
            question: '¿Hay una aplicación móvil?',
            answer: '¡Sí! Nuestra aplicación funciona perfectamente en todos los dispositivos: iOS, Android y web. Instálala como una aplicación en casa para una experiencia similar a una aplicación.'
          }
        ]
      },
      contact: {
        title: 'Contacto',
        subtitle: '¿Tienes preguntas? Estamos aquí para ayudar',
        email: 'Envíanos un correo',
        form: {
          name: 'Nombre',
          email: 'Correo electrónico',
          message: 'Mensaje',
          send: 'Enviar mensaje'
        }
      },
      footer: {
        product: 'Producto',
        company: 'Compañía',
        legal: 'Legal',
        links: {
          features: 'Características',
          pricing: 'Precios',
          about: 'Acerca de',
          contact: 'Contacto',
          privacy: 'Política de privacidad',
          terms: 'Términos de servicio'
        },
        copyright: '© 2025 AI Grocery Lists. Todos los derechos reservados.'
      }
    }
  };

  const t = translations[language];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold text-blue-600">🛒 AI Grocery Lists</span>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('home')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.home}
              </button>
              <button onClick={() => scrollToSection('features')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.features}
              </button>
              <button onClick={() => scrollToSection('pricing')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.pricing}
              </button>
              <button onClick={() => scrollToSection('about')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.about}
              </button>
              <button onClick={() => scrollToSection('faq')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.faq}
              </button>
              <button onClick={() => scrollToSection('contact')} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.contact}
              </button>

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as 'en' | 'he' | 'es' | 'ru')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                <option value="en">🇺🇸 English</option>
                <option value="he">🇮🇱 עברית</option>
                <option value="es">🇪🇸 Español</option>
                <option value="ru">🇷🇺 Русский</option>
              </select>

              <button onClick={onLogin} className="text-gray-700 dark:text-gray-300 hover:text-blue-600">
                {t.nav.login}
              </button>
              <button
                onClick={onGetStarted}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t.nav.getStarted}
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 dark:text-gray-300"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4">
              <div className="flex flex-col space-y-2">
                <button onClick={() => scrollToSection('home')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.home}
                </button>
                <button onClick={() => scrollToSection('features')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.features}
                </button>
                <button onClick={() => scrollToSection('pricing')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.pricing}
                </button>
                <button onClick={() => scrollToSection('about')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.about}
                </button>
                <button onClick={() => scrollToSection('faq')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.faq}
                </button>
                <button onClick={() => scrollToSection('contact')} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.contact}
                </button>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as 'en' | 'he' | 'es')}
                  className="mx-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="he">🇮🇱 עברית</option>
                  <option value="es">🇪🇸 Español</option>
                </select>
                <button onClick={onLogin} className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
                  {t.nav.login}
                </button>
                <button onClick={onGetStarted} className="mx-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t.nav.getStarted}
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            {t.hero.title}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            {t.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-lg font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
            >
              {t.hero.cta}
            </button>
          </div>

          {/* App Screenshots */}
          <div className="mt-16 max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="transform hover:scale-105 transition-transform">
                <AppScreenshot type="list" />
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                  Smart Organization
                </p>
              </div>
              <div className="transform hover:scale-105 transition-transform">
                <AppScreenshot type="ai-categorization" />
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                  AI Categorization
                </p>
              </div>
              <div className="transform hover:scale-105 transition-transform">
                <AppScreenshot type="price-tracking" />
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                  Price Tracking
                </p>
              </div>
              <div className="transform hover:scale-105 transition-transform">
                <AppScreenshot type="family-sharing" />
                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-3 font-semibold">
                  Family Sharing
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t.features.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.features.items.map((feature, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              {t.pricing.subtitle}
            </p>

            {/* Pricing Toggle */}
            <div className="inline-flex items-center bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setActivePricingPlan('monthly')}
                className={`px-6 py-2 rounded-lg transition-colors ${
                  activePricingPlan === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.pricing.monthly}
              </button>
              <button
                onClick={() => setActivePricingPlan('yearly')}
                className={`px-6 py-2 rounded-lg transition-colors relative ${
                  activePricingPlan === 'yearly'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.pricing.yearly}
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                  {t.pricing.save20}
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.pricing.plans.map((plan, index) => (
              <div
                key={index}
                className={`bg-white dark:bg-gray-700 rounded-2xl p-8 ${
                  plan.popular ? 'ring-2 ring-blue-600 shadow-xl scale-105' : 'shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-600 text-white text-sm font-semibold px-4 py-1 rounded-full inline-block mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {activePricingPlan === 'yearly' && plan.yearlyPrice ? plan.yearlyPrice : plan.monthlyPrice || plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-300 ml-2">
                    {plan.period}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {plan.description}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-500'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t.about.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t.about.subtitle}
            </p>
          </div>

          <div className="max-w-3xl mx-auto mb-12">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {t.about.story}
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-gray-800 rounded-2xl p-8 mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              {t.about.mission.title}
            </h3>
            <p className="text-lg text-gray-700 dark:text-gray-300 text-center">
              {t.about.mission.description}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {t.about.values.map((value, index) => (
              <div key={index} className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{['🔒', '🚀', '👨‍👩‍👧‍👦'][index]}</span>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {value.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t.faq.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t.faq.subtitle}
            </p>
          </div>

          <div className="space-y-4">
            {t.faq.items.map((item, index) => (
              <details key={index} className="bg-white dark:bg-gray-700 rounded-lg p-6 shadow-sm">
                <summary className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
                  {item.question}
                </summary>
                <p className="mt-4 text-gray-600 dark:text-gray-300">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t.contact.title}
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {t.contact.subtitle}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8">
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Email us at: <a href={`mailto:${t.contact.email}`} className="text-blue-600 hover:underline">{t.contact.email}</a>
              </p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.contact.form.name}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.contact.form.email}
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t.contact.form.message}
                </label>
                <textarea
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
              >
                {t.contact.form.send}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4">{t.footer.product}</h3>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className="text-gray-400 hover:text-white">{t.footer.links.features}</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="text-gray-400 hover:text-white">{t.footer.links.pricing}</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">{t.footer.company}</h3>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('about')} className="text-gray-400 hover:text-white">{t.footer.links.about}</button></li>
                <li><button onClick={() => scrollToSection('contact')} className="text-gray-400 hover:text-white">{t.footer.links.contact}</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">{t.footer.legal}</h3>
              <ul className="space-y-2">
                <li><a href="/privacy" className="text-gray-400 hover:text-white">{t.footer.links.privacy}</a></li>
                <li><a href="/terms" className="text-gray-400 hover:text-white">{t.footer.links.terms}</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">{t.footer.social}</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white text-2xl">𝕏</a>
                <a href="#" className="text-gray-400 hover:text-white text-2xl">📘</a>
                <a href="#" className="text-gray-400 hover:text-white text-2xl">📷</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>{t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
