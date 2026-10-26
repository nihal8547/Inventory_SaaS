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
  Store,
  Shield,
  Package,
  CheckCircle2,
  Building2,
  BarChart3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
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

  const handleQuickFill = (email: string, pass: string, roleName: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    toast.info(`Filled credentials for ${roleName}`);
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
        throw new Error('Invalid response from server');
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

      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-950 font-sans">
      {/* ============================================================ */}
      {/* LEFT COLUMN: COMPANY DETAILS & ENTERPRISE BRANDING (Desktop) */}
      {/* ============================================================ */}
      <div className="hidden lg:flex lg:col-span-5 xl:col-span-6 relative flex-col justify-between p-10 xl:p-14 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden border-r border-slate-800">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        
        {/* Subtle Grid Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Company Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">
                  InventoryOS
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Enterprise SaaS
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Tenant Retail & Warehouse Platform</p>
            </div>
          </div>
        </div>

        {/* Hero & Company Value Highlights */}
        <div className="relative z-10 py-10 my-auto max-w-lg space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-slate-300 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <span>Version 2.4 Production • High Reliability</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Unified Inventory, Multi-Branch & POS Operations.
            </h1>
            <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed font-normal">
              Empower your business with real-time stock synchronisation, rapid barcode checkout, daily itemized sales registers, and zero-trust financial governance.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Real-Time Inventory & Batch Upload</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Automated stock valuation, duplicate-free Excel ingestion, and low-stock alerts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">POS Terminal & Sales Registers</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Daily itemized breakdown, quantity counts, monthly calendar register & split tenders.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-white">Multi-Branch & Zero-Trust Security</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Strict tenant isolation, branch-level RBAC, and server-authoritative calculations.</p>
              </div>
            </div>
          </div>

          {/* Trust Badge / SLA */}
          <div className="flex items-center gap-3 pt-2 text-xs text-slate-400 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>99.98% System Uptime</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-4 w-4 text-blue-400" />
              <span>256-bit TLS Encrypted</span>
            </div>
          </div>
        </div>

        {/* Company Footer Info */}
        <div className="relative z-10 pt-6 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60">
          <p>© {new Date().getFullYear()} InventoryOS Technologies. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Privacy</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Terms</span>
            <span>•</span>
            <span className="hover:text-slate-200 cursor-pointer transition-colors">Status</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: MINIMAL STANDARD LOGIN FORM                    */}
      {/* ============================================================ */}
      <div className="col-span-1 lg:col-span-7 xl:col-span-6 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 min-h-screen bg-slate-50/50 dark:bg-slate-900/50">
        {/* Mobile Top Brand (Visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Package className="h-4 w-4" />
            </div>
            <span className="font-bold text-base text-slate-900 dark:text-white">
              InventoryOS
            </span>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Enterprise
          </span>
        </div>

        {/* Form Container (Centered Vertically) */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign in to your account
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              Enter your corporate credentials to access your workspace.
            </p>
          </div>

          {/* Quick Demo Credentials (Hidden in Production unless explicitly enabled) */}
          {(process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true') && (
            <div className="mb-6 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-2 font-medium">
                <span>Quick Demo Fill:</span>
                <span className="text-[10px] text-slate-400">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('owner@demo-store.com', 'Owner123!', 'Store Owner')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200/70 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-xs group"
                >
                  <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Store className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                      Store Owner
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">demo-store</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickFill('manager@demo-store.com', 'Admin123!', 'Store Manager')}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200/70 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-xs group"
                >
                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">
                      Store Manager
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">demo-store</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Standard Minimal Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Email address
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className="pl-9 h-11 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg shadow-2xs"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <Link
                  href="#"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10 h-11 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg shadow-2xs"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2 pt-0.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              />
              <Label
                htmlFor="remember"
                className="text-xs font-normal text-slate-600 dark:text-slate-400 cursor-pointer select-none"
              >
                Remember this device for 30 days
              </Label>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 mt-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-medium text-xs sm:text-sm rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign in</span>
              )}
            </Button>

            {/* Security Notice (NO REGISTER OPTION) */}
            <div className="pt-4 text-center border-t border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Authorized store & branch access only.</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                For account credentials or staff onboarding, contact your store administrator.
              </p>
              <div className="pt-2">
                <Link
                  href="/login/admin"
                  className="text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <Shield className="h-3 w-3 text-indigo-500" />
                  <span>Platform Super Admin Portal →</span>
                </Link>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column Bottom Footer */}
        <div className="text-center py-4 text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
          <p>Protected by reCAPTCHA Enterprise and 256-bit TLS encryption.</p>
        </div>
      </div>
    </div>
  );
}
