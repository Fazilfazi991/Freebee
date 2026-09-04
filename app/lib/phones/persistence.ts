import { phones as normalizedSnapshot } from '~/lib/phones/data';
import type { Phone, PhoneBrand } from '~/lib/phones/schema';
import type { IngestionCandidate } from '~/lib/phones/ingestion/records';

export interface PhoneDataStore {
  getByIdentity(brand: PhoneBrand, slug: string): Phone | undefined;
  list(): readonly Phone[];
}

export interface MutablePhoneDataStore extends PhoneDataStore {
  save(phone: Phone): Promise<void>;
}

export interface AsyncPhoneDataStore {
  getByIdentity(brand: PhoneBrand, slug: string): Promise<Phone | undefined>;
  list(): Promise<readonly Phone[]>;
}

export interface AsyncMutablePhoneDataStore extends AsyncPhoneDataStore {
  writeIngestion(candidate: IngestionCandidate): Promise<void>;
}

export class JsonSnapshotPhoneStore implements PhoneDataStore {
  constructor(private readonly _records: readonly Phone[] = normalizedSnapshot) {}
  getByIdentity(brand: PhoneBrand, slug: string) {
    return this._records.find((phone) => phone.brand === brand && phone.slug === slug);
  }
  list() {
    return this._records;
  }
}
