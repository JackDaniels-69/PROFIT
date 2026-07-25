import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  Target,
  Wallet,
  MessageCircle,
  Dumbbell,
  Calendar,
  Flame,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Avatar } from '@/components/Avatar';
import { whatsappLink, formatDate, formatDateTime, last7Days, sameDay } from '@/lib/utils';
import type { Profile, Workout, WorkoutLog } from '@/lib/types';

export default function StudentDetail({
  studentId,
  personalId,
  onBack,
  onOpenWorkouts,
}: {
  studentId: string;
  personalId: string;
  onBack: () => void;
  onOpenWorkouts: () => void;
}) {
  const toast = useToast();
  const [student, setStudent] = useState<Profile | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, w, l] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', studentId).maybeSingle(),
        supabase.from('workouts').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
        supabase
          .from('workout_logs')
          .select('*')
          .eq('student_id', studentId)
          .order('completed_at', { ascending: false })
          .limit(50),
      ]);
      if (s.data) setStudent(s.data as Profile);
      if (w.data) setWorkouts(w.data as Workout[]);
      if (l.data) setLogs(l.data as WorkoutLog[]);
      setLoading(false);
    })();
  }, [studentId]);

  const week = last7Days();
  const weekCounts = week.map(
    (d) => logs.filter((l) => sameDay(new Date(l.completed_at), d.date)).length,
  );
  const totalSessions = logs.length;
  const weekSessions = weekCounts.reduce((a, b) => a + b, 0);
  const streak = computeStreak(logs);

  if (loading) {
    return (
      <div className="p-6 grid place-items-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center">
        <p className="text-ink-400">Aluno não encontrado.</p>
        <button onClick={onBack} className="btn-ghost mt-3">
          Voltar
        </button>
      </div>
    );
  }

  function remind() {
    const msg = `Olá ${student!.nome.split(' ')[0]}! Bora treinar hoje 💪? Veja sua ficha no app!`;
    window.open(whatsappLink(student!.telefone, msg), '_blank');
  }

  async function togglePayment() {
    const next = student!.payment_status === 'pendente' ? 'pago' : 'pendente';
    const { error } = await supabase.from('profiles').update({ payment_status: next }).eq('id', student!.id);
    if (error) toast('Erro ao atualizar.', 'error');
    else {
      setStudent({ ...student!, payment_status: next });
      toast(next === 'pago' ? 'Pagamento marcado como pago.' : 'Pagamento pendente.');
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto animate-fade-in">
      <button onClick={onBack} className="btn-ghost mb-4 py-2">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      {/* Header */}
      <div className="card p-5 mb-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <Avatar name={student.nome} size="lg" ring />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold">{student.nome}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-ink-400">
            <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" /> {student.email}</span>
            {student.telefone && (
              <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> {student.telefone}</span>
            )}
            {student.objetivo && (
              <span className="inline-flex items-center gap-1"><Target className="w-3 h-3" /> {student.objetivo}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={remind} className="btn-ghost py-2 text-xs">
            <MessageCircle className="w-3.5 h-3.5 text-neon-400" /> WhatsApp
          </button>
          <button onClick={togglePayment} className="btn-ghost py-2 text-xs">
            <Wallet className={`w-3.5 h-3.5 ${student.payment_status === 'pendente' ? 'text-warning' : 'text-neon-400'}`} />
            {student.payment_status === 'pendente' ? 'Pendente' : 'Pago'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStat icon={<Flame className="w-4 h-4" />} label="Sequência" value={`${streak}d`} tone="neon" />
        <MiniStat icon={<Calendar className="w-4 h-4" />} label="Esta semana" value={`${weekSessions}`} tone="accent" />
        <MiniStat icon={<TrendingUp className="w-4 h-4" />} label="Total" value={`${totalSessions}`} tone="neutral" />
      </div>

      {/* Weekly chart */}
      <div className="card p-5 mb-4">
        <h2 className="font-display font-bold mb-4">Frequência semanal</h2>
        <WeekChart days={week} counts={weekCounts} />
      </div>

      {/* Workouts assigned */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold">Fichas atribuídas</h2>
          <button onClick={onOpenWorkouts} className="btn-ghost py-1.5 px-3 text-xs">
            <Dumbbell className="w-3.5 h-3.5" /> Gerenciar
          </button>
        </div>
        {workouts.length === 0 ? (
          <p className="text-sm text-ink-400 py-4 text-center">
            Nenhuma ficha atribuída a este aluno ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {workouts.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/60">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-neon-400/10 text-neon-400">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{w.nome}</div>
                  {w.descricao && <div className="text-xs text-ink-400 truncate">{w.descricao}</div>}
                </div>
                <span className={`chip text-[10px] ${w.ativo ? 'bg-neon-400/10 text-neon-400' : 'bg-ink-700/50 text-ink-400'}`}>
                  {w.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      <div className="card p-5">
        <h2 className="font-display font-bold mb-3">Histórico de treinos</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-ink-400 py-6 text-center">Nenhum treino concluído ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 15).map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/40">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-accent/10 text-accent">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{formatDateTime(l.completed_at)}</div>
                  <div className="text-xs text-ink-400">
                    {l.exercises_done ?? 0}/{l.exercises_total ?? 0} exercícios
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'neon' | 'accent' | 'neutral';
}) {
  const tones = {
    neon: 'text-neon-400 bg-neon-400/10',
    accent: 'text-accent bg-accent/10',
    neutral: 'text-ink-300 bg-ink-700/50',
  };
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className={`grid place-items-center w-9 h-9 rounded-lg ${tones[tone]}`}>{icon}</div>
      <div>
        <div className="font-display font-bold text-lg leading-none">{value}</div>
        <div className="text-[11px] text-ink-400 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

function WeekChart({ days, counts }: { days: { label: string; date: Date }[]; counts: number[] }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="flex items-end justify-between gap-2 h-32">
      {days.map((d, i) => {
        const h = (counts[i] / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
            <div className="w-full flex-1 flex items-end">
              <div
                className={`w-full rounded-t-md transition-all duration-500 ${
                  counts[i] > 0 ? 'bg-gradient-to-t from-neon-500 to-neon-300' : 'bg-ink-700/40'
                }`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            </div>
            <span className="text-[10px] text-ink-400 font-medium">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function computeStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const days = new Set(logs.map((l) => new Date(l.completed_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  // allow today or yesterday as start
  for (let i = 0; i < 60; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    if (days.has(d.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}
