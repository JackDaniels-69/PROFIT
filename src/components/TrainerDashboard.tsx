import { useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Wallet,
  Dumbbell,
  Search,
  Mail,
  Phone,
  Target,
  MoreVertical,
  MessageCircle,
  X,
  Loader2,
  TrendingUp,
  Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useTrainerData } from '@/lib/trainer-data';
import { supabase } from '@/lib/supabase';
import { Avatar } from '@/components/Avatar';
import { whatsappLink, formatDate } from '@/lib/utils';
import type { Profile } from '@/lib/types';

export default function TrainerDashboard({
  onOpenWorkouts,
  onOpenStudent,
}: {
  onOpenWorkouts: () => void;
  onOpenStudent: (id: string) => void;
}) {
  const { profile } = useAuth();
  const { students, workouts, loading, reload } = useTrainerData(profile?.id);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const active = students.length;
    const pending = students.filter((s) => s.payment_status === 'pendente').length;
    return { active, pending, workouts: workouts.length };
  }, [students, workouts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.nome.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, query]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Olá, {profile?.nome.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-ink-400 mt-0.5">Acompanhe seus alunos e treinos.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <UserPlus className="w-4 h-4" />
          Novo aluno
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Alunos ativos"
          value={stats.active}
          tone="neon"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Pagamentos pendentes"
          value={stats.pending}
          tone={stats.pending > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="Fichas de treino"
          value={stats.workouts}
          tone="accent"
          onClick={onOpenWorkouts}
        />
      </div>

      {/* Students list */}
      <div className="card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-display text-lg font-bold">Meus alunos</h2>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-500" />
            <input
              className="input pl-9 py-2"
              placeholder="Buscar aluno…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            onAction={() => setShowAdd(true)}
            actionLabel="Cadastrar aluno"
            title={query ? 'Nenhum aluno encontrado' : 'Nenhum aluno ainda'}
            desc={
              query
                ? 'Tente outro nome ou e-mail.'
                : 'Cadastre seu primeiro aluno para começar a montar treinos.'
            }
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                onOpen={() => onOpenStudent(s.id)}
                onChanged={reload}
              />
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'neon' | 'warning' | 'accent' | 'neutral';
  onClick?: () => void;
}) {
  const tones = {
    neon: 'text-neon-400 bg-neon-400/10',
    warning: 'text-warning bg-warning/10',
    accent: 'text-accent bg-accent/10',
    neutral: 'text-ink-300 bg-ink-700/50',
  };
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`card p-4 flex items-center gap-4 text-left transition ${
        onClick ? 'hover:border-ink-600 cursor-pointer' : ''
      }`}
    >
      <div className={`grid place-items-center w-11 h-11 rounded-xl ${tones[tone]}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-xs text-ink-400 mt-1">{label}</div>
      </div>
    </button>
  );
}

function StudentRow({
  student,
  onOpen,
  onChanged,
}: {
  student: Profile;
  onOpen: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [menu, setMenu] = useState(false);
  const pending = student.payment_status === 'pendente';

  async function togglePayment() {
    setMenu(false);
    const next = pending ? 'pago' : 'pendente';
    const { error } = await supabase
      .from('profiles')
      .update({ payment_status: next })
      .eq('id', student.id);
    if (error) toast('Erro ao atualizar pagamento.', 'error');
    else {
      toast(next === 'pago' ? 'Pagamento marcado como pago.' : 'Pagamento marcado como pendente.');
      onChanged();
    }
  }

  function sendReminder() {
    setMenu(false);
    const msg = `Olá ${student.nome.split(' ')[0]}! Passando para lembrar do seu treino de hoje 💪. Qualquer dúvida, é só chamar!`;
    window.open(whatsappLink(student.telefone, msg), '_blank');
  }

  return (
    <div className="group flex items-center gap-3 p-3 rounded-xl bg-ink-800/60 hover:bg-ink-750 transition border border-transparent hover:border-ink-700">
      <button onClick={onOpen} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Avatar name={student.nome} />
        <div className="min-w-0">
          <div className="font-semibold text-sm truncate">{student.nome}</div>
          <div className="text-xs text-ink-400 truncate">{student.email}</div>
        </div>
      </button>
      <div className="hidden sm:flex items-center gap-2">
        {student.objetivo && (
          <span className="chip bg-ink-700/50 text-ink-300">
            <Target className="w-3 h-3" />
            {student.objetivo}
          </span>
        )}
        <span
          className={`chip ${
            pending ? 'bg-warning/10 text-warning' : 'bg-neon-400/10 text-neon-400'
          }`}
        >
          {pending ? 'Pendente' : 'Pago'}
        </span>
      </div>
      <div className="relative">
        <button
          onClick={() => setMenu((m) => !m)}
          className="p-2 rounded-lg hover:bg-ink-700 text-ink-400"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-48 card p-1 animate-scale-in">
              <button
                onClick={onOpen}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-ink-700 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4 text-ink-400" /> Ver progresso
              </button>
              <button
                onClick={sendReminder}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-ink-700 flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4 text-neon-400" /> Lembrete WhatsApp
              </button>
              <button
                onClick={togglePayment}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-ink-700 flex items-center gap-2"
              >
                <Wallet className="w-4 h-4 text-warning" />
                {pending ? 'Marcar como pago' : 'Marcar como pendente'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function AddStudentModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { profile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', telefone: '', objetivo: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    setLoading(true);
    try {
      // Create auth account for the student with a random password they can reset.
      // Simpler: create profile row directly linked to trainer; student signs up themselves.
      const { error } = await supabase.from('profiles').insert({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        telefone: form.telefone.trim() || null,
        objetivo: form.objetivo.trim() || null,
        role: 'aluno',
        personal_id: profile.id,
        payment_status: 'pendente',
        // id intentionally omitted — trainer registers student as a record;
        // the student will link their account later by signing up with the same email.
      } as Partial<Profile>);
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Aluno cadastrado com sucesso!');
        onCreated();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Cadastrar aluno">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input
            className="input"
            placeholder="Nome do aluno"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            type="email"
            className="input"
            placeholder="aluno@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="label">Telefone (com DDD)</label>
          <input
            className="input"
            placeholder="(11) 99999-9999"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Objetivo</label>
          <input
            className="input"
            placeholder="Ex: Hipertrofia, emagrecimento…"
            value={form.objetivo}
            onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
          />
        </div>
        <div className="flex items-start gap-2 text-xs text-ink-400 bg-ink-800/60 border border-ink-700/60 rounded-lg p-3">
          <Mail className="w-4 h-4 mt-0.5 text-ink-500" />
          <span>
            O aluno poderá acessar o app criando uma conta com o e-mail acima e
            informando seu e-mail ({profile?.email}) como convite.
          </span>
        </div>
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Cadastrar
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function Modal({
  onClose,
  title,
  children,
  maxWidth = 'max-w-lg',
}: {
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative card w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-scale-in`}
      >
        <div className="sticky top-0 flex items-center justify-between px-5 py-4 bg-ink-850/95 backdrop-blur border-b border-ink-700/60">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-700 text-ink-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  actionLabel,
  onAction,
}: {
  title: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="grid place-items-center w-14 h-14 rounded-2xl bg-ink-800 mx-auto mb-4">
        <Users className="w-6 h-6 text-ink-500" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-ink-400 mt-1 max-w-sm mx-auto">{desc}</p>
      {actionLabel && (
        <button onClick={onAction} className="btn-primary mt-4">
          <UserPlus className="w-4 h-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Re-export for convenience
export { formatDate };
