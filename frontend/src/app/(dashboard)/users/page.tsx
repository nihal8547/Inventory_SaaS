'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePagination } from '@/hooks/use-pagination';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Users,
  ShieldCheck,
  Plus,
  Trash2,
  Check,
  Lock,
  UserPlus,
  KeyRound,
  Loader2,
  CheckSquare,
  Square,
  RotateCcw
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { Membership } from '@/types';
import { usersService } from '@/services/users.service';
import { api, handleApiError } from '@/lib/api';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface RoleEntity {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions?: { permission: { code: string; name: string; module: string } }[];
  _count?: { memberships: number };
}

interface PermissionEntity {
  id: string;
  code: string;
  name: string;
  module: string;
}

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  roleId: z.string().min(1, 'Role is required'),
});
type InviteForm = z.infer<typeof inviteSchema>;

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'roles'>('members');

  // Members state
  const [members, setMembers] = useState<Membership[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [allPermissions, setAllPermissions] = useState<PermissionEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviting, setInviting] = useState(false);

  const { page, limit, goToPage, setLimit, reset: resetPagination } = usePagination(1, 10);

  // Custom Role Modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit,
        search: search.trim() || undefined,
      };
      if (roleFilter !== 'all') params.roleId = roleFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const mr = await usersService.listMembers(params);
      const resData = (mr.data as any)?.data;
      const list = resData?.data ?? resData ?? [];
      setMembers(Array.isArray(list) ? list : []);
      setTotal(resData?.meta?.total ?? (Array.isArray(list) ? list.length : 0));
      setTotalPages(resData?.meta?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  const fetchAuxData = async () => {
    try {
      const [rr, pr] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions').catch(() => ({ data: { data: [] } })),
      ]);
      const loadedRoles = (rr.data as any)?.data ?? [];
      setRoles(Array.isArray(loadedRoles) ? loadedRoles : []);
      const loadedPerms = (pr.data as any)?.data ?? [];
      setAllPermissions(Array.isArray(loadedPerms) ? loadedPerms : []);
    } catch (err) {
      console.error('Failed to load role data', err);
    }
  };

  useEffect(() => {
    fetchAuxData();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const onInvite = async (data: InviteForm) => {
    setInviting(true);
    try {
      await usersService.inviteMember(data);
      toast.success('Invitation successfully sent to member');
      setInviteModalOpen(false);
      reset();
      fetchMembers();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setInviting(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      toast.error('Role name is required');
      return;
    }
    setSavingRole(true);
    try {
      if (editingRoleId) {
        await api.patch(`/roles/${editingRoleId}`, {
          name: roleName,
          description: roleDescription,
          permissionCodes: selectedPermissions,
        });
        toast.success(`Role "${roleName}" updated successfully`);
      } else {
        await api.post('/roles', {
          name: roleName,
          description: roleDescription,
          permissionCodes: selectedPermissions,
        });
        toast.success(`Custom role "${roleName}" created`);
      }
      setRoleModalOpen(false);
      setEditingRoleId(null);
      setRoleName('');
      setRoleDescription('');
      setSelectedPermissions([]);
      fetchAuxData();
      fetchMembers();
    } catch (err) {
      toast.error(handleApiError(err));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete role "${name}"?`)) return;
    try {
      await api.delete(`/roles/${id}`);
      toast.success(`Role "${name}" deleted`);
      fetchAuxData();
      fetchMembers();
    } catch (err) {
      toast.error(handleApiError(err));
    }
  };

  const togglePermission = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleModulePermissions = (module: string, modulePerms: PermissionEntity[]) => {
    const codes = modulePerms.map((p) => p.code);
    const allSelected = codes.every((c) => selectedPermissions.includes(c));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...codes])));
    }
  };

  // Group permissions by module
  const permissionsByModule = React.useMemo(() => {
    const groups: { [module: string]: PermissionEntity[] } = {};
    for (const p of allPermissions) {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    }
    return groups;
  }, [allPermissions]);

  const memberColumns: ColumnDef<Membership>[] = [
    {
      id: 'name',
      header: 'Team Member',
      cell: ({ row }) => {
        const u = (row.original as any).user;
        const name = u ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : 'User';
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center border border-slate-200 dark:border-slate-700">
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="font-medium text-slate-900 dark:text-white text-sm">{name || 'Unnamed'}</p>
              <p className="text-xs text-slate-500 font-mono">{u?.email ?? '—'}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Assigned Role',
      cell: ({ row }) => {
        const role = row.original.role;
        return (
          <Badge variant="outline" className="text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700">
            <KeyRound className="h-3 w-3 mr-1 text-blue-500" />
            {role?.name ?? 'Standard Role'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Access Status',
      cell: ({ row }) => <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Roles"
        description="Manage workspace users and access permissions"
        action={
          activeTab === 'members' ? (
            <Button onClick={() => setInviteModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          ) : (
            <Button
              onClick={() => {
                setEditingRoleId(null);
                setRoleName('');
                setRoleDescription('');
                setSelectedPermissions([]);
                setRoleModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          )
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-5">
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <TabsTrigger value="members" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <Users className="h-4 w-4 text-blue-500" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-xs">
            <ShieldCheck className="h-4 w-4 text-indigo-500" />
            Roles ({roles.length})
          </TabsTrigger>
        </TabsList>

        {/* ================= MEMBERS TAB ================= */}
        <TabsContent value="members">
          <DataTable
            columns={memberColumns}
            data={members}
            loading={loading}
            page={page}
            pageSize={limit}
            totalRows={total}
            totalPages={totalPages}
            onPageChange={goToPage}
            onPageSizeChange={(newSize) => {
              setLimit(newSize);
              resetPagination();
            }}
            searchValue={search}
            onSearchChange={(val) => {
              setSearch(val);
              resetPagination();
            }}
            searchPlaceholder="Search members by name or email..."
            toolbarActions={
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    setRoleFilter(val);
                    resetPagination();
                  }}
                >
                  <SelectTrigger className="h-9 w-40 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    setStatusFilter(val);
                    resetPagination();
                  }}
                >
                  <SelectTrigger className="h-9 w-36 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active Members</SelectItem>
                    <SelectItem value="inactive">Inactive Members</SelectItem>
                  </SelectContent>
                </Select>

                {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setRoleFilter('all');
                      setStatusFilter('all');
                      resetPagination();
                    }}
                    className="h-9 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset Filters
                  </Button>
                )}
              </div>
            }
            emptyMessage="No team members matching your query"
          />
        </TabsContent>

        {/* ================= ROLES & RBAC TAB ================= */}
        <TabsContent value="roles" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((r) => {
              const permCount = r.permissions?.length ?? 0;
              return (
                <Card
                  key={r.id}
                  className="rounded-2xl border-slate-200 dark:border-slate-800 hover:border-indigo-400/60 transition-all shadow-xs flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          {r.name}
                          {r.isSystem && (
                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[10px]">
                              System Role
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-xs line-clamp-2">
                          {r.description || 'Pre-configured access permissions'}
                        </CardDescription>
                      </div>
                      {!r.isSystem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRole(r.id, r.name)}
                          className="h-8 w-8 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Assigned Members</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {r._count?.memberships ?? 0} users
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Permissions Granted</span>
                      <Badge className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[11px]">
                        {permCount} permissions
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Module Coverage
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(r.permissions?.map((p) => p.permission.module) || [])).map((mod) => (
                          <span
                            key={mod}
                            className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase"
                          >
                            {mod}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0 border-t border-slate-100 dark:border-slate-800/60 p-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs rounded-xl"
                      onClick={() => {
                        setEditingRoleId(r.id);
                        setRoleName(r.name);
                        setRoleDescription(r.description || '');
                        setSelectedPermissions(r.permissions?.map((p) => p.permission.code) || []);
                        setRoleModalOpen(true);
                      }}
                      disabled={r.isSystem}
                    >
                      {r.isSystem ? 'System Locked' : 'Customize Permissions'}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* --- INVITE MEMBER MODAL --- */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Invite New Team Member</DialogTitle>
            <DialogDescription>
              Assign the member an email and select their RBAC permission role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Email Address *</Label>
              <Input {...register('email')} placeholder="colleague@yourstore.qa" className="rounded-lg" />
              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Assign Role *</Label>
              <Select onValueChange={(v) => setValue('roleId', v)}>
                <SelectTrigger className="rounded-lg">
                  <SelectValue placeholder="Select an RBAC role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      <span className="font-medium">{r.name}</span>
                      {r.description && <span className="text-xs text-slate-400 ml-2">({r.description})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roleId && <p className="text-xs text-rose-500">{errors.roleId.message}</p>}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                {inviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Send Workspace Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- CREATE / EDIT ROLE MODAL --- */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRoleId ? 'Customize Role Permissions' : 'Create Custom RBAC Role'}
            </DialogTitle>
            <DialogDescription>
              Check or uncheck the specific capabilities granted to this role across each platform module.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Role Name *</Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Senior Shift Supervisor"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Description</Label>
                <Input
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                  placeholder="e.g. Can manage POS and adjust damaged stock"
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Permission Matrix ({selectedPermissions.length} selected)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-indigo-600"
                    onClick={() => setSelectedPermissions(allPermissions.map((p) => p.code))}
                  >
                    Select All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 text-slate-500"
                    onClick={() => setSelectedPermissions([])}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {Object.entries(permissionsByModule).map(([moduleName, modulePerms]) => {
                const allModuleSelected = modulePerms.every((p) => selectedPermissions.includes(p.code));
                return (
                  <div
                    key={moduleName}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <span className="font-semibold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {moduleName} Module
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-6 px-2 text-slate-600 dark:text-slate-300"
                        onClick={() => toggleModulePermissions(moduleName, modulePerms)}
                      >
                        {allModuleSelected ? 'Deselect Module' : 'Select All in Module'}
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {modulePerms.map((perm) => {
                        const checked = selectedPermissions.includes(perm.code);
                        return (
                          <div
                            key={perm.code}
                            onClick={() => togglePermission(perm.code)}
                            className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer border transition-colors ${
                              checked
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="mt-0.5">
                              {checked ? (
                                <CheckSquare className="h-4 w-4 text-indigo-600" />
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{perm.name}</p>
                              <p className="text-[10px] font-mono text-slate-400 truncate">{perm.code}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setRoleModalOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSaveRole}
              disabled={savingRole}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
            >
              {savingRole && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRoleId ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
