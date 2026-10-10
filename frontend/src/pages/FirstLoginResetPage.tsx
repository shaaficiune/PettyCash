import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Lock, AlertCircle, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '../components/ui';

export const FirstLoginResetPage: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user || !user.resetPasswordRequired) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/first-login-reset', { newPassword: password });
      // Update local storage and auth context with updated user context
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      updateUserContext({ resetPasswordRequired: false });

      // Navigate to dashboard
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl">Security Update Required</CardTitle>
          <CardDescription className="text-xs">
            Hi {user.fullName}, you are logged in using a temporary password. You must set a new secure password to proceed.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label required>New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label required>Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="gold"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              Save & Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default FirstLoginResetPage;
