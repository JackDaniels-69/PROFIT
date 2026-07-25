import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Workout, WorkoutDay, WorkoutExercise } from '@/lib/types';

export function useTrainerData(personalId: string | undefined) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!personalId) return;
    setLoading(true);
    const [sRes, wRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('personal_id', personalId)
        .order('created_at', { ascending: false }),
      supabase
        .from('workouts')
        .select('*')
        .eq('personal_id', personalId)
        .order('created_at', { ascending: false }),
    ]);
    if (sRes.data) setStudents(sRes.data as Profile[]);
    if (wRes.data) setWorkouts(wRes.data as Workout[]);
    setLoading(false);
  }, [personalId]);

  useEffect(() => {
    load();
  }, [load]);

  return { students, workouts, loading, reload: load };
}

export async function fetchWorkoutTree(workoutId: string) {
  const { data: days } = await supabase
    .from('workout_days')
    .select('*')
    .eq('workout_id', workoutId)
    .order('ordem', { ascending: true });
  if (!days) return { days: [], exercisesByDay: {} as Record<string, WorkoutExercise[]> };
  const dayIds = (days as WorkoutDay[]).map((d) => d.id);
  const { data: exs } = await supabase
    .from('workout_exercises')
    .select('*')
    .in('workout_day_id', dayIds.length ? dayIds : ['00000000-0000-0000-0000-000000000000'])
    .order('ordem', { ascending: true });
  const exercisesByDay: Record<string, WorkoutExercise[]> = {};
  (exs as WorkoutExercise[] | null)?.forEach((ex) => {
    (exercisesByDay[ex.workout_day_id] ||= []).push(ex);
  });
  return { days: days as WorkoutDay[], exercisesByDay };
}
