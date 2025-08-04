import { useAutofetchPrices } from './useAutofetchPrices.ts';

/**
 * PriceFetcher component
 *
 * A simple component that calls the useAutofetchPrices hook and returns null.
 *
 * Usage:
 * ```tsx
 * // In your root component or layout
 * <PriceFetcher />
 * ```
 */
export function PriceFetcher() {
  // Call the hook to enable automatic price fetching
  useAutofetchPrices();

  // Return null as this component doesn't render any UI
  return null;
}
