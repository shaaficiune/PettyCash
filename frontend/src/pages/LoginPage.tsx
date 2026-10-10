import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Wallet, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#061e1e] via-[#0a2e2e] to-[#031414] font-sans px-4 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gold text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-amber-500/25">
            <Wallet className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Petty Cash System</h1>
          <p className="text-xs text-teal-200/70 mt-1">Sign in to your account</p>
        </div>

        {/* shadcn Card */}
        <Card className="bg-[#0b3333]/90 backdrop-blur-xl border-teal-700/40 shadow-2xl shadow-black/40 text-white">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-white">Welcome Back</CardTitle>
            <CardDescription className="text-xs text-teal-200/70">
              Enter your credentials to access CashDesk
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" className="bg-rose-500/20 border-rose-500/30 text-rose-300 py-2.5">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertDescription className="text-xs text-rose-200">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-teal-100/90 text-xs font-medium">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-300/60 pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 bg-[#062020]/80 border-teal-700/50 text-white placeholder:text-teal-400/40 rounded-lg focus-visible:ring-gold focus-visible:border-gold h-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-teal-100/90 text-xs font-medium">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-300/60 pointer-events-none z-10" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-[#062020]/80 border-teal-700/50 text-white placeholder:text-teal-400/40 rounded-lg focus-visible:ring-gold focus-visible:border-gold h-10"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                isLoading={loading}
                className="w-full mt-2 h-10 text-sm font-semibold rounded-lg shadow-md shadow-amber-500/20"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-0 justify-center">
            <p className="text-center text-[11px] text-teal-300/50">
              Somtel &bull; Bluekom
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
