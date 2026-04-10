import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, adminLogin } from "../api/client";
import { Mail, Lock, Loader2, Eye, EyeOff, User, ShieldCheck } from "lucide-react";
import { isDemoMode, BRAND } from "../config/brand";

const DEMO_CREDENTIALS = [
  {
    label: "Demo Client Login",
    role: "Client",
    email: "demo@propertypulse.com.au",
    password: "demo123",
    icon: User,
    action: "client",
    destination: "/dashboard",
  },
  {
    label: "Demo Admin Login",
    role: "Admin",
    email: "admin@propertypulse.com.au",
    password: "admin123",
    icon: ShieldCheck,
    action: "admin",
    destination: "/admin/clients",
  },
];

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null); // tracks which demo button is loading
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

  const handleDemoLogin = async (cred) => {
    setError("");
    setDemoLoading(cred.action);
    try {
      if (cred.action === "admin") {
        await adminLogin(cred.email, cred.password);
      } else {
        await login(cred.email, cred.password);
      }
      navigate(cred.destination);
    } catch (err) {
      setError(err.message || "Demo login failed");
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-white p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="p-8 bg-[#24355A] rounded-xl border shadow-2xl backdrop-blur-sm" style={{ borderColor: BRAND.primary + '4D' }}>
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
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-navy border border-white/10 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:border-teal transition-all placeholder:text-gray-600"
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
              disabled={loading || demoLoading !== null}
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
          <div className="space-y-3">
            <p className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: BRAND.primary + 'CC' }}>
              Demo Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_CREDENTIALS.map((cred) => {
                const Icon = cred.icon;
                const isThisLoading = demoLoading === cred.action;
                const isAdminCred = cred.action === "admin";
                const borderColor = isAdminCred ? '#D4A843' : BRAND.primary;
                return (
                  <button
                    key={cred.action}
                    type="button"
                    disabled={demoLoading !== null || loading}
                    onClick={() => handleDemoLogin(cred)}
                    className="text-left rounded-xl border-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ borderColor: borderColor + '60', background: borderColor + '0D' }}
                    onMouseEnter={e => { if (!demoLoading && !loading) e.currentTarget.style.borderColor = borderColor; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = borderColor + '60'; }}
                  >
                    <div className="px-4 py-4">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg mb-3" style={{ background: borderColor + '1A' }}>
                        {isThisLoading
                          ? <Loader2 size={18} className="animate-spin" style={{ color: borderColor }} />
                          : <Icon size={18} style={{ color: borderColor }} />
                        }
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">{cred.label}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded mt-1 inline-block" style={{ color: borderColor, background: borderColor + '1A' }}>
                        {cred.role}
                      </span>
                      <p className="text-[10px] text-gray-500 mt-1.5 font-mono truncate">{cred.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
