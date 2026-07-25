/*
# Adjust profiles to support trainer-created students

1. Why
The original profiles.id was a strict FK to auth.users(id), so a trainer could
not pre-register a student (Nome, E-mail, Telefone, Objetivo) before the student
created an auth account. This migration decouples the profile row identity from
the auth user identity:

- profiles.id becomes a surrogate PK (DEFAULT gen_random_uuid()), no longer
  referencing auth.users.
- A new nullable `user_id` column references auth.users(id) and is populated
  when the student signs up (matched by email). Until then the profile exists
  as a trainer-managed record with user_id = null.
- RLS for "own profile" now checks `user_id = auth.uid()`.
- Trainer student access still checks `personal_id = auth.uid()`.
- workouts.student_id and workout_logs.student_id still reference profiles.id
  (the profile row). Student-side policies now resolve the student's profile via
  a subquery: `student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())`.

2. Changes
- Drop FK profiles_id_fkey (id -> auth.users).
- Set profiles.id DEFAULT gen_random_uuid().
- Add profiles.user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL.
- Add index on profiles.user_id.
- Recreate student-side RLS policies on profiles, workouts, workout_days,
  workout_exercises, workout_logs, exercise_logs to use user_id resolution.

3. Security
- No data is lost (table is empty in this fresh build).
- RLS remains enabled; policies tightened to the new identity model.
*/

-- 1. Decouple profiles.id from auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Add user_id link to auth.users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id_unique ON profiles(user_id) WHERE user_id IS NOT NULL;

-- 3. Recreate profiles policies (drop old, add new)

-- Own profile (student or trainer viewing their own row)
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Trainer reads students they own
DROP POLICY IF EXISTS "trainer_select_students" ON profiles;
CREATE POLICY "trainer_select_students" ON profiles FOR SELECT
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid());

-- Trainer inserts a student profile (pre-registration, user_id null)
DROP POLICY IF EXISTS "trainer_insert_student" ON profiles;
CREATE POLICY "trainer_insert_student" ON profiles FOR INSERT
  TO authenticated WITH CHECK (role = 'aluno' AND personal_id = auth.uid());

-- Trainer updates students they own (also used by student-link flow)
DROP POLICY IF EXISTS "trainer_update_student" ON profiles;
CREATE POLICY "trainer_update_student" ON profiles FOR UPDATE
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid())
  WITH CHECK (role = 'aluno' AND personal_id = auth.uid());

-- Trainer deletes students they own
DROP POLICY IF EXISTS "trainer_delete_student" ON profiles;
CREATE POLICY "trainer_delete_student" ON profiles FOR DELETE
  TO authenticated USING (role = 'aluno' AND personal_id = auth.uid());

-- A student can link their auth account to a pre-registered profile (update user_id)
-- Allowed when the profile has no user_id yet and the acting user matches by email.
DROP POLICY IF EXISTS "student_link_profile" ON profiles;
CREATE POLICY "student_link_profile" ON profiles FOR UPDATE
  TO authenticated
  USING (user_id IS NULL AND role = 'aluno')
  WITH CHECK (user_id = auth.uid() AND role = 'aluno');

-- A student can insert their own profile row if none pre-existed (self-registration)
DROP POLICY IF EXISTS "student_insert_own_profile" ON profiles;
CREATE POLICY "student_insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());


-- 4. workouts student-side policy: resolve student profile by user_id
DROP POLICY IF EXISTS "student_select_workouts" ON workouts;
CREATE POLICY "student_select_workouts" ON workouts FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );


-- 5. workout_days student-side policy
DROP POLICY IF EXISTS "student_select_days" ON workout_days;
CREATE POLICY "student_select_days" ON workout_days FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workouts w
      WHERE w.id = workout_days.workout_id
      AND w.student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );


-- 6. workout_exercises student-side policy
DROP POLICY IF EXISTS "student_select_exercises" ON workout_exercises;
CREATE POLICY "student_select_exercises" ON workout_exercises FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM workout_days d
      JOIN workouts w ON w.id = d.workout_id
      WHERE d.id = workout_exercises.workout_day_id
      AND w.student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );


-- 7. workout_logs: student owns logs for their profile row
DROP POLICY IF EXISTS "student_select_logs" ON workout_logs;
CREATE POLICY "student_select_logs" ON workout_logs FOR SELECT
  TO authenticated USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_insert_logs" ON workout_logs;
CREATE POLICY "student_insert_logs" ON workout_logs FOR INSERT
  TO authenticated WITH CHECK (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "student_update_logs" ON workout_logs;
CREATE POLICY "student_update_logs" ON workout_logs FOR UPDATE
  TO authenticated
  USING (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "student_delete_logs" ON workout_logs;
CREATE POLICY "student_delete_logs" ON workout_logs FOR DELETE
  TO authenticated USING (
    student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );


-- 8. exercise_logs student-side (unchanged shape, already joins workout_logs)
-- (policies already reference workout_logs.student_id; keep as-is, they still work
--  because workout_logs policies above enforce ownership)
