import { AnnouncementDto } from '@dissco-cs/shared-types';
import { AnnouncementRow } from '../repositories/announcements.repository.js';

// created_at is DB bookkeeping (see AnnouncementRow), never part of the wire DTO.
export function toAnnouncementDto(row: AnnouncementRow): AnnouncementDto {
  const { created_at, start_date, end_date, ...rest } = row;
  return {
    ...rest,
    start_date: start_date ? start_date.toISOString() : null,
    end_date: end_date ? end_date.toISOString() : null,
  };
}
