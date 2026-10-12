import { InstitutionDto } from '@dissco-cs/shared-types';
import { InstitutionRow } from '../repositories/institutions.repository.js';

// created_at/updated_at are DB bookkeeping (see InstitutionRow), never part of the wire DTO.
export function toInstitutionDto(row: InstitutionRow): InstitutionDto {
  const { created_at, updated_at, ...dto } = row;
  return dto;
}
