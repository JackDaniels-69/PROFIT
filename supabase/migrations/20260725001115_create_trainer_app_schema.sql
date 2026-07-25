/*
# Personal Trainer Micro-SaaS Schema

1. Overview
This migration creates the full data model for a personal-trainer micro-SaaS.
There are two user roles: `personal` (trainer) and `aluno` (student).
Trainers manage students, build workout sheets (fichas) divided by training days,
each day containing exercises, and assign sheets to students. Students log
completed workouts and exercises, and the app tracks weekly progress.

2. New Tables
- `profiles`
  - `id` uuid PK, references auth.users, ON DELETE CASCADE
  - `nome` text NOT NULL
  - `email` text NOT NULL
  - `telefone` text
  - `objetivo` text
  - `role` text NOT NULL DEFAULT 'aluno' CHECK in ('personal','aluno')
  - `personal_id` uuid nullable -> profiles.id (the trainer who owns this student)
  - `payment_status` text DEFAULT 'pago' CHECK in ('pago','pendente')
  - `created_at` timestamptz DEFAULT now()
- `workouts` (a ficha de treino)
  - `id` uuid PK
  - `personal_id` uuid NOT NULL -> profiles.id (trainer owner)
  - `student_id` uuid nullable -> profiles.id (assigned student, null = template)
  - `nome` text NOT NULL (e.g. "Hipertrofia - Joao")
  - `descricao` text
  - `ativo` boolean DEFAULT true
  - `created_at` timestamptz DEFAULT now()
- `workout_days` (Treino A, Treino B, ...)
  - `id` uuid PK
  - `workout_id` uuid NOT NULL -> workouts.id ON DELETE CASCADE
  - `nome` text NOT NULL (e.g. "Treino A - Peito")
  - `ordem` int DEFAULT 0
- `workout_exercises`
  - `id` uuid PK
  - `workout_day_id` uuid NOT NULL -> workout_days.id ON DELETE CASCADE
  - `nome` text NOT NULL
  - `series` int
  - `repeticoes` text (e.g. "8-12")
  - `carga` text (e.g. "20kg")
  - `video_url` text (YouTube link)
  - `ordem` int DEFAULT 0
- `workout_logs` (history of completed workouts by students)
  - `id` uuid PK
  - `student_id` uuid NOT NULL -> profiles.id ON DELETE CASCADE
  - `workout_day_id` uuid NOT NULL -> workout_days.id
  - `completed_at` timestamptz DEFAULT now()
  - `exercises_total` int
  - `exercises_done` int
- `exercise_logs` (per-exercise completion within a workout log)
  - `id` uuid PK
  - `workout_log_id` uuid NOT NULL -> workout_logs.id ON DELETE CASCADE
  - `exercise_id` uuid NOT NULL -> workout_exercises.id
  - `completed` boolean DEFAULT false
  - `completed_at` timestamptz

3. Security (RLS)
- profiles: each authenticated user reads/updates their own row. A trainer can
  read/update rows of students where personal_id = auth.uid(). Students can read
  their own row. Trainers can read their own row. A trainer can INSERT student
  profiles (personal_id = auth.uid()).
- workouts: trainer owns rows where personal_id = auth.uid() (full CRUD). A
  student can SELECT workouts assigned to them (student_id = auth.uid()).
- workout_days / workout_exercises: trainer CRUD when parent workout is owned by
  them; student SELECT when parent workout is assigned to them.
- workout_logs / exercise_logs: student owns their own logs (full CRUD by the
  student). Trainer SELECT for logs of their students.
- All policies scoped TO authenticated (this app has a sign-in screen).

4. Notes
- `profiles.user_id` style ownership is via `id` (the auth user id) for the user's
  own profile, and via `personal_id` for the trainer-student relationship.
- Owner columns that the client inserts with an explicit owner use DEFAULT auth.uid()
  where the client is the owner (workouts.personal_id).
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  objetivo text,
  role text NOT NULL DEFAULT 'aluno' CHECK (role IN ('personal','aluno')),
  personal_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'pago' CHECK (payment_status IN ('pago','pendente')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- A user can read & update their own profile
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- A trainer can read students they own
DROP POLICY IF EXISTS "trainer_select_students" ON profiles;
CREATE POLICY "trainer_select_students" ON profiles FOR SELECT
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid());

-- A trainer can insert a student profile (personal_id must be the trainer)
DROP POLICY IF EXISTS "trainer_insert_student" ON profiles;
CREATE POLICY "trainer_insert_student" ON profiles FOR INSERT
  TO authenticated WITH CHECK (role = 'aluno' AND personal_id = auth.uid());

-- A trainer can update students they own
DROP POLICY IF EXISTS "trainer_update_student" ON profiles;
CREATE POLICY "trainer_update_student" ON profiles FOR UPDATE
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid())
  WITH CHECK (role = 'aluno' AND personal_id = auth.uid());

-- A trainer can delete students they own
DROP POLICY IF EXISTS "trainer_delete_student" ON profiles;
CREATE POLICY "trainer_delete_student" ON profiles FOR DELETE
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid());


-- WORKOUTS
CREATE TABLE IF NOT EXISTS workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  student_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Trainer full CRUD on own workouts
DROP POLICY IF EXISTS "trainer_select_workouts" ON workouts;
CREATE POLICY "trainer_select_workouts" ON workouts FOR SELECT
  TO authenticated USING (personal_id = auth.uid());

DROP POLICY IF EXISTS "trainer_insert_workouts" ON workouts;
CREATE POLICY "trainer_insert_workouts" ON workouts FOR INSERT
  TO authenticated WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "trainer_update_workouts" ON workouts;
CREATE POLICY "trainer_update_workouts" ON workouts FOR UPDATE
  TO authenticated USING (personal_id = auth.uid()) WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "trainer_delete_workouts" ON workouts;
CREATE POLICY "trainer_delete_workouts" ON workouts FOR DELETE
  TO authenticated USING (personal_id = auth.uid());

-- Student can read workouts assigned to them
DROP POLICY IF EXISTS "student_select_workouts" ON workouts;
CREATE POLICY "student_select_workouts" ON workouts FOR SELECT
  TO authenticated USING (student_id = auth.uid());


-- WORKOUT DAYS
CREATE TABLE IF NOT EXISTS workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;

-- Trainer CRUD when parent workout owned by them
DROP POLICY IF EXISTS "trainer_select_days" ON workout_days;
CREATE POLICY "trainer_select_days" ON workout_days FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.personal_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_insert_days" ON workout_days;
CREATE POLICY "trainer_insert_days" ON workout_days FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.personal_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_update_days" ON workout_days;
CREATE POLICY "trainer_update_days" ON workout_days FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.personal_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.personal_id = auth.uid())
  );

DROP POLICY IF EXISTS "trainer_delete_days" ON workout_days;
CREATE POLICY "trainer_delete_days" ON workout_days FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.personal_id = auth.uid())
  );

-- Student can read days of workouts assigned to them
DROP POLICY IF EXISTS "student_select_days" ON workout_days;
CREATE POLICY "student_select_days" ON workout_days FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_days.workout_id AND w.student_id = auth.uid())
  );


-- WORKOUT EXERCISES
CREATE TABLE IF NOT EXISTS workout_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  nome text NOT NULL,
  series int,
  repeticoes text,
  carga text,
  video_url text,
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trainer_select_exercises" ON workout_exercises;
CREATE POLICY "trainer_select_exercises" ON workout_exercises FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.personal_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trainer_insert_exercises" ON workout_exercises;
CREATE POLICY "trainer_insert_exercises" ON workout_exercises FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.personal_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trainer_update_exercises" ON workout_exercises;
CREATE POLICY "trainer_update_exercises" ON workout_exercises FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.personal_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.personal_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "trainer_delete_exercises" ON workout_exercises;
CREATE POLICY "trainer_delete_exercises" ON workout_exercises FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.personal_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "student_select_exercises" ON workout_exercises;
CREATE POLICY "student_select_exercises" ON workout_exercises FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id AND w.student_id = auth.uid()
    )
  );


-- WORKOUT LOGS
CREATE TABLE IF NOT EXISTS workout_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  workout_day_id uuid NOT NULL REFERENCES workout_days(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  exercises_total int,
  exercises_done int
);

ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- Student owns their logs
DROP POLICY IF EXISTS "student_select_logs" ON workout_logs;
CREATE POLICY "student_select_logs" ON workout_logs FOR SELECT
  TO authenticated USING (student_id = auth.uid());

DROP POLICY IF EXISTS "student_insert_logs" ON workout_logs;
CREATE POLICY "student_insert_logs" ON workout_logs FOR INSERT
  TO authenticated WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_update_logs" ON workout_logs;
CREATE POLICY "student_update_logs" ON workout_logs FOR UPDATE
  TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "student_delete_logs" ON workout_logs;
CREATE POLICY "student_delete_logs" ON workout_logs FOR DELETE
  TO authenticated USING (student_id = auth.uid());

-- Trainer can read logs of their students
DROP POLICY IF EXISTS "trainer_select_student_logs" ON workout_logs;
CREATE POLICY "trainer_select_student_logs" ON workout_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = workout_logs.student_id AND p.personal_id = auth.uid())
  );


-- EXERCISE LOGS
CREATE TABLE IF NOT EXISTS exercise_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL REFERENCES workout_logs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz
);

ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_select_exlogs" ON exercise_logs;
CREATE POLICY "student_select_exlogs" ON exercise_logs FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workout_logs l WHERE l.id = exercise_logs.workout_log_id AND l.student_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_insert_exlogs" ON exercise_logs;
CREATE POLICY "student_insert_exlogs" ON exercise_logs FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workout_logs l WHERE l.id = exercise_logs.workout_log_id AND l.student_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_update_exlogs" ON exercise_logs;
CREATE POLICY "student_update_exlogs" ON exercise_logs FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workout_logs l WHERE l.id = exercise_logs.workout_log_id AND l.student_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM workout_logs l WHERE l.id = exercise_logs.workout_log_id AND l.student_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_delete_exlogs" ON exercise_logs;
CREATE POLICY "student_delete_exlogs" ON exercise_logs FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workout_logs l WHERE l.id = exercise_logs.workout_log_id AND l.student_id = auth.uid())
  );

-- Trainer can read exercise logs of their students
DROP POLICY IF EXISTS "trainer_select_exlogs" ON exercise_logs;
CREATE POLICY "trainer_select_exlogs" ON exercise_logs FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_logs l
      JOIN profiles p ON p.id = l.student_id
      WHERE l.id = exercise_logs.workout_log_id AND p.personal_id = auth.uid()
    )
  );


-- INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_personal_id ON profiles(personal_id);
CREATE INDEX IF NOT EXISTS idx_workouts_personal_id ON workouts(personal_id);
CREATE INDEX IF NOT EXISTS idx_workouts_student_id ON workouts(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_days_workout_id ON workout_days(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_day_id ON workout_exercises(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_student_id ON workout_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_completed_at ON workout_logs(completed_at);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_log_id ON exercise_logs(workout_log_id);
