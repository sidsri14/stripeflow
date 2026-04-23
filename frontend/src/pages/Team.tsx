import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, ChevronRight, Loader2, Send, Building2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';
import { toast } from 'react-hot-toast';
import { ConfirmModal } from '../components/shared/ConfirmModal';
import { SettingsNav } from '../components/common/SettingsNav';

const Team = () => {
  const queryClient = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showRenameOrg, setShowRenameOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [renameOrgName, setRenameOrgName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [renamingOrg, setRenamingOrg] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState<any[] | null>(null);

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data: orgData } = await api.get('/team/my');
      const orgs = orgData.data as any[];
      if (orgs.length === 0) return { orgs: [], activeOrg: null, members: [] };
      const { data: memberData } = await api.get(`/team/${orgs[0].id}/members`);
      return { orgs, activeOrg: orgs[0], members: memberData.data.members as any[] };
    },
    staleTime: 60_000,
  });

  const orgs: any[] = teamData?.orgs ?? [];
  const activeOrg: any = teamData?.activeOrg ?? null;
  const members: any[] = localMembers ?? teamData?.members ?? [];

  const refreshTeam = () => {
    setLocalMembers(null);
    queryClient.invalidateQueries({ queryKey: ['team'] });
  };

  const isAdminOrOwner = activeOrg?.role === 'owner' || activeOrg?.role === 'admin';
  const isOwner = activeOrg?.role === 'owner';

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName) return;
    setCreatingOrg(true);
    try {
      await api.post('/team', { name: newOrgName });
      toast.success('Organization created!');
      setNewOrgName('');
      setShowCreateOrg(false);
      refreshTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create organization');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleRenameOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg || !renameOrgName.trim()) return;
    setRenamingOrg(true);
    try {
      await api.patch(`/team/${activeOrg.id}`, { name: renameOrgName.trim() });
      toast.success('Organization renamed!');
      setShowRenameOrg(false);
      refreshTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to rename organization');
    } finally {
      setRenamingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrg) return;
    setInviting(true);
    try {
      await api.post(`/team/${activeOrg.id}/invite`, { email: inviteEmail, role: inviteRole });
      toast.success('Invitation sent!');
      setInviteEmail('');
      setShowInvite(false);
      refreshTeam();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!activeOrg) return;
    setUpdatingRoleId(userId);
    try {
      await api.patch(`/team/${activeOrg.id}/members/${userId}`, { role: newRole });
      toast.success('Role updated');
      setLocalMembers(prev => (prev ?? members).map(m => m.user.id === userId ? { ...m, role: newRole } : m));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!activeOrg || !confirmRemove) return;
    setRemovingMemberId(confirmRemove.userId);
    try {
      await api.delete(`/team/${activeOrg.id}/members/${confirmRemove.userId}`);
      toast.success('Member removed');
      setLocalMembers(prev => (prev ?? members).filter(m => m.user.id !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin opacity-50" />
      </div>
    );
  }

  const renderContent = () => {
    if (orgs.length === 0) {
      return (
        <div className="max-w-2xl mx-auto py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mx-auto mb-8 border border-stone-200 dark:border-stone-700 shadow-inner">
            <Users className="w-10 h-10 text-stone-300 dark:text-stone-600" />
          </div>
          <h2 className="text-4xl font-black text-stone-900 dark:text-white mb-4 tracking-tight">Collaborate with your team</h2>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-10 font-medium">
            Organizations let you share invoices, track payment performance collectively, and control what each teammate can see and do.
          </p>
          <button
            onClick={() => setShowCreateOrg(true)}
            className="group relative px-8 py-4 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-stone-500/20"
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4" />
              Create Your First Organization
            </div>
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Team Management</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-5xl font-black text-stone-900 dark:text-white tracking-tight">
                {activeOrg?.name}
              </h1>
              {isOwner && (
                <button
                  onClick={() => { setRenameOrgName(activeOrg?.name ?? ''); setShowRenameOrg(true); }}
                  className="p-2 text-stone-300 hover:text-stone-700 dark:hover:text-stone-200 transition-colors mt-1"
                  title="Rename organization"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-stone-800 dark:hover:bg-stone-100 transition-all shadow-xl"
          >
            <UserPlus className="w-4 h-4" />
            Invite Member
          </button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-stone-800 rounded-3xl border border-warm-border dark:border-stone-700 overflow-hidden shadow-sm">
              <div className="px-8 py-4 border-b border-warm-border dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/20 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-stone-400">Teammates</span>
                <span className="text-[10px] bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full font-bold text-stone-500">{members.length} Total</span>
              </div>

              <div className="divide-y divide-warm-border dark:divide-stone-700">
                {members.map((m) => (
                  <div key={m.id} className="p-6 flex items-center justify-between group hover:bg-stone-50 dark:hover:bg-stone-900/40 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-700 flex items-center justify-center text-stone-400 font-bold text-lg">
                        {m.user.name?.[0] || m.user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-800 dark:text-stone-100">{m.user.name || 'Unnamed'}</span>
                          {m.role === 'owner' && <span className="text-[8px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider">Owner</span>}
                        </div>
                        <span className="text-xs text-stone-400 block">{m.user.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Role selector — visible to admin/owner for non-owner members */}
                      {isAdminOrOwner && m.role !== 'owner' ? (
                        <div className="relative">
                          {updatingRoleId === m.user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                          ) : (
                            <select
                              value={m.role}
                              onChange={e => handleRoleChange(m.user.id, e.target.value)}
                              className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-700 border-none rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none pr-6"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                            </select>
                          )}
                        </div>
                      ) : m.role !== 'owner' ? (
                        <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">{m.role}</span>
                      ) : null}

                      {/* Remove button — visible to admin/owner for non-owner members */}
                      {isAdminOrOwner && m.role !== 'owner' && (
                        <button
                          onClick={() => setConfirmRemove({ userId: m.user.id, name: m.user.name || m.user.email })}
                          disabled={removingMemberId === m.user.id}
                          className="p-2 text-stone-300 hover:text-rose-500 transition-colors disabled:opacity-50"
                          title="Remove member"
                        >
                          {removingMemberId === m.user.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/20">
              <Shield className="w-8 h-8 mb-4 opacity-50" />
              <h3 className="text-xl font-black mb-2 leading-tight">Secure Collaboration</h3>
              <p className="text-emerald-100 text-sm font-medium leading-relaxed mb-6">
                Only owners and admins can manage invoices and billing settings. Members have read-only access to the shared dashboard.
              </p>
              <div className="h-[1px] bg-white/10 w-full mb-6" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Permissions</p>
              <ul className="mt-3 space-y-2 text-xs font-semibold">
                <li className="flex items-center gap-2 italic"><CheckCircle2 className="w-3 h-3 text-emerald-300" /> Shared Invoice Workspace</li>
                <li className="flex items-center gap-2 italic"><CheckCircle2 className="w-3 h-3 text-emerald-300" /> Unified Dashboard</li>
                <li className="flex items-center gap-2 italic"><CheckCircle2 className="w-3 h-3 text-emerald-300" /> Audit Trail Logging</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <SettingsNav />
      {renderContent()}

      {/* ── Remove member confirm */}
      <ConfirmModal
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Remove ${confirmRemove?.name} from ${activeOrg?.name}? They will lose access immediately.`}
        confirmText="Remove"
        isDestructive
        loading={!!removingMemberId}
      />

      <AnimatePresence>
        {/* ── Rename org modal */}
        {showRenameOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={handleRenameOrg} className="p-8 space-y-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-800">
                    <Pencil className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-black text-stone-800 dark:text-white">Rename Organization</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">New Name</label>
                  <input
                    required
                    value={renameOrgName}
                    onChange={e => setRenameOrgName(e.target.value)}
                    maxLength={100}
                    placeholder="e.g. Acme Corp"
                    className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-transparent focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-stone-800 dark:text-stone-100"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    disabled={renamingOrg}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {renamingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Save Name
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRenameOrg(false)}
                    className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ── Create org modal */}
        {showCreateOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={handleCreateOrg} className="p-8 space-y-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-800">
                    <Building2 className="w-8 h-8 text-indigo-500" />
                  </div>
                  <h3 className="text-2xl font-black text-stone-800 dark:text-white">Build Your Organization</h3>
                  <p className="text-stone-400 text-sm mt-1">Ready to start recovering with your team?</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Organization Name</label>
                    <input
                      required
                      value={newOrgName}
                      onChange={e => setNewOrgName(e.target.value)}
                      maxLength={100}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-transparent focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-stone-800 dark:text-stone-100"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    disabled={creatingOrg}
                    className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-500 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {creatingOrg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                    Launch Organization
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateOrg(false)}
                    className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* ── Invite modal */}
        {showInvite && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-700 shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <form onSubmit={handleInvite} className="p-8 space-y-6">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-stone-50 dark:bg-stone-800 flex items-center justify-center mx-auto mb-4 border border-stone-100 dark:border-stone-700">
                    <UserPlus className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-stone-800 dark:text-white">Invite Teammate</h3>
                  <p className="text-stone-400 text-sm mt-1">Add them to {activeOrg?.name}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="teammate@company.com"
                      className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-transparent focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-stone-800 dark:text-stone-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Permission Role</label>
                    <select
                      value={inviteRole}
                      onChange={e => setInviteRole(e.target.value)}
                      className="w-full px-5 py-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-transparent focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium text-stone-800 dark:text-stone-100"
                    >
                      <option value="member">Member (Read-only)</option>
                      <option value="admin">Admin (Collaborator)</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    disabled={inviting}
                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-xs hover:bg-emerald-500 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 transition-colors py-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Team;
