import { useForm, get, type DefaultValues, type FieldValues, type Path, type RegisterOptions } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { fieldErrorKey, formIssueKey } from '../utility/form-errors';

/**
 * A form checked against a zod schema, with our own messages instead of the browser's: a field
 * shows its error once the user leaves it, and every field does at the first submit (react-hook-form's
 * "onTouched"). Put noValidate on the <form>, so the browser does not check it first.
 * @param schema the zod schema for the values (often the shared one the backend also checks)
 * @param defaultValues the starting values
 * Returns: react-hook-form's form, plus field(name) to spread on an input (register + aria-invalid,
 * which also turns its border red) and errorFor(name), the translated message for FormField's error.
 */
export function useValidatedForm<TInput extends FieldValues, TOutput extends FieldValues>(
  schema: z.ZodType<TOutput, TInput>,
  defaultValues: DefaultValues<TInput>
) {
  const { t } = useTranslation('dissco-cs');
  const form = useForm<TInput, unknown, TOutput>({
    mode: 'onTouched',
    resolver: zodResolver(schema, { error: formIssueKey }),
    defaultValues,
  });

  const errorFor = (name: Path<TInput>) => {
    const key = fieldErrorKey(get(form.formState.errors, name));
    return key ? t(key) : undefined;
  };

  const field = (name: Path<TInput>, options?: RegisterOptions<TInput, Path<TInput>>) => ({
    ...form.register(name, options),
    'aria-invalid': !!get(form.formState.errors, name),
  });

  return { ...form, errorFor, field };
}
