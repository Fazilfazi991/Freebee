import type { Phone, PhoneBrand, Provenance } from './schema';

const checked = '2026-09-04T00:00:00.000Z';
const p = (url: string, section: string, sourceText: string): Provenance => ({
  sourceUrl: url,
  sourceSection: section,
  sourceText,
  verifiedAt: checked,
});
const apple17 = 'https://www.apple.com/ae/iphone-17/specs/';
const applePro = 'https://www.apple.com/ae/iphone-17-pro/specs/';
const samsung = 'https://www.samsung.com/ae/smartphones/galaxy-s26/specs/';
const google = 'https://store.google.com/product/pixel_10_specs?hl=en-US';
const googlePro = 'https://store.google.com/product/pixel_10_pro_specs?hl=en-US';

type Seed = Omit<
  Phone,
  | 'id'
  | 'source'
  | 'provenance'
  | 'quality'
  | 'design'
  | 'dimensions'
  | 'display'
  | 'performance'
  | 'memory'
  | 'rearCameras'
  | 'frontCameras'
  | 'battery'
  | 'connectivity'
  | 'sim'
  | 'software'
> &
  Partial<Phone> & { url: string; region: string };

const make = (x: Seed): Phone => {
  const manufacturer = x.brand === 'apple' ? 'Apple' : x.brand === 'samsung' ? 'Samsung' : 'Google';
  const provenance = x.provenance ?? {
    display: p(
      x.url,
      'Display',
      `${x.display?.sizeInches ?? 'Unknown'} inch; up to ${x.display?.refreshRateMaxHz ?? 'unknown'} Hz`,
    ),
    dimensions: p(x.url, 'Dimensions and weight', `${x.dimensions?.weightG ?? 'Unknown'} g`),
    memory: p(
      x.url,
      'Memory and storage',
      x.memory?.storageOptionsGb?.map((v) => `${v} GB`).join(', ') ?? 'Not stated',
    ),
    battery: p(
      x.url,
      'Battery and charging',
      x.battery?.capacityMah
        ? `${x.battery.capacityMah} mAh`
        : `${x.battery?.videoPlaybackHours ?? 'Unknown'} hours video playback`,
    ),
  };

  return {
    id: `${x.brand}-${x.slug}`,
    slug: x.slug,
    brand: x.brand,
    model: x.model,
    series: x.series,
    variantName: x.variantName,
    releaseDate: x.releaseDate,
    quality: x.quality ?? 'verified',
    source: {
      manufacturer,
      officialUrl: x.url,
      region: x.region,
      retrievedAt: checked,
      lastCheckedAt: checked,
      lastChangedAt: checked,
      sourceHash: `poc-${x.slug}-20260904`,
    },
    provenance,
    design: x.design ?? { colors: [] },
    dimensions: x.dimensions ?? {},
    display: x.display ?? {},
    performance: x.performance ?? {},
    memory: x.memory ?? { storageOptionsGb: [] },
    rearCameras: x.rearCameras ?? [],
    frontCameras: x.frontCameras ?? [],
    battery: x.battery ?? {},
    connectivity: x.connectivity ?? {},
    sim: x.sim ?? {},
    software: x.software ?? {},
  };
};

const appleBase = {
  brand: 'apple' as PhoneBrand,
  series: 'iPhone 17',
  region: 'AE',
  display: {
    technology: 'Super Retina XDR OLED',
    refreshRateMaxHz: 120,
    refreshRateMinHz: 1,
    refreshRateAdaptive: true,
    brightnessPeakNits: 3000,
    hdr: true,
  },
  design: { colors: ['Silver', 'Cosmic Orange', 'Deep Blue'], materials: 'Aluminum', ipRating: 'IP68' },
  performance: { chipset: 'A19 Pro' },
  connectivity: { cellular: '5G', wifi: 'Wi‑Fi 7', bluetooth: 'Bluetooth 6', nfc: true, uwb: true, usb: 'USB-C' },
  sim: { physicalSim: false, esim: true, dualSim: true },
  software: { operatingSystem: 'iOS 26' },
};
export const phones: Phone[] = [
  make({
    brand: 'apple',
    slug: 'iphone-17',
    model: 'iPhone 17',
    series: 'iPhone 17',
    url: apple17,
    region: 'AE',
    releaseDate: '2025-09-19',
    design: { colors: ['Black', 'White', 'Mist Blue', 'Sage', 'Lavender'], materials: 'Aluminum', ipRating: 'IP68' },
    dimensions: { heightMm: 149.6, widthMm: 71.5, depthMm: 7.95, weightG: 177 },
    display: {
      sizeInches: 6.3,
      technology: 'Super Retina XDR OLED',
      resolutionWidth: 1206,
      resolutionHeight: 2622,
      ppi: 460,
      refreshRateMaxHz: 120,
      refreshRateAdaptive: true,
      brightnessTypicalNits: 1000,
      brightnessPeakNits: 3000,
      hdr: true,
    },
    performance: { chipset: 'A19', cpu: '6-core CPU', gpu: '5-core GPU', neuralProcessor: '16-core Neural Engine' },
    memory: { storageOptionsGb: [256, 512], expandableStorage: false },
    rearCameras: [
      { role: 'Main', megapixels: 48, aperture: 1.6, stabilization: 'Sensor-shift OIS' },
      { role: 'Ultra Wide', megapixels: 48, aperture: 2.2 },
    ],
    frontCameras: [{ role: 'Center Stage', megapixels: 18 }],
    battery: { videoPlaybackHours: 30, fastChargeClaim: 'Up to 50% in 20 minutes' },
    connectivity: { cellular: '5G', wifi: 'Wi‑Fi 7', bluetooth: 'Bluetooth 6', nfc: true, uwb: true, usb: 'USB-C' },
    sim: { physicalSim: false, esim: true, dualSim: true },
    software: { operatingSystem: 'iOS 26' },
  }),
  make({
    ...appleBase,
    slug: 'iphone-17-pro',
    model: 'iPhone 17 Pro',
    url: applePro,
    releaseDate: '2025-09-19',
    dimensions: { heightMm: 150, widthMm: 71.9, depthMm: 8.75, weightG: 206 },
    display: { ...appleBase.display, sizeInches: 6.3, resolutionWidth: 1206, resolutionHeight: 2622, ppi: 460 },
    memory: { storageOptionsGb: [256, 512, 1024], expandableStorage: false },
    rearCameras: [
      { role: 'Main', megapixels: 48 },
      { role: 'Ultra Wide', megapixels: 48 },
      { role: 'Telephoto', megapixels: 48, opticalZoom: 4 },
    ],
    frontCameras: [{ role: 'Center Stage', megapixels: 18 }],
    battery: { videoPlaybackHours: 33, wirelessChargingWatts: 25, fastChargeClaim: 'Up to 50% in 20 minutes' },
  }),
  make({
    ...appleBase,
    slug: 'iphone-17-pro-max',
    model: 'iPhone 17 Pro Max',
    url: applePro,
    releaseDate: '2025-09-19',
    dimensions: { heightMm: 163.4, widthMm: 78, depthMm: 8.75, weightG: 233 },
    display: { ...appleBase.display, sizeInches: 6.9, resolutionWidth: 1320, resolutionHeight: 2868, ppi: 460 },
    memory: { storageOptionsGb: [256, 512, 1024, 2048], expandableStorage: false },
    rearCameras: [
      { role: 'Main', megapixels: 48 },
      { role: 'Ultra Wide', megapixels: 48 },
      { role: 'Telephoto', megapixels: 48, opticalZoom: 4 },
    ],
    frontCameras: [{ role: 'Center Stage', megapixels: 18 }],
    battery: { videoPlaybackHours: 39, wirelessChargingWatts: 25, fastChargeClaim: 'Up to 50% in 20 minutes' },
  }),
  ...(
    [
      ['galaxy-s26', 'Galaxy S26', 6.3, 167, 4300, [256, 512]],
      ['galaxy-s26-plus', 'Galaxy S26+', 6.7, 190, 4900, [256, 512]],
      ['galaxy-s26-ultra', 'Galaxy S26 Ultra', 6.9, 214, 5000, [256, 512, 1024]],
    ] as const
  ).map(([slug, model, size, weight, battery, storage]) =>
    make({
      brand: 'samsung',
      slug,
      model,
      series: 'Galaxy S26',
      url: samsung,
      region: 'AE',
      releaseDate: '2026-02-25',
      design: {
        colors: ['Cobalt Violet', 'Sky Blue', 'Black', 'White', 'Silver Shadow', 'Pink Gold'],
        materials: 'Armor Aluminum',
        ipRating: 'IP68',
      },
      dimensions: { depthMm: model.includes('Ultra') ? 7.9 : model.includes('+') ? 7.3 : 7.2, weightG: weight },
      display: {
        sizeInches: size,
        technology: 'Dynamic AMOLED 2X',
        refreshRateMaxHz: 120,
        brightnessPeakNits: 2600,
        hdr: true,
      },
      performance: { chipset: model.includes('Ultra') ? 'Snapdragon 8 Elite Gen 5 for Galaxy' : 'Exynos 2600' },
      memory: { ramGb: 12, storageOptionsGb: [...storage], expandableStorage: false },
      rearCameras: model.includes('Ultra')
        ? [
            { role: 'Main', megapixels: 200, aperture: 1.4 },
            { role: 'Ultra Wide', megapixels: 50, aperture: 1.9 },
            { role: 'Telephoto', megapixels: 50, aperture: 2.9 },
          ]
        : [
            { role: 'Main', megapixels: 50, aperture: 1.8 },
            { role: 'Ultra Wide', megapixels: 12, aperture: 2.2 },
            { role: 'Telephoto', megapixels: 10, aperture: 2.4, opticalZoom: 3 },
          ],
      frontCameras: [{ role: 'Selfie', megapixels: 12, aperture: 2.2 }],
      battery: { capacityMah: battery, videoPlaybackHours: model === 'Galaxy S26' ? 30 : 31 },
      connectivity: { cellular: '5G', wifi: 'Wi‑Fi', bluetooth: 'Bluetooth', nfc: true, usb: 'USB-C' },
      sim: { esim: true, dualSim: true },
      software: { operatingSystem: 'Android 16 / One UI 8.5', updatePolicy: 'Up to 7 years of updates' },
    }),
  ),
  make({
    brand: 'google',
    slug: 'pixel-10',
    model: 'Pixel 10',
    series: 'Pixel 10',
    url: google,
    region: 'US',
    releaseDate: '2025-08-28',
    design: {
      colors: ['Indigo', 'Frost', 'Lemongrass', 'Obsidian'],
      materials: 'Aluminum and Gorilla Glass Victus 2',
      ipRating: 'IP68',
    },
    dimensions: { heightMm: 152.4, widthMm: 71.1, depthMm: 7.62, weightG: 204 },
    display: {
      sizeInches: 6.3,
      technology: 'Actua OLED',
      resolutionWidth: 1080,
      resolutionHeight: 2424,
      ppi: 422,
      refreshRateMinHz: 60,
      refreshRateMaxHz: 120,
      refreshRateAdaptive: true,
      brightnessTypicalNits: 2000,
      brightnessPeakNits: 3000,
      hdr: true,
    },
    performance: { chipset: 'Google Tensor G5', neuralProcessor: 'Titan M2' },
    memory: { ramGb: 12, storageOptionsGb: [128, 256], expandableStorage: false },
    rearCameras: [
      { role: 'Main', megapixels: 48, aperture: 1.7, stabilization: 'OIS' },
      { role: 'Ultra Wide', megapixels: 13, aperture: 2.2 },
      { role: 'Telephoto', megapixels: 10.8, aperture: 3.1, opticalZoom: 5, stabilization: 'OIS' },
    ],
    frontCameras: [{ role: 'Selfie', megapixels: 10.5, aperture: 2.2 }],
    battery: { capacityMah: 4970, wirelessChargingWatts: 15, fastChargeClaim: 'Up to 55% in about 30 minutes' },
    connectivity: { cellular: '5G', wifi: 'Wi‑Fi 6E', bluetooth: 'Bluetooth 6', nfc: true, usb: 'USB-C 3.2' },
    sim: { physicalSim: false, esim: true, dualSim: true },
    software: { operatingSystem: 'Android 16', updatePolicy: '7 years of OS, security, and Pixel Drop updates' },
  }),
  ...(
    [
      ['pixel-10-pro', 'Pixel 10 Pro', 6.3, 207, 4870, [128, 256, 512, 1024], 15],
      ['pixel-10-pro-xl', 'Pixel 10 Pro XL', 6.8, 232, 5200, [256, 512, 1024], 25],
    ] as const
  ).map(([slug, model, size, weight, battery, storage, wireless]) =>
    make({
      brand: 'google',
      slug,
      model,
      series: 'Pixel 10',
      url: googlePro,
      region: 'US',
      releaseDate: '2025-08-28',
      design: {
        colors: ['Moonstone', 'Jade', 'Porcelain', 'Obsidian'],
        materials: 'Aluminum and Gorilla Glass Victus 2',
        ipRating: 'IP68',
      },
      dimensions: { weightG: weight },
      display: {
        sizeInches: size,
        technology: 'Super Actua LTPO OLED',
        refreshRateMinHz: 1,
        refreshRateMaxHz: 120,
        refreshRateAdaptive: true,
        brightnessTypicalNits: 2200,
        brightnessPeakNits: 3300,
        hdr: true,
      },
      performance: { chipset: 'Google Tensor G5', neuralProcessor: 'Titan M2' },
      memory: { ramGb: 16, storageOptionsGb: [...storage], expandableStorage: false },
      rearCameras: [
        { role: 'Main', megapixels: 50 },
        { role: 'Ultra Wide', megapixels: 48 },
        { role: 'Telephoto', megapixels: 48, opticalZoom: 5 },
      ],
      frontCameras: [{ role: 'Selfie', megapixels: 42 }],
      battery: {
        capacityMah: battery,
        wirelessChargingWatts: wireless,
        fastChargeClaim: model.includes('XL') ? 'Up to 70% in about 30 minutes' : 'Up to 55% in about 30 minutes',
      },
      connectivity: {
        cellular: '5G',
        wifi: 'Wi‑Fi 7',
        bluetooth: 'Bluetooth 6',
        nfc: true,
        uwb: true,
        usb: 'USB-C 3.2',
      },
      sim: { esim: true, dualSim: true },
      software: { operatingSystem: 'Android 16', updatePolicy: '7 years of OS, security, and Pixel Drop updates' },
    }),
  ),
];
