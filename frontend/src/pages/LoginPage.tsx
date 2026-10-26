import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-[#060A14] dark:via-[#090F1F] dark:to-[#060A14] font-sans px-4 py-10 relative overflow-hidden transition-colors selection:bg-[#F5B700]/30 selection:text-foreground">
      {/* Dual-Brand Ambient Radial Glows */}
      <div className="absolute -top-36 -left-36 w-[450px] h-[450px] bg-[#1F5FBF]/15 dark:bg-[#1F5FBF]/12 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-[450px] h-[450px] bg-[#F5B700]/15 dark:bg-[#F5B700]/12 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative subtle grid overlay */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" 
      />

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* ── Brand Logos Section (Prominent & Elegant) ── */}
        <div className="text-center mb-6">
          
          {/* Dual Brand Logos Container */}
          <div className="inline-flex items-center justify-center gap-3 sm:gap-4 p-2.5 sm:p-3 bg-white/90 dark:bg-[#0E172C]/90 rounded-2xl border border-slate-200/90 dark:border-[#1C2B4E] shadow-lg shadow-slate-900/5 dark:shadow-black/30 backdrop-blur-md mb-4 transition-all">
            {/* Somtel Logo */}
            <div className="h-13 sm:h-14 px-3 sm:px-4 bg-slate-50/80 dark:bg-[#121E38]/80 rounded-xl border border-slate-100 dark:border-[#22355F] flex items-center justify-center hover:scale-[1.02] transition-transform">
              <img
                src="/logos/somtel-logo.png"
                alt="Somtel Logo"
                className="h-9 sm:h-10 w-auto object-contain max-w-[110px]"
                onError={(e: any) => { e.currentTarget.src = '/logos/somtel-banner.png'; }}
              />
            </div>

            <div className="flex flex-col items-center justify-center">
              <span className="text-slate-300 dark:text-slate-600 font-bold text-xs">&times;</span>
            </div>

            {/* Bluekom Logo */}
            <div className="h-13 sm:h-14 px-3 sm:px-4 bg-slate-50/80 dark:bg-[#121E38]/80 rounded-xl border border-slate-100 dark:border-[#22355F] flex items-center justify-center hover:scale-[1.02] transition-transform">
              <img
                src="/logos/bluekom-logo.jpg"
                alt="Bluekom Logo"
                className="h-9 sm:h-10 w-auto object-contain max-w-[110px]"
                onError={(e: any) => { e.currentTarget.src = '/logos/bluekom-logo.jpeg'; }}
              />
            </div>
          </div>

          {/* System Title */}
          <h1 className="text-2xl sm:text-[26px] font-black text-slate-900 dark:text-white tracking-tight font-display leading-tight">
            Petty Cash Office
          </h1>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Somtel & Bluekom Financial Disbursements & Audit
          </p>
        </div>

        {/* ── Main Login Card ── */}
        <Card className="border border-slate-200 dark:border-[#1C2B4E] shadow-2xl shadow-slate-900/10 dark:shadow-black/50 bg-white/95 dark:bg-[#0D162B]/95 backdrop-blur-xl text-card-foreground rounded-2xl overflow-hidden relative">
          
          {/* Dual-Brand Top Accent Bar */}
          <div className="h-[3.5px] w-full bg-gradient-to-r from-[#1F5FBF] via-[#F5B700] to-[#E0A500]" />

          <CardHeader className="space-y-1 pb-3 pt-6 px-6 sm:px-7">
            <CardTitle className="text-lg text-foreground font-bold flex items-center gap-2">
              Sign In to CashDesk
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground leading-relaxed">
              Enter your credentials to access your financial workspace
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 sm:px-7 pt-2">
            {error && (
              <Alert variant="destructive" className="py-2.5 px-3 rounded-xl border border-destructive/20 bg-destructive/10">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                <AlertDescription className="text-xs font-medium text-destructive leading-tight">{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Username</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-11 border-slate-200 dark:border-[#1E2E52] bg-slate-50/70 dark:bg-[#090F1F] focus:bg-white dark:focus:bg-[#0A1224] focus:ring-2 focus:ring-[#F5B700]/50 focus:border-[#F5B700] rounded-xl text-sm transition-all"
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input with Visibility Toggle */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Password</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 border-slate-200 dark:border-[#1E2E52] bg-slate-50/70 dark:bg-[#090F1F] focus:bg-white dark:focus:bg-[#0A1224] focus:ring-2 focus:ring-[#F5B700]/50 focus:border-[#F5B700] rounded-xl text-sm transition-all font-mono"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-md focus:outline-none"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                size="lg"
                isLoading={loading}
                className="w-full mt-2 h-11 text-sm font-bold bg-[#F5B700] hover:bg-[#E5AA00] text-slate-950 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/25 rounded-xl cursor-pointer transition-all active:scale-[0.99]"
              >
                Sign In to Workspace
              </Button>
            </form>
          </CardContent>

          <CardFooter className="pt-2 pb-6 px-6 sm:px-7 flex flex-col items-center gap-3 border-t border-slate-100 dark:border-[#14203B] bg-slate-50/40 dark:bg-[#0A1122]/40">
            <div className="flex items-center gap-2">
              <span className="co-badge-somtel text-[10px] font-bold px-2 py-0.5 rounded-full">Somtel</span>
              <span className="text-slate-300 dark:text-slate-700 text-xs">&bull;</span>
              <span className="co-badge-bluekom text-[10px] font-bold px-2 py-0.5 rounded-full">Bluekom</span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>256-bit Encrypted & Audited Session</span>
            </div>
          </CardFooter>
        </Card>

        {/* Bottom subtle copyright / location */}
        <p className="text-center text-[11px] text-muted-foreground/70 mt-6 font-medium">
          HQ Puntland Garowe &bull; Somalia
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
