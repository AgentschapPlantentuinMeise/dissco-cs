import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SITE_COLOR_KEYS, SiteColorKey, SiteColors } from '@dissco-cs/shared-types';
import { siteThemeKeys, siteThemeQueries } from '../../../api/queries/site-theme';
import { siteThemeApi } from '../../../api/cs-client/site-theme';
import { contrastWarnings, DEFAULT_SITE_COLORS, isHexColor } from './palette';

// The colors form: the stored palette (or the defaults) plus the admin's unsaved edits.
export function useSiteColors() {
  const queryClient = useQueryClient();
  const { data: stored, isPending: isLoading } = useQuery(siteThemeQueries.get());
  const [edits, setEdits] = useState<SiteColors | null>(null);

  const colors = edits ?? stored ?? DEFAULT_SITE_COLORS;
  const isValid = SITE_COLOR_KEYS.every(key => isHexColor(colors[key]));
  const warnings = contrastWarnings(colors);

  // Invalidating the theme query lets SiteColorsSync apply the new palette to the whole site.
  const onWritten = async () => {
    await queryClient.invalidateQueries({ queryKey: siteThemeKeys.all });
    setEdits(null);
  };

  const save = useMutation({
    mutationFn: () => siteThemeApi.setColors(colors),
    onSuccess: onWritten,
  });

  const reset = useMutation({
    mutationFn: () => siteThemeApi.deleteColors(),
    onSuccess: onWritten,
  });

  const setColor = (key: SiteColorKey, value: string) => setEdits({ ...colors, [key]: value });

  return {
    colors,
    isLoading,
    isDirty: edits !== null,
    isValid,
    hasOwnPalette: !!stored,
    warnings,
    setColor,
    discard: () => setEdits(null),
    save,
    reset,
  };
}
