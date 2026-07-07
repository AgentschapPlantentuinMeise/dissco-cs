import React, { useEffect, useRef, useState } from 'react';
import { FieldProps } from './registry';

type CompletionItem = { uri: string; label: string; resource_class?: string };
type AutocompleteValue = { uri: string; label: string; resource_class?: string };

// Mirrors madoc-ts's AutocompleteField: `dataSource` is a URL with a `%` placeholder that gets
// replaced by the typed query, fetched directly (no auth — term-proxy is a public site endpoint),
// expecting back `{ completions: CompletionItem[] }`.
export function AutocompleteField({ field, path, onChange }: FieldProps) {
  const dataSource: string | undefined = (field as any).dataSource;
  const placeholder: string | undefined = (field as any).placeholder;
  const value: AutocompleteValue | undefined = field.value;

  const [query, setQuery] = useState(value?.label ?? '');
  const [options, setOptions] = useState<CompletionItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.uri]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  // No vocabulary endpoint configured on this field — fall back to the original plain input.
  if (!dataSource) {
    return (
      <input
        type="text"
        className="w-full border border-gray-300 rounded px-2 py-1 text-[0.9rem]"
        value={field.value ?? ''}
        onChange={e => onChange(path, e.target.value)}
      />
    );
  }

  const search = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const url = dataSource.replace('%', encodeURIComponent(text));
        console.log('[AutocompleteField] fetching', url);
        const res = await fetch(url, { signal: controller.signal });
        console.log('[AutocompleteField] response status', res.status);
        const body: { completions: CompletionItem[] } = await res.json();
        console.log('[AutocompleteField] response body', body);
        const completions = body.completions ?? [];
        // Some sources (e.g. Nager.Date's AvailableCountries) ignore the query and always return
        // everything — filter client-side so typing still narrows the list down.
        const filtered = text
          ? completions.filter(o => o.label.toLowerCase().includes(text.toLowerCase()))
          : completions;
        setOptions(filtered);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[AutocompleteField] fetch failed', e);
          setOptions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (value) onChange(path, undefined);
    search(text);
  };

  const selectOption = (option: CompletionItem) => {
    setQuery(option.label);
    setOpen(false);
    onChange(path, { uri: option.uri, label: option.label, resource_class: option.resource_class });
  };

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border border-gray-300 rounded px-2 py-1 text-[0.9rem]"
        placeholder={placeholder}
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => query && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (loading || options.length > 0) && (
        <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded mt-1 max-h-56 overflow-y-auto shadow">
          {loading && <li className="px-2 py-1 text-[0.85rem] text-gray-400">Zoeken...</li>}
          {!loading &&
            options.map(option => (
              <li
                key={option.uri}
                className="px-2 py-1 text-[0.9rem] cursor-pointer hover:bg-gray-100"
                onMouseDown={() => selectOption(option)}
              >
                {option.label}
                {option.resource_class && (
                  <span className="ml-1 text-[0.78rem] text-gray-400">({option.resource_class})</span>
                )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
