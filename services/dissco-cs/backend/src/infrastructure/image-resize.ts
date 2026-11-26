import sharp from 'sharp';

// An admin may upload up to 3 MB, but a logo shows at most 160 px high and a header photo on half
// a banner: every visitor would download the full file. So each upload is shrunk once, when saved.
// 'logo' at a higher quality, so text in a logo stays sharp.
const SHRINK = {
  logo: { maxSide: 800, quality: 90 },
  photo: { maxSide: 2000, quality: 80 },
} as const;

export type ImageKind = keyof typeof SHRINK;

/**
 * An uploaded image made to fit its use, as WebP. Never enlarged; transparency is kept; a phone
 * photo is turned upright using its EXIF orientation, and the EXIF data itself (GPS included) is
 * dropped.
 * @param buffer the uploaded JPEG, PNG or WebP, already checked by checkUpload/readUpload
 * @param kind 'logo' (fits within 800 × 800 px) or 'photo' (fits within 2000 × 2000 px)
 * Returns: the new file as { mimeType: 'image/webp', buffer }.
 */
export async function shrinkImage(buffer: Buffer, kind: ImageKind): Promise<{ mimeType: string; buffer: Buffer }> {
  const { maxSide, quality } = SHRINK[kind];
  const shrunk = await sharp(buffer)
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
  return { mimeType: 'image/webp', buffer: shrunk };
}
