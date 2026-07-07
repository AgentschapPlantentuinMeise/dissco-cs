import React from 'react';

export interface MiradorIframeToggleProps {
  manifestUrl: string;
  height?: string;
}

export function MiradorIframeToggle({ manifestUrl, height = '100%' }: MiradorIframeToggleProps) {
  const embedUrl = `https://projectmirador.org/embed/?iiif-content=${encodeURIComponent(manifestUrl)}`;

  return (
    <iframe
      className="block w-full border-0"
      style={{ height }}
      title="Mirador viewer"
      src={embedUrl}
      allowFullScreen
    />
  );
}
