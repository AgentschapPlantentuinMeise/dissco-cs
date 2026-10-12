import { NavItemDto } from '@dissco-cs/shared-types';
import { NavItemRow } from '../repositories/nav-items.repository.js';

// The nav-items list is public: site_id/updated_at are bookkeeping and contact_email is
// admin-only (served by GET /nav-items/contact/email).
export function toNavItemDto(row: NavItemRow): NavItemDto {
  return {
    page_key: row.page_key,
    is_active: row.is_active,
    content: row.content,
    show_contact_form: row.show_contact_form,
    sort_order: row.sort_order,
  };
}
