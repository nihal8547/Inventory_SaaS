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
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { handleApiError } from '@/lib/api';
import { Eye, EyeOff, Lock, Mail, User, Loader2 } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await authService.register(data);
      const raw = res.data as any;
      const payload = raw?.data ?? raw;
      const accessToken = payload?.accessToken;
      const user = payload?.user;

      if (!accessToken || !user) {
        throw new Error('Invalid response from server');
      }

      setAuth(user, accessToken);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-7 sm:p-8 shadow-sm">
        {/* Card Header */}
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create an account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Get started with InventoryOS multi-tenant workspace
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                First name
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-3.5 w-3.5" />
                </div>
                <Input
                  id="firstName"
                  placeholder="John"
                  className="pl-8 h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg"
                  {...register('firstName')}
                />
              </div>
              {errors.firstName && <p className="text-xs text-rose-500 mt-1">{errors.firstName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lastName" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Last name
              </Label>
              <Input
                id="lastName"
                placeholder="Doe"
                className="h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg"
                {...register('lastName')}
              />
              {errors.lastName && <p className="text-xs text-rose-500 mt-1">{errors.lastName.message}</p>}
            </div>
          </div>

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
                placeholder="name@company.com"
                className="pl-9 h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg"
                {...register('email')}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Password
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                className="pl-9 pr-10 h-10 text-xs sm:text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-600 dark:focus-visible:ring-blue-500 rounded-lg"
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
            {errors.password && <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-blue-600 dark:hover:bg-blue-500 font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <span>Create account</span>
            )}
          </Button>

          <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
