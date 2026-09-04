import { describe, expect, it } from 'vitest';
import { LLMManager } from './manager';

describe('LLM provider contract', () => {
  it.each([
    ['OpenAI', 'OPENAI_API_KEY'],
    ['Anthropic', 'ANTHROPIC_API_KEY'],
    ['Google', 'GOOGLE_GENERATIVE_AI_API_KEY'],
    ['OpenRouter', 'OPEN_ROUTER_API_KEY'],
  ])('registers %s with stable identity and credential configuration', (name, apiTokenKey) => {
    const provider = LLMManager.getInstance().getProvider(name);

    expect(provider?.name).toBe(name);
    expect(provider?.config.apiTokenKey).toBe(apiTokenKey);
    expect(provider?.staticModels.every((model) => model.provider === name)).toBe(true);
  });

  it('prefers an explicit request key and provider base URL over server configuration', () => {
    const provider = LLMManager.getInstance().getProvider('OpenRouter');

    expect(provider).toBeDefined();

    expect(
      provider?.getProviderBaseUrlAndKey({
        apiKeys: { OpenRouter: 'request-key' },
        providerSettings: { enabled: true, baseUrl: 'https://gateway.example.test/' },
        serverEnv: { OPEN_ROUTER_API_KEY: 'server-key' },
        defaultBaseUrlKey: 'OPEN_ROUTER_BASE_URL',
        defaultApiTokenKey: 'OPEN_ROUTER_API_KEY',
      }),
    ).toEqual({ baseUrl: 'https://gateway.example.test', apiKey: 'request-key' });
  });
});
