const PRIMARY_STORAGE_KEY = 'cfg_primary_color';

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map(value => clamp(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, target: string, amount: number) {
  const base = hexToRgb(hex);
  const end = hexToRgb(target);
  if (!base || !end) return hex;
  return toHex({
    r: base.r + (end.r - base.r) * amount,
    g: base.g + (end.g - base.g) * amount,
    b: base.b + (end.b - base.b) * amount,
  });
}

export function applyCustomPrimaryColor(hex: string) {
  const value = hexToRgb(hex) ? hex : '#059669';
  const root = document.documentElement;
  const shades = {
    50: mix(value, '#ffffff', 0.92),
    100: mix(value, '#ffffff', 0.84),
    200: mix(value, '#ffffff', 0.68),
    300: mix(value, '#ffffff', 0.48),
    400: mix(value, '#ffffff', 0.25),
    500: value,
    600: mix(value, '#000000', 0.10),
    700: mix(value, '#000000', 0.22),
    800: mix(value, '#000000', 0.36),
    900: mix(value, '#000000', 0.50),
    950: mix(value, '#000000', 0.68),
  };

  root.setAttribute('data-custom-theme', 'true');
  root.style.setProperty('--theme-primary', value);
  Object.entries(shades).forEach(([key, shade]) => {
    root.style.setProperty(`--theme-primary-${key}`, shade);
  });
  root.style.setProperty('--color-primary', shades[600]);
  root.style.setProperty('--color-nucleus', shades[700]);
  root.style.setProperty('--color-sidebar-bg', shades[950]);
  localStorage.setItem(PRIMARY_STORAGE_KEY, value);
}

export function initCustomTheme() {
  const saved = localStorage.getItem(PRIMARY_STORAGE_KEY);
  if (saved) applyCustomPrimaryColor(saved);
}

