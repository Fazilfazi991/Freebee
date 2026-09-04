import type { SecretMetadata, SecretStore } from './types';

interface StoredSecret extends SecretMetadata {
  value: string;
}

export class MemorySecretStore implements SecretStore {
  #scopes = new Map<string, Map<string, StoredSecret>>();

  async storeSecret(scopeId: string, name: string, value: string) {
    if (!scopeId || !name || !value.trim()) {
      throw new Error('Scope, secret name, and value are required');
    }

    const secrets = this.#scopes.get(scopeId) ?? new Map<string, StoredSecret>();
    const existing = secrets.get(name);
    const now = new Date().toISOString();
    const stored = { name, value, createdAt: existing?.createdAt ?? now, updatedAt: now };
    secrets.set(name, stored);
    this.#scopes.set(scopeId, secrets);

    return this._toMetadata(stored);
  }

  async getSecret(scopeId: string, name: string) {
    return this.#scopes.get(scopeId)?.get(name)?.value;
  }

  async deleteSecret(scopeId: string, name: string) {
    this.#scopes.get(scopeId)?.delete(name);
  }

  async listSecretMetadata(scopeId: string) {
    return [...(this.#scopes.get(scopeId)?.values() ?? [])].map((secret) => this._toMetadata(secret));
  }

  private _toMetadata({ name, createdAt, updatedAt }: StoredSecret): SecretMetadata {
    return { name, createdAt, updatedAt };
  }
}
