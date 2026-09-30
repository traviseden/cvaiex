import config from '../../public/data/community-tour.json';
export interface TourStop { placeId: string; note: string; cameraOffset: [number, number, number]; durationMs: number; }
export interface TourConfig { id: string; name: string; description: string; stops: TourStop[]; }
export const communityTour = config as TourConfig;
