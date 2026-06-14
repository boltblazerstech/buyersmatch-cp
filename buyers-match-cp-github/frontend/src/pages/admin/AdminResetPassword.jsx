import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { adminVerifyResetToken, adminResetPassword } from "../../api/auth";
import { Lock, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

const AdminResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError("Invalid reset link.");
      setLoading(false);
      return;
    }
    adminVerifyResetToken(token)
      .then((data) => setEmail(data.email))
      .catch((err) => {
        if (err.message && err.message.toLowerCase().includes("expired")) {
          setTokenError("This reset link has expired. Please request a new one.");
        } else {
          setTokenError("This reset link is invalid or has already been used.");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (newPassword.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await adminResetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate("/admin/login"), 3000);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes("expired")) {
        setFormError("This reset link has expired. Please request a new one.");
      } else {
        setFormError(err.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
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
          <p className="text-gold font-medium uppercase tracking-widest text-xs">Reset Password</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-gold" size={32} />
          </div>
        ) : tokenError ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {tokenError}
            </div>
            <Link
              to="/admin/forgot-password"
              className="inline-block text-sm text-gold hover:text-gold/80 transition-colors"
            >
              Request a new reset link
            </Link>
            <div>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={16} />
                Back to Admin Login
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 size={48} className="text-gold" />
            </div>
            <h2 className="text-lg font-semibold text-white">Password Reset!</h2>
            <p className="text-gray-300 text-sm">Your password has been reset. Redirecting you to login...</p>
          </div>
        ) : (
          <>
            {email && (
              <p className="text-gray-400 text-sm mb-6 text-center">
                Setting new password for <span className="text-gold font-medium">{email}</span>
              </p>
            )}

            {formError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">New Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-gold transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#0A1128] border border-white/10 rounded-lg py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder:text-gray-600"
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gold transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500 group-focus-within:text-gold transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0A1128] border border-white/10 rounded-lg py-3 pl-11 pr-12 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all placeholder:text-gray-600"
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gold transition-colors"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold hover:bg-gold/90 text-navy font-bold py-3 rounded-lg transition-all shadow-lg shadow-gold/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : "Reset Password"}
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

export default AdminResetPassword;
