import { Pool } from 'pg';
import { NAV_ITEM_KEYS, NavItemContactEmailDto, NavItemContentKey, NavItemDto, NavItemKey, SitePageLang } from '@dissco-cs/shared-types';

export type NavItemRow = {
  site_id: number;
  page_key: NavItemKey;
  is_active: boolean;
  content: Partial<Record<SitePageLang, string>>;
  intro: Partial<Record<SitePageLang, string>>;
  contact_email: string | null;
  show_contact_form: boolean;
  sort_order: number;
  updated_at: Date;
  updated_by: number | null;
};

export class NavItemsRepository {
  constructor(
    private readonly pool: Pool,
    private readonly schemaRef: string
  ) {}

  private table(name: string): string {
    return `${this.schemaRef}.${name}`;
  }

  async getNavItems(siteId: number): Promise<NavItemRow[]> {
    const result = await this.pool.query<NavItemRow>(
      `SELECT * FROM ${this.table('nav_items')} WHERE site_id = $1`,
      [siteId]
    );

    const byKey = new Map(result.rows.map(row => [row.page_key, row]));

    // Always return every known page key, even ones that have never been toggled/edited
    // (and so have no row yet), so navbar and page management always see the full set —
    // defaulting to active with the configured default display order.
    const items: NavItemRow[] = NAV_ITEM_KEYS.map((key, defaultIndex) => {
      const existing = byKey.get(key);
      if (existing) {
        return existing;
      }
      return {
        site_id: siteId,
        page_key: key,
        is_active: true,
        content: {},
        intro: {},
        contact_email: null,
        show_contact_form: false,
        sort_order: defaultIndex,
        updated_at: new Date(),
        updated_by: null,
      };
    });

    return items.sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return NAV_ITEM_KEYS.indexOf(a.page_key) - NAV_ITEM_KEYS.indexOf(b.page_key);
    });
  }

  async setNavItemActive(siteId: number, userId: number, pageKey: NavItemKey, isActive: boolean): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table('nav_items')} (site_id, page_key, is_active, updated_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET is_active = EXCLUDED.is_active, updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, pageKey, isActive, userId]
    );
  }

  async upsertNavItemContent(
    siteId: number,
    userId: number,
    pageKey: NavItemContentKey,
    lang: SitePageLang,
    contentMd: string,
    intro: string
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table('nav_items')} (site_id, page_key, content, intro, updated_by)
      VALUES ($1, $2, jsonb_build_object($3::text, $4::text), jsonb_build_object($3::text, $5::text), $6)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET content = jsonb_set(${this.table('nav_items')}.content, ARRAY[$3::text], to_jsonb($4::text)),
          intro = jsonb_set(${this.table('nav_items')}.intro, ARRAY[$3::text], to_jsonb($5::text)),
          updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, pageKey, lang, contentMd, intro, userId]
    );
  }

  async setContactEmail(siteId: number, userId: number, email: string): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table('nav_items')} (site_id, page_key, contact_email, updated_by)
      VALUES ($1, 'contact', $2, $3)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET contact_email = EXCLUDED.contact_email, updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, email, userId]
    );
  }

  async setShowContactForm(siteId: number, userId: number, showForm: boolean): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO ${this.table('nav_items')} (site_id, page_key, show_contact_form, updated_by)
      VALUES ($1, 'contact', $2, $3)
      ON CONFLICT (site_id, page_key) DO UPDATE
      SET show_contact_form = EXCLUDED.show_contact_form, updated_at = NOW(), updated_by = EXCLUDED.updated_by
    `,
      [siteId, showForm, userId]
    );
  }

  async getContactEmail(siteId: number): Promise<string | null> {
    const result = await this.pool.query<{ contact_email: string | null; is_active: boolean }>(
      `SELECT contact_email, is_active FROM ${this.table('nav_items')} WHERE site_id = $1 AND page_key = 'contact'`,
      [siteId]
    );

    const row = result.rows[0];
    if (!row || !row.is_active) {
      return null;
    }

    return row.contact_email;
  }
}

// ---- DTO mapping ----

// The nav-items list is public: contact_email is admin-only (served by GET /nav-items/contact/email).
export function toNavItemDto(row: NavItemRow): NavItemDto {
  return {
    pageKey: row.page_key,
    isActive: row.is_active,
    content: row.content,
    intro: row.intro,
    showContactForm: row.show_contact_form,
    sortOrder: row.sort_order,
  };
}

// undefined: the site has no contact nav item yet.
export function toNavItemContactEmailDto(contactRow: NavItemRow | undefined): NavItemContactEmailDto {
  return { email: contactRow?.contact_email ?? null };
}
