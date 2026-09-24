import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useTeamMembers() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('status', 'active')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setTeamMembers(data.map((u: any) => ({
            id: u.id,
            name: u.full_name || u.email?.split('@')[0] || 'Usuário',
            email: u.email || '',
            role: u.role || 'agent',
          })));
        }
        setLoading(false);
      });
  }, []);

  const memberNames = teamMembers.map(m => m.name);

  return { teamMembers, memberNames, loading };
}
