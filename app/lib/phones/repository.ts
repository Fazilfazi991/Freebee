import { JsonSnapshotPhoneStore, type PhoneDataStore } from '~/lib/phones/persistence';
import type { Phone, PhoneBrand, PhoneFilters } from '~/lib/phones/schema';

export interface PhoneRepository {
  getPhone(brand: string, slug: string): Phone | undefined;
  getPhones(): Phone[];
  getPhonesByBrand(brand: PhoneBrand): Phone[];
  comparePhones(slugs: string[]): Phone[];
  findPhones(filters: PhoneFilters): Phone[];
}

const searchable = (p: Phone) =>
  `${p.brand} ${p.model} ${p.memory.storageOptionsGb.map((x) => `${x}gb`).join(' ')} ${p.display.refreshRateMaxHz ? `${p.display.refreshRateMaxHz}hz phone` : ''}`.toLowerCase();
export class SnapshotPhoneRepository implements PhoneRepository {
  constructor(private readonly _store: PhoneDataStore = new JsonSnapshotPhoneStore()) {}
  getPhone(brand: string, slug: string) {
    if (!['apple', 'samsung', 'google'].includes(brand)) {
      return undefined;
    }

    const phone = this._store.getByIdentity(brand as PhoneBrand, slug);

    return phone?.publicationState === 'published' ? phone : undefined;
  }
  getPhones() {
    return this._store.list().filter((p) => p.publicationState === 'published');
  }
  getPhonesByBrand(brand: PhoneBrand) {
    return this.getPhones().filter((p) => p.brand === brand);
  }
  comparePhones(slugs: string[]) {
    return slugs.map((slug) => this.getPhones().find((p) => p.slug === slug)).filter((p): p is Phone => Boolean(p));
  }
  findPhones(f: PhoneFilters) {
    return this.getPhones().filter(
      (p) =>
        (!f.query ||
          f.query
            .toLowerCase()
            .split(/\s+/)
            .every((token) => searchable(p).includes(token))) &&
        (!f.brand || p.brand === f.brand) &&
        (!f.minDisplay || (!!p.display.sizeInches && p.display.sizeInches >= f.minDisplay)) &&
        (!f.maxDisplay || (!!p.display.sizeInches && p.display.sizeInches <= f.maxDisplay)) &&
        (!f.minRefreshRate || (!!p.display.refreshRateMaxHz && p.display.refreshRateMaxHz >= f.minRefreshRate)) &&
        (!f.storageGb || p.memory.storageOptionsGb.includes(f.storageGb)) &&
        (!f.maxWeightG || (!!p.dimensions.weightG && p.dimensions.weightG <= f.maxWeightG)) &&
        (!f.minBatteryMah || (!!p.battery.capacityMah && p.battery.capacityMah >= f.minBatteryMah)) &&
        (!f.esim || p.sim.esim === true) &&
        (!f.nfc || p.connectivity.nfc === true) &&
        (!f.ipRating || p.design.ipRating === f.ipRating),
    );
  }
}
export const phoneRepository = new SnapshotPhoneRepository();
