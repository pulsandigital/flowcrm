export interface BrandSettings {
  businessName: string;
  subtitle: string;
  logoUrl: string;
  professionalName: string;
  professionalPhotoUrl: string;
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  businessName: 'Nucleus',
  subtitle: 'HEALTH PLATFORM',
  logoUrl: '',
  professionalName: '',
  professionalPhotoUrl: '',
};

export const BRAND_STORAGE_KEY = 'nucleus_brand_settings';

export function getBrandSettings(): BrandSettings {
  try {
    return {
      ...DEFAULT_BRAND_SETTINGS,
      ...JSON.parse(localStorage.getItem(BRAND_STORAGE_KEY) || '{}'),
    };
  } catch {
    return DEFAULT_BRAND_SETTINGS;
  }
}

export function saveBrandSettings(settings: BrandSettings) {
  localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('nucleus:brand-settings-updated', { detail: settings }));
}

