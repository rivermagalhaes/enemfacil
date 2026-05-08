// src/hooks/useAuth.ts
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

export type Plano = "free" | "basico" | "premium" | "completo" | "professor" |
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

const HIERARQUIA: Plano[] = [
  "free", "gratis",
  "basico", "estudante",
  "premium", "pro",
  "completo", "ouro",
];

function normalizarPlano(plano: string): Plano {
  const mapa: Record<string, Plano> = {
    gratis: "free", estudante: "basico", pro: "premium", ouro: "completo",
  };
  return (mapa[plano] ?? plano) as Plano;
}

function indicePlano(plano: string): number {
  const normalizado = normalizarPlano(plano);
  const idx = HIERARQUIA.indexOf(normalizado);
  return idx === -1 ? 0 : idx;
}

// Roles que têm acesso de professor/staff
const ROLES_PROFESSOR: Role[] = ["professor", "teacher", "admin", "super_admin"];
const ROLES_ADMIN: Role[] = ["admin", "super_admin"];

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
      .select("id,email,nome,username,role,plano,plan,plan_expires_at,xp_total,sequencia,avatar_url,goal,institution,estado,regiao,logo_url,nome_escola,nome_professor")
      .eq("id", userId)
      .single();
    setProfile(data as Profile ?? null);
    setLoading(false);
  }

  const temPlano = (planoMinimo: Plano): boolean => {
    if (!profile) return false;
    const planoAtual = String(profile.plano ?? profile.plan ?? "free");
    return indicePlano(planoAtual) >= indicePlano(planoMinimo);
  };

  // ── Roles centralizados ──
  const isProfessor = !!profile && ROLES_PROFESSOR.includes(profile.role);
  const isAdmin = !!profile && ROLES_ADMIN.includes(profile.role);
  const isStudent = !!profile && (profile.role === "student" || !ROLES_PROFESSOR.includes(profile.role));

  // ── Permissões ──
  const podeQuizIlimitado = isProfessor || temPlano("basico");
  const podeIA = isProfessor || temPlano("premium");
  const podeTrilha = isProfessor || temPlano("premium");
  const podeMapaMental = isProfessor || temPlano("premium");
  const podeRedacao = isProfessor || temPlano("completo");
  const podePainelProfessor = isProfessor;

  const planoDisplay = (): { label: string; cor: string; emoji: string } => {
    if (isProfessor && !isAdmin) return { label: "Professor", cor: "#0A7C4B", emoji: "👨‍🏫" };
    if (isAdmin) return { label: "Admin", cor: "#ef4444", emoji: "🛡️" };
    const p = normalizarPlano(String(profile?.plano ?? profile?.plan ?? "free"));
    if (p === "completo") return { label: "Ouro",    cor: "#f59e0b", emoji: "👑" };
    if (p === "premium")  return { label: "Premium", cor: "#8b5cf6", emoji: "⭐" };
    if (p === "basico")   return { label: "Básico",  cor: "#3b82f6", emoji: "📚" };
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
    temPlano,
    isProfessor,
    isAdmin,
    isStudent,
    planoDisplay,
    podeQuizIlimitado,
    podeIA,
    podeTrilha,
    podeMapaMental,
    podeRedacao,
    podePainelProfessor,
    signOut,
  };
}
