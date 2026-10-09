import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectQueries } from '../../api/queries/projects';
import { institutionQueries } from '../../api/queries/institutions';
import { InstitutionDto, MadocProjectDto } from '@dissco-cs/shared-types';

const MIN_QUERY_LENGTH = 2;

function matchesInternationalString(value: unknown, needle: string): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.values(value as Record<string, unknown>).some(entry => {
    if (Array.isArray(entry)) {
      return entry.some(s => typeof s === 'string' && s.toLowerCase().includes(needle));
    }
    return typeof entry === 'string' && entry.toLowerCase().includes(needle);
  });
}

export function useSearch(query: string) {
  const projectsQuery = useQuery({ ...projectQueries.listAll(), staleTime: 5 * 60 * 1000 });
  const institutionsQuery = useQuery({ ...institutionQueries.active(), staleTime: 5 * 60 * 1000 });

  const trimmed = query.trim().toLowerCase();
  const isActive = trimmed.length >= MIN_QUERY_LENGTH;

  const projects = useMemo(() => {
    if (!isActive) {
      return [];
    }
    return (projectsQuery.data || []).filter(
      (project: MadocProjectDto) =>
        project.status === 1 &&
        (matchesInternationalString(project.label, trimmed) || matchesInternationalString(project.summary, trimmed))
    );
  }, [projectsQuery.data, isActive, trimmed]);

  const institutions = useMemo(() => {
    if (!isActive) {
      return [];
    }
    return (institutionsQuery.data?.institutions || []).filter(
      (institution: InstitutionDto) =>
        matchesInternationalString(institution.name, trimmed) ||
        matchesInternationalString(institution.description, trimmed)
    );
  }, [institutionsQuery.data, isActive, trimmed]);

  return {
    isActive,
    projects,
    institutions,
    isLoading: projectsQuery.isLoading || institutionsQuery.isLoading,
  };
}
