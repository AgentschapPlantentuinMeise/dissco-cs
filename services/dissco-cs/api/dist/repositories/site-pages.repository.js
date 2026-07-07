// Order here is the default display order (navbar + page management) for sites that
// haven't customized it yet — see `sort_order` on the `site_pages` table.
export const SITE_PAGE_KEYS = ['institutions', 'forum', 'about', 'help', 'contact'];
export const SITE_PAGE_CONTENT_KEYS = ['about', 'help', 'contact'];
export const SITE_PAGE_LANGS = ['nl', 'en', 'fr', 'de'];
export class SitePagesRepository {
    pool;
    schemaRef;
    constructor(pool, schemaRef) {
        this.pool = pool;
        this.schemaRef = schemaRef;
    }
    table(name) {
        return `${this.schemaRef}.${name}`;
    }
    async getSitePages(siteId) {
        const result = await this.pool.query(`SELECT * FROM ${this.table('site_pages')} WHERE site_id = $1`, [siteId]);
        const byKey = new Map(result.rows.map(row => [row.page_key, row]));
        // Always return every known page key, even ones that have never been toggled/edited
        // (and so have no row yet), so navbar and page management always see the full set —
        // defaulting to active with the configured default display order.
        const pages = SITE_PAGE_KEYS.map((key, defaultIndex) => {
            const existing = byKey.get(key);
            if (existing) {
                return existing;
            }
            return {
                site_id: siteId,
                page_key: key,
                is_active: true,
                content: {},
                contact_email: null,
                show_contact_form: true,
                sort_order: defaultIndex,
                updated_at: new Date(),
            };
        });
        return pages.sort((a, b) => {
            if (a.sort_order !== b.sort_order) {
                return a.sort_order - b.sort_order;
            }
            return SITE_PAGE_KEYS.indexOf(a.page_key) - SITE_PAGE_KEYS.indexOf(b.page_key);
        });
    }
    async setPagesOrder(siteId, orderedKeys) {
        await this.runOrderedUpdate(orderedKeys, (client, pageKey, sortOrder) => client.query(`
        INSERT INTO ${this.table('site_pages')} (site_id, page_key, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (site_id, page_key) DO UPDATE
        SET sort_order = EXCLUDED.sort_order, updated_at = NOW()
      `, [siteId, pageKey, sortOrder]));
    }
    async setPageActive(siteId, pageKey, isActive) {
        await this.pool.query(`
      INSERT INTO ${this.table('site_pages')} (site_id, page_key, is_active)
      VALUES ($1, $2, $3)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET is_active = EXCLUDED.is_active, updated_at = NOW()
    `, [siteId, pageKey, isActive]);
    }
    async upsertPageContent(siteId, pageKey, lang, contentMd) {
        await this.pool.query(`
      INSERT INTO ${this.table('site_pages')} (site_id, page_key, content)
      VALUES ($1, $2, jsonb_build_object($3::text, $4::text))
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET content = jsonb_set(${this.table('site_pages')}.content, ARRAY[$3::text], to_jsonb($4::text)),
          updated_at = NOW()
    `, [siteId, pageKey, lang, contentMd]);
    }
    async setContactEmail(siteId, email) {
        await this.pool.query(`
      INSERT INTO ${this.table('site_pages')} (site_id, page_key, contact_email)
      VALUES ($1, 'contact', $2)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET contact_email = EXCLUDED.contact_email, updated_at = NOW()
    `, [siteId, email]);
    }
    async setShowContactForm(siteId, showForm) {
        await this.pool.query(`
      INSERT INTO ${this.table('site_pages')} (site_id, page_key, show_contact_form)
      VALUES ($1, 'contact', $2)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET show_contact_form = EXCLUDED.show_contact_form, updated_at = NOW()
    `, [siteId, showForm]);
    }
    async getContactEmail(siteId) {
        const result = await this.pool.query(`SELECT contact_email, is_active FROM ${this.table('site_pages')} WHERE site_id = $1 AND page_key = 'contact'`, [siteId]);
        const row = result.rows[0];
        if (!row || !row.is_active) {
            return null;
        }
        return row.contact_email;
    }
    async runOrderedUpdate(items, queryFor) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            for (let i = 0; i < items.length; i++) {
                await queryFor(client, items[i], i);
            }
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
}
