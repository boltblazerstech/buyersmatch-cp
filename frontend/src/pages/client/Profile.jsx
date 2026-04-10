import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getClientProfile, getBuyerBrief, getClientProperties, getStoredUser, logout } from '../../api/client';
import { anonymizeName, anonymizeEmail, anonymizeGreeting, anonymizeCompany } from '../../utils/anonymize';
import Layout from '../../components/Layout';
import { 
  User, Mail, Users, Briefcase, DollarSign, MapPin, Home, 
  Calendar, Percent, CheckCircle2, Clock, Loader2, Building2, ArrowRight,
  LogOut, ArrowLeft, Tag, Wallet, TrendingUp, PiggyBank, FileText, Star, Phone
} from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [brief, setBrief] = useState(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, accepted: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      const clientId = user?.clientId;
      if (!clientId) {
        setLoading(false);
        return;
      }

      // Fetch all three independently so one failure doesn't blank the page
      const [profileData, briefData, assignmentsData] = await Promise.allSettled([
        getClientProfile(clientId),
        getBuyerBrief(clientId),
        getClientProperties(clientId),
      ]);

      if (profileData.status === 'fulfilled' && profileData.value) {
        const p = profileData.value;
        setProfile({
          ...p,
          fullName:       anonymizeName(p.fullName),
          email:          anonymizeEmail(p.email),
          secondaryEmail: p.secondaryEmail ? anonymizeEmail(p.secondaryEmail) : null,
          greetingName:   anonymizeGreeting(p.greetingName),
          jointBuyerName: p.jointBuyerName ? anonymizeCompany(p.jointBuyerName) : null,
        });
      }

      if (briefData.status === 'fulfilled' && briefData.value) {
        setBrief(briefData.value);
      }

      if (assignmentsData.status === 'fulfilled' && assignmentsData.value) {
        const assignments = assignmentsData.value?.assignments || [];
        setStats({
          total:    assignments.length,
          pending:  assignments.filter(a => a.portalStatus === 'PENDING').length,
          accepted: assignments.filter(a => a.portalStatus === 'ACCEPTED').length,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout title="My Profile">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-teal mb-4" size={48} />
        </div>
      </Layout>
    );
  }

  const DetailRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-start gap-4 py-4 border-b border-teal/10 last:border-0">
      <div className="mt-1 text-teal">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-teal font-bold mb-1">{label}</p>
        <p className="text-white font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  );

  const fmt = (n) => n != null ? `$${Number(n).toLocaleString()}` : 'N/A';
  const fmtPct = (n) => n != null ? `${n}%` : 'N/A';

  return (
    <Layout title="My Profile">
      {/* Profile Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 text-teal hover:text-white transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} />
          Back to Properties
        </Link>

        <button 
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold uppercase tracking-widest text-xs"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      <div className="flex flex-col items-center gap-8 pb-20 max-w-2xl mx-auto">

        {/* Personal Details Card */}
        <div className="bg-navy border border-teal/20 rounded-2xl p-8 shadow-xl w-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gold/10 rounded-lg flex items-center justify-center text-gold">
              <User size={24} />
            </div>
            <h2 className="text-xl font-bold text-gold uppercase tracking-widest">Personal Details</h2>
          </div>
          <div className="space-y-1">
            <DetailRow label="Full Name" value={profile?.fullName} icon={User} />
            <DetailRow label="Email Address" value={profile?.email} icon={Mail} />
            {profile?.secondaryEmail && (
              <DetailRow label="Secondary Email" value={profile?.secondaryEmail} icon={Mail} />
            )}
            <DetailRow label="Greeting Name" value={profile?.greetingName} icon={Users} />
            {profile?.jointBuyerName && (
              <DetailRow label="Joint Buyer Name" value={profile?.jointBuyerName} icon={Users} />
            )}
          </div>
        </div>

        {/* Buyer Brief Card */}
        {brief && (
          <div className="bg-navy border border-teal/20 rounded-2xl p-8 shadow-xl w-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-teal/10 rounded-lg flex items-center justify-center text-teal">
                <Briefcase size={24} />
              </div>
              <h2 className="text-xl font-bold text-teal uppercase tracking-widest">Buyer Brief</h2>
            </div>

            {/* Status & Priority badges */}
            <div className="flex flex-wrap gap-2 mb-6">
              {brief.status && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-teal/10 border border-teal/30 text-teal uppercase tracking-widest">
                  {brief.status}
                </span>
              )}
              {brief.priority && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-gold/10 border border-gold/30 text-gold uppercase tracking-widest">
                  ⭐ {brief.priority} Priority
                </span>
              )}
              {brief.preApproved && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-green-500/10 border border-green-500/30 text-green-400 uppercase tracking-widest">
                  ✓ Pre-Approved
                </span>
              )}
              {brief.tags?.map(tag => (
                <span key={tag} className="px-3 py-1 text-xs font-bold rounded-full bg-white/5 border border-white/10 text-gray-300">
                  #{tag}
                </span>
              ))}
            </div>

            {/* Budget Section */}
            <p className="text-[10px] uppercase tracking-widest text-teal font-bold mb-3 flex items-center gap-2">
              <Wallet size={12} /> Budget & Finance
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Min Budget', value: fmt(brief.minBudget) },
                { label: 'Max Budget', value: fmt(brief.maxBudget) },
                { label: 'Available Deposit', value: fmt(brief.availableDeposit) },
                { label: 'Deposit / Equity %', value: fmtPct(brief.depositEquityPercent) },
                { label: 'Interest Rate', value: fmtPct(brief.interestRate) },
                { label: 'Tax Rate', value: fmtPct(brief.taxRate) },
                { label: 'Weekly Rent', value: brief.weeklyRent ? `$${brief.weeklyRent}/wk` : 'N/A' },
                { label: 'Monthly Holding Cost', value: brief.monthlyHoldingCost ? `$${brief.monthlyHoldingCost}/mo` : 'N/A' },
                { label: 'Yield %', value: fmtPct(brief.yieldPercent) },
                { label: 'Financer', value: brief.financerName || 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm text-white font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Property Preferences */}
            <p className="text-[10px] uppercase tracking-widest text-teal font-bold mb-3 flex items-center gap-2">
              <Home size={12} /> Property Preferences
            </p>
            <div className="space-y-1 mb-6">
              <DetailRow label="Property Types" value={brief.propertyTypes?.join(', ')} icon={Building2} />
              <DetailRow label="Preferred States" value={brief.preferredStates?.join(', ')} icon={MapPin} />
              <DetailRow label="Preferred Suburbs" value={brief.preferredSuburbs} icon={MapPin} />
              <DetailRow label="Bed / Bath / Garage" value={brief.bedBathGarage} icon={Home} />
              <DetailRow label="Land Size" value={brief.landSizeSqm ? `${brief.landSizeSqm} m²` : null} icon={Home} />
              <DetailRow label="Timeline to Buy" value={brief.timelineToBuy} icon={Calendar} />
            </div>

            {/* Assigned Agents */}
            {brief.assignedAgents?.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold mb-3 flex items-center gap-2">
                  <Users size={12} /> Assigned Agents
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {brief.assignedAgents.map(agent => (
                    <span key={agent} className="px-4 py-2 text-sm font-bold rounded-xl bg-teal/10 border border-teal/20 text-teal">
                      {agent}
                    </span>
                  ))}
                </div>
              </>
            )}

            {/* Buyer Match Notes */}
            {brief.buyerMatchNotes && (
              <>
                <p className="text-[10px] uppercase tracking-widest text-teal font-bold mb-3 flex items-center gap-2">
                  <FileText size={12} /> Buyers Match Notes
                </p>
                <div className="p-5 bg-teal/5 border border-teal/20 rounded-2xl">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{brief.buyerMatchNotes}</p>
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Profile;
