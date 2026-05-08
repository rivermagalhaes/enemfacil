// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type Plano = "free" | "basico" | "premium" | "completo" | "professor" |
                    // aliases legados
                    "gratis" | "estudante" | "pro" | "ouro";

export type Role = "student" | "teacher" | "admin" | "professor" | "super_admin";

export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  username: string | null;
  role: Role;
  plano: Plano;
  plan: string | null;
  plan_expires_at: string | null;
  xp_total: number;
  sequencia: number;
  avatar_url: string | null;
  goal: string | null;
  institution: string | null;
  estado: string | null;
  regiao: string | null;
  logo_url: string | null;
  nome_escola: string | null;
  nome_professor: string | null;
}

// Hierarquia de planos (do menor para o maior)
const HIERARQUIA: Plano[] = [
  "free", "gratis",           // gratuito
  "basico", "estudante",      // R$9,90 aluno
  "premium", "pro",           // R$19,90
  "completo", "ouro",         // R$29,90
];

// Normaliza plano para comparação
function normalizarPlano(plano: string): Plano {
  const mapa: Record<string, Plano> = {
    gratis: "free", estudante: "basico", pro: "premium", ouro: "completo",
  };
  return (mapa[plano] ?? plano) as Plano;
}

// Retorna índice do plano na hierarquia (professor é tratado separado)
function indicePlano(plano: string): number {
  const normalizado = normalizarPlano(plano);
  const idx = HIERARQUIA.indexOf(normalizado);
  return idx === -1 ? 0 : idx;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data as Profile ?? null);
    setLoading(false);
  }

  // ── Verificações de plano ──

  /** Verifica se o usuário tem pelo menos o plano mínimo */
  const temPlano = (planoMinimo: Plano): boolean => {
    if (!profile) return false;
    const planoAtual = String(profile.plano ?? "free");
    return indicePlano(planoAtual) >= indicePlano(planoMinimo);
  };

  /** Verifica se é professor */
  const isProfessor = !!profile && (profile.role === "professor" || profile.role === "admin" || profile.role === "super_admin");

  /** Verifica se é admin */
  const isAdmin = !!profile && (profile.role === "admin" || profile.role === "super_admin");

  // ── Permissões específicas ──

  /** Quiz/Simulado ilimitado — basico+ ou professor */
  const podeQuizIlimitado = isProfessor || temPlano("basico");

  /** Agente IA — premium+ */
  const podeIA = temPlano("premium");

  /** Trilhas — premium+ */
  const podeTrilha = temPlano("premium");

  /** Mapa mental — premium+ */
  const podeMapaMental = temPlano("premium");

  /** Redação IA — completo */
  const podeRedacao = temPlano("completo");

  /** Painel professor — professor/admin */
  const podePainelProfessor = isProfessor;

  // ── Plano display ──
  const planoDisplay = (): { label: string; cor: string; emoji: string } => {
    if (isProfessor) return { label: "Professor", cor: "#0A7C4B", emoji: "👨‍🏫" };
    const p = normalizarPlano(String(profile?.plano ?? "free"));
    if (p === "completo") return { label: "Completo", cor: "#f59e0b", emoji: "👑" };
    if (p === "premium")  return { label: "Premium",  cor: "#8b5cf6", emoji: "⭐" };
    if (p === "basico")   return { label: "Básico",   cor: "#3b82f6", emoji: "📚" };
    return { label: "Gratuito", cor: "#64748b", emoji: "🆓" };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return {
    user,
    profile,
    loading,
    // plano
    temPlano,
    isProfessor,
    isAdmin,
    planoDisplay,
    // permissões
    podeQuizIlimitado,
    podeIA,
    podeTrilha,
    podeMapaMental,
    podeRedacao,
    podePainelProfessor,
    signOut,
  };
}
