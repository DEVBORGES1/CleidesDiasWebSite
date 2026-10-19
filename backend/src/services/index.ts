import type { Logger } from 'pino';
import type { AuthProvider } from '../integrations/auth-provider.js';
import type { MediaStorage } from '../integrations/media-storage.js';
import type { Repositories } from '../repositories/types.js';
import { AuthService } from './auth.service.js';
import { FaqService } from './faq.service.js';
import { GalleryService } from './gallery.service.js';
import { MediaService } from './media.service.js';
import { PackagesService } from './packages.service.js';
import { SectionsService } from './sections.service.js';
import { SettingsService } from './settings.service.js';
import { SiteService } from './site.service.js';
import { StepsService } from './steps.service.js';

export interface Services {
  auth: AuthService;
  media: MediaService;
  packages: PackagesService;
  gallery: GalleryService;
  faq: FaqService;
  steps: StepsService;
  sections: SectionsService;
  settings: SettingsService;
  site: SiteService;
}

export function createServices(deps: { repos: Repositories; authProvider: AuthProvider; storage: MediaStorage; logger: Logger }): Services {
  const { repos } = deps;
  const media = new MediaService(repos, deps.storage, deps.logger);
  const sections = new SectionsService(repos, media);
  return {
    auth: new AuthService(deps.authProvider, repos),
    media,
    packages: new PackagesService(repos, media),
    gallery: new GalleryService(repos, media, sections),
    faq: new FaqService(repos),
    steps: new StepsService(repos, media),
    sections,
    settings: new SettingsService(repos, media),
    site: new SiteService(repos, sections, media),
  };
}
