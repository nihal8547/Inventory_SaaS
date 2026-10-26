'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { handleApiError } from '@/lib/api';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Server,
  Activity,
  Terminal,
  ArrowLeft,
  KeyRound,
  Database,
} from 'lucide-react';

const schema = z.object({
  email: z.string().email('Please enter a valid administrative email address'),
  password: z.string().min(1, 'Super Admin password is required'),
});

type FormData = z.infer<typeof schema>;

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleQuickFill = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    toast.info('Super Admin credentials loaded');
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authService.login(data);
      const raw = res.data as any;
      const payload = raw?.data ?? raw;
      const accessToken = payload?.accessToken;
      const user = payload?.user;
      const memberships = payload?.memberships ?? [];

      if (!accessToken || !user) {
        throw new Error('Invalid authentication response from server');
      }

      // STRICT SUPER ADMIN ACCESS GATE
      if (!user.isSuperAdmin) {
        logout();
        throw new Error(
          'Access Denied: This account does not possess Platform Super Admin privileges. Please use the standard store login portal.'
        );
      }

      setAuth(user, accessToken);

      if (memberships.length > 0) {
        const tenantsList = memberships.map((m: any) => ({
          id: m.tenantId,
          name: m.tenantName,
          slug: m.tenantSlug,
          currency: 'USD',
          timezone: 'UTC',
          locale: 'en',
          isActive: true,
          createdAt: new Date().toISOString(),
        }));
        useAuthStore.getState().setTenants(tenantsList);
        useAuthStore.getState().setTenant(tenantsList[0]);
      }

      toast.success('Authenticated as Platform Super Admin');
      router.push('/admin/tenants');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-slate-950 font-sans text-slate-100">
      {/* ============================================================ */}
      {/* LEFT COLUMN: HIGH-SECURITY INFRASTRUCTURE BRANDING           */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-black via-slate-950 to-purple-950/40 text-white overflow-hidden border-r border-slate-800/80">
        {/* Ambient Dark Neon Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* High-Tech Terminal Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #a855f7 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Platform Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30 ring-1 ring-white/20">
              <ShieldAlert className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  InventoryOS
                </span>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Root Console
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Platform Infrastructure & Multi-Tenant Control</p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative z-10 py-10 my-auto max-w-lg space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 text-xs font-mono backdrop-blur-sm">
              <KeyRound className="h-3.5 w-3.5 text-purple-400" />
              <span>Privileged Access Management (PAM)</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Global Platform Administration Portal
            </h1>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed font-normal">
              Restricted management gateway for platform operations, tenant provisioning, cross-organization governance, and root infrastructure observability.
            </p>
          </div>

          {/* Infrastructure Modules */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                <Database className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Multi-Tenant Management & Provisioning</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Create, configure, suspend, and monitor independent tenant workspaces across global regions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Zero-Trust Root Authentication</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Automated role verification. Standard store logins are strictly prevented from gaining platform access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Server className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Platform Health & Telemetry</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                  Real-time database connection metrics, API latency tracking, and immutable audit logs.
                </p>
              </div>
            </div>
          </div>

          {/* Security Status Card */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Root Gateway Active
            </span>
            <span className="text-purple-400">TLS 1.3 • SHA-256</span>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-6 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/60 font-mono">
          <p>© {new Date().getFullYear()} InventoryOS Core Platform</p>
          <div className="flex items-center gap-3">
            <span>Security Center</span>
            <span>•</span>
            <span>Audit Logs</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: SUPER ADMIN SECURE LOGIN FORM                 */}
      {/* ============================================================ */}
      <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 min-h-screen bg-slate-900/60 border-l border-slate-800/40">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-purple-600 to-rose-600 flex items-center justify-center text-white shadow-sm">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-base text-white">InventoryOS</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Root Admin
          </span>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          {/* Header */}
          <div className="mb-8 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-mono">
              <Terminal className="h-3.5 w-3.5" />
              <span>SUPER ADMIN CONSOLE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Super Admin Sign In
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Authenticate with your root platform administrator credentials.
            </p>
          </div>

          {/* Quick Demo Super Admin Button (Hidden in production unless explicitly enabled) */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true') && (
            <div className="mb-6 p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-medium">
                <span>Super Admin Demo Credentials:</span>
                <span className="text-[10px] text-purple-400">Click to fill</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@example.com', 'Admin123!')}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 text-left border border-slate-700/80 hover:border-purple-500 hover:bg-purple-950/20 transition-all text-xs group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-md bg-purple-900/60 text-purple-400 border border-purple-700/50 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-white leading-tight">
                      Platform Super Admin
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">admin@example.com</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                  Full Root
                </span>
              </button>
            </div>
          )}

          {/* Secure Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                Administrator Email
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  className="pl-9 h-11 text-xs sm:text-sm bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-purple-500 rounded-lg shadow-2xs font-mono"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                Master Security Password
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="pl-9 pr-10 h-11 text-xs sm:text-sm bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-purple-500 rounded-lg shadow-2xs font-mono"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Session */}
            <div className="flex items-center space-x-2 pt-0.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              />
              <Label
                htmlFor="remember"
                className="text-xs font-normal text-slate-400 cursor-pointer select-none"
              >
                Retain root authentication token on this device
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Root Authorization...</span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Authenticate Super Admin</span>
                </div>
              )}
            </Button>

            {/* Link back to Store Login */}
            <div className="pt-5 text-center border-t border-slate-800/80 space-y-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Standard Store & Branch Login</span>
              </Link>
              <p className="text-[11px] text-slate-500">
                Unauthorized access to this portal is monitored and subject to automated IP security throttling.
              </p>
            </div>
          </form>
        </div>

        {/* Bottom Notice */}
        <div className="text-center py-4 text-xs text-slate-500 border-t border-slate-800/60 font-mono">
          <p>InventoryOS Infrastructure Gateway • Protected by TLS 1.3</p>
        </div>
      </div>
    </div>
  );
}
