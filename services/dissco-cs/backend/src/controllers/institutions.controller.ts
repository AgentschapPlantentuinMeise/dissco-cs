import { Hono } from 'hono';
import type { Context } from 'hono';
import { requireSiteAdmin, requireSiteId } from '../auth/auth.js';
import { InstitutionsRepository, toInstitutionDto } from '../repositories/institutions.repository.js';
import { intId, safeSegment, validateParams } from '../infrastructure/validate-params.js';
import { validateMultipart } from '../infrastructure/validate-multipart.js';
import { Upload, checkUpload, sendFile, uploadLimit } from '../infrastructure/file-http.js';
import {
  IMAGE_UPLOAD_MIME_TYPES,
  INSTITUTION_LOGO_FIELD,
  MAX_EMAIL_LENGTH,
  MAX_IMAGE_UPLOAD_SIZE,
  MAX_INSTITUTION_DESCRIPTION_LENGTH,
  MAX_INSTITUTION_NAME_LENGTH,
  MAX_INSTITUTION_PHONE_LENGTH,
  MAX_INSTITUTION_WEBSITE_LENGTH,
  SITE_PAGE_LANGS,
  institutionInputSchema,
} from '@dissco-cs/shared-types';

// A save carries the logo and the JSON fields; a character takes at most 3 bytes in UTF-8. Below the
// gateway's default 10m, so this route needs no location of its own in dissco-cs-api.conf.
const MAX_INSTITUTION_SAVE_SIZE =
  MAX_IMAGE_UPLOAD_SIZE +
  3 * SITE_PAGE_LANGS.length * (MAX_INSTITUTION_NAME_LENGTH + MAX_INSTITUTION_DESCRIPTION_LENGTH) +
  3 * (MAX_EMAIL_LENGTH + MAX_INSTITUTION_PHONE_LENGTH + MAX_INSTITUTION_WEBSITE_LENGTH);

// The logo from the multipart body: null when none was sent, or the error Response (413, 415).
async function readLogo(c: Context, files: Record<string, File>): Promise<Upload | Response | null> {
  const file = files[INSTITUTION_LOGO_FIELD];
  return file ? checkUpload(c, file, MAX_IMAGE_UPLOAD_SIZE, IMAGE_UPLOAD_MIME_TYPES) : null;
}

export function institutionsController(institutionsRepository: InstitutionsRepository): Hono {
  const app = new Hono();

  app.get('/active', async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institutions = await institutionsRepository.listActiveInstitutions(siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  app.get('/active/:slug', validateParams({ slug: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.valid('param').slug);
    if (!institution) {
      return c.notFound();
    }

    return c.json(toInstitutionDto(institution));
  });

  app.get('/active/:slug/projects', validateParams({ slug: safeSegment }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const institution = await institutionsRepository.getActiveInstitutionBySlug(siteId, c.req.valid('param').slug);
    if (!institution) {
      return c.notFound();
    }

    const projectSlugs = await institutionsRepository.listProjectSlugsForInstitution(siteId, institution.id);
    return c.json({ projectSlugs });
  });

  app.get('/', async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const institutions = await institutionsRepository.listInstitutions(identity.siteId);
    return c.json({ institutions: institutions.map(toInstitutionDto) });
  });

  // The logo is public: it shows on Home and the institution pages. Not limited to active
  // institutions, because the management list shows the inactive ones' logos too.
  app.get('/:id/logo', validateParams({ id: intId }), async c => {
    const siteId = await requireSiteId(c);
    if (siteId instanceof Response) {
      return siteId;
    }

    const logo = await institutionsRepository.getLogoFile(siteId, c.req.valid('param').id);
    if (!logo) {
      return c.notFound();
    }

    // The frontend adds ?v=<logoUpdatedAt> to the URL, so a new logo gets a new URL and the browser
    // may keep this one for good.
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
    return sendFile(c, logo.buffer, logo.mimeType);
  });

  app.post('/', uploadLimit(MAX_INSTITUTION_SAVE_SIZE), validateMultipart(institutionInputSchema), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { data, files } = c.req.valid('form');
    const logo = await readLogo(c, files);
    if (logo instanceof Response) {
      return logo;
    }
    if (!logo) {
      return c.json({ error: 'Logo is required' }, 400);
    }

    const institution = await institutionsRepository.createInstitution(identity.siteId, data, logo);
    return c.json(toInstitutionDto(institution), 201);
  });

  app.put(
    '/:id',
    validateParams({ id: intId }),
    uploadLimit(MAX_INSTITUTION_SAVE_SIZE),
    validateMultipart(institutionInputSchema),
    async c => {
      const identity = requireSiteAdmin(c);
      if (identity instanceof Response) {
        return identity;
      }

      const { id } = c.req.valid('param');
      const { data, files } = c.req.valid('form');

      const existing = await institutionsRepository.getInstitutionById(identity.siteId, id);
      if (!existing) {
        return c.notFound();
      }

      const logo = await readLogo(c, files);
      if (logo instanceof Response) {
        return logo;
      }
      if (!logo && !existing.logo_mime_type) {
        return c.json({ error: 'Logo is required' }, 400);
      }

      const institution = await institutionsRepository.updateInstitution(identity.siteId, id, data, logo);
      if (!institution) {
        return c.notFound();
      }

      return c.body(null, 204);
    }
  );

  app.delete('/:id', validateParams({ id: intId }), async c => {
    const identity = requireSiteAdmin(c);
    if (identity instanceof Response) {
      return identity;
    }

    const { id } = c.req.valid('param');

    const deleted = await institutionsRepository.deleteInstitution(identity.siteId, id);
    if (!deleted) {
      return c.notFound();
    }

    return c.body(null, 204);
  });

  return app;
}
