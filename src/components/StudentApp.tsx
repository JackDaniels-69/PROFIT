import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  Calendar,
  Flame,
  TrendingUp,
  Check,
  CheckCheck,
  Play,
  X,
  Loader2,
  Trophy,
  ChevronRight,
  Clock,
  Target,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Avatar } from '@/components/Avatar';
import {
  youtubeEmbed,
  youtubeThumb,
  last7Days,
  sameDay,
  formatDateTime,
  cn,
} from '@/lib/utils';
import type {
  Profile,
  Workout,
  WorkoutDay,
  WorkoutExercise,
  WorkoutLog,
  ExerciseLog,
} from '@/lib/types';

interface DayWithEx extends WorkoutDay {
  workout_exercises: WorkoutExercise[];
}
interface WorkoutWithDays extends Workout {
  workout_days: DayWithEx[];
}

export default function StudentApp({ profile }: { profile: Profile }) {
  const [workouts, setWorkouts] = useState<WorkoutWithDays[]>([]);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState<DayWithEx | null>(null);

  const load = useCallback(async () => {
    if (!profile.id) return;
    setLoading(true);
    const [wRes, lRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, workout_days(*, workout_exercises(*))')
        .eq('student_id', profile.id)
        .eq('ativo', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('workout_logs')
        .select('*')
        .eq('student_id', profile.id)
        .order('completed_at', { ascending: false })
        .limit(100),
    ]);
    if (wRes.data) setWorkouts(wRes.data as WorkoutWithDays[]);
    if (lRes.data) setLogs(lRes.data as WorkoutLog[]);
    setLoading(false);
  }, [profile.id]);

  useEffect(() => {
    load();
  }, [load]);

  const allDays = useMemo(() => workouts.flatMap((w) => w.workout_days), [workouts]);
  const todayLog = logs.find((l) => sameDay(new Date(l.completed_at), new Date()));
  const trainedToday = !!todayLog;

  const week = last7Days();
  const weekCounts = week.map(
    (d) => logs.filter((l) => sameDay(new Date(l.completed_at), d.date)).length,
  );
  const weekTotal = weekCounts.reduce((a, b) => a + b, 0);
  const streak = computeStreak(logs);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-ink-950/80 backdrop-blur-lg border-b border-ink-800/60">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-neon-400 text-ink-950 shadow-glow">
              <Dumbbell className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-extrabold leading-none">
                Pro<span className="text-neon-400">Fit</span>
              </div>
              <div className="text-[10px] text-ink-500 mt-0.5">Aluno</div>
            </div>
          </div>
          <Avatar name={profile.nome} size="sm" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-5 space-y-5 animate-fade-in">
        {/* Greeting */}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            E aí, {profile.nome.split(' ')[0]}! 💪
          </h1>
          <p className="text-sm text-ink-400 mt-1">
            {trainedToday ? 'Treino de hoje concluído. Bom trabalho!' : 'Bora treinar hoje?'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatPill icon={<Flame className="w-4 h-4" />} value={`${streak}d`} label="Sequência" tone="neon" />
          <StatPill icon={<Calendar className="w-4 h-4" />} value={`${weekTotal}`} label="Esta semana" tone="accent" />
          <StatPill icon={<TrendingUp className="w-4 h-4" />} value={`${logs.length}`} label="Total" tone="neutral" />
        </div>

        {/* Weekly progress */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-sm">Progresso semanal</h2>
            <span className="text-xs text-ink-400">{weekTotal}/7 dias</span>
          </div>
          <WeekDots days={week} counts={weekCounts} />
        </div>

        {/* Today's workout / days list */}
        {loading ? (
          <div className="card p-8 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
          </div>
        ) : allDays.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="grid place-items-center w-12 h-12 rounded-xl bg-ink-800 mx-auto mb-3">
              <Dumbbell className="w-5 h-5 text-ink-500" />
            </div>
            <h3 className="font-semibold">Nenhum treino atribuído</h3>
            <p className="text-sm text-ink-400 mt-1">
              Seu personal ainda não montou sua ficha. Aguarde ou entre em contato.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="font-display font-bold text-sm mb-2.5 px-1">Seus treinos</h2>
            <div className="space-y-2.5">
              {allDays.map((day) => (
                <DayCard key={day.id} day={day} onOpen={() => setActiveDay(day)} />
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        {logs.length > 0 && (
          <div className="card p-4">
            <h2 className="font-display font-bold text-sm mb-3">Treinos recentes</h2>
            <div className="space-y-2">
              {logs.slice(0, 6).map((l) => (
                <div key={l.id} className="flex items-center gap-3">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-neon-400/10 text-neon-400">
                    <Check className="w-4 h-4" />
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
          </div>
        )}
      </main>

      {activeDay && (
        <DayWorkoutSheet
          profile={profile}
          day={activeDay}
          onClose={() => setActiveDay(null)}
          onCompleted={() => {
            setActiveDay(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  tone: 'neon' | 'accent' | 'neutral';
}) {
  const tones = {
    neon: 'text-neon-400 bg-neon-400/10',
    accent: 'text-accent bg-accent/10',
    neutral: 'text-ink-300 bg-ink-700/50',
  };
  return (
    <div className="card p-3 flex flex-col items-center gap-1">
      <div className={`grid place-items-center w-9 h-9 rounded-xl ${tones[tone]}`}>{icon}</div>
      <div className="font-display font-bold text-lg leading-none mt-0.5">{value}</div>
      <div className="text-[10px] text-ink-400">{label}</div>
    </div>
  );
}

function WeekDots({ days, counts }: { days: { label: string; date: Date }[]; counts: number[] }) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      {days.map((d, i) => {
        const done = counts[i] > 0;
        const isToday = sameDay(d.date, new Date());
        return (
          <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
            <div
              className={cn(
                'grid place-items-center w-9 h-9 rounded-full transition-all',
                done
                  ? 'bg-neon-400 text-ink-950 shadow-glow scale-105'
                  : isToday
                    ? 'bg-ink-700 text-ink-200 ring-2 ring-neon-400/40'
                    : 'bg-ink-800 text-ink-500',
              )}
            >
              {done ? <Check className="w-4 h-4" strokeWidth={3} /> : <span className="text-xs font-bold">{d.label[0]}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayCard({ day, onOpen }: { day: DayWithEx; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="card w-full p-4 flex items-center gap-3 text-left hover:border-ink-600 transition group"
    >
      <div className="grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br from-neon-400/20 to-accent/10 text-neon-300">
        <Dumbbell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{day.nome}</div>
        <div className="text-xs text-ink-400 mt-0.5">
          {day.workout_exercises.length} {day.workout_exercises.length === 1 ? 'exercício' : 'exercícios'}
        </div>
      </div>
      <div className="chip bg-neon-400/10 text-neon-400 text-[10px]">
        <Play className="w-2.5 h-2.5" /> Iniciar
      </div>
      <ChevronRight className="w-4 h-4 text-ink-500 group-hover:translate-x-0.5 transition" />
    </button>
  );
}

function DayWorkoutSheet({
  profile,
  day,
  onClose,
  onCompleted,
}: {
  profile: Profile;
  day: DayWithEx;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const toast = useToast();
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [exLogs, setExLogs] = useState<Record<string, ExerciseLog>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [videoEx, setVideoEx] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Find or create today's log for this day
      const { data: existing } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('student_id', profile.id)
        .eq('workout_day_id', day.id)
        .order('completed_at', { ascending: false })
        .limit(1);
      let currentLog = (existing?.[0] as WorkoutLog) || null;

      const total = day.workout_exercises.length;
      if (!currentLog) {
        const { data: created, error } = await supabase
          .from('workout_logs')
          .insert({
            student_id: profile.id,
            workout_day_id: day.id,
            exercises_total: total,
            exercises_done: 0,
          })
          .select()
          .single();
        if (error) {
          toast('Erro ao iniciar treino.', 'error');
          setLoading(false);
          return;
        }
        currentLog = created as WorkoutLog;
      }
      setLog(currentLog);

      // Load exercise logs
      const { data: el } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('workout_log_id', currentLog.id);
      const map: Record<string, ExerciseLog> = {};
      (el as ExerciseLog[] | null)?.forEach((e) => (map[e.exercise_id] = e));
      setExLogs(map);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.id]);

  const doneCount = Object.values(exLogs).filter((e) => e.completed).length;
  const total = day.workout_exercises.length;
  const allDone = total > 0 && doneCount === total;

  async function toggleExercise(ex: WorkoutExercise) {
    if (!log) return;
    setSaving(ex.id);
    const existing = exLogs[ex.id];
    try {
      if (existing) {
        const next = !existing.completed;
        const { data, error } = await supabase
          .from('exercise_logs')
          .update({ completed: next, completed_at: next ? new Date().toISOString() : null })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        setExLogs((m) => ({ ...m, [ex.id]: data as ExerciseLog }));
      } else {
        const { data, error } = await supabase
          .from('exercise_logs')
          .insert({
            workout_log_id: log.id,
            exercise_id: ex.id,
            completed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        setExLogs((m) => ({ ...m, [ex.id]: data as ExerciseLog }));
      }
      // update count
      const newDone = Object.values({ ...exLogs, [ex.id]: { ...existing, completed: !existing?.completed } }).filter(
        (e) => e.completed,
      ).length;
      await supabase
        .from('workout_logs')
        .update({ exercises_done: newDone })
        .eq('id', log.id);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao atualizar.', 'error');
    } finally {
      setSaving(null);
    }
  }

  async function finishWorkout() {
    if (!log) return;
    setFinishing(true);
    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({
          exercises_done: doneCount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', log.id);
      if (error) throw error;
      toast(allDone ? 'Treino concluído! Parabéns! 🏆' : 'Treino finalizado. Bom trabalho!');
      onCompleted();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao finalizar.', 'error');
    } finally {
      setFinishing(false);
    }
  }

  const progress = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md max-h-[94vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink-850/95 backdrop-blur border-b border-ink-700/60">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid place-items-center w-9 h-9 rounded-xl bg-neon-400/15 text-neon-400">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold truncate">{day.nome}</h3>
                <p className="text-xs text-ink-400">{doneCount}/{total} exercícios concluídos</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-700 text-ink-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-ink-800">
            <div
              className="h-full bg-gradient-to-r from-neon-500 to-neon-300 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {day.workout_exercises.length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-8">
                Nenhum exercício neste treino ainda.
              </p>
            ) : (
              day.workout_exercises.map((ex, i) => {
                const done = exLogs[ex.id]?.completed;
                return (
                  <div
                    key={ex.id}
                    className={cn(
                      'rounded-2xl border p-4 transition-all',
                      done
                        ? 'border-neon-400/40 bg-neon-400/5'
                        : 'border-ink-700/60 bg-ink-800/50',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => toggleExercise(ex)}
                        disabled={saving === ex.id}
                        className={cn(
                          'shrink-0 grid place-items-center w-9 h-9 rounded-xl transition-all active:scale-90',
                          done
                            ? 'bg-neon-400 text-ink-950 shadow-glow'
                            : 'bg-ink-700 text-ink-400 hover:text-ink-200',
                          saving === ex.id && 'opacity-60',
                        )}
                      >
                        {saving === ex.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-5 h-5" strokeWidth={3} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-ink-500">#{i + 1}</span>
                          <h4 className={cn('font-semibold text-sm flex-1', done && 'line-through text-ink-400')}>
                            {ex.nome}
                          </h4>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ex.series && (
                            <span className="chip bg-ink-700/50 text-ink-200 text-[10px]">
                              {ex.series} séries
                            </span>
                          )}
                          {ex.repeticoes && (
                            <span className="chip bg-ink-700/50 text-ink-200 text-[10px]">
                              {ex.repeticoes} reps
                            </span>
                          )}
                          {ex.carga && (
                            <span className="chip bg-accent/10 text-accent text-[10px]">
                              <Target className="w-2.5 h-2.5" /> {ex.carga}
                            </span>
                          )}
                        </div>
                        {ex.video_url && youtubeEmbed(ex.video_url) && (
                          <button
                            onClick={() => setVideoEx(ex.id)}
                            className="mt-3 relative w-full rounded-xl overflow-hidden border border-ink-700/40 group"
                          >
                            <img
                              src={youtubeThumb(ex.video_url)!}
                              alt="video"
                              className="w-full h-24 object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-ink-950/40 grid place-items-center">
                              <div className="grid place-items-center w-10 h-10 rounded-full bg-neon-400 text-ink-950 shadow-glow">
                                <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                            <span className="absolute bottom-1.5 left-2 text-[10px] text-ink-100 font-medium">
                              Ver vídeo
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Finish button */}
            {total > 0 && (
              <button
                onClick={finishWorkout}
                disabled={finishing}
                className={cn(
                  'btn w-full py-3.5 mt-2',
                  allDone
                    ? 'bg-neon-400 text-ink-950 shadow-glow hover:bg-neon-300'
                    : 'bg-ink-750 text-ink-100 border border-ink-600/60 hover:bg-ink-700',
                )}
              >
                {finishing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : allDone ? (
                  <>
                    <Trophy className="w-4 h-4" /> Concluir treino do dia
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-4 h-4" /> Finalizar treino do dia
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {videoEx && (
        <VideoModal
          url={day.workout_exercises.find((e) => e.id === videoEx)?.video_url || ''}
          onClose={() => setVideoEx(null)}
        />
      )}
    </div>
  );
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const embed = youtubeEmbed(url);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4">
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-scale-in">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 p-2 rounded-lg bg-ink-800 text-ink-300 hover:text-ink-100"
        >
          <X className="w-5 h-5" />
        </button>
        {embed ? (
          <div className="aspect-video rounded-2xl overflow-hidden border border-ink-700 shadow-glow">
            <iframe
              src={embed}
              title="video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="card p-6 text-center text-ink-400">Vídeo indisponível.</div>
        )}
      </div>
    </div>
  );
}

function computeStreak(logs: WorkoutLog[]): number {
  if (logs.length === 0) return 0;
  const days = new Set(logs.map((l) => new Date(l.completed_at).toDateString()));
  let streak = 0;
  const cursor = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else if (i > 0) break;
  }
  return streak;
}
