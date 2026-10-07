export function userFileUploadForm(file: File, purpose?: 'image' | 'header') {
  // Hono serializes every property, including undefined, into the multipart form.
  return purpose ? { file, purpose } : { file };
}
