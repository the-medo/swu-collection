import { useEffect, useRef } from 'react';
import { getCardVariantPriceFetchList } from '@/dexie';
import { useBulkLoadCardPrices } from '@/api/card-prices/useBulkLoadCardPrices.ts';

/**
 * Hook that periodically checks the fetch list in IndexedDB for variants to check
 * and fetches their prices using the bulk load API.
 *
 * - First check is performed 15 seconds after the component mounts
 * - Subsequent checks are performed every minute
 * - Always takes the most recently added 100 variants
 * - Fetched variants are automatically removed from the fetch list by batchStoreCardVariantPrices
 */
export function useAutofetchPrices() {
  const bulkLoadMutation = useBulkLoadCardPrices();
  const timerRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  // Function to fetch prices for variants in the fetch list
  const fetchPrices = async () => {
    // Prevent concurrent executions
    if (isRunningRef.current) {
      return;
    }

    try {
      isRunningRef.current = true;

      // Get the most recently added 100 variants from the fetch list
      const fetchList = await getCardVariantPriceFetchList();
      const recentVariants = fetchList.slice(0, 500);

      if (recentVariants.length === 0) {
        // No variants to fetch
        return;
      }

      // Extract variant IDs
      const variantIds = recentVariants.map(variant => variant.variantId);

      // Use the bulk load mutation to fetch prices
      await bulkLoadMutation.mutateAsync({
        variantIds,
        sourceType: 'cardmarket',
      });

      // Note: The variants are automatically removed from the fetch list by batchStoreCardVariantPrices
    } catch (error) {
      console.error('Error fetching prices:', error);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    // Initial fetch after 15 seconds
    const initialTimer = window.setTimeout(() => {
      void fetchPrices();
    }, 3000);

    // Set up interval for subsequent fetches every minute
    const intervalTimer = window.setInterval(() => {
      void fetchPrices();
    }, 15000);

    // Clean up timers on unmount
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    isLoading: bulkLoadMutation.isPending,
    isError: bulkLoadMutation.isError,
    error: bulkLoadMutation.error,
    // Expose the fetch function to allow manual triggering if needed
    fetchPrices,
  };
}
