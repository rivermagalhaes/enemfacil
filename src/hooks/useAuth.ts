import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  nome: string | null;
  plano: 'gratis' | 'cidadao' | 'concurseiro' | 'cursinho' | 'premium';
  plano_ate: string | null;
  xp_total: number;
  sequencia: number;
  ultimo_acesso: string | null;
  criado_em: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  role: string | null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        fetchProfile(u.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) fetchProfile(u.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const temPlano = (planoMinimo: Profile['plano']): boolean => {
    if (!profile) return false;
    const ordem: Profile['plano'][] = ['gratis', 'cidadao', 'concurseiro', 'cursinho', 'premium'];
    return ordem.indexOf(profile.plano) >= ordem.indexOf(planoMinimo);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, temPlano, signOut };
};
