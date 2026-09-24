import { useEffect, useMemo, useState } from 'react';
import { Building2, MapPin, Plus, Search, Trash2 } from 'lucide-react';

interface LocationItem {
  id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  phone: string;
  notes: string;
}

interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  city: string;
}

const STORAGE_KEY = 'nucleus_care_locations';
const TYPES = ['Clinica', 'Hospital', 'Consultorio', 'Sala compartilhada', 'Atendimento domiciliar', 'Outro'];
const ADDRESS_FALLBACKS: AddressSuggestion[] = [
  { id: 'fortaleza-iguatemi', label: 'Av. Washington Soares, 85 - Edson Queiroz, Fortaleza - CE', address: 'Av. Washington Soares, 85 - Edson Queiroz', city: 'Fortaleza, CE' },
  { id: 'fortaleza-aldeota', label: 'Av. Santos Dumont - Aldeota, Fortaleza - CE', address: 'Av. Santos Dumont - Aldeota', city: 'Fortaleza, CE' },
  { id: 'sp-paulista', label: 'Av. Paulista - Bela Vista, Sao Paulo - SP', address: 'Av. Paulista - Bela Vista', city: 'Sao Paulo, SP' },
  { id: 'rio-centro', label: 'Av. Rio Branco - Centro, Rio de Janeiro - RJ', address: 'Av. Rio Branco - Centro', city: 'Rio de Janeiro, RJ' },
];

const readLocations = (): LocationItem[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export default function CareLocations() {
  const [locations, setLocations] = useState<LocationItem[]>(readLocations);
  const [search, setSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressFocused, setAddressFocused] = useState(false);
  const [form, setForm] = useState<Omit<LocationItem, 'id'>>({
    name: '',
    type: 'Clinica',
    address: '',
    city: '',
    phone: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return locations.filter(item => [item.name, item.type, item.address, item.city].join(' ').toLowerCase().includes(term));
  }, [locations, search]);

  useEffect(() => {
    const query = form.address.trim();
    if (query.length < 3 || !addressFocused) {
      setAddressSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=br&q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await response.json();
        const suggestions = (Array.isArray(data) ? data : []).map((item: any, index: number) => {
          const addr = item.address ?? {};
          const road = [addr.road, addr.house_number].filter(Boolean).join(', ');
          const district = addr.suburb || addr.neighbourhood || addr.city_district;
          const city = addr.city || addr.town || addr.village || addr.municipality || '';
          const state = addr.state_code || addr.state || '';
          return {
            id: `${item.place_id ?? index}`,
            label: item.display_name,
            address: [road || item.name, district].filter(Boolean).join(' - ') || item.display_name,
            city: [city, state].filter(Boolean).join(', '),
          };
        });
        setAddressSuggestions(suggestions.length ? suggestions : ADDRESS_FALLBACKS.filter(item => item.label.toLowerCase().includes(query.toLowerCase())));
      } catch {
        setAddressSuggestions(ADDRESS_FALLBACKS.filter(item => item.label.toLowerCase().includes(query.toLowerCase())));
      } finally {
        setAddressLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [form.address, addressFocused]);

  const persist = (next: LocationItem[]) => {
    setLocations(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const save = () => {
    if (!form.name.trim() || !form.address.trim()) return;
    persist([{ ...form, id: `loc-${Date.now()}` }, ...locations]);
    setForm({ name: '', type: 'Clinica', address: '', city: '', phone: '', notes: '' });
  };

  const remove = (id: string) => persist(locations.filter(item => item.id !== id));
  const selectAddress = (suggestion: AddressSuggestion) => {
    setForm({ ...form, address: suggestion.address, city: suggestion.city });
    setAddressSuggestions([]);
    setAddressFocused(false);
  };

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Locais de atendimento</h1>
        <p className="text-sm text-slate-500">Cadastre clinicas, hospitais, consultorios e enderecos usados em agenda, guias e documentos.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-primary-600" />
            <h2 className="section-title">Novo local</h2>
          </div>
          <div>
            <label className="label">Nome do local *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Hospital Sao Lucas" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                {TYPES.map(type => <option key={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="relative">
            <label className="label">Endereco *</label>
            <input
              className="input"
              value={form.address}
              onFocus={() => setAddressFocused(true)}
              onChange={e => setForm({ ...form, address: e.target.value })}
              placeholder="Rua, numero, bairro"
            />
            {addressFocused && form.address.trim().length >= 3 && (
              <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                {addressLoading && <div className="px-3 py-3 text-sm text-slate-400">Buscando enderecos...</div>}
                {!addressLoading && addressSuggestions.length === 0 && (
                  <div className="px-3 py-3 text-sm text-slate-400">Nenhum endereco encontrado</div>
                )}
                {!addressLoading && addressSuggestions.map(suggestion => (
                  <button
                    key={suggestion.id}
                    type="button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => selectAddress(suggestion)}
                    className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-slate-50"
                  >
                    <MapPin size={15} className="mt-0.5 flex-shrink-0 text-primary-600" />
                    <span>
                      <span className="block text-sm font-medium text-slate-800">{suggestion.address}</span>
                      <span className="block text-xs text-slate-500">{suggestion.city || suggestion.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Cidade/UF</label>
            <input className="input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Fortaleza, CE" />
          </div>
          <div>
            <label className="label">Observacoes</label>
            <textarea className="input min-h-[90px] resize-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button onClick={save} disabled={!form.name.trim() || !form.address.trim()} className="btn-primary w-full justify-center disabled:opacity-50">
            <Plus size={15} /> Salvar local
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, endereco ou cidade..." />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <MapPin size={26} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhum local cadastrado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(item => (
                <div key={item.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{item.type} · {item.address}</div>
                    <div className="text-xs text-slate-400">{[item.city, item.phone].filter(Boolean).join(' · ')}</div>
                    {item.notes && <div className="mt-2 text-xs text-slate-500">{item.notes}</div>}
                  </div>
                  <button onClick={() => remove(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
