export interface SecretMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecretStore {
  storeSecret(scopeId: string, name: string, value: string): Promise<SecretMetadata>;
  getSecret(scopeId: string, name: string): Promise<string | undefined>;
  deleteSecret(scopeId: string, name: string): Promise<void>;
  listSecretMetadata(scopeId: string): Promise<SecretMetadata[]>;
}
