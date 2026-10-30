import { Hono } from 'hono';
import { IMAGE_UPLOAD_MIME_TYPES, MAX_IMAGE_UPLOAD_SIZE, setSiteImageCreditSchema } from '@dissco-cs/shared-types';
import { SiteImagesRepository, toSiteImageDto } from '../repositories/site-images.repository.js';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { validateJson } from '../infrastructure/validate-json.js';
import { readUpload, sendFile, uploadLimit } from '../infrastructure/file-http.js';
import { siteImageKey, validateParams } from '../infrastructure/validate-params.js';

export function siteImagesController(siteImagesRepository: SiteImagesRepository): Hono {
  const app = new Hono();

  app.get('/', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const rows = await siteImagesRepository.list(siteId);
    return c.json({ images: rows.map(toSiteImageDto) });
  });

  app.get('/:key', validateParams({ key: siteImageKey }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const file = await siteImagesRepository.getFile(siteId, c.req.valid('param').key);
    if (!file) {
      return c.notFound();
    }

    // The frontend adds ?v=<updatedAt> to the URL, so a new image gets a new URL and the browser
    // may keep this one for good.
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return sendFile(c, file.buffer, file.mimeType);
  });

  // The writes live under /file and /credit: the gateway lets /site-images and /site-images/:key
  // through without checking the JWT (anonymous visitors need the images), and requireSiteAdmin
  // only reads the JWT's payload.
  app.put('/:key/file', validateParams({ key: siteImageKey }), uploadLimit(MAX_IMAGE_UPLOAD_SIZE), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const upload = await readUpload(c, MAX_IMAGE_UPLOAD_SIZE, IMAGE_UPLOAD_MIME_TYPES);
    if (upload instanceof Response) {
      return upload;
    }

    await siteImagesRepository.upsertFile(identity.siteId, identity.userId, c.req.valid('param').key, upload);
    return c.body(null, 204);
  });

  app.patch('/:key/credit', validateParams({ key: siteImageKey }), validateJson(setSiteImageCreditSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const updated = await siteImagesRepository.setCredit(identity.siteId, identity.userId, c.req.valid('param').key, c.req.valid('json').credit);
    if (!updated) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  app.delete('/:key/file', validateParams({ key: siteImageKey }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    await siteImagesRepository.delete(identity.siteId, c.req.valid('param').key);
    return c.body(null, 204);
  });

  return app;
}
