import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getClientProfile, getBuyerBrief, getClientProperties, getStoredUser, logout } from '../../api/client';
import { anonymizeName, anonymizeEmail, anonymizeGreeting, anonymizeCompany } from '../../utils/anonymize';
import Layout from '../../components/Layout';
import { 
  User, Mail, Users, Briefcase, DollarSign, MapPin, Home, 
  Calendar, Percent, CheckCircle2, Clock, Loader2, Building2, ArrowRight,
  LogOut, ArrowLeft
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
      if (!user || !user.clientId) {
        setLoading(false);
        return;
      }

      try {
        const [profileData, briefData, assignmentsData] = await Promise.all([
          getClientProfile(user.clientId),
          getBuyerBrief(user.clientId),
          getClientProperties(user.clientId)
        ]);

        const { assignments = [] } = assignmentsData;
        
        setProfile({
          ...profileData,
          fullName:      anonymizeName(profileData?.fullName),
          email:         anonymizeEmail(profileData?.email),
          secondaryEmail: profileData?.secondaryEmail ? anonymizeEmail(profileData.secondaryEmail) : null,
          greetingName:  anonymizeGreeting(profileData?.greetingName),
          jointBuyerName: profileData?.jointBuyerName ? anonymizeCompany(profileData.jointBuyerName) : null,
        });
        setBrief(briefData);
        setStats({
          total: assignments.length,
          pending: assignments.filter(a => a.portalStatus === 'PENDING').length,
          accepted: assignments.filter(a => a.portalStatus === 'ACCEPTED').length,
        });
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
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

        {/* Profile Card centered */}
        <div className="flex justify-center pb-20">
          <div className="bg-navy border border-teal/20 rounded-2xl p-8 shadow-xl w-full max-w-2xl">
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
        </div>
    </Layout>
  );
};

export default Profile;
