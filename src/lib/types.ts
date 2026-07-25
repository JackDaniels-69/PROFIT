export type Role = 'personal' | 'aluno';
export type PaymentStatus = 'pago' | 'pendente';

export interface Profile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  objetivo: string | null;
  role: Role;
  personal_id: string | null;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface Workout {
  id: string;
  personal_id: string;
  student_id: string | null;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface WorkoutDay {
  id: string;
  workout_id: string;
  nome: string;
  ordem: number;
  created_at?: string;
}

export interface WorkoutExercise {
  id: string;
  workout_day_id: string;
  nome: string;
  series: number | null;
  repeticoes: string | null;
  carga: string | null;
  video_url: string | null;
  ordem: number;
}

export interface WorkoutLog {
  id: string;
  student_id: string;
  workout_day_id: string;
  completed_at: string;
  exercises_total: number | null;
  exercises_done: number | null;
}

export interface ExerciseLog {
  id: string;
  workout_log_id: string;
  exercise_id: string;
  completed: boolean;
  completed_at: string | null;
}

export interface WorkoutWithRelations extends Workout {
  workout_days?: WorkoutDay[];
}

export interface DayWithExercises extends WorkoutDay {
  workout_exercises?: WorkoutExercise[];
}
