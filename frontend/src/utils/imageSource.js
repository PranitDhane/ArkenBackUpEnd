/**
 * Resolve an attachment object to a reliable image src string.
 *
 * Prefers att.preview when it is a valid data URI.
 * Falls back to constructing a data URI from att.data (base64).
 * Returns null if no image data is available.
 */
export function resolveImageSrc(att) {
  if (att.preview && att.preview.startsWith("data:")) {
    return att.preview;
  }
  if (att.data && att.media_type) {
    return `data:${att.media_type};base64,${att.data}`;
  }
  return null;
}
