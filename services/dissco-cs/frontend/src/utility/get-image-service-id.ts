// IIIF canvas JSON isn't modeled as a shared type -- this is the only place that reaches into
// its structure, doing its own narrow, defensive traversal down to the image service's id.
type IIIFAnnotationBody = { id?: string; '@id'?: string; service?: unknown };

export function getImageServiceId(canvas: unknown): string | undefined {
  const items = (canvas as { items?: unknown[] } | undefined)?.items;
  const annotationItems = (items?.[0] as { items?: unknown[] } | undefined)?.items;
  const annotation = annotationItems?.[0] as { body?: unknown } | undefined;
  const rawBody = annotation?.body;
  const body = (Array.isArray(rawBody) ? rawBody[0] : rawBody) as IIIFAnnotationBody | undefined;
  const rawService = body?.service;
  const service = (Array.isArray(rawService) ? rawService[0] : rawService) as IIIFAnnotationBody | undefined;
  return service?.id || service?.['@id'];
}
