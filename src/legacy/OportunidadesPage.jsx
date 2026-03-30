
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/contexts/CacheContext';
import pb from '@/lib/pocketbaseClient';
import { pbFetch } from '@/lib/pbFetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import OpportunityDetailModal from '@/components/OpportunityDetailModal';
import LeadImportModal from '@/components/LeadImportModal';
import { Plus, Trash2, UserPlus, UserMinus, MessageCircle, Check, X, Link as LinkIcon, Copy, ArrowUp, ArrowDown, ExternalLink, Upload, Loader2, LayoutGrid as LayoutColumn } from 'lucide-react';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const PHOTO_TYPES = [
  { value: 'Casamento', label: '💍 Casamento' },
  { value: 'Gestante', label: '🤰 Gestante' },
  { value: 'Corporativo', label: '💼 Corporativo' },
  { value: 'Retrato', label: '👤 Retrato' },
  { value: 'Newborn', label: '👶 Newborn' },
  { value: 'Infantil', label: '👧 Infantil' },
  { value: 'Ensaio feminino', label: '👩 Ensaio feminino' },
  { value: 'Smash the cake', label: '🎂 Smash the cake' }
];

const OportunidadesPage = () => {
  const { currentUser } = useAuth();
  const isMounted = useRef(true);
  
  const [activePipelineId, setActivePipelineId] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  
  const [editingColumnId, setEditingColumnId] = useState(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  const [newColumnOpen, setNewColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveTargetPipeline, setMoveTargetPipeline] = useState('');
  const [moveTargetColumn, setMoveTargetColumn] = useState('');

  const [massDeleteModalOpen, setMassDeleteModalOpen] = useState(false);
  const [isMassDeleting, setIsMassDeleting] = useState(false);

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('opportunity');
  const [formData, setFormData] = useState({
    name: '', value: '', email: '', whatsapp: '', instagram: '', date: '', local: '', notes: '', targetPipelineId: '', tipoFoto: '', whatsappNumber: '', whatsappText: ''
  });
  const [formFields, setFormFields] = useState({
    email: true, phone: true, instagram: true, date: false, local: false, description: false
  });

  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  const [cadenciaOpen, setCadenciaOpen] = useState(false);
  const [selectedOppForCadencia, setSelectedOppForCadencia] = useState(null);
  const [selectedFlowId, setSelectedFlowId] = useState('');

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch base data (pipelines, columns, flows, forms) using cache
  const { data: baseData, isLoading: baseLoading, refetch: refetchBase } = useCache('pipelines_base', async () => {
    const pipes = await pbFetch(() => pb.collection('pipelines').getList(1, 50, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Pipelines');
    const cols = await pbFetch(() => pb.collection('pipeline_columns').getList(1, 100, { filter: `userId = "${currentUser.id}"`, sort: 'order', $autoCancel: false }), 'Fetch Columns');
    const flows = await pbFetch(() => pb.collection('cadencia_flows').getList(1, 50, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }), 'Fetch Flows');
    const forms = await pbFetch(() => pb.collection('link_forms').getList(1, 50, { filter: `userId = "${currentUser.id}"`, $autoCancel: false }).catch(() => ({items:[]})), 'Fetch Link Forms');
    
    let currentPipelines = pipes.items;
    let currentColumns = cols.items;
    
    if (currentPipelines.length === 0) {
      const newPipeline = await pbFetch(() => pb.collection('pipelines').create({ name: 'Oportunidades', userId: currentUser.id }, { $autoCancel: false }), 'Create Default Pipeline');
      const defaultColumns = ['Aberto', 'Em Progresso', 'Ganho', 'Perdido'];
      const newColumns = [];
      for (let i = 0; i < defaultColumns.length; i++) {
        const col = await pbFetch(() => pb.collection('pipeline_columns').create({ name: defaultColumns[i], pipelineId: newPipeline.id, order: i, userId: currentUser.id }, { $autoCancel: false }), `Create Default Col ${i}`);
        newColumns.push(col);
      }
      currentPipelines = [newPipeline];
      currentColumns = newColumns;
    }
    
    return { pipes: currentPipelines, cols: currentColumns, flows: flows.items, forms: forms.items };
  }, { dependencies: [currentUser?.id] });

  const pipelines = Array.isArray(baseData?.pipes) ? baseData.pipes : [];
  const columns = Array.isArray(baseData?.cols) ? baseData.cols : [];
  const flows = Array.isArray(baseData?.flows) ? baseData.flows : [];
  const linkForms = Array.isArray(baseData?.forms) ? baseData.forms : [];

  // Set initial active pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !activePipelineId) {
      setActivePipelineId(pipelines[0].id);
      setFormData(prev => ({ ...prev, targetPipelineId: pipelines[0].id }));
    }
  }, [pipelines, activePipelineId]);

  // Refs for real-time sync to avoid dependency array loops
  const activePipelineIdRef = useRef(activePipelineId);
  useEffect(() => {
    activePipelineIdRef.current = activePipelineId;
  }, [activePipelineId]);

  // Fetch Opportunities manually to have full control over state and optimistic updates
  const fetchOpportunities = useCallback(async () => {
    if (!activePipelineId || !currentUser?.id) return;
    
    setLoadingOpps(true);
    try {
      const data = await pb.collection('opportunities').getFullList({
        filter: `userId="${currentUser.id}" && pipelineId="${activePipelineId}"`,
        $autoCancel: false
      });
      if (isMounted.current) {
        setOpportunities(data);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching opportunities:", error);
        if (isMounted.current) toast.error("Erro ao carregar oportunidades");
      }
    } finally {
      if (isMounted.current) setLoadingOpps(false);
    }
  }, [activePipelineId, currentUser?.id]);

  // Initial fetch when pipeline changes
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  // Real-time Sync for Opportunities
  useEffect(() => {
    if (!currentUser?.id || !pb.authStore.isValid) return;

    let isSubscribed = true;

    const setupSubscriptions = async () => {
      try {
        // Unsubscribe first to prevent duplicates
        await pb.collection('opportunities').unsubscribe('*').catch(() => {});
        if (!isSubscribed) return;

        await pb.collection('opportunities').subscribe('*', (e) => {
          if (!isSubscribed) return;
          
          setOpportunities(prev => {
            const currentPipeId = activePipelineIdRef.current;
            const safePrev = Array.isArray(prev) ? prev : [];

            if (e.action === 'create') {
              if (e.record.userId === currentUser.id && e.record.pipelineId === currentPipeId) {
                if (!safePrev.find(o => o.id === e.record.id)) {
                  return [...safePrev, e.record];
                }
              }
            } else if (e.action === 'update') {
              if (e.record.userId === currentUser.id && e.record.pipelineId === currentPipeId) {
                const exists = safePrev.find(o => o.id === e.record.id);
                if (exists) {
                  return safePrev.map(o => o.id === e.record.id ? e.record : o);
                } else {
                  return [...safePrev, e.record];
                }
              } else {
                // If it was updated to belong to another pipeline, remove it from current view
                return safePrev.filter(o => o.id !== e.record.id);
              }
            } else if (e.action === 'delete') {
              return safePrev.filter(o => o.id !== e.record.id);
            }
            return safePrev;
          });
        });

      } catch (error) {
        if (isSubscribed) console.error('Failed to establish real-time subscriptions:', error);
      }
    };

    setupSubscriptions();

    return () => {
      isSubscribed = false;
      pb.collection('opportunities').unsubscribe('*').catch(() => {});
    };
  }, [currentUser?.id]);

  // Sync selectedOpportunity for the modal when opportunities array updates
  useEffect(() => {
    if (selectedOpportunity) {
      const updated = opportunities.find(o => o.id === selectedOpportunity.id);
      if (updated && updated.isClient !== selectedOpportunity.isClient) {
        setSelectedOpportunity(updated);
      }
    }
  }, [opportunities, selectedOpportunity]);

  const handlePipelineChange = (newId) => {
    setActivePipelineId(newId);
    setFormData(prev => ({ ...prev, targetPipelineId: newId }));
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) {
      toast.error('Nome da pipeline é obrigatório');
      return;
    }

    try {
      const newPipeline = await pbFetch(() => pb.collection('pipelines').create({ name: newPipelineName, userId: currentUser.id }, { $autoCancel: false }), 'Create Pipeline');
      const defaultColumns = ['Aberto', 'Em Progresso', 'Ganho', 'Perdido'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await pbFetch(() => pb.collection('pipeline_columns').create({ name: defaultColumns[i], pipelineId: newPipeline.id, order: i, userId: currentUser.id }, { $autoCancel: false }), `Create Col ${i}`);
      }
      
      if (isMounted.current) {
        refetchBase();
        setActivePipelineId(newPipeline.id);
        setNewPipelineOpen(false);
        setNewPipelineName('');
        toast.success('Pipeline criada com sucesso');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao criar pipeline');
    }
  };

  const handleCreateColumn = async () => {
    if (!newColumnName.trim()) {
      toast.error('Nome da coluna é obrigatório');
      return;
    }

    try {
      const activeCols = columns.filter(c => c.pipelineId === activePipelineId);
      await pb.collection('pipeline_columns').create({
        name: newColumnName,
        pipelineId: activePipelineId,
        order: activeCols.length,
        userId: currentUser.id
      }, { $autoCancel: false });

      if (isMounted.current) {
        refetchBase();
        setNewColumnOpen(false);
        setNewColumnName('');
        toast.success('Coluna adicionada com sucesso');
      }
    } catch (error) {
      console.error('Error creating column:', error);
      if (isMounted.current) toast.error('Erro ao criar coluna');
    }
  };

  const handleDeleteColumn = async (colId) => {
    if (!confirm('Tem certeza que deseja excluir esta coluna? As oportunidades nela não serão excluídas, mas ficarão sem coluna visível até serem movidas.')) return;
    
    try {
      await pb.collection('pipeline_columns').delete(colId, { $autoCancel: false });
      if (isMounted.current) {
        refetchBase();
        toast.success('Coluna excluída com sucesso');
      }
    } catch (error) {
      console.error('Error deleting column:', error);
      if (isMounted.current) toast.error('Erro ao excluir coluna');
    }
  };

  const handleCreateOpportunityOrForm = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    const targetPipeId = formData.targetPipelineId || activePipelineId;
    const activeCols = columns.filter(c => c.pipelineId === targetPipeId).sort((a, b) => a.order - b.order);
    const firstColumn = activeCols[0];

    if (!firstColumn) {
      toast.error('Nenhuma coluna encontrada no pipeline selecionado');
      return;
    }

    try {
      if (activeTab === 'opportunity') {
        const oppData = {
          name: formData.name,
          value: parseFloat(formData.value) || 0,
          email: formData.email,
          whatsapp: formData.whatsapp,
          phone: formData.whatsapp,
          instagram: formData.instagram,
          local: formData.local,
          notes: formData.notes,
          pipelineId: targetPipeId,
          columnId: firstColumn.id,
          userId: currentUser.id,
          status: 'Novo',
          isClient: false
        };

        if (formData.tipoFoto) {
          oppData.tipoFoto = formData.tipoFoto;
        }

        const newOpp = await pb.collection('opportunities').create(oppData, { $autoCancel: false });
        
        if (isMounted.current) {
          if (targetPipeId === activePipelineId) {
            setOpportunities(prev => {
              if (!prev.find(o => o.id === newOpp.id)) {
                return [...prev, newOpp];
              }
              return prev;
            });
          }
          toast.success('Oportunidade criada');
        }
      } else {
        const linkFormData = {
          name: formData.name,
          pipelineId: targetPipeId,
          columnId: firstColumn.id,
          whatsappNumber: formData.whatsappNumber,
          whatsappText: formData.whatsappText,
          fields: { email: true, phone: true, instagram: true, date: formFields.date, local: formFields.local, description: formFields.description },
          userId: currentUser.id
        };

        if (formData.tipoFoto) {
          linkFormData.tipoFoto = formData.tipoFoto;
        }

        await pb.collection('link_forms').create(linkFormData, { $autoCancel: false });
        if (isMounted.current) {
          refetchBase();
          toast.success('Link Form criado com sucesso');
        }
      }

      if (isMounted.current) {
        setNewModalOpen(false);
        setFormData({ name: '', value: '', email: '', whatsapp: '', instagram: '', date: '', local: '', notes: '', targetPipelineId: activePipelineId, tipoFoto: '', whatsappNumber: '', whatsappText: '' });
      }
    } catch (error) {
      console.error("Error creating opportunity/form:", error);
      if (isMounted.current) toast.error('Erro ao salvar. Verifique os dados preenchidos.');
    }
  };

  const handleDeleteLinkForm = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este formulário?')) return;
    try {
      const submissions = await pb.collection('link_form_submissions').getFullList({
        filter: `linkFormId="${id}"`,
        $autoCancel: false
      });
      
      for (const sub of submissions) {
        await pb.collection('link_form_submissions').delete(sub.id, { $autoCancel: false });
      }

      await pb.collection('link_forms').delete(id, { $autoCancel: false });
      
      if (isMounted.current) {
        refetchBase();
        toast.success('Formulário excluído com sucesso');
      }
    } catch (error) {
      console.error('Error deleting link form:', error);
      if (isMounted.current) toast.error('Erro ao excluir formulário. Verifique se há dependências.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copiado para a área de transferência!');
  };

  const openInNewTab = (url) => {
    window.open(url, '_blank');
  };

  const handleUpdateColumnName = async (colId) => {
    if (!editingColumnName.trim()) {
      setEditingColumnId(null);
      return;
    }
    try {
      await pb.collection('pipeline_columns').update(colId, { name: editingColumnName }, { $autoCancel: false });
      if (isMounted.current) {
        refetchBase();
        setEditingColumnId(null);
        toast.success('Nome da coluna atualizado');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao atualizar coluna');
    }
  };

  const handleSelectAll = (colId) => {
    const oppsInCol = opportunities.filter(o => o.columnId === colId).map(o => o.id);
    setSelectedOpportunities(prev => Array.from(new Set([...prev, ...oppsInCol])));
  };

  const handleDeselectAll = (colId) => {
    const oppsInCol = opportunities.filter(o => o.columnId === colId).map(o => o.id);
    setSelectedOpportunities(prev => prev.filter(id => !oppsInCol.includes(id)));
  };

  const handleToggleClient = async (opp, e) => {
    if (e) e.stopPropagation();
    const previousState = { ...opp };

    try {
      if (opp.isClient) {
        // Optimistic remove
        setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, isClient: false, clientIdRelation: null, clientId: null } : o));
        
        const relId = opp.clientIdRelation || opp.clientId;
        if (relId) {
          try {
            await pb.collection('clients').delete(relId, { $autoCancel: false });
          } catch (err) {
            // Ignore 404 if already deleted
            if (err.status !== 404) throw err;
          }
        }
        
        const updatedOpp = await pb.collection('opportunities').update(opp.id, { isClient: false, clientIdRelation: null, clientId: null }, { $autoCancel: false });
        
        if (isMounted.current) {
          setOpportunities(prev => prev.map(o => o.id === opp.id ? updatedOpp : o));
          toast.success('Cliente removido com sucesso');
        }
      } else {
        // Optimistic add
        setOpportunities(prev => prev.map(o => o.id === opp.id ? { ...o, isClient: true } : o));
        
        const clientData = {
          name: opp.name,
          userId: currentUser.id,
          email: opp.email?.trim() || '',
          phone: opp.phone?.trim() || opp.whatsapp?.trim() || '',
          company: opp.company?.trim() || ''
        };

        const client = await pb.collection('clients').create(clientData, { $autoCancel: false });
        const updatedOpp = await pb.collection('opportunities').update(opp.id, { isClient: true, clientIdRelation: client.id, clientId: client.id }, { $autoCancel: false });
        
        if (isMounted.current) {
          setOpportunities(prev => prev.map(o => o.id === opp.id ? updatedOpp : o));
          toast.success('Cliente criado com sucesso');
        }
      }
    } catch (error) {
      console.error("Error toggling client:", error);
      if (isMounted.current) {
        toast.error('Erro ao atualizar status de cliente');
        setOpportunities(prev => prev.map(o => o.id === opp.id ? previousState : o)); // Revert optimistic update
      }
    }
  };

  const handleSendCadencia = async () => {
    if (!selectedFlowId || !selectedOppForCadencia) return;

    try {
      const flow = flows.find(f => f.id === selectedFlowId);
      await pb.collection('cadencia_assignments').create({ opportunityId: selectedOppForCadencia.id, flowId: flow.id, status: 'Enviado', sentDate: new Date().toISOString(), userId: currentUser.id }, { $autoCancel: false });

      const firstMsg = flow.messages?.[0]?.content || '';
      const phone = selectedOppForCadencia.whatsapp || selectedOppForCadencia.phone || '';
      
      if (isMounted.current) {
        setCadenciaOpen(false);
        setSelectedOppForCadencia(null);
        setSelectedFlowId('');
        toast.success('Cadência iniciada');

        if (phone) {
          const cleanPhone = phone.replace(/\D/g, '');
          window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(firstMsg)}`, '_blank');
        } else {
          toast.warning('Lead não possui telefone cadastrado para WhatsApp');
        }
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao iniciar cadência');
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'column') {
      const activeCols = columns.filter(c => c.pipelineId === activePipelineId).sort((a, b) => a.order - b.order);
      const newCols = Array.from(activeCols);
      const [removed] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, removed);

      const updatedCols = newCols.map((col, index) => ({ ...col, order: index }));
      
      try {
        await Promise.all(updatedCols.map(col => pb.collection('pipeline_columns').update(col.id, { order: col.order }, { $autoCancel: false })));
        if (isMounted.current) refetchBase();
      } catch (error) {
        if (isMounted.current) toast.error('Erro ao reordenar colunas');
      }
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const updatedOpps = Array.from(opportunities);
    
    if (sourceColId === destColId) {
      const colOpps = updatedOpps.filter(o => o.columnId === sourceColId);
      const otherOpps = updatedOpps.filter(o => o.columnId !== sourceColId);
      const [moved] = colOpps.splice(source.index, 1);
      colOpps.splice(destination.index, 0, moved);
      setOpportunities([...otherOpps, ...colOpps]);
      return;
    }

    const oppIndex = updatedOpps.findIndex(o => o.id === draggableId);
    if (oppIndex !== -1) {
      const oppToMove = updatedOpps[oppIndex];
      updatedOpps[oppIndex] = { ...oppToMove, columnId: destColId };
      setOpportunities(updatedOpps); // Optimistic update

      try {
        await pb.collection('opportunities').update(draggableId, { columnId: destColId }, { $autoCancel: false });
      } catch (error) {
        console.error("Error moving card:", error);
        if (isMounted.current) {
          toast.error('Erro ao mover card. Recarregando dados...');
          fetchOpportunities(); // Revert on error
        }
      }
    }
  };

  const moveCard = (oppId, colId, direction, e) => {
    e.stopPropagation();
    const colOpps = opportunities.filter(o => o.columnId === colId);
    const otherOpps = opportunities.filter(o => o.columnId !== colId);
    const index = colOpps.findIndex(o => o.id === oppId);
    
    if (direction === 'up' && index > 0) {
      const temp = colOpps[index];
      colOpps[index] = colOpps[index - 1];
      colOpps[index - 1] = temp;
      setOpportunities([...otherOpps, ...colOpps]);
    } else if (direction === 'down' && index < colOpps.length - 1) {
      const temp = colOpps[index];
      colOpps[index] = colOpps[index + 1];
      colOpps[index + 1] = temp;
      setOpportunities([...otherOpps, ...colOpps]);
    }
  };

  const handleMoveSelected = async () => {
    if (!moveTargetColumn) {
      toast.error('Selecione uma coluna de destino');
      return;
    }

    const targetPipeId = moveTargetPipeline || activePipelineId;

    try {
      await Promise.all(
        selectedOpportunities.map(oppId =>
          pb.collection('opportunities').update(oppId, { columnId: moveTargetColumn, pipelineId: targetPipeId }, { $autoCancel: false })
        )
      );

      if (isMounted.current) {
        if (targetPipeId === activePipelineId) {
          setOpportunities(prev => prev.map(opp => selectedOpportunities.includes(opp.id) ? { ...opp, columnId: moveTargetColumn } : opp));
        } else {
          setOpportunities(prev => prev.filter(opp => !selectedOpportunities.includes(opp.id)));
        }

        setSelectedOpportunities([]);
        setMoveModalOpen(false);
        toast.success('Oportunidades movidas com sucesso');
      }
    } catch (error) {
      console.error("Error moving selected:", error);
      if (isMounted.current) toast.error('Erro ao mover oportunidades');
    }
  };

  const handleMassDelete = async () => {
    if (selectedOpportunities.length === 0) return;
    setIsMassDeleting(true);
    
    try {
      for (const oppId of selectedOpportunities) {
        const assignments = await pb.collection('cadencia_assignments').getFullList({
          filter: `opportunityId="${oppId}"`,
          $autoCancel: false
        });
        
        for (const assignment of assignments) {
          await pb.collection('cadencia_assignments').delete(assignment.id, { $autoCancel: false });
        }
        
        await pb.collection('opportunities').delete(oppId, { $autoCancel: false });
      }

      if (isMounted.current) {
        setOpportunities(prev => prev.filter(o => !selectedOpportunities.includes(o.id)));
        toast.success(`${selectedOpportunities.length} oportunidade(s) deletada(s) com sucesso`);
        setSelectedOpportunities([]);
        setMassDeleteModalOpen(false);
      }
    } catch (error) {
      console.error('Mass delete error:', error);
      if (isMounted.current) {
        toast.error('Erro ao deletar algumas oportunidades. Tente novamente.');
      }
    } finally {
      if (isMounted.current) {
        setIsMassDeleting(false);
      }
    }
  };

  const toggleSelection = (oppId, e) => {
    e.stopPropagation();
    setSelectedOpportunities(prev => prev.includes(oppId) ? prev.filter(id => id !== oppId) : [...prev, oppId]);
  };

  const handleCardClick = (opp) => {
    setSelectedOpportunity(opp);
    setShowDetailModal(true);
  };

  const handleOppDelete = (id) => {
    if (!id) return;
    setOpportunities(prev => prev.filter(o => o.id !== id));
    setSelectedOpportunities(prev => prev.filter(selectedId => selectedId !== id));
    setShowDetailModal(false);
  };

  if (baseLoading && pipelines.length === 0) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="flex gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-[600px] w-80 rounded-xl" />
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const activeColumns = columns.filter(c => c.pipelineId === activePipelineId).sort((a, b) => a.order - b.order);
  const targetColumnsForMove = columns.filter(c => c.pipelineId === (moveTargetPipeline || activePipelineId)).sort((a, b) => a.order - b.order);

  return (
    <>
      <Helmet>
        <title>Oportunidades - Frame Pro</title>
        <meta name="description" content="Gerencie suas oportunidades de vendas" />
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-hidden flex flex-col bg-muted/30 relative">
            <div className="p-6 pb-0 shrink-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Oportunidades</h1>
                  <div className="flex items-center gap-4">
                    <Select value={activePipelineId} onValueChange={handlePipelineChange}>
                      <SelectTrigger className="w-64 bg-background border-muted-foreground/30">
                        <SelectValue placeholder="Selecione o pipeline" />
                      </SelectTrigger>
                      <SelectContent>
                        {pipelines.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={newPipelineOpen} onOpenChange={setNewPipelineOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-muted-foreground/30">Nova Pipeline</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Pipeline</DialogTitle>
                          <DialogDescription>Dê um nome para sua nova pipeline de vendas.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                          <Label htmlFor="pipelineName">Nome da Pipeline</Label>
                          <Input 
                            id="pipelineName" 
                            value={newPipelineName} 
                            onChange={(e) => setNewPipelineName(e.target.value)} 
                            placeholder="Ex: Vendas B2B"
                            className="mt-2"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setNewPipelineOpen(false)}>Cancelar</Button>
                          <Button onClick={handleCreatePipeline} className="bg-primary hover:bg-primary/90 text-primary-foreground">Criar</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Importar
                  </Button>
                  <Dialog open={newModalOpen} onOpenChange={setNewModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Oportunidade
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Adicionar ao Pipeline</DialogTitle>
                        <DialogDescription>Crie uma nova oportunidade ou gere um link de formulário.</DialogDescription>
                      </DialogHeader>
                      
                      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="opportunity">Nova Oportunidade</TabsTrigger>
                          <TabsTrigger value="linkform">Link Form</TabsTrigger>
                        </TabsList>
                        
                        <div className="mt-6 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Qual pipeline este lead cairá?</Label>
                              <Select 
                                value={formData.targetPipelineId} 
                                onValueChange={(val) => setFormData({...formData, targetPipelineId: val})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o pipeline" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pipelines.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Tipo de Foto</Label>
                              <Select 
                                value={formData.tipoFoto} 
                                onValueChange={(val) => setFormData({...formData, tipoFoto: val})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {PHOTO_TYPES.map(pt => (
                                    <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Nome do {activeTab === 'opportunity' ? 'Lead' : 'Formulário'} *</Label>
                            <Input 
                              value={formData.name} 
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                              placeholder={activeTab === 'opportunity' ? "Nome do cliente" : "Ex: Orçamento Casamento"}
                            />
                          </div>

                          {activeTab === 'opportunity' && (
                            <div className="space-y-2">
                              <Label>Valor</Label>
                              <Input 
                                type="number" 
                                value={formData.value} 
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })} 
                                placeholder="0.00"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Email</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox checked disabled className="opacity-50" />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Telefone/WhatsApp</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox checked disabled className="opacity-50" />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Instagram</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox checked disabled className="opacity-50" />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input value={formData.instagram} onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Data</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox 
                                    checked={formFields.date} 
                                    onCheckedChange={(c) => setFormFields({...formFields, date: c})} 
                                  />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Local do evento</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox 
                                    checked={formFields.local} 
                                    onCheckedChange={(c) => setFormFields({...formFields, local: c})} 
                                  />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input value={formData.local} onChange={(e) => setFormData({ ...formData, local: e.target.value })} />
                              )}
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label>Descrição</Label>
                                {activeTab === 'linkform' && (
                                  <Checkbox 
                                    checked={formFields.description} 
                                    onCheckedChange={(c) => setFormFields({...formFields, description: c})} 
                                  />
                                )}
                              </div>
                              {activeTab === 'opportunity' && (
                                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                              )}
                            </div>
                          </div>

                          {activeTab === 'linkform' && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-muted-foreground/20">
                              <div className="space-y-2">
                                <Label>Número de WhatsApp</Label>
                                <Input 
                                  value={formData.whatsappNumber} 
                                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })} 
                                  placeholder="Ex: 5511999999999"
                                />
                                <p className="text-xs text-muted-foreground">Número que receberá a mensagem do cliente</p>
                              </div>
                              <div className="space-y-2">
                                <Label>Texto da Mensagem</Label>
                                <Input 
                                  value={formData.whatsappText} 
                                  onChange={(e) => setFormData({ ...formData, whatsappText: e.target.value })} 
                                  placeholder="Ex: Olá, gostaria de um orçamento"
                                />
                                <p className="text-xs text-muted-foreground">Texto pré-definido para o WhatsApp</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                          <Button variant="outline" onClick={() => setNewModalOpen(false)}>Cancelar</Button>
                          <Button onClick={handleCreateOpportunityOrForm} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                            {activeTab === 'opportunity' ? 'Criar Oportunidade' : 'Gerar Link Form'}
                          </Button>
                        </div>
                      </Tabs>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {selectedOpportunities.length > 0 && (
                <Card className="mb-4 bg-primary/5 border-primary/20">
                  <CardContent className="p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      {selectedOpportunities.length} oportunidade(s) selecionada(s)
                    </span>
                    <div className="flex gap-2">
                      <Dialog open={massDeleteModalOpen} onOpenChange={setMassDeleteModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Deletar Selecionados
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Deletar Oportunidades</DialogTitle>
                            <DialogDescription>
                              Tem certeza que deseja deletar {selectedOpportunities.length} oportunidade(s)? Esta ação não pode ser desfeita e removerá todos os dados vinculados.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setMassDeleteModalOpen(false)} disabled={isMassDeleting}>Cancelar</Button>
                            <Button onClick={handleMassDelete} disabled={isMassDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              {isMassDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Deletar
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={moveModalOpen} onOpenChange={setMoveModalOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
                            Mover Selecionados
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mover Oportunidades</DialogTitle>
                            <DialogDescription>Selecione o destino para os cards selecionados.</DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Pipeline de Destino</Label>
                              <Select 
                                value={moveTargetPipeline || activePipelineId} 
                                onValueChange={(val) => {
                                  setMoveTargetPipeline(val);
                                  setMoveTargetColumn('');
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o pipeline" />
                                </SelectTrigger>
                                <SelectContent>
                                  {pipelines.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Coluna de Destino</Label>
                              <Select value={moveTargetColumn} onValueChange={setMoveTargetColumn}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a coluna" />
                                </SelectTrigger>
                                <SelectContent>
                                  {targetColumnsForMove.map(col => (
                                    <SelectItem key={col.id} value={col.id}>{col.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setMoveModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleMoveSelected} className="bg-primary hover:bg-primary/90 text-primary-foreground">Mover</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex-1 overflow-x-auto p-6 pt-0 pb-2">
              {loadingOpps ? (
                <div className="flex gap-6 h-full items-start">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-80 h-[600px] rounded-xl shrink-0" />
                  ))}
                </div>
              ) : (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Droppable droppableId="all-columns" direction="horizontal" type="column">
                    {(provided) => (
                      <div 
                        className="flex gap-6 h-full items-start"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                      >
                        {activeColumns.map((column, index) => {
                          const columnOpps = opportunities.filter(o => o.columnId === column.id);
                          const isEditing = editingColumnId === column.id;
                          
                          return (
                            <Draggable key={column.id} draggableId={column.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="w-80 shrink-0 flex flex-col bg-muted/30 rounded-xl border border-muted-foreground/30 h-full max-h-[800px]"
                                >
                                  <div 
                                    className="p-3 flex flex-col gap-2 border-b border-muted-foreground/30 bg-background/50 rounded-t-xl"
                                    {...provided.dragHandleProps}
                                  >
                                    <div className="flex items-center justify-between">
                                      {isEditing ? (
                                        <div className="flex items-center gap-1 w-full">
                                          <Input 
                                            value={editingColumnName} 
                                            onChange={(e) => setEditingColumnName(e.target.value)}
                                            className="h-7 text-sm px-2"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateColumnName(column.id)}
                                          />
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleUpdateColumnName(column.id)}>
                                            <Check className="h-4 w-4" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setEditingColumnId(null)}>
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <div 
                                          className="font-semibold cursor-pointer hover:text-primary transition-colors flex-1"
                                          onClick={() => {
                                            setEditingColumnId(column.id);
                                            setEditingColumnName(column.name);
                                          }}
                                        >
                                          {column.name}
                                        </div>
                                      )}
                                      {!isEditing && (
                                        <div className="flex items-center gap-1">
                                          <span className="bg-muted text-muted-foreground text-xs px-2 py-1 rounded-full border border-muted-foreground/20">
                                            {columnOpps.length}
                                          </span>
                                          <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteColumn(column.id)}>
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                      <button onClick={() => handleSelectAll(column.id)} className="text-muted-foreground hover:text-foreground transition-colors">Selecionar Todos</button>
                                      <span className="text-muted-foreground/30">|</span>
                                      <button onClick={() => handleDeselectAll(column.id)} className="text-muted-foreground hover:text-foreground transition-colors">Desmarcar Todos</button>
                                    </div>
                                  </div>
                                  
                                  <ScrollArea className="flex-1">
                                    <Droppable droppableId={column.id} type="card">
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.droppableProps}
                                          className={`p-3 space-y-3 min-h-[600px] ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                                        >
                                          {columnOpps.map((opp, index) => {
                                            const photoTypeObj = PHOTO_TYPES.find(pt => pt.value === opp.tipoFoto);
                                            
                                            return (
                                              <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                                {(provided, snapshot) => (
                                                  <Card
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    onClick={() => handleCardClick(opp)}
                                                    className={`shadow-sm hover:shadow-md transition-shadow border-muted-foreground/30 cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/40' : ''}`}
                                                  >
                                                    <CardContent className="p-3">
                                                      <div className="flex items-start gap-2 mb-2">
                                                        <Checkbox
                                                          checked={selectedOpportunities.includes(opp.id)}
                                                          onCheckedChange={(c) => toggleSelection(opp.id, { stopPropagation: () => {} })}
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="border-muted-foreground/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-1"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                          <div className="flex items-center justify-between">
                                                            <p className="font-medium text-sm truncate">{opp.name}</p>
                                                            <div className="flex flex-col gap-0.5 ml-1">
                                                              <button onClick={(e) => moveCard(opp.id, column.id, 'up', e)} className="text-muted-foreground hover:text-foreground" disabled={index === 0}>
                                                                <ArrowUp className="w-3 h-3" />
                                                              </button>
                                                              <button onClick={(e) => moveCard(opp.id, column.id, 'down', e)} className="text-muted-foreground hover:text-foreground" disabled={index === columnOpps.length - 1}>
                                                                <ArrowDown className="w-3 h-3" />
                                                              </button>
                                                            </div>
                                                          </div>
                                                          {photoTypeObj && (
                                                            <span className="inline-block bg-muted text-xs px-1.5 py-0.5 rounded mt-1 mb-1">
                                                              {photoTypeObj.label}
                                                            </span>
                                                          )}
                                                          {opp.email && <p className="text-xs text-muted-foreground truncate">{opp.email}</p>}
                                                          {(opp.phone || opp.whatsapp) && <p className="text-xs text-muted-foreground truncate">{opp.phone || opp.whatsapp}</p>}
                                                        </div>
                                                      </div>
                                                      <div className="flex gap-2 mt-3">
                                                        <Button 
                                                          size="sm" 
                                                          variant={opp.isClient ? "default" : "outline"}
                                                          className={`flex-1 h-8 text-xs transition-colors ${opp.isClient ? 'bg-red-500 hover:bg-red-600 text-white border-red-500' : 'border-muted-foreground/30 hover:bg-muted'}`}
                                                          onClick={(e) => handleToggleClient(opp, e)}
                                                        >
                                                          {opp.isClient ? <UserMinus className="h-3 w-3 mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
                                                          {opp.isClient ? 'Cliente' : '+Cliente'}
                                                        </Button>
                                                        <Button 
                                                          size="sm" 
                                                          variant="outline" 
                                                          className="flex-1 h-8 text-xs border-muted-foreground/30 hover:bg-muted"
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedOppForCadencia(opp);
                                                            setCadenciaOpen(true);
                                                          }}
                                                        >
                                                          <MessageCircle className="h-3 w-3 mr-1 text-[#25D366]" />
                                                          Cadência
                                                        </Button>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                )}
                                              </Draggable>
                                            );
                                          })}
                                          {provided.placeholder}
                                        </div>
                                      )}
                                    </Droppable>
                                  </ScrollArea>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        
                        {/* Add Column Button */}
                        <div className="w-80 shrink-0 flex flex-col h-full">
                          <Dialog open={newColumnOpen} onOpenChange={setNewColumnOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full h-12 border-dashed border-2 bg-muted/10 hover:bg-muted/30">
                                <Plus className="w-4 h-4 mr-2" />
                                Adicionar Coluna
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Nova Coluna</DialogTitle>
                                <DialogDescription>Adicione uma nova etapa ao seu pipeline.</DialogDescription>
                              </DialogHeader>
                              <div className="py-4">
                                <Label htmlFor="columnName">Nome da Coluna</Label>
                                <Input 
                                  id="columnName" 
                                  value={newColumnName} 
                                  onChange={(e) => setNewColumnName(e.target.value)} 
                                  placeholder="Ex: Em Negociação"
                                  className="mt-2"
                                  onKeyDown={(e) => e.key === 'Enter' && handleCreateColumn()}
                                />
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setNewColumnOpen(false)}>Cancelar</Button>
                                <Button onClick={handleCreateColumn} className="bg-primary hover:bg-primary/90 text-primary-foreground">Adicionar</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>

            {/* Link Forms Section */}
            <div className="p-6 pt-4 border-t border-muted-foreground/20 bg-background shrink-0">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                Formulários de Captação (Link Forms)
              </h3>
              {linkForms.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {linkForms.map(form => {
                    const formUrl = `${window.location.origin}/link-form/${form.id}`;
                    const photoTypeObj = PHOTO_TYPES.find(pt => pt.value === form.tipoFoto);
                    
                    return (
                      <Card key={form.id} className="border-muted-foreground/30 shadow-sm">
                        <CardContent className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium truncate pr-2">{form.name}</p>
                              {photoTypeObj && (
                                <span className="inline-block bg-muted text-xs px-1.5 py-0.5 rounded mt-1">
                                  {photoTypeObj.label}
                                </span>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0" onClick={() => handleDeleteLinkForm(form.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input value={formUrl} readOnly className="h-8 text-xs bg-muted/50" />
                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copyToClipboard(formUrl)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => openInNewTab(formUrl)}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum formulário criado ainda. Use o botão "Nova Oportunidade" para criar um.</p>
              )}
            </div>
          </main>
        </div>
      </div>

      <Dialog open={cadenciaOpen} onOpenChange={setCadenciaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Cadência</DialogTitle>
            <DialogDescription>
              Selecione um fluxo de mensagens para enviar para {selectedOppForCadencia?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fluxo de Cadência</Label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger className="border-muted-foreground/30">
                  <SelectValue placeholder="Selecione um fluxo..." />
                </SelectTrigger>
                <SelectContent>
                  {flows.map(flow => (
                    <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCadenciaOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendCadencia} disabled={!selectedFlowId} className="bg-[#25D366] hover:bg-[#25D366]/90 text-white">
              <MessageCircle className="h-4 w-4 mr-2" />
              Iniciar e Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <OpportunityDetailModal 
        open={showDetailModal} 
        onOpenChange={setShowDetailModal} 
        opportunity={selectedOpportunity} 
        onDelete={handleOppDelete}
        onToggleClient={handleToggleClient}
      />

      <LeadImportModal 
        open={importModalOpen} 
        onOpenChange={setImportModalOpen} 
        pipelines={pipelines} 
        columns={columns} 
        currentUser={currentUser} 
      />
    </>
  );
};

export default OportunidadesPage;
