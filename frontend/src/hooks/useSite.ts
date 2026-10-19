import { useQuery } from '@tanstack/react-query';
import { adminApi, publicApi } from '../services/api';

export const siteQueryKey = (preview: boolean) => ['site', preview ? 'preview' : 'public'] as const;

/**
 * Conteúdo do site. Visitantes recebem só o que está publicado; com `preview`,
 * a administradora logada vê também os rascunhos (endpoint protegido).
 */
export function useSite(preview: boolean) {
  return useQuery({
    queryKey: siteQueryKey(preview),
    queryFn: ({ signal }) => (preview ? adminApi.preview() : publicApi.site(signal)),
    staleTime: preview ? 0 : 30_000,
    refetchOnWindowFocus: true,
  });
}
