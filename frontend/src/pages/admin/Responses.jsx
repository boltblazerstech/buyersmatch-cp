import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Clock,
  ArrowRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { getAllResponses } from '../../api/client';
import { Link } from 'react-router-dom';

const Responses = () => {
  const [responses, setResponses] = useState([]);
  const [filteredResponses, setFilteredResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllResponses();
        setResponses(data);
        setFilteredResponses(data);
      } catch (error) {
        console.error("Error fetching responses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let filtered = responses.filter(r => 
      r.client?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.property?.address.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (activeFilter !== 'ALL') {
      filtered = filtered.filter(r => r.portalStatus === activeFilter);
    }

    setFilteredResponses(filtered);
  }, [searchQuery, activeFilter, responses]);

  const filters = [
    { label: 'All Responses', value: 'ALL' },
    { label: 'Assigned', value: 'PENDING' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Purchased', value: 'PURCHASED' },
  ];

  return (
    <AdminLayout title="Onboarded Responses">
      <div className="space-y-8">
        {/* Control Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or address..." 
              className="w-full bg-[#1B2A4A] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:border-teal outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full sm:w-auto scrollbar-hide pb-2 sm:pb-0">
            {filters.map((f) => (
              <button 
                key={f.value}
                onClick={() => setActiveFilter(f.value)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all whitespace-nowrap ${activeFilter === f.value ? 'bg-teal text-navy' : 'bg-[#1B2A4A] border border-white/5 text-gray-400 hover:text-white'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center">
              <Loader2 className="animate-spin text-teal mx-auto" size={32} />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 italic">
              No responses found matching your search.
            </div>
          ) : filteredResponses.map((res) => (
            <div key={res.id} className="bg-[#1B2A4A] border border-white/5 rounded-3xl overflow-hidden group hover:border-teal/30 transition-all">
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal/20 flex items-center justify-center text-teal font-bold">
                      {res.client?.fullName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-teal transition-colors">{res.client?.fullName}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Onboarded</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                    res.portalStatus === 'ACCEPTED' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                    res.portalStatus === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                    res.portalStatus === 'PURCHASED' ? 'bg-gold/10 text-gold border-gold/20' :
                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>
                    {res.portalStatus === 'PENDING' ? 'ASSIGNED' : res.portalStatus}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <img 
                        src={`https://placehold.co/200x150/1B2A4A/2ABFBF?text=${res.property?.addressLine1}`} 
                        alt="Prop" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{res.property?.address}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{res.property?.suburb}, {res.property?.state}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={14} className="text-teal" />
                      {new Date(res.assignedAt).toLocaleDateString()}
                    </div>
                    <Link 
                      to={`/admin/client/${res.client?.id}`}
                      className="text-teal text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      Manage <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Responses;
