import React, { useEffect } from 'react';

interface AdBannerProps {
  /**
   * Ad slot ID from Google AdSense
   * You'll get this from your AdSense account
   */
  adSlot?: string;
  /**
   * Ad format (auto, horizontal, vertical, rectangle)
   */
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  /**
   * Whether ads are responsive
   */
  responsive?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * AdBanner component for displaying Google AdSense ads
 * Only shows ads when adSlot is provided (set in environment variables)
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  adSlot,
  format = 'auto',
  responsive = true,
  className = ''
}) => {
  useEffect(() => {
    // Push ad to AdSense queue when component mounts
    if (adSlot && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, [adSlot]);

  // Don't render if no ad slot configured
  if (!adSlot) {
    return null;
  }

  return (
    <div className={`ad-container my-4 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID || ''}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};

// Extend window type for TypeScript
declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}
