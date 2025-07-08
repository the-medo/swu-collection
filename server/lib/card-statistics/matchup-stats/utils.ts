import * as zlib from 'zlib';

/**
 * Decompresses data from the cardStatMatchupInfo table
 * @param infoJson The JSON string from the info column
 * @returns The decompressed data object
 */
export function decompressMatchupInfo(infoJson: string): any {
  const info = JSON.parse(infoJson);
  
  // Check if the data is compressed
  if (info.compressed) {
    // Decompress the data
    const compressedData = Buffer.from(info.data, 'base64');
    const decompressedData = zlib.inflateSync(compressedData).toString();
    return JSON.parse(decompressedData);
  }
  
  // If not compressed, return the data as is
  return info;
}

/**
 * Compresses data for the cardStatMatchupInfo table
 * @param data The data object to compress
 * @returns A JSON string with compressed data
 */
export function compressMatchupInfo(data: any): string {
  const jsonData = JSON.stringify(data);
  
  // Compress the data using zlib
  const compressedData = zlib.deflateSync(jsonData).toString('base64');
  
  // Return JSON with compression flag
  return JSON.stringify({
    compressed: true,
    data: compressedData,
  });
}