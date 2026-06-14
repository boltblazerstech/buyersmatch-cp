import React, { useState } from "react";
import { Link } from "react-router-dom";
import { adminForgotPassword } from "../../api/auth";
import { Mail, Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

const AdminForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminForgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1128] text-white p-6">
      <div className="p-8 bg-[#1B2A4A] rounded-xl border border-gold/40 shadow-2xl w-full max-w-md backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gold/10 border border-gold/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} className="text-gold" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Admin Portal</h1>
          <p className="text-gold font-medium uppercase tracking-widest text-xs">Forgot Password</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 size={48} className="text-gold" />
            </div>
            <h2 className="text-lg font-semibold text-white">Check your email</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              If an admin account exists for <span className="text-gold font-medium">{email}</span>, you'll receive a reset link shortly. It expires in 30 minutes.
            </p>
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-sm text-gold/60 hover:text-gold transition-colors mt-4"
            >
              <ArrowLeft size={16} />
              Back to Admin Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
              Enter your admin email address and we'll send you a password reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Admin Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-gold transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0A1128] border border-white/10 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder:text-gray-600"
                    placeholder="admin@buyermatch.com.au"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold hover:bg-gold/90 text-navy font-bold py-3 rounded-lg transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : "Send Reset Link"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 text-sm text-gold/60 hover:text-gold transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Admin Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminForgotPassword;
