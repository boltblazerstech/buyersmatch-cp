import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  Users, 
  Building2, 
  MessageSquare, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import { getAllClients, getAllProperties, getAllResponses } from '../../api/client';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalResponses: 0,
    pendingAssignments: 0,
    acceptedAssignments: 0,
    rejectedAssignments: 0
  });
  const [recentResponses, setRecentResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clients, responses] = await Promise.all([
          getAllClients(),
          getAllResponses()
        ]);

        setStats({
          totalClients: clients.length,
          totalResponses: responses.length,
          pendingAssignments: responses.filter(r => r.portalStatus === 'PENDING').length,
          acceptedAssignments: responses.filter(r => r.portalStatus === 'ACCEPTED' || r.portalStatus === 'PURCHASED').length,
          rejectedAssignments: responses.filter(r => r.portalStatus === 'REJECTED').length
        });

        setRecentResponses(responses.sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt)).slice(0, 5));
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const statCards = [
    { label: 'Active Onboarded', value: stats.totalClients, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Active Responses', value: stats.totalResponses, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Accepted Deals', value: stats.acceptedAssignments, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  ];

  return (
    <AdminLayout title="Dashboard Overview">
      <div className="space-y-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statCards.map((stat, idx) => (
            <div key={idx} className="bg-[#1B2A4A] border border-white/5 p-6 rounded-3xl group hover:border-teal/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                  <stat.icon size={24} />
                </div>
                <TrendingUp size={16} className="text-gray-500" />
              </div>
              <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">{stat.label}</p>
              <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Recent Activity */}
          <div className="lg:col-span-12 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="text-teal" size={24} />
                Recent Onboarded Activity
              </h3>
              <Link to="/admin/responses" className="text-teal text-sm font-bold hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="bg-[#1B2A4A] border border-white/5 rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/5">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Property</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {recentResponses.map((res) => (
                      <tr key={res.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal/20 flex items-center justify-center text-teal text-xs font-bold">
                              {res.client?.fullName?.charAt(0)}
                            </div>
                            <p className="text-sm font-bold text-white group-hover:text-teal transition-colors">{res.client?.fullName}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-400 truncate max-w-[400px]">{res.property?.address}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            res.portalStatus === 'ACCEPTED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            res.portalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            res.portalStatus === 'PURCHASED' ? 'bg-gold/10 text-gold border-gold/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {res.portalStatus === 'PENDING' ? 'ASSIGNED' : res.portalStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-xs text-gray-500">{new Date(res.assignedAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
