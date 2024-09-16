export interface Place {
  latitude: number;
  longitude: number;
  id?: string;
  name?: string;
  cleanRating?: number;
  facilitiesRating?: number;
  privacyRating?: number;
  notes?: string | string[];
}
