/**
 * Converts a hex color string to RGB values
 * @param hexColor - Hex color string (e.g., "#ff0000")
 * @returns Object with r, g, b number values
 */
export const hexToRgb = (hexColor: string): { r: number; g: number; b: number } => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return { r, g, b };
};