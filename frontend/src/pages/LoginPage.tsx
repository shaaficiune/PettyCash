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
    <div className="min-h-screen flex items-center justify-center bg-muted/40 dark:bg-background font-sans px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Wallet className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Petty Cash System</h1>
          <p className="text-xs text-muted-foreground mt-1">Sign in to your account</p>
        </div>

        {/* shadcn Card */}
        <Card className="border-border shadow-md bg-card text-card-foreground">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access CashDesk
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
                <Label className="text-xs font-medium text-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 h-10"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 h-10"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                isLoading={loading}
                className="w-full mt-2 h-10 text-sm font-semibold shadow-xs"
              >
                Sign In
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pt-0 justify-center">
            <p className="text-center text-[11px] text-muted-foreground">
              Somtel &bull; Bluekom
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
