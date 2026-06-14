import React, { useEffect, useState, useMemo } from 'react';
import AdminLayout from '../../components/AdminLayout';
import {
  Users, Search, CheckCircle2, Clock, Loader2,
  UserPlus, X, Eye, EyeOff, Mail, Lock, RefreshCw,
  AlertCircle, DollarSign, MapPin, Home, Trash2,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { getAllBuyerBriefs, createClient } from '../../api/client';

// ─── Onboard Modal ────────────────────────────────────────────────
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const generatePassword = () =>
  Array.from({ length: 6 }, () => ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]).join('');

const OnboardModal = ({ brief, onClose, onSuccess }) => {
  const [loginEmail, setLoginEmail] = useState(brief.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await createClient({
        buyerBriefId: brief.id,
        loginEmail,
        password,
      });
      setResult(data);
      onSuccess(brief.id, data);
    } catch (err) {
      setError(err.message || 'Failed to onboard client');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1B2A4A] border border-teal/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-white">Onboard Client</h3>
            <p className="text-xs text-gray-400 mt-1">{brief.fullName}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>

        {result ? (
          /* ── Success State ── */
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <p className="text-white font-bold">Client Onboarded Successfully!</p>
            <div className="bg-[#0A1128] border border-white/10 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Login Email</span>
                <span className="text-white font-mono">{result.loginEmail || loginEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Password</span>
                <span className="text-teal font-mono font-bold">{password}</span>
              </div>
            </div>
            <p className="text-xs text-yellow-400/80">
              ⚠️ Copy the password now — it won't be shown again.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-teal text-navy font-bold rounded-2xl hover:bg-teal/90 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Form State ── */
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Login Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal" size={16} />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full bg-[#0A1128] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-teal outline-none transition-all"
                  placeholder="client@example.com"
                />
              </div>
              <p className="text-[10px] text-gray-500 ml-1">Pre-filled from buyer brief. Change if needed.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
              <div className="flex gap-2">
                <div className="relative group flex-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-teal" size={16} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#0A1128] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-sm focus:border-teal outline-none transition-all font-mono"
                    placeholder="Enter or generate"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}
                  className="px-4 py-3 bg-teal/10 border border-teal/30 text-teal text-xs font-bold rounded-xl hover:bg-teal/20 transition-all whitespace-nowrap flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Generate
                </button>
              </div>
              <p className="text-[10px] text-gray-500 ml-1">Type any password or click Generate for a 6-character alphanumeric one.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-white/5 text-gray-400 rounded-2xl text-sm font-bold hover:text-white transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-teal text-navy rounded-2xl text-sm font-bold hover:bg-teal/90 transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                Onboard
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────
const Buyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [briefSort, setBriefSort] = useState('desc'); // 'desc' | 'asc' | null

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllBuyerBriefs();
        setBuyers(data);
      } catch (err) {
        console.error('Error fetching buyers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleOnboardSuccess = (buyerId, result) => {
    setBuyers(prev => prev.map(b =>
      b.id === buyerId
        ? { ...b, portalUser: { id: result.id, email: result.loginEmail, status: 'onboarded' } }
        : b
    ));
  };


  const filtered = useMemo(() => {
    const list = buyers.filter(b => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        (b.fullName || '').toLowerCase().includes(q) ||
        (b.email || '').toLowerCase().includes(q) ||
        (b.zohoContactId || '').toLowerCase().includes(q);
      const isOnboarded = !!b.portalUser;
      const matchesFilter =
        activeFilter === 'ALL' ||
        (activeFilter === 'ONBOARDED' && isOnboarded) ||
        (activeFilter === 'NOT_ONBOARDED' && !isOnboarded);
      return matchesSearch && matchesFilter;
    });

    if (briefSort) {
      list.sort((a, b) => {
        const ac = a.briefCount || 0;
        const bc = b.briefCount || 0;
        return briefSort === 'desc' ? bc - ac : ac - bc;
      });
    }

    return list;
  }, [buyers, searchQuery, activeFilter, briefSort]);

  const counts = useMemo(() => ({
    total: buyers.length,
    onboarded: buyers.filter(b => b.portalUser).length,
    notOnboarded: buyers.filter(b => !b.portalUser).length,
  }), [buyers]);

  const filters = [
    { label: 'All Clients', value: 'ALL', count: counts.total },
    { label: 'Onboarded', value: 'ONBOARDED', count: counts.onboarded },
    { label: 'Not Onboarded', value: 'NOT_ONBOARDED', count: counts.notOnboarded },
  ];

  return (
    <AdminLayout title="Client Management">
      <div className="space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Clients', value: counts.total, color: 'text-teal', bg: 'bg-teal/10 border-teal/20' },
            { label: 'Onboarded', value: counts.onboarded, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
            { label: 'Not Onboarded', value: counts.notOnboarded, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-5 ${s.bg}`}>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, email or Zoho ID..."
              className="w-full bg-[#1B2A4A] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-teal outline-none transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {filters.map(f => (
              <button
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeFilter === f.value
                    ? 'bg-teal text-navy'
                    : 'bg-[#1B2A4A] border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeFilter === f.value ? 'bg-navy/30' : 'bg-white/10'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Buyer List View */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-teal" size={40} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center text-gray-500 italic">No clients found.</div>
        ) : (
          <div className="bg-[#1B2A4A] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest pl-8">Client Name</th>
                  <th
                    className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest cursor-pointer hover:text-white select-none transition-colors"
                    onClick={() => setBriefSort(s => s === 'desc' ? 'asc' : 'desc')}
                  >
                    <div className="flex items-center gap-1.5">
                      Briefs
                      {briefSort === 'desc' ? (
                        <ArrowDown size={13} className="text-teal" />
                      ) : briefSort === 'asc' ? (
                        <ArrowUp size={13} className="text-teal" />
                      ) : (
                        <ArrowUpDown size={13} className="text-gray-600" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Zoho Contact ID</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Portal Status</th>
                  <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right pr-8">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map(buyer => {
                  const isOnboarded = !!buyer.portalUser;
                  return (
                    <tr key={buyer.id} className="hover:bg-white/[0.02] transition-colors group text-sm">
                      <td className="p-4 pl-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-white mb-0.5">{buyer.fullName || 'Unknown'}</span>
                          <span className="text-xs text-gray-500">{buyer.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono">
                          {buyer.briefCount || 1}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs font-mono text-gray-500 group-hover:text-teal/70 transition-colors">
                          {buyer.zohoContactId || 'NOT LINKED'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isOnboarded
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                        }`}>
                          {isOnboarded ? 'Onboarded' : 'Not Onboarded'}
                        </span>
                      </td>
                      <td className="p-4 text-right pr-8">
                        {isOnboarded ? (
                          <div className="flex items-center justify-end gap-3 text-xs text-green-400">
                            <CheckCircle2 size={14} />
                            <span className="font-mono">{buyer.portalUser.email}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedBuyer(buyer)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal/10 border border-teal/30 text-teal rounded-xl text-xs font-bold hover:bg-teal hover:text-navy transition-all"
                          >
                            <UserPlus size={14} />
                            Onboard
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Onboard Modal */}
      {selectedBuyer && (
        <OnboardModal
          brief={selectedBuyer}
          onClose={() => setSelectedBuyer(null)}
          onSuccess={(buyerId, result) => {
            handleOnboardSuccess(buyerId, result);
            setSelectedBuyer(null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default Buyers;
