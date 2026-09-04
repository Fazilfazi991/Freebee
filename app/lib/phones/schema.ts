export type PhoneBrand = 'apple' | 'samsung' | 'google';
export type DataQuality = 'verified' | 'partial' | 'needs-review';

export interface Provenance {
  sourceUrl: string;
  sourceSection: string;
  sourceText: string;
  verifiedAt: string;
}
export interface CameraSpec {
  role?: string;
  megapixels?: number;
  aperture?: number;
  opticalZoom?: number;
  stabilization?: string;
}
export interface Phone {
  id: string;
  slug: string;
  brand: PhoneBrand;
  model: string;
  series: string;
  variantName?: string;
  announcedDate?: string;
  releaseDate?: string;
  discontinued?: boolean;
  quality: DataQuality;
  source: {
    manufacturer: string;
    officialUrl: string;
    region: string;
    retrievedAt: string;
    sourceHash: string;
    lastCheckedAt: string;
    lastChangedAt: string;
  };
  provenance: Record<string, Provenance>;
  design: { colors: string[]; materials?: string; ipRating?: string };
  dimensions: { heightMm?: number; widthMm?: number; depthMm?: number; weightG?: number };
  display: {
    sizeInches?: number;
    technology?: string;
    resolutionWidth?: number;
    resolutionHeight?: number;
    ppi?: number;
    refreshRateMaxHz?: number;
    refreshRateMinHz?: number;
    refreshRateAdaptive?: boolean;
    brightnessTypicalNits?: number;
    brightnessPeakNits?: number;
    hdr?: boolean;
  };
  performance: { chipset?: string; cpu?: string; gpu?: string; neuralProcessor?: string };
  memory: { ramGb?: number; storageOptionsGb: number[]; expandableStorage?: boolean };
  rearCameras: CameraSpec[];
  frontCameras: CameraSpec[];
  battery: {
    capacityMah?: number;
    videoPlaybackHours?: number;
    wiredChargingWatts?: number;
    wirelessChargingWatts?: number;
    fastChargeClaim?: string;
  };
  connectivity: { cellular?: string; wifi?: string; bluetooth?: string; nfc?: boolean; uwb?: boolean; usb?: string };
  sim: { physicalSim?: boolean; esim?: boolean; dualSim?: boolean };
  software: { operatingSystem?: string; updatePolicy?: string; securityUpdatesUntil?: string };
}

export interface PhoneFilters {
  query?: string;
  brand?: PhoneBrand;
  minDisplay?: number;
  maxDisplay?: number;
  minRefreshRate?: number;
  storageGb?: number;
  maxWeightG?: number;
  minBatteryMah?: number;
  esim?: boolean;
  nfc?: boolean;
  ipRating?: string;
}
