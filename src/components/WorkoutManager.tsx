import { useEffect, useState } from 'react';
import {
  Dumbbell,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Save,
  X,
  Loader2,
  Link2,
  Copy,
  UserCheck,
  ListPlus,
  Pencil,
  Play,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Modal } from '@/components/TrainerDashboard';
import { fetchWorkoutTree } from '@/lib/trainer-data';
import { youtubeThumb, youtubeEmbed } from '@/lib/utils';
import type { Profile, Workout, WorkoutDay, WorkoutExercise } from '@/lib/types';

interface DraftExercise {
  id?: string;
  nome: string;
  series: string;
  repeticoes: string;
  carga: string;
  video_url: string;
  ordem: number;
}

interface DraftDay {
  id?: string;
  nome: string;
  ordem: number;
  exercises: DraftExercise[];
  open: boolean;
}

export default function WorkoutManager({
  personalId,
  students,
  onOpenStudent,
}: {
  personalId: string;
  students: Profile[];
  onOpenStudent: (id: string) => void;
}) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Workout | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('personal_id', personalId)
      .order('created_at', { ascending: false });
    setWorkouts((data as Workout[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [personalId]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Fichas de treino</h1>
          <p className="text-sm text-ink-400 mt-0.5">Monte treinos por dia e atribua aos alunos.</p>
        </div>
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nova ficha
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-24" />
          ))}
        </div>
      ) : workouts.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="grid place-items-center w-14 h-14 rounded-2xl bg-ink-800 mx-auto mb-4">
            <Dumbbell className="w-6 h-6 text-ink-500" />
          </div>
          <h3 className="font-semibold">Nenhuma ficha ainda</h3>
          <p className="text-sm text-ink-400 mt-1 max-w-sm mx-auto">
            Crie sua primeira ficha de treino dividida por dias (Treino A, B, C…) e
            associe aos seus alunos.
          </p>
          <button onClick={() => setCreating(true)} className="btn-primary mt-4">
            <Plus className="w-4 h-4" /> Criar primeira ficha
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((w) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              students={students}
              onEdit={() => setEditing(w)}
              onChanged={load}
              onOpenStudent={onOpenStudent}
            />
          ))}
        </div>
      )}

      {(creating || editing) && (
        <WorkoutEditor
          personalId={personalId}
          students={students}
          workout={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function WorkoutCard({
  workout,
  students,
  onEdit,
  onChanged,
  onOpenStudent,
}: {
  workout: Workout;
  students: Profile[];
  onEdit: () => void;
  onChanged: () => void;
  onOpenStudent: (id: string) => void;
}) {
  const toast = useToast();
  const [days, setDays] = useState(0);
  const [assignOpen, setAssignOpen] = useState(false);
  const student = students.find((s) => s.id === workout.student_id);

  useEffect(() => {
    supabase
      .from('workout_days')
      .select('id', { count: 'exact', head: true })
      .eq('workout_id', workout.id)
      .then(({ count }) => setDays(count || 0));
  }, [workout.id]);

  async function assign(studentId: string | null) {
    const { error } = await supabase
      .from('workouts')
      .update({ student_id: studentId })
      .eq('id', workout.id);
    if (error) toast('Erro ao atribuir ficha.', 'error');
    else {
      toast(studentId ? 'Ficha atribuída ao aluno!' : 'Ficha desvinculada.');
      setAssignOpen(false);
      onChanged();
    }
  }

  return (
    <div className="card p-4 flex flex-col gap-3 group">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold truncate">{workout.nome}</h3>
            {workout.ativo ? (
              <span className="chip bg-neon-400/10 text-neon-400 text-[10px]">Ativa</span>
            ) : (
              <span className="chip bg-ink-700/50 text-ink-400 text-[10px]">Inativa</span>
            )}
          </div>
          {workout.descricao && (
            <p className="text-xs text-ink-400 mt-1 line-clamp-2">{workout.descricao}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-ink-400">
        <span className="chip bg-ink-700/50 text-ink-300">
          <ListPlus className="w-3 h-3" /> {days} {days === 1 ? 'dia' : 'dias'}
        </span>
        {student ? (
          <button
            onClick={() => onOpenStudent(student.id)}
            className="chip bg-accent/10 text-accent hover:bg-accent/20 transition"
          >
            <UserCheck className="w-3 h-3" /> {student.nome.split(' ')[0]}
          </button>
        ) : (
          <span className="chip bg-ink-700/40 text-ink-500">Sem aluno</span>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onEdit} className="btn-ghost flex-1 py-2 text-xs">
          <Pencil className="w-3.5 h-3.5" /> Editar
        </button>
        <button onClick={() => setAssignOpen(true)} className="btn-ghost py-2 text-xs">
          <UserCheck className="w-3.5 h-3.5" /> Aluno
        </button>
      </div>

      {assignOpen && (
        <AssignModal
          students={students}
          currentId={workout.student_id}
          onPick={assign}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  );
}

function AssignModal({
  students,
  currentId,
  onPick,
  onClose,
}: {
  students: Profile[];
  currentId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} title="Atribuir a aluno" maxWidth="max-w-sm">
      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        <button
          onClick={() => onPick(null)}
          className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
            !currentId
              ? 'border-neon-400/60 bg-neon-400/10'
              : 'border-ink-700/60 bg-ink-800/60 hover:border-ink-600'
          }`}
        >
          <div className="grid place-items-center w-9 h-9 rounded-full bg-ink-700 text-ink-400">
            <X className="w-4 h-4" />
          </div>
          <div className="text-sm font-medium">Sem aluno (template)</div>
        </button>
        {students.map((s) => (
          <button
            key={s.id}
            onClick={() => onPick(s.id)}
            className={`w-full text-left p-3 rounded-xl border transition flex items-center gap-3 ${
              currentId === s.id
                ? 'border-neon-400/60 bg-neon-400/10'
                : 'border-ink-700/60 bg-ink-800/60 hover:border-ink-600'
            }`}
          >
            <div className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-neon-400/30 to-accent/20 text-neon-100 text-xs font-bold">
              {s.nome.split(' ').slice(0, 2).map((p) => p[0]).join('')}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{s.nome}</div>
              <div className="text-xs text-ink-400 truncate">{s.email}</div>
            </div>
          </button>
        ))}
        {students.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-6">
            Cadastre alunos primeiro para atribuir fichas.
          </p>
        )}
      </div>
    </Modal>
  );
}

function WorkoutEditor({
  personalId,
  students,
  workout,
  onClose,
  onSaved,
}: {
  personalId: string;
  students: Profile[];
  workout: Workout | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(!!workout);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState(workout?.nome || '');
  const [descricao, setDescricao] = useState(workout?.descricao || '');
  const [studentId, setStudentId] = useState<string | null>(workout?.student_id || null);
  const [days, setDays] = useState<DraftDay[]>([]);

  useEffect(() => {
    if (!workout) return;
    (async () => {
      setLoading(true);
      const { days: d, exercisesByDay } = await fetchWorkoutTree(workout.id);
      setDays(
        d.map((day) => ({
          id: day.id,
          nome: day.nome,
          ordem: day.ordem,
          open: false,
          exercises: (exercisesByDay[day.id] || []).map((e) => ({
            id: e.id,
            nome: e.nome,
            series: e.series?.toString() || '',
            repeticoes: e.repeticoes || '',
            carga: e.carga || '',
            video_url: e.video_url || '',
            ordem: e.ordem,
          })),
        })),
      );
      setLoading(false);
    })();
  }, [workout]);

  function addDay() {
    setDays((d) => [
      ...d,
      {
        nome: `Treino ${String.fromCharCode(65 + d.length)}`,
        ordem: d.length,
        open: true,
        exercises: [],
      },
    ]);
  }

  function addExercise(dayIdx: number) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  nome: '',
                  series: '3',
                  repeticoes: '8-12',
                  carga: '',
                  video_url: '',
                  ordem: day.exercises.length,
                },
              ],
            }
          : day,
      ),
    );
  }

  function updateDay(idx: number, patch: Partial<DraftDay>) {
    setDays((d) => d.map((day, i) => (i === idx ? { ...day, ...patch } : day)));
  }

  function updateEx(dayIdx: number, exIdx: number, patch: Partial<DraftExercise>) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              exercises: day.exercises.map((ex, j) =>
                j === exIdx ? { ...ex, ...patch } : ex,
              ),
            }
          : day,
      ),
    );
  }

  function removeEx(dayIdx: number, exIdx: number) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIdx
          ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIdx) }
          : day,
      ),
    );
  }

  function removeDay(idx: number) {
    setDays((d) => d.filter((_, i) => i !== idx));
  }

  function moveDay(idx: number, dir: -1 | 1) {
    setDays((d) => {
      const next = [...d];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return d;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((day, i) => ({ ...day, ordem: i }));
    });
  }

  async function save() {
    if (!nome.trim()) {
      toast('Dê um nome à ficha.', 'error');
      return;
    }
    setSaving(true);
    try {
      let workoutId = workout?.id;
      if (workoutId) {
        const { error } = await supabase
          .from('workouts')
          .update({ nome: nome.trim(), descricao: descricao.trim(), student_id: studentId })
          .eq('id', workoutId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workouts')
          .insert({
            personal_id: personalId,
            nome: nome.trim(),
            descricao: descricao.trim(),
            student_id: studentId,
            ativo: true,
          })
          .select()
          .single();
        if (error) throw error;
        workoutId = (data as Workout).id;
      }

      // Replace days & exercises (simple approach for this app)
      const { data: existingDays } = await supabase
        .from('workout_days')
        .select('id')
        .eq('workout_id', workoutId);
      if (existingDays && existingDays.length) {
        await supabase
          .from('workout_days')
          .delete()
          .in('id', (existingDays as WorkoutDay[]).map((d) => d.id));
      }

      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const { data: dayRow, error: dErr } = await supabase
          .from('workout_days')
          .insert({ workout_id: workoutId, nome: day.nome.trim(), ordem: i })
          .select()
          .single();
        if (dErr) throw dErr;
        const dayId = (dayRow as WorkoutDay).id;
        for (let j = 0; j < day.exercises.length; j++) {
          const ex = day.exercises[j];
          if (!ex.nome.trim()) continue;
          const { error: eErr } = await supabase
            .from('workout_exercises')
            .insert({
              workout_day_id: dayId,
              nome: ex.nome.trim(),
              series: ex.series ? parseInt(ex.series, 10) : null,
              repeticoes: ex.repeticoes.trim() || null,
              carga: ex.carga.trim() || null,
              video_url: ex.video_url.trim() || null,
              ordem: j,
            });
          if (eErr) throw eErr;
        }
      }

      toast('Ficha salva com sucesso!');
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao salvar ficha.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-b-none sm:rounded-2xl animate-scale-in">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-ink-850/95 backdrop-blur border-b border-ink-700/60">
          <h3 className="font-display text-lg font-bold">
            {workout ? 'Editar ficha' : 'Nova ficha de treino'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-ink-700 text-ink-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 grid place-items-center">
            <Loader2 className="w-6 h-6 animate-spin text-ink-400" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Nome da ficha</label>
                <input
                  className="input"
                  placeholder="Ex: Hipertrofia - João"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Atribuir a aluno</label>
                <select
                  className="input"
                  value={studentId || ''}
                  onChange={(e) => setStudentId(e.target.value || null)}
                >
                  <option value="">Sem aluno (template)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <input
                className="input"
                placeholder="Ex: Foco em hipertrofia, 4x semana"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Dias de treino</label>
                <button onClick={addDay} className="btn-ghost py-1.5 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar dia
                </button>
              </div>

              <div className="space-y-2">
                {days.map((day, idx) => (
                  <div key={idx} className="rounded-xl border border-ink-700/60 bg-ink-800/50 overflow-hidden">
                    <div className="flex items-center gap-2 p-3">
                      <div className="flex flex-col">
                        <button
                          onClick={() => moveDay(idx, -1)}
                          disabled={idx === 0}
                          className="text-ink-500 hover:text-ink-200 disabled:opacity-30"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveDay(idx, 1)}
                          disabled={idx === days.length - 1}
                          className="text-ink-500 hover:text-ink-200 disabled:opacity-30"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        className="input py-2 flex-1 font-semibold"
                        value={day.nome}
                        onChange={(e) => updateDay(idx, { nome: e.target.value })}
                      />
                      <button
                        onClick={() => updateDay(idx, { open: !day.open })}
                        className="p-2 rounded-lg hover:bg-ink-700 text-ink-400"
                      >
                        {day.open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => removeDay(idx)}
                        className="p-2 rounded-lg hover:bg-danger/15 text-ink-400 hover:text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {day.open && (
                      <div className="px-3 pb-3 space-y-2 animate-fade-in">
                        {day.exercises.map((ex, j) => (
                          <div key={j} className="rounded-lg bg-ink-850/70 border border-ink-700/40 p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-ink-600 shrink-0" />
                              <input
                                className="input py-2 flex-1"
                                placeholder="Nome do exercício"
                                value={ex.nome}
                                onChange={(e) => updateEx(idx, j, { nome: e.target.value })}
                              />
                              <button
                                onClick={() => removeEx(idx, j)}
                                className="p-2 rounded-lg hover:bg-danger/15 text-ink-400 hover:text-danger"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="label !text-[10px]">Séries</label>
                                <input
                                  className="input py-2"
                                  type="number"
                                  placeholder="3"
                                  value={ex.series}
                                  onChange={(e) => updateEx(idx, j, { series: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label !text-[10px]">Reps</label>
                                <input
                                  className="input py-2"
                                  placeholder="8-12"
                                  value={ex.repeticoes}
                                  onChange={(e) => updateEx(idx, j, { repeticoes: e.target.value })}
                                />
                              </div>
                              <div>
                                <label className="label !text-[10px]">Carga</label>
                                <input
                                  className="input py-2"
                                  placeholder="20kg"
                                  value={ex.carga}
                                  onChange={(e) => updateEx(idx, j, { carga: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label !text-[10px] flex items-center gap-1">
                                <Link2 className="w-3 h-3" /> Link do vídeo (YouTube)
                              </label>
                              <input
                                className="input py-2"
                                placeholder="https://youtube.com/watch?v=…"
                                value={ex.video_url}
                                onChange={(e) => updateEx(idx, j, { video_url: e.target.value })}
                              />
                              {ex.video_url && youtubeThumb(ex.video_url) && (
                                <div className="mt-2 relative rounded-lg overflow-hidden border border-ink-700/40">
                                  <img
                                    src={youtubeThumb(ex.video_url)!}
                                    alt="thumb"
                                    className="w-full h-24 object-cover"
                                  />
                                  <span className="absolute bottom-1 right-1 chip bg-ink-950/80 text-ink-200 text-[10px]">
                                    <Play className="w-2.5 h-2.5" /> Preview
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                        <button
                          onClick={() => addExercise(idx)}
                          className="w-full py-2 rounded-lg border border-dashed border-ink-600 text-ink-400 hover:text-ink-200 hover:border-ink-500 transition text-xs font-medium"
                        >
                          <Plus className="w-3.5 h-3.5 inline mr-1" /> Adicionar exercício
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {days.length === 0 && (
                  <div className="text-center py-6 text-sm text-ink-500">
                    Nenhum dia adicionado. Comece com "Treino A".
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-ink-850/95 backdrop-blur -mx-5 px-5 py-3 border-t border-ink-700/60">
              <button onClick={onClose} className="btn-ghost flex-1">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar ficha
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
