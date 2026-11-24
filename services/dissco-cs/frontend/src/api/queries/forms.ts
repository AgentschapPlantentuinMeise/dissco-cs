import { queryOptions } from '@tanstack/react-query';
import { formsApi } from '../cs-client/forms';

// The forms (admin). What a project's annotation page uses is projectQueries.formLayout.
export const formKeys = {
  all: ['forms'] as const,
  list: () => [...formKeys.all, 'list'] as const,
  fields: (formName: string) => [...formKeys.all, 'fields', formName] as const,
};

export const formQueries = {
  list: () => queryOptions({ queryKey: formKeys.list(), queryFn: () => formsApi.list() }),
  fields: (formName: string) =>
    queryOptions({ queryKey: formKeys.fields(formName), queryFn: () => formsApi.getFields(formName), enabled: !!formName }),
};
