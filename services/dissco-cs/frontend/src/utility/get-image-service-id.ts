export function getImageServiceId(canvas: any): string | undefined {
  const annotation = canvas?.items?.[0]?.items?.[0];
  const body = Array.isArray(annotation?.body) ? annotation.body[0] : annotation?.body;
  const service = Array.isArray(body?.service) ? body.service[0] : body?.service;
  return service?.id || service?.['@id'];
}
