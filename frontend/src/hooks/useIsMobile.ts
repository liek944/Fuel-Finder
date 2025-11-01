import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile viewport (width <= 768px)
 * Updates on window resize
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    // Debounce resize events for performance
    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkIsMobile, 150);
    };

    window.addEventListener('resize', handleResize);
    
    // Initial check
    checkIsMobile();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, [breakpoint]);

  return isMobile;
}
