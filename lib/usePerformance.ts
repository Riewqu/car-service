import { useEffect } from 'react';

/**
 * Custom hook to enable performance optimizations
 * - Reduces repaints and reflows
 * - Enables GPU acceleration
 * - Optimizes scroll performance
 */
export const usePerformance = () => {
  useEffect(() => {
    // Enable smooth scrolling
    document.documentElement.style.scrollBehavior = 'smooth';

    // Add GPU acceleration class to body
    document.body.classList.add('gpu-accelerated');

    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
      document.body.classList.remove('gpu-accelerated');
    };
  }, []);
};

/**
 * Debounce function for search inputs
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for scroll events
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
