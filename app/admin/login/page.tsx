import Link from 'next/link';
import { login } from './actions';
export const dynamic = 'force-dynamic';
export default async function AdminLogin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black flex items-center justify-center p-4">
      <div className="bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl p-8 rounded-3xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-red-600 mb-4 shadow-lg shadow-orange-500/20">
            🔒
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider">
            ADMIN PORTAL
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Enter authorized credentials to access dashboard
          </p>
        </div>

        <form action={login} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter admin email"
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter admin password"
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          {params.error && (
            <p className="text-sm text-red-400">
              लॉगिन नहीं हुआ। ईमेल और पासवर्ड जाँचें।
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-3.5 rounded-2xl shadow-xl transition text-sm tracking-wide"
          >
            Authenticate &amp; Access
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            ← Back to Public Store
          </Link>
        </div>
      </div>
    </div>
  );
}