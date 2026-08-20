import { readFileSync } from 'fs';

import { appConfig } from '../config.js';

export function getServiceJwt(): string {
  const jwtJsonString = readFileSync(appConfig.madocServiceJwtPath).toString('utf-8');
  return JSON.parse(jwtJsonString).token;
}
