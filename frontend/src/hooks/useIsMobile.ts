import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile viewport (width <= 768px)
 * Updates on window resize
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const getIsMobile = () => {
    if (typeof window === 'undefined') return false;
    
    // Check for true mobile: requires BOTH coarse pointer (touch) AND no hover capability
    // Laptops with touchscreens have hover via trackpad/mouse, so they won't match
    const isTouchOnly = window.matchMedia && 
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    
    // Also check screen size as fallback for unusual configurations
    const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= breakpoint;
    
    return isTouchOnly || isSmallScreen;
  };

  const [isMobile, setIsMobile] = useState<boolean>(getIsMobile);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(getIsMobile());
    };

    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkIsMobile, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    // Initial check
    checkIsMobile();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);

  return isMobile;
}
