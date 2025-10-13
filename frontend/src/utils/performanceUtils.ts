/**
 * Performance Utilities
 * 
 * Provides throttling, debouncing, and performance optimization utilities
 * for smooth trip replay animations.
 * 
 * @module performanceUtils
 * @version 7.0.0
 * @since Phase 7
 */

/**
 * Throttle function execution
 * 
 * Ensures function is called at most once per specified interval.
 * Useful for limiting map updates during rapid animation frames.
 * 
 * @param func - Function to throttle
 * @param limit - Minimum time between calls in milliseconds
 * @returns Throttled function
 * 
 * @example
 * ```typescript
 * const throttledUpdate = throttle((position) => {
 *   map.panTo(position);
 * }, 100); // Max once per 100ms
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (this: any, ...args: Parameters<T>): void {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Debounce function execution
 * 
 * Delays function execution until after specified time has elapsed
 * since last invocation.
 * 
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 * 
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query) => {
 *   performSearch(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Request animation frame throttle
 * 
 * Throttles function to run at most once per animation frame.
 * Ideal for smooth animations synchronized with browser repaints.
 * 
 * @param func - Function to throttle
 * @returns Throttled function
 * 
 * @example
 * ```typescript
 * const rafThrottled = rafThrottle((position) => {
 *   updateMarkerPosition(position);
 * });
 * ```
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (this: any, ...args: Parameters<T>): void {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
        rafId = null;
        lastArgs = null;
      });
    }
  };
}

/**
 * Adaptive throttle based on performance
 * 
 * Automatically adjusts throttle interval based on frame rate.
 * Increases throttling if performance degrades.
 * 
 * @param func - Function to throttle
 * @param targetFPS - Target frames per second (default: 60)
 * @returns Adaptive throttled function
 */
export function adaptiveThrottle<T extends (...args: any[]) => any>(
  func: T,
  targetFPS: number = 60
): (...args: Parameters<T>) => void {
  const targetInterval = 1000 / targetFPS;
  let lastTime = 0;
  let adaptiveInterval = targetInterval;
  const performanceWindow: number[] = [];
  const windowSize = 10;

  return function (this: any, ...args: Parameters<T>): void {
    const now = performance.now();
    const elapsed = now - lastTime;

    if (elapsed >= adaptiveInterval) {
      // Track performance
      performanceWindow.push(elapsed);
      if (performanceWindow.length > windowSize) {
        performanceWindow.shift();
      }

      // Calculate average frame time
      const avgFrameTime = performanceWindow.reduce((a, b) => a + b, 0) / performanceWindow.length;

      // Adjust interval if performance is poor
      if (avgFrameTime > targetInterval * 1.5) {
        adaptiveInterval = Math.min(adaptiveInterval * 1.1, targetInterval * 2);
      } else if (avgFrameTime < targetInterval * 0.8) {
        adaptiveInterval = Math.max(adaptiveInterval * 0.9, targetInterval);
      }

      func.apply(this, args);
      lastTime = now;
    }
  };
}

/**
 * Performance monitor
 */
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  private readonly maxSamples: number = 60;

  /**
   * Record a frame
   */
  recordFrame(): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }
    this.lastFrameTime = now;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }

  /**
   * Get average frame time in milliseconds
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
  }

  /**
   * Check if performance is good (>= 50 FPS)
   */
  isPerformanceGood(): boolean {
    return this.getFPS() >= 50;
  }

  /**
   * Reset monitor
   */
  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
  }
}

/**
 * Batch update helper
 * 
 * Batches multiple updates into a single operation.
 * Useful for reducing DOM updates during animations.
 * 
 * @param batchSize - Number of updates to batch
 * @returns Batch update function
 */
export function createBatchUpdater<T>(
  batchSize: number,
  onBatch: (items: T[]) => void
): (item: T) => void {
  let batch: T[] = [];

  return (item: T) => {
    batch.push(item);
    if (batch.length >= batchSize) {
      onBatch([...batch]);
      batch = [];
    }
  };
}

/**
 * Memory-efficient array chunking
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[]> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Measure function execution time
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  func: T,
  label?: string
): (...args: Parameters<T>) => ReturnType<T> {
  return function (this: any, ...args: Parameters<T>): ReturnType<T> {
    const start = performance.now();
    const result = func.apply(this, args);
    const end = performance.now();
    
    if (label) {
      console.log(`[Performance] ${label}: ${(end - start).toFixed(2)}ms`);
    }
    
    return result;
  };
}

/**
 * Lazy value computation
 * 
 * Computes value only when first accessed, then caches result.
 */
export class LazyValue<T> {
  private computed: boolean = false;
  private value: T | undefined;

  constructor(private compute: () => T) {}

  get(): T {
    if (!this.computed) {
      this.value = this.compute();
      this.computed = true;
    }
    return this.value!;
  }

  reset(): void {
    this.computed = false;
    this.value = undefined;
  }
}

/**
 * Check if browser supports hardware acceleration
 */
export function supportsHardwareAcceleration(): boolean {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  return !!gl;
}

/**
 * Get optimal update interval based on device capabilities
 */
export function getOptimalUpdateInterval(): number {
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Check if device has good performance
  const hasGoodPerformance = navigator.hardwareConcurrency >= 4;

  if (isMobile && !hasGoodPerformance) {
    return 100; // 10 FPS for low-end mobile
  } else if (isMobile) {
    return 50; // 20 FPS for mid-range mobile
  } else if (hasGoodPerformance) {
    return 16; // 60 FPS for desktop
  } else {
    return 33; // 30 FPS for low-end desktop
  }
}
