import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Staff {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function StaffPage() {
  const navigate = useNavigate();
  const { role: currentRole } = useAuth();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = currentRole === 'business_owner';
  //const isManager = currentRole === 'business_owner' || currentRole === 'admin_staff';

  const loadStaff = async () => {
    try {
      const res = await api.get('/businesses/me/staff');
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStaff(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setAdding(true);
    try {
      await api.post('/businesses/me/staff', { email, password, is_admin: isAdmin });
      setSuccess(`${email} added successfully`);
      setEmail('');
      setPassword('');
      setIsAdmin(false);
      await loadStaff();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === 'string') setError(detail);
      else if (Array.isArray(detail)) setError(detail.map((d: any) => d.msg).join(', '));
      else setError('Failed to add staff');
    } finally {
      setAdding(false);
    }
  };

  const handleDeactivate = async (id: string, email: string) => {
    if (!confirm(`Deactivate ${email}?`)) return;
    try {
      await api.delete(`/businesses/me/staff/${id}`);
      await loadStaff();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to deactivate');
    }
  };

  const handleReactivate = async (id: string, email: string) => {
    if (!confirm(`Reactivate ${email}?`)) return;
    try {
      await api.patch(`/businesses/me/staff/${id}/reactivate`);
      await loadStaff();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to reactivate');
    }
  };

  const handleToggleAdmin = async (id: string, staffRole: string) => {
    const action = staffRole === 'admin_staff' ? 'Demote to regular staff?' : 'Promote to admin staff?';
    if (!confirm(action)) return;
    try {
      await api.patch(`/businesses/me/staff/${id}/toggle-admin`);
      await loadStaff();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert(typeof detail === 'string' ? detail : 'Failed to update role');
    }
  };

  const canManageMember = (member: Staff) => {
    if (isOwner) return true;
    if (currentRole === 'admin_staff' && member.role === 'staff') return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">

      {/* Header */}
      <div className="bg-[#13151c] border-b border-[#1e2130] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white">
          ← Back
        </button>
        <h1 className="font-bold">Staff Management</h1>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* Add staff form */}
        <div className="bg-[#13151c] border border-[#1e2130] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-slate-300">Add Staff Member</h2>
          <form onSubmit={handleAdd} className="space-y-3">

            <input
              type="email"
              placeholder="Staff email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />

            <input
              type="password"
              placeholder="Temporary password (min 8 chars)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-[#0b0c10] border border-[#1e2130] rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />

            {/* Admin toggle — owner only */}
            {isOwner && (
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <div
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${isAdmin ? 'bg-sky-500' : 'bg-[#1e2130]'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-slate-300 text-sm">
                  Grant admin access
                  <span className="text-slate-500 ml-1">(can manage staff)</span>
                </span>
              </label>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}

            <button
              type="submit"
              disabled={adding}
              className="w-full bg-sky-400 hover:bg-sky-300 text-[#0b0c10] font-bold py-3 rounded-xl transition disabled:opacity-50"
            >
              {adding ? 'Adding...' : '+ Add Staff'}
            </button>

          </form>
        </div>

        {/* Staff list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-300">
            Current Staff ({staff.filter(s => s.is_active).length} active)
          </h2>

          {loading && (
            <p className="text-slate-500 text-sm">Loading...</p>
          )}

          {!loading && staff.length === 0 && (
            <p className="text-slate-500 text-sm">No staff added yet.</p>
          )}

          {staff.map(member => (
            <div
              key={member.id}
              className={`bg-[#13151c] border rounded-xl p-4 space-y-3 ${
                member.is_active ? 'border-[#1e2130]' : 'border-red-900/30'
              }`}
            >
              {/* Staff info */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">{member.email}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      member.role === 'admin_staff'
                        ? 'bg-sky-400/10 text-sky-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {member.role === 'admin_staff' ? 'Admin' : 'Staff'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    {member.is_active ? 'Active' : 'Deactivated'} · Added {new Date(member.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action buttons — active members */}
              {member.is_active && canManageMember(member) && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleAdmin(member.id, member.role)}
                    className="flex-1 text-sky-400 hover:text-sky-300 text-sm border border-sky-900/50 hover:border-sky-400 px-3 py-2 rounded-lg transition"
                  >
                    {member.role === 'admin_staff' ? 'Demote to staff' : 'Promote to admin'}
                  </button>
                  <button
                    onClick={() => handleDeactivate(member.id, member.email)}
                    className="text-red-400 hover:text-red-300 text-sm border border-red-900/50 hover:border-red-400 px-3 py-2 rounded-lg transition"
                  >
                    Deactivate
                  </button>
                </div>
              )}

              {/* Reactivate button — deactivated members */}
              {!member.is_active && canManageMember(member) && (
                <button
                  onClick={() => handleReactivate(member.id, member.email)}
                  className="w-full text-green-400 hover:text-green-300 text-sm border border-green-900/50 hover:border-green-400 px-3 py-2 rounded-lg transition"
                >
                  Reactivate
                </button>
              )}

            </div>
          ))}

        </div>
      </div>
    </div>
  );
}