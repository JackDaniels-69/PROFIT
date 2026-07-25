import { useState } from 'react';
import { Dumbbell, Mail, Lock, User, Phone, Target, UserCog, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';
type Role = 'personal' | 'aluno';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [role, setRole] = useState<Role>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [objetivo, setObjetivo] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) setError(error);
      } else {
        const { error } = await signUp({
          email: email.trim(),
          password,
          nome: nome.trim(),
          role,
          telefone: telefone.trim(),
          objetivo: objetivo.trim(),
          inviteCode: inviteCode.trim(),
        });
        if (error) setError(error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative lg:w-1/2 overflow-hidden flex flex-col justify-between p-8 lg:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-950 to-ink-950" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-neon-400/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="grid place-items-center w-10 h-10 rounded-xl bg-neon-400 text-ink-950 shadow-glow">
            <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-display font-extrabold text-xl tracking-tight">
            Pro<span className="text-neon-400">Fit</span>
          </span>
        </div>

        <div className="relative max-w-md mt-16 lg:mt-0">
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight">
            Treine melhor.
            <br />
            <span className="text-neon-400">Conquiste mais.</span>
          </h1>
          <p className="mt-5 text-ink-300 leading-relaxed">
            A plataforma completa para personal trainers gerenciarem alunos, montarem
            fichas de treino e acompanharem o progresso — tudo em um só lugar.
          </p>

          <div className="mt-10 space-y-3">
            {[
              'Monte fichas divididas por treino A, B, C…',
              'Acompanhe a frequência e progresso dos alunos',
              'Lembretes automáticos via WhatsApp',
            ].map((t) => (
              <div key={t} className="flex items-center gap-3 text-sm text-ink-300">
                <span className="grid place-items-center w-5 h-5 rounded-full bg-neon-400/15 text-neon-400">
                  <ArrowRight className="w-3 h-3" strokeWidth={3} />
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-ink-500 mt-10 hidden lg:block">
          © {new Date().getFullYear()} ProFit · Feito para quem leva treino a sério
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex gap-1 p-1 rounded-xl bg-ink-850 border border-ink-700/60 mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'signin' ? 'bg-ink-700 text-ink-100 shadow' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
                mode === 'signup' ? 'bg-ink-700 text-ink-100 shadow' : 'text-ink-400 hover:text-ink-200'
              }`}
            >
              Criar conta
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight">
            {mode === 'signin' ? 'Bem-vindo de volta' : 'Comece agora'}
          </h2>
          <p className="text-sm text-ink-400 mt-1.5">
            {mode === 'signin'
              ? 'Acesse sua conta para continuar.'
              : 'Crie sua conta em poucos segundos.'}
          </p>

          {mode === 'signup' && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              <RoleCard
                active={role === 'personal'}
                onClick={() => setRole('personal')}
                icon={<UserCog className="w-4 h-4" />}
                title="Personal"
                desc="Gerenciar alunos"
              />
              <RoleCard
                active={role === 'aluno'}
                onClick={() => setRole('aluno')}
                icon={<Dumbbell className="w-4 h-4" />}
                title="Aluno"
                desc="Ver meus treinos"
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === 'signup' && (
              <Field icon={<User className="w-4 h-4" />} label="Nome completo">
                <input
                  className="input pl-10"
                  placeholder="Seu nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </Field>
            )}

            <Field icon={<Mail className="w-4 h-4" />} label="E-mail">
              <input
                type="email"
                className="input pl-10"
                placeholder="voce@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </Field>

            <Field icon={<Lock className="w-4 h-4" />} label="Senha">
              <input
                type="password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </Field>

            {mode === 'signup' && (
              <>
                <Field icon={<Phone className="w-4 h-4" />} label="Telefone (com DDD)">
                  <input
                    className="input pl-10"
                    placeholder="(11) 99999-9999"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </Field>

                {role === 'aluno' && (
                  <Field icon={<Target className="w-4 h-4" />} label="Objetivo">
                    <input
                      className="input pl-10"
                      placeholder="Ex: Hipertrofia, emagrecimento…"
                      value={objetivo}
                      onChange={(e) => setObjetivo(e.target.value)}
                    />
                  </Field>
                )}

                {role === 'aluno' && (
                  <Field icon={<Mail className="w-4 h-4" />} label="E-mail do seu Personal">
                    <input
                      className="input pl-10"
                      placeholder="personal@email.com"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                    />
                  </Field>
                )}
              </>
            )}

            {error && (
              <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2.5 animate-scale-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Entrar' : 'Criar conta'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-ink-500 mt-6 text-center">
            {mode === 'signin' ? (
              <>
                Não tem conta?{' '}
                <button
                  className="text-neon-400 font-semibold hover:underline"
                  onClick={() => setMode('signup')}
                >
                  Criar agora
                </button>
              </>
            ) : (
              <>
                Já tem conta?{' '}
                <button
                  className="text-neon-400 font-semibold hover:underline"
                  onClick={() => setMode('signin')}
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-xl border transition-all ${
        active
          ? 'border-neon-400/60 bg-neon-400/10 shadow-glow'
          : 'border-ink-700/60 bg-ink-850 hover:border-ink-600'
      }`}
    >
      <div
        className={`grid place-items-center w-8 h-8 rounded-lg mb-2 ${
          active ? 'bg-neon-400 text-ink-950' : 'bg-ink-700 text-ink-300'
        }`}
      >
        {icon}
      </div>
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-ink-400">{desc}</div>
    </button>
  );
}
