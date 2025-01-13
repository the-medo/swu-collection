export function createFileName(name: string): string {
  return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
}
