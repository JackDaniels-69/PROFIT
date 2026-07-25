import { AuthProvider, useAuth } from '@/lib/auth';
import { ToastProvider } from '@/components/Toast';
import { FullScreenLoader } from '@/components/Loader';
import AuthScreen from '@/components/AuthScreen';
import TrainerApp from '@/components/TrainerApp';
import StudentApp from '@/components/StudentApp';

function Router() {
  const { session, profile, loading } = useAuth();

  if (loading) return <FullScreenLoader />;
  if (!session) return <AuthScreen />;
  if (!profile) {
    // Session exists but profile not loaded yet — show loader briefly.
    return <FullScreenLoader />;
  }

  if (profile.role === 'personal') return <TrainerApp />;
  return <StudentApp profile={profile} />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router />
      </ToastProvider>
    </AuthProvider>
  );
}
