import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (params: {
    email: string;
    password: string;
    nome: string;
    role: 'personal' | 'aluno';
    telefone?: string;
    objetivo?: string;
    inviteCode?: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('loadProfile error', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? translateError(error.message) : null };
  }

  async function signUp(params: {
    email: string;
    password: string;
    nome: string;
    role: 'personal' | 'aluno';
    telefone?: string;
    objetivo?: string;
    inviteCode?: string;
  }) {
    const { email, password, nome, role, telefone, objetivo, inviteCode } = params;

    // For students, resolve the trainer by invite code (trainer email).
    let personalId: string | null = null;
    if (role === 'aluno') {
      if (!inviteCode) {
        return { error: 'Informe o e-mail do seu personal trainer.' };
      }
      const { data: trainer, error: tErr } = await supabase
        .from('profiles')
        .select('id, role, email')
        .eq('email', inviteCode.trim().toLowerCase())
        .maybeSingle();
      if (tErr) return { error: translateError(tErr.message) };
      if (!trainer) return { error: 'Personal trainer não encontrado.' };
      if (trainer.role !== 'personal') return { error: 'O e-mail informado não é de um personal.' };
      personalId = trainer.id;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: translateError(error.message) };
    const userId = data.user?.id;
    if (!userId) return { error: 'Não foi possível criar a conta.' };

    if (role === 'personal') {
      // Trainer: create their own profile row.
      const { error: pErr } = await supabase.from('profiles').insert({
        user_id: userId,
        nome,
        email,
        telefone: telefone || null,
        objetivo: objetivo || null,
        role: 'personal',
        payment_status: 'pago',
      } as Partial<Profile>);
      if (pErr) {
        await supabase.auth.signOut();
        return { error: translateError(pErr.message) };
      }
    } else {
      // Student: link auth account to the pre-registered profile (matched by email + trainer).
      const { data: existing, error: fErr } = await supabase
        .from('profiles')
        .select('id, personal_id, user_id')
        .eq('email', email.trim().toLowerCase())
        .eq('personal_id', personalId)
        .maybeSingle();
      if (fErr) {
        await supabase.auth.signOut();
        return { error: translateError(fErr.message) };
      }
      if (existing && !existing.user_id) {
        const { error: uErr } = await supabase
          .from('profiles')
          .update({ user_id: userId })
          .eq('id', existing.id);
        if (uErr) {
          await supabase.auth.signOut();
          return { error: translateError(uErr.message) };
        }
      } else if (!existing) {
        // No pre-registration; create a fresh self-managed student profile.
        const { error: pErr } = await supabase.from('profiles').insert({
          user_id: userId,
          nome,
          email,
          telefone: telefone || null,
          objetivo: objetivo || null,
          role: 'aluno',
          personal_id: personalId,
          payment_status: 'pendente',
        } as Partial<Profile>);
        if (pErr) {
          await supabase.auth.signOut();
          return { error: translateError(pErr.message) };
        }
      } else {
        // Profile already linked to another account.
        await supabase.auth.signOut();
        return { error: 'Este e-mail já está vinculado a uma conta de aluno.' };
      }
    }

    await loadProfile(userId);
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }

  const value = useMemo<AuthState>(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (m.includes('user already registered')) return 'Este e-mail já está cadastrado.';
  if (m.includes('email')) return 'E-mail inválido ou já em uso.';
  if (m.includes('password')) return 'A senha deve ter ao menos 6 caracteres.';
  if (m.includes('rate limit')) return 'Muitas tentativas. Aguarde um instante.';
  return msg;
}
