export const FINCA_LAT = Number(process.env.NEXT_PUBLIC_FINCA_LAT ?? -17.73902);
export const FINCA_LNG = Number(process.env.NEXT_PUBLIC_FINCA_LNG ?? -62.57987);
export const FINCA_ZOOM = 15;

export const TILE_URL_SATELITAL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const TILE_ATTRIBUTION_SATELITAL =
  "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community";

export const TILE_URL_ETIQUETAS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
export const TILE_ATTRIBUTION_ETIQUETAS = "Esri, Garmin, HERE, USGS";
