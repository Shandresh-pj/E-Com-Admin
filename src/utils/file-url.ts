import { environment } from 'src/environment/environment';

export function toFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${environment.apiUrl.replace(/\/api\/?$/, '')}${path}`;
}
