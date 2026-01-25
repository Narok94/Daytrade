import { useRef, useEffect, useCallback } from 'react';

// This hook creates a debounced version of a callback function that delays its execution.
// It's useful for scenarios like auto-saving, where you want to wait for the user to stop typing
// before triggering a save operation.
export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
) {
  // Store the latest callback in a ref to ensure the debounced function
  // always calls the most recent version of the callback without
  // resetting the timer.
  const callbackRef = useRef(callback);
  // FIX: Initialize useRef with undefined to fix "Expected 1 arguments, but got 0" error.
  // This can be caused by older React type versions not supporting the no-argument overload.
  const timeoutRef = useRef<number | undefined>(undefined);

  // Update the ref to the latest callback function on every render.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup the timeout when the component unmounts or the delay changes.
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [delay]);

  // Return a memoized debounced function.
  return useCallback((...args: A) => {
    // If there's an existing timeout, clear it.
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to execute the callback after the specified delay.
    timeoutRef.current = window.setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);
}
