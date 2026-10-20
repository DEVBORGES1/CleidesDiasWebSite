import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../services/api';

export const adminKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  packages: ['admin', 'packages'] as const,
  gallery: ['admin', 'gallery'] as const,
  faq: ['admin', 'faq'] as const,
  steps: ['admin', 'steps'] as const,
  lots: ['admin', 'lots'] as const,
  sections: ['admin', 'sections'] as const,
  settings: ['admin', 'settings'] as const,
  media: ['admin', 'media'] as const,
};

export const useDashboard = () => useQuery({ queryKey: adminKeys.dashboard, queryFn: adminApi.dashboard });
export const usePackages = () => useQuery({ queryKey: adminKeys.packages, queryFn: adminApi.packages.list });
export const useGallery = () => useQuery({ queryKey: adminKeys.gallery, queryFn: adminApi.gallery.list });
export const useFaq = () => useQuery({ queryKey: adminKeys.faq, queryFn: adminApi.faq.list });
export const useSteps = () => useQuery({ queryKey: adminKeys.steps, queryFn: adminApi.steps.list });
export const useLots = () => useQuery({ queryKey: adminKeys.lots, queryFn: adminApi.lots.list });
export const useSections = () => useQuery({ queryKey: adminKeys.sections, queryFn: adminApi.sections.list });
export const useSettings = () => useQuery({ queryKey: adminKeys.settings, queryFn: adminApi.settings.get });
export const useMediaStatus = () => useQuery({ queryKey: adminKeys.media, queryFn: adminApi.media.status, staleTime: 5 * 60_000 });
