import { useEffect } from 'react';
import userTracking from '../utils/userTracking';

export function useUserTracking(page: string = 'main') {
  useEffect(() => {
    userTracking.startTracking(page);

    return () => {
      userTracking.stopTracking();
    };
  }, [page]);
}
