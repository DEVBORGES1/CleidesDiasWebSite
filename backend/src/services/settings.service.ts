import { pickPresent, siteSettingsUpdateSchema, type SiteSettings } from '@cleides/shared';
import { parse } from '../lib/validation.js';
import type { Repositories, SettingsRecord } from '../repositories/types.js';
import type { MediaService } from './media.service.js';

export class SettingsService {
  constructor(
    private readonly repos: Repositories,
    private readonly media: MediaService,
  ) {}

  get(): Promise<SiteSettings> {
    return this.repos.settings.get();
  }

  async update(raw: unknown, userId: string | null): Promise<SiteSettings> {
    const input = pickPresent(parse(siteSettingsUpdateSchema, raw), raw);
    const { logo, seoImage, ...rest } = input;
    const patch: Partial<SettingsRecord> = { ...rest };
    if ('logo' in input) patch.logo = await this.media.resolveImage(logo);
    if ('seoImage' in input) patch.seoImage = await this.media.resolveImage(seoImage);
    return this.repos.settings.update(patch, userId);
  }
}
