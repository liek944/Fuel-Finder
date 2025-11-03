import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile viewport (width <= 768px)
 * Updates on window resize
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const getIsMobile = () =>
    typeof window !== 'undefined' && (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      Math.min(window.innerWidth, window.innerHeight) <= breakpoint
    );

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
