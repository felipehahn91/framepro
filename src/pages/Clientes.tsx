import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Search, Plus, Edit2, Trash2, Users, Loader2, X, Mail, Phone
} from "lucide-react";
import { toast } from "sonner";
import ClientDetailPanel from "@/components/ClientDetailPanel";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
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
    instagram: ""
  });

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
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.toLowerCase().includes(query))
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
        instagram: client.instagram || ""
      });
    } else {
      setSelectedClient(null);
      setFormData({ name: "", email: "", phone: "", instagram: "" });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("O nome é obrigatório.");

    setIsSubmitting(true);
    try {
      if (selectedClient) {
        const { data, error } = await supabase
          .from('opportunities')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            instagram: formData.instagram
          })
          .eq('id', selectedClient.id)
          .select()
          .single();

        if (error) throw error;
        
        const updatedClient = data as Client;
        setClients(prev => prev.map(c => c.id === selectedClient.id ? updatedClient : c));
        
        if (viewingClient?.id === updatedClient.id) {
          setViewingClient(updatedClient);
        }
        
        toast.success("Cliente atualizado com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('opportunities')
          .insert({
            user_id: user?.id,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            instagram: formData.instagram,
            is_client: true,
            pipeline_id: null
          })
          .select()
          .single();

        if (error) throw error;
        setClients(prev => [data as Client, ...prev]);
        toast.success("Cliente criado com sucesso!");
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
      // Em vez de deletar o registro, apenas desmarcamos a flag de cliente
      const { error } = await supabase
        .from('opportunities')
        .update({ is_client: false })
        .eq('id', selectedClient.id);
        
      if (error) throw error;
      
      setClients(prev => prev.filter(c => c.id !== selectedClient.id));
      toast.success("Status de cliente removido. O lead continua no funil.");
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error("Erro ao remover status de cliente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFromPanel = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setViewingClient(updatedClient);
  };

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Clientes</h1>
            <p className="text-sm text-gray-500">Gerencie sua base de clientes e anotações</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[300px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar clientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 sm:py-2 bg-white border border-gray-200 rounded-xl sm:rounded-lg text-sm text-gray-700 shadow-sm transition-colors outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <button
              onClick={() => handleOpenEditModal()}
              className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 bg-orange-400 text-white font-semibold rounded-xl sm:rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo cliente
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="overflow-x-auto flex-1">
            {filteredClients.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Origem</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Contato</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cadastro</th>
                    <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr 
                      key={client.id} 
                      onClick={() => setViewingClient(client)}
                      className="hover:bg-white/40 transition-colors group cursor-pointer"
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0 border border-orange-200">
                            {getInitials(client.name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{client.name}</p>
                            {client.instagram && <p className="text-xs text-gray-500">{client.instagram}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {client.pipeline_id ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-600 border border-orange-100">
                            Oportunidade
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {client.email ? (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                              <Mail className="w-3 h-3 text-gray-400" /> {client.email}
                            </div>
                          ) : <span className="text-xs text-gray-400">-</span>}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                              <Phone className="w-3 h-3 text-gray-400" /> {client.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-500">
                        {new Date(client.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => handleOpenEditModal(client, e)}
                            className="p-2 text-gray-400 hover:text-orange-500 hover:bg-white rounded-lg transition-all"
                            title="Editar cliente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteClick(client, e)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                            title="Remover status de cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-16">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum cliente encontrado</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'Tente buscar com outros termos.' : 'Adicione seu primeiro cliente clicando no botão acima.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over de Detalhes do Cliente */}
      <ClientDetailPanel 
        isOpen={!!viewingClient}
        client={viewingClient}
        onClose={() => setViewingClient(null)}
        onUpdate={handleUpdateFromPanel}
        onEditClick={(c) => {
          setViewingClient(null);
          handleOpenEditModal(c);
        }}
      />

      {/* Modal Criar/Editar Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <p className="text-sm text-gray-500">{selectedClient ? 'Atualize as informações do cliente.' : 'Cadastre um novo cliente manualmente.'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Cliente *</label>
                <input 
                  required
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nome completo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    E-mail
                  </label>
                  <input 
                    type="email"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="cliente@email.com"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  <input 
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                   Instagram
                </label>
                <input 
                  value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="@usuario"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors border border-transparent">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {selectedClient ? 'Atualizar' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deletar (Agora com lógica de desmarcar status) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Remover Cliente?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Deseja remover o status de cliente de <strong>{selectedClient?.name}</strong>? Ele deixará de aparecer aqui, mas continuará existindo como oportunidade no seu funil de vendas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center justify-center">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}