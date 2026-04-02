import React, { useState } from 'react';
import { Sparkles, RefreshCw, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AIInsightProps {
  userId: string;
  initialData: any;
}

export const AIInsight = ({ userId, initialData }: AIInsightProps) => {
  const [data, setData] = useState(initialData || { title: "Voz da IA", content: "Clique para gerar sua análise do dia.", mood: "info" });
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/generate-ai-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      
      setData(result);
      toast.success("Análise atualizada!");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao gerar insight da IA. Verifique se o Admin configurou a OpenAI.");
    } finally {
      setLoading(false);
    }
  };

  const getMoodIcon = () => {
    switch (data.mood) {
      case 'enthusiastic': return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'strategic': return <Target className="w-5 h-5 text-blue-500" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default: return <Sparkles className="w-5 h-5 text-purple-500" />;
    }
  };

  const getMoodBg = () => {
    switch (data.mood) {
      case 'enthusiastic': return 'bg-green-50 border-green-100';
      case 'strategic': return 'bg-blue-50 border-blue-100';
      case 'alert': return 'bg-orange-50 border-orange-100';
      default: return 'bg-purple-50 border-purple-100';
    }
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-500 ${getMoodBg()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
            {getMoodIcon()}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm tracking-tight">{data.title}</h3>
            {data.updated_at && (
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                IA • {new Date(data.updated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <button 
          onClick={handleGenerate}
          disabled={loading}
          className="p-1.5 hover:bg-white/50 rounded-full transition-colors text-gray-400 hover:text-gray-900 disabled:opacity-50"
          title="Recarregar análise"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="text-xs text-gray-700 leading-relaxed font-medium">
        {data.content.split('\n').map((para: string, i: number) => (
          <p key={i} className="mb-1 last:mb-0">{para}</p>
        ))}
      </div>
    </div>
  );
};