import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { login, register } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirm: '', workspace: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(loginForm.email, loginForm.password);
      saveToken(res.access_token);
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Login failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await register(registerForm.email, registerForm.password, registerForm.workspace || undefined);
      saveToken(res.access_token);
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Registration failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-cosmic flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center space-x-3">
            <Brain className="w-10 h-10 text-primary cosmic-glow" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Black Hole AI
            </h1>
          </div>
          <p className="text-muted-foreground">Your personal knowledge gravitational center</p>
        </div>

        <Card className="bg-gradient-void border-border">
          <CardContent className="pt-6">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      required
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-event-horizon"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={registerForm.email}
                      onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                      required
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-workspace">Workspace name (optional)</Label>
                    <Input
                      id="reg-workspace"
                      type="text"
                      placeholder="my-workspace"
                      value={registerForm.workspace}
                      onChange={e => setRegisterForm(f => ({ ...f, workspace: e.target.value }))}
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                      required
                      minLength={8}
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm password</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirm}
                      onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))}
                      required
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-event-horizon"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
