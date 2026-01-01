import { doc, getDoc, updateDoc, increment, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from './firebaseService';

export interface PromoCode {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // 100 for 100%, or dollar amount
  duration: number; // number of billing cycles
  maxUses: number | null; // null = unlimited
  currentUses: number;
  active: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp | null;
  description?: string;
}

export interface PromoCodeValidation {
  valid: boolean;
  promoCode?: PromoCode;
  error?: string;
  discountedPrice?: number;
}

/**
 * Validate a promo code
 */
export const validatePromoCode = async (
  code: string,
  originalPrice: number
): Promise<PromoCodeValidation> => {
  try {
    if (!code || code.trim() === '') {
      return { valid: false, error: 'Please enter a promo code' };
    }

    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', code.toUpperCase().trim());
    const promoSnap = await getDoc(promoRef);

    if (!promoSnap.exists()) {
      return { valid: false, error: 'Invalid promo code' };
    }

    const promo = promoSnap.data() as PromoCode;

    // Check if active
    if (!promo.active) {
      return { valid: false, error: 'This promo code is no longer active' };
    }

    // Check expiration
    if (promo.expiresAt && promo.expiresAt.toDate() < new Date()) {
      return { valid: false, error: 'This promo code has expired' };
    }

    // Check usage limit
    if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
      return { valid: false, error: 'This promo code has reached its usage limit' };
    }

    // Calculate discounted price
    const discountedPrice = calculateDiscountedPrice(originalPrice, promo);

    return {
      valid: true,
      promoCode: promo,
      discountedPrice
    };
  } catch (error) {
    console.error('Error validating promo code:', error);
    return { valid: false, error: 'Error validating promo code' };
  }
};

/**
 * Increment promo code usage count
 */
export const incrementPromoCodeUsage = async (code: string): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', code.toUpperCase().trim());
    await updateDoc(promoRef, {
      currentUses: increment(1)
    });
  } catch (error) {
    console.error('Error incrementing promo code usage:', error);
  }
};

/**
 * Create a new promo code
 */
export const createPromoCode = async (
  promo: Omit<PromoCode, 'currentUses' | 'createdAt'>
): Promise<void> => {
  try {
    const { db } = getFirebaseServices();
    const promoRef = doc(db, 'promoCodes', promo.code.toUpperCase().trim());
    await setDoc(promoRef, {
      ...promo,
      code: promo.code.toUpperCase().trim(),
      currentUses: 0,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    throw error;
  }
};

/**
 * Calculate discounted price based on promo code
 */
export const calculateDiscountedPrice = (
  originalPrice: number,
  promoCode: PromoCode
): number => {
  if (promoCode.type === 'percentage') {
    const discount = originalPrice * (promoCode.value / 100);
    return Math.max(0, originalPrice - discount);
  } else {
    // Fixed amount discount
    return Math.max(0, originalPrice - promoCode.value);
  }
};

/**
 * Format discount text for display
 */
export const formatDiscountText = (promoCode: PromoCode): string => {
  if (promoCode.type === 'percentage') {
    return `${promoCode.value}% off`;
  } else {
    return `$${promoCode.value} off`;
  }
};

/**
 * Get discount description with duration
 */
export const getDiscountDescription = (promoCode: PromoCode): string => {
  const discountText = formatDiscountText(promoCode);
  const durationText = promoCode.duration === 1 
    ? 'first month' 
    : `${promoCode.duration} months`;
  
  return `${discountText} for ${durationText}`;
};

