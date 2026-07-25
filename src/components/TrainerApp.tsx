import { useState } from 'react';
import {
  LayoutDashboard,
  Dumbbell,
  LogOut,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTrainerData } from '@/lib/trainer-data';
import TrainerDashboard from '@/components/TrainerDashboard';
import WorkoutManager from '@/components/WorkoutManager';
import StudentDetail from '@/components/StudentDetail';
import { Avatar } from '@/components/Avatar';

type Tab = 'dashboard' | 'workouts';

export default function TrainerApp() {
  const { profile, signOut } = useAuth();
  const { students, reload } = useTrainerData(profile?.id);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  function openStudent(id: string) {
    setStudentId(id);
    setTab('dashboard');
  }

  if (studentId && profile?.id) {
    return (
      <StudentDetail
        studentId={studentId}
        personalId={profile.id}
        onBack={() => {
          setStudentId(null);
          reload();
        }}
        onOpenWorkouts={() => {
          setStudentId(null);
          setTab('workouts');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-ink-950/80 backdrop-blur-lg border-b border-ink-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid place-items-center w-9 h-9 rounded-xl bg-neon-400 text-ink-950 shadow-glow">
              <Dumbbell className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-extrabold leading-none">
                Pro<span className="text-neon-400">Fit</span>
              </div>
              <div className="text-[10px] text-ink-500 mt-0.5">Painel do Personal</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-ink-800 text-ink-300">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-neon-400" />
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((m) => !m)}
                className="flex items-center gap-2 p-1 pr-2 rounded-xl hover:bg-ink-800 transition"
              >
                <Avatar name={profile?.nome || '?'} size="sm" />
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                  {profile?.nome.split(' ')[0]}
                </span>
                <Menu className="w-4 h-4 text-ink-400" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-52 card p-1 animate-scale-in">
                    <div className="px-3 py-2 border-b border-ink-700/60 mb-1">
                      <div className="text-sm font-semibold truncate">{profile?.nome}</div>
                      <div className="text-xs text-ink-400 truncate">{profile?.email}</div>
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-ink-700 flex items-center gap-2 text-danger"
                    >
                      <LogOut className="w-4 h-4" /> Sair da conta
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="py-2">
        {tab === 'dashboard' && (
          <TrainerDashboard onOpenWorkouts={() => setTab('workouts')} onOpenStudent={openStudent} />
        )}
        {tab === 'workouts' && profile?.id && (
          <WorkoutManager personalId={profile.id} students={students} onOpenStudent={openStudent} />
        )}
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-ink-950/90 backdrop-blur-lg border-t border-ink-800/60">
        <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-around">
          <NavButton
            active={tab === 'dashboard'}
            onClick={() => setTab('dashboard')}
            icon={<LayoutDashboard className="w-5 h-5" />}
            label="Início"
          />
          <NavButton
            active={tab === 'workouts'}
            onClick={() => setTab('workouts')}
            icon={<Dumbbell className="w-5 h-5" />}
            label="Treinos"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition ${
        active ? 'text-neon-400' : 'text-ink-500 hover:text-ink-300'
      }`}
    >
      <span className={active ? 'scale-110 transition' : 'transition'}>{icon}</span>
      <span className="text-[10px] font-semibold">{label}</span>
    </button>
  );
}
