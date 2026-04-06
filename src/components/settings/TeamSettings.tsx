import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, UserPlus, Trash2, Building2, Shield, User, Check } from 'lucide-react';

export function TeamSettings() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  const isCompanyAdmin = profile?.company_role === 'admin';
  const hasCompany = !!profile?.company_id;

  const [myInvites, setMyInvites] = useState<any[]>([]);

  useEffect(() => {
    if (hasCompany) {
      fetchCompanyData();
    } else {
      fetchMyInvites();
      setFetching(false);
    }
  }, [profile?.company_id]);

  const fetchMyInvites = async () => {
    if (!user?.email) return;
    try {
      const { data } = await supabase
        .from('company_invites')
        .select('*, companies(name)')
        .eq('email', user.email);
      if (data) setMyInvites(data);
    } catch (error) {
      console.error('Error fetching my invites:', error);
    }
  };

  const handleAcceptInvite = async (invite: any) => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('accept_company_invite', { invite_id: invite.id });
      if (error) throw error;

      await refreshProfile();
      toast.success('Convite aceito com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao aceitar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyData = async () => {
    setFetching(true);
    try {
      // Fetch company details
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', profile?.company_id)
        .single();
      
      if (companyData) setCompanyName(companyData.name);

      // Fetch members
      const { data: membersData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, company_role')
        .eq('company_id', profile?.company_id);
      
      if (membersData) setMembers(membersData);

      // Fetch invites
      const { data: invitesData } = await supabase
        .from('company_invites')
        .select('*')
        .eq('company_id', profile?.company_id);
      
      if (invitesData) setInvites(invitesData);

    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    
    setLoading(true);
    try {
      const { error: rpcError } = await supabase.rpc('create_company', { company_name: companyName });
      if (rpcError) throw rpcError;

      await refreshProfile();
      toast.success('Empresa criada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao criar empresa: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !profile?.company_id) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/invite-to-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          email: inviteEmail.toLowerCase(),
          company_id: profile.company_id,
          role: 'member'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar convite');
      }

      toast.success('Convite enviado com sucesso!');
      setInviteEmail('');
      fetchCompanyData();
    } catch (error: any) {
      toast.error('Erro ao enviar convite: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInvite = async (id: string) => {
    try {
      await supabase.from('company_invites').delete().eq('id', id);
      setInvites(invites.filter(i => i.id !== id));
      toast.success('Convite removido.');
    } catch (error) {
      toast.error('Erro ao remover convite.');
    }
  };

  const handleRemoveMember = async (id: string) => {
    if (id === user?.id) {
      toast.error('Você não pode remover a si mesmo.');
      return;
    }
    if (!confirm('Tem certeza que deseja remover este usuário da empresa?')) return;

    try {
      const { error } = await supabase.rpc('remove_company_member', { member_id: id });
      if (error) throw error;
      
      setMembers(members.filter(m => m.id !== id));
      toast.success('Usuário removido da empresa.');
    } catch (error: any) {
      toast.error('Erro ao remover usuário: ' + error.message);
    }
  };

  if (fetching) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>;
  }

  if (!hasCompany) {
    return (
      <div className="space-y-6">
        {myInvites.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="h-5 w-5" />
                Convites Pendentes
              </CardTitle>
              <CardDescription>
                Você foi convidado para participar de uma ou mais empresas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {myInvites.map(invite => (
                <div key={invite.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-primary/10 shadow-sm">
                  <div>
                    <p className="font-medium text-gray-900">{invite.companies?.name || 'Empresa Desconhecida'}</p>
                    <p className="text-sm text-gray-500">Como {invite.role === 'admin' ? 'Administrador' : 'Membro'}</p>
                  </div>
                  <Button onClick={() => handleAcceptInvite(invite)} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Aceitar Convite
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Criar Empresa
            </CardTitle>
            <CardDescription>
              Crie uma empresa para colaborar com sua equipe e compartilhar dados do CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nome da Empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Ex: Minha Agência"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Empresa
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Sua Empresa: {companyName}
          </CardTitle>
          <CardDescription>
            Gerencie os membros da sua equipe. Todos os membros têm acesso aos dados do CRM da empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isCompanyAdmin && (
            <form onSubmit={handleInviteUser} className="flex gap-3 mb-8 max-w-md">
              <Input 
                type="email" 
                placeholder="E-mail do novo membro" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Convidar
              </Button>
            </form>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Membros Ativos</h3>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                        {member.first_name?.[0] || member.email?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                          {member.id === user?.id && <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Você</span>}
                        </p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        {member.company_role === 'admin' ? <Shield className="h-4 w-4 text-amber-500" /> : <User className="h-4 w-4" />}
                        {member.company_role === 'admin' ? 'Admin' : 'Membro'}
                      </div>
                      {isCompanyAdmin && member.id !== user?.id && (
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveMember(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {invites.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Convites Pendentes</h3>
                <div className="space-y-3">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-dashed border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                          <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{invite.email}</p>
                          <p className="text-xs text-gray-500">Enviado em {new Date(invite.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {isCompanyAdmin && (
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleRemoveInvite(invite.id)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}