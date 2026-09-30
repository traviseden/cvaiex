import catalog from '../../public/data/storefronts.json';
import { assertStorefrontCatalog } from '../lib/storefront-catalog.mjs';

export interface MallPhoto {
  id: string; src: string; alt: string; creator: string; license: string;
  licenseUrl: string; source: string; capturedAt: string; changes: string; fileTitle?: string;
}
export interface MallBusiness {
  id: string; name: string; category: string; address: string; website: string; description: string;
  aliases: string[]; operatingStatus: 'listed' | 'closed' | 'unknown'; verifiedAt: string;
  sources: string[]; photoId: string | null;
}
export interface StorefrontSlot {
  id: string; address: string; side: 'north' | 'south'; along: number; width: number; height: number;
  businessId: string | null;
  appearance: { brick: string; trim: string; accent: string; awning: boolean; facadeImageId?: string | null };
}
export interface MallLandmark { id: string; name: string; kind: 'pavilion' | 'chalkboard'; along: number; x: number; description: string; source: string; }
export interface MusicVenue { id: string; title: string; verifiedAt: string; source: string; performers: { name: string; date: string; source: string; note?: string }[]; }
export interface StorefrontCatalog {
  $schema?: string; schemaVersion: 1; revision: number; updatedAt: string;
  district: { id: 'downtown-mall'; name: string; description: string; layoutNote: string; length: number; sources: string[]; facts: { title: string; text: string; source: string }[]; streetscape?: { width: number; treeOffset: number; treeSpacing: number; walkLane: number } };
  businesses: MallBusiness[]; slots: StorefrontSlot[]; media: MallPhoto[];
  landmarks?: MallLandmark[];
  chalkboard?: { heading: string; lines: string[]; cheer: string; editable: false; artNote: string };
  musicVenues?: MusicVenue[];
}
export const storefrontCatalog: StorefrontCatalog = assertStorefrontCatalog(catalog);
