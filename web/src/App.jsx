import AppRouter from './routes/AppRouter';
import { AuthProvider } from './features/auth/AuthContext';
import { ToastProvider } from './components/ui/Toast';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}