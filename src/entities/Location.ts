export interface Location {
  latitude: number;
  longitude: number;
  totalEarned: number | string;
  timeStarted?: string;
  timeEnded?: string;
  day?: string;
  city?: string;
}
