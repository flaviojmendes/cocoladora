export interface Location {
  id?: number | string;
  latitude: number;
  longitude: number;
  totalearned: number | string;
  timestarted?: string;
  timeended?: string;
  day?: string;
  city?: string;
  mine?: boolean;
}
