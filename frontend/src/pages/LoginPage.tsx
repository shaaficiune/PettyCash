import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter your username and password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const userObj = JSON.parse(savedUser);
        navigate(userObj.resetPasswordRequired ? '/first-login-reset' : '/');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 502 || status === 503) {
        setError('Server is currently offline or restarting (502 Bad Gateway). Please wait a moment.');
      } else if (status === 500) {
        setError('Internal server error (500). Please check backend logs.');
      } else if (msg) {
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setError('Invalid username or password');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#080D1A] font-sans px-4 py-8 relative overflow-hidden transition-colors">
      {/* Dual-Brand Ambient Radial Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#1F5FBF]/15 dark:bg-[#1F5FBF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#F5B700]/15 dark:bg-[#F5B700]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Logos & System Title */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            {/* Somtel Logo badge */}
            <div className="h-11 px-3 bg-white dark:bg-[#0E172C] rounded-xl border border-slate-200 dark:border-[#1C2B4E] shadow-xs flex items-center justify-center">
              <img
                src="/logos/somtel-logo.png"
                alt="Somtel Logo"
                className="h-6 w-auto object-contain"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
            <span className="text-slate-300 dark:text-slate-600 font-light text-sm">&times;</span>
            {/* Bluekom Logo badge */}
            <div className="h-11 px-3 bg-white dark:bg-[#0E172C] rounded-xl border border-slate-200 dark:border-[#1C2B4E] shadow-xs flex items-center justify-center">
              <img
                src="/logos/bluekom-logo.jpg"
                alt="Bluekom Logo"
                className="h-6 w-auto object-contain"
                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
            Petty Cash Office
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Enterprise Financial Disbursements & Audit
          </p>
        </div>

        {/* Dual-Brand Card */}
        <Card className="border border-slate-200/80 dark:border-[#1C2B4E] shadow-xl shadow-slate-900/5 dark:shadow-black/40 bg-white/90 dark:bg-[#0E172C]/90 backdrop-blur-md text-card-foreground rounded-2xl">
          <CardHeader className="space-y-1 pb-4 pt-6">
            <CardTitle className="text-lg text-foreground font-bold">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access the CashDesk workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 h-10 border-slate-200 dark:border-[#1C2B4E] bg-white dark:bg-[#0A1224] focus:ring-[#F5B700] rounded-lg text-sm"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10 border-slate-200 dark:border-[#1C2B4E] bg-white dark:bg-[#0A1224] focus:ring-[#F5B700] rounded-lg text-sm"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                isLoading={loading}
                className="w-full mt-3 h-10 text-sm font-bold bg-gradient-to-r from-[#FFC30B] to-[#F5B700] text-slate-950 hover:from-[#F5B700] hover:to-[#E0A500] shadow-md shadow-amber-500/20 rounded-lg cursor-pointer transition-all"
              >
                Sign In to Workspace
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-1 pb-6 justify-center">
            <div className="flex items-center gap-2">
              <span className="co-badge-somtel text-[10px]">Somtel</span>
              <span className="text-slate-300 dark:text-slate-700 text-xs">&bull;</span>
              <span className="co-badge-bluekom text-[10px]">Bluekom</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
