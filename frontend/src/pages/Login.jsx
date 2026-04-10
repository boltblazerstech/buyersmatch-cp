import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { Mail, Lock, Loader2, Eye, EyeOff, User } from "lucide-react";
import { isDemoMode, BRAND } from "../config/brand";

const DEMO_CREDENTIAL = {
  label: "Demo Client Login",
  role: "Client",
  email: "demo@propertypulse.com.au",
  password: "demo123",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (cred) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-white p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="p-8 bg-[#24355A] rounded-xl border border-teal shadow-2xl backdrop-blur-sm" style={{ borderColor: BRAND.primary + '4D' }}>
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-1 tracking-tight" style={{ color: BRAND.primary }}>
              {BRAND.name}
            </h1>
            <p className="font-medium uppercase tracking-widest text-sm" style={{ color: BRAND.accent }}>
              {BRAND.tagline}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors" style={{}}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy border border-white/10 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:border-teal transition-all placeholder:text-gray-600"
                  style={{ '--tw-ring-color': BRAND.primary + '80' }}
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy border border-white/10 rounded-lg py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:border-teal transition-all placeholder:text-gray-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-teal transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: BRAND.primary,
                color: BRAND.dark,
                boxShadow: `0 4px 20px ${BRAND.primary}33`,
              }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <p className="text-xs text-gray-500">
              Secure Access • Powered by {BRAND.name}
            </p>
          </div>
        </div>

        {isDemoMode && (
          <button
            type="button"
            onClick={() => fillCredentials(DEMO_CREDENTIAL)}
            className="w-full text-left rounded-xl border-2 transition-all group"
            style={{ borderColor: BRAND.primary + '80', background: BRAND.primary + '0D' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = BRAND.primary}
            onMouseLeave={e => e.currentTarget.style.borderColor = BRAND.primary + '80'}
          >
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Lock size={14} style={{ color: BRAND.primary }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.primary }}>
                    Demo Access
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ color: BRAND.dark, background: BRAND.primary }}>
                  Click to auto-fill
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: BRAND.primary + '1A' }}>
                  <User size={18} style={{ color: BRAND.primary }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{DEMO_CREDENTIAL.label}</p>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: BRAND.primary, background: BRAND.primary + '1A' }}>
                      {DEMO_CREDENTIAL.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 font-mono truncate">{DEMO_CREDENTIAL.email}</p>
                </div>
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
