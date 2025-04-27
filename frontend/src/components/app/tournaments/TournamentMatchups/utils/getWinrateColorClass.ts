// Utility function to get the appropriate color class based on winrate percentage
export const getWinrateColorClass = (winrate: number): string => {
  if (winrate >= 58) {
    return 'bg-green-300 dark:bg-green-950'; // Extremely good
  } else if (winrate >= 54) {
    return 'bg-green-200 dark:bg-green-900'; // Very good
  } else if (winrate >= 52) {
    return 'bg-green-100 dark:bg-green-800'; // Good
  } else if (winrate >= 50) {
    return 'bg-green-50 dark:bg-green-950/30'; // Neutral with very light background
  } else if (winrate >= 48) {
    return 'bg-red-50 dark:bg-red-950/30'; // Neutral with very light background
  } else if (winrate >= 46) {
    return 'bg-red-100 dark:bg-red-900'; // Bad
  } else if (winrate >= 42) {
    return 'bg-red-200 dark:bg-red-800'; // Very bad
  } else {
    return 'bg-red-300 dark:bg-red-950'; // Extremely bad
  }
};