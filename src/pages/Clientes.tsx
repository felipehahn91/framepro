import React, { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, Plus, Edit2, Trash2, Users, Loader2, X, Mail, Phone, Building2, Camera
} from "lucide-react";
import { toast } from "sonner";
import ClientDetailPanel from "@/components/ClientDetailPanel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  company: string;
  avatar_url: string;
  created_at: string;
  pipeline_id: string | null;
  is_client: boolean;
  observations: string;
}

export default function Clientes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    company: ""
  });
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  useEffect(() => {
    if (user) fetchClients();
  }, [user]);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_client', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data as Client[] || []);
    } catch (error) {
      toast.error("Erro ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients;
    const query = searchQuery.toLowerCase();
    return clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.company && c.company.toLowerCase().includes(query)) ||
      (c.email && c.email.toLowerCase().includes(query))
    );
  }, [clients, searchQuery]);

  const handleOpenEditModal = (client?: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); 
    
    if (client) {
      setSelectedClient(client);
      setFormData({
        name: client.name || "",
        email: client.email || "",
        phone: client.phone || "",
        instagram: client.instagram || "",
        company: client.company || ""
      });
      setAvatarPreview(client.avatar_url || null);
    } else {
      setSelectedClient(null);
      setFormData({ name: "", email: "", phone: "", instagram: "", company: "" });
      setAvatarPreview(null);
    }
    setAvatarFile(null);
    setIsModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("O nome é obrigatório.");

    setIsSubmitting(true);
    try {
      let avatarUrl = selectedClient?.avatar_url || null;

      // Upload do Avatar se houver novo arquivo
      if (avatarFile && user) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `client_${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('contract_images')
          .upload(filePath, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('contract_images')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
      }

      const clientData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        instagram: formData.instagram,
        company: formData.company,
        avatar_url: avatarUrl,
        is_client: true,
        user_id: user?.id
      };

      if (selectedClient) {
        const { data, error } = await supabase
          .from('opportunities')
          .update(clientData)
          .eq('id', selectedClient.id)
          .select()
          .single();

        if (error) throw error;
        
        const updatedClient = data as Client;
        setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
        if (viewingClient?.id === updatedClient.id) setViewingClient(updatedClient);
        
        toast.success("Cliente atualizado!");
      } else {
        const { data, error } = await supabase
          .from('opportunities')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;
        setClients(prev => [data as Client, ...prev]);
        toast.success("Cliente criado!");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClient(client);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('opportunities')
        .update({ is_client: false })
        .eq('id', selectedClient.id);
        
      if (error) throw error;
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      toast.success("Status de cliente removido.");
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error("Erro ao remover status.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full relative">
        
        {/* FAB para Mobile */}
        <button 
          onClick={() => handleOpenEditModal()} 
          className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-orange-400 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center z-40 hover:bg-orange-500 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Clientes</h1>
            <p className="text-sm text-gray-500">Gerencie sua base de clientes, empresas e contatos</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou empresa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 shadow-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>
            <button
              onClick={() => handleOpenEditModal()}
              className="hidden md:flex w-full sm:w-auto px-5 py-2.5 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors items-center justify-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo cliente
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto pb-20 md:pb-0">
          {filteredClients.length > 0 ? (
            <>
              {/* VISÃO DESKTOP (Tabela) */}
              <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Empresa</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contato</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredClients.map((client) => (
                      <tr 
                        key={client.id} 
                        onClick={() => setViewingClient(client)}
                        className="hover:bg-gray-50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border border-gray-200">
                              <AvatarImage src={client.avatar_url} />
                              <AvatarFallback className="bg-orange-50 text-orange-500 font-bold text-xs">
                                {getInitials(client.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{client.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.company ? (
                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" /> {client.company}
                            </div>
                          ) : <span className="text-xs text-gray-300 italic">Individual</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {client.email && <span className="text-xs font-medium text-gray-600">{client.email}</span>}
                            {client.phone && <span className="text-[11px] text-gray-400">{client.phone}</span>}
                            {!client.email && !client.phone && <span className="text-xs text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => handleOpenEditModal(client, e)}
                              className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => handleDeleteClick(client, e)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISÃO MOBILE (Cards) */}
              <div className="md:hidden flex flex-col gap-3">
                {filteredClients.map((client) => (
                  <div 
                    key={client.id} 
                    onClick={() => setViewingClient(client)}
                    className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border border-gray-200">
                          <AvatarImage src={client.avatar_url} />
                          <AvatarFallback className="bg-orange-50 text-orange-500 font-bold text-sm">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-gray-900 leading-tight">{client.name}</h3>
                          {client.company && (
                            <p className="text-xs font-semibold text-orange-500 mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {client.company}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={(e) => handleOpenEditModal(client, e)}
                          className="p-2 text-gray-400 hover:text-orange-500 bg-gray-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(client, e)}
                          className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 text-sm">
                      {client.email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                      {!client.email && !client.phone && (
                        <span className="text-xs text-gray-400 italic">Nenhum contato salvo</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl shadow-sm">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">Nenhum cliente por aqui</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">Comece cadastrando seu primeiro cliente clicando no botão de adicionar.</p>
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Detalhes */}
      <ClientDetailPanel 
        isOpen={!!viewingClient}
        client={viewingClient}
        onClose={() => setViewingClient(null)}
        onUpdate={(updated) => {
          setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
          setViewingClient(updated);
        }}
        onEditClick={(c) => {
          setViewingClient(null);
          handleOpenEditModal(c);
        }}
      />

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-3xl">
              <h2 className="text-xl font-bold text-gray-900">{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 sm:p-8 space-y-6">
              {/* Upload Foto Perfil */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <Avatar className="w-24 h-24 border-2 border-orange-100 shadow-md">
                    <AvatarImage src={avatarPreview || ''} />
                    <AvatarFallback className="bg-gray-50 text-gray-300 font-bold text-2xl">
                      <Users className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-orange-400 text-white rounded-full shadow-lg border-2 border-white hover:bg-orange-500 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Foto do Perfil</p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Nome Completo *</label>
                  <input 
                    required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                    placeholder="Ex: João da Silva"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Empresa / Estúdio</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                      placeholder="Nome da empresa"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">E-mail</label>
                    <input 
                      type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">WhatsApp</label>
                    <input 
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3 sm:py-2.5 bg-orange-400 text-white font-bold rounded-xl shadow-md hover:bg-orange-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 order-1 sm:order-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedClient ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deletar */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remover status?</h3>
            <p className="text-sm text-gray-500 mb-8">
              O lead <strong>{selectedClient?.name}</strong> deixará de aparecer na lista de clientes, mas continuará existindo no funil de vendas.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-orange-400 text-white font-bold rounded-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}