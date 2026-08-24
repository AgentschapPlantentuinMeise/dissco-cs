import { publicRequest } from './request';

// -- Current user (site-scoped public API) --
export const getUserDetails = () => publicRequest<any>('/me');
