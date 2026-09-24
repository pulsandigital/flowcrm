export const SPECIALTIES = [
  'Cardiologia',
  'Clínica médica',
  'Dermatologia',
  'Endocrinologia',
  'Fisioterapia',
  'Fonoaudiologia',
  'Ginecologia',
  'Medicina',
  'Nutrição',
  'Odontologia',
  'Ortopedia',
  'Pediatria',
  'Psicologia',
  'Psiquiatria',
  'Estética',
  'Terapia Ocupacional',
  'Enfermagem',
  'Outro',
];

export function normalizeSpecialty(value?: string | null) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function canonicalSpecialty(value?: string | null) {
  const normalized = normalizeSpecialty(value);
  return SPECIALTIES.find(item => normalizeSpecialty(item) === normalized) ?? value ?? '';
}

export function allowedSpecialtiesForProfile(profile?: { specialty?: string | null; role?: string | null } | null) {
  const specialty = canonicalSpecialty(profile?.specialty);
  const role = String(profile?.role ?? '').toLowerCase();

  if (specialty && specialty !== 'Outro') return [specialty];
  if (role === 'doctor' || role === 'professional' || role === 'nurse') return specialty ? [specialty] : [];
  return SPECIALTIES;
}
