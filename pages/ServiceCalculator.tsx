
import React, { useState, useMemo, useEffect } from 'react';
import { User, Part, ServiceRecord, AppSettings, CategoryGroup } from '../types';
import { analyzeServiceScreenshot } from '../geminiService';

interface CalculatorProps {
  user: User;
  parts: Part[];
  settings: AppSettings;
  onSave: (record: ServiceRecord) => void;
}

const ServiceCalculator: React.FC<CalculatorProps> = ({ user, parts, settings, onSave }) => {
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [inGameCost, setInGameCost] = useState<number>(0);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [aiNote, setAiNote] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Add paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (e) => {
              setScreenshot(e.target?.result as string);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const freelanceFee = useMemo(() => {
    return inGameCost * settings.freelanceMultiplier;
  }, [inGameCost, settings.freelanceMultiplier]);

  const subtotalParts = useMemo(() => {
    return selectedPartIds.reduce((sum, partId) => {
      const part = parts.find(p => p.id === partId);
      return sum + (part ? part.price : 0);
    }, 0);
  }, [selectedPartIds, parts]);

  const totalAmount = subtotalParts + freelanceFee;
  const tax = totalAmount * settings.taxRate;
  const finalTotal = totalAmount + tax;

  const togglePart = (partId: string) => {
    setSelectedPartIds(prev => {
      if (prev.includes(partId)) {
        return prev.filter(id => id !== partId);
      }
      return [...prev, partId];
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshot(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const sendDiscordWebhook = async (record: ServiceRecord) => {
    const groupsUsed = new Set<CategoryGroup>();
    if (record.freelanceFee > 0) {
      groupsUsed.add('Estetica');
    }

    record.parts.forEach(p => {
      const originalPart = parts.find(part => part.id === p.partId);
      const group = settings.categoryGroups[originalPart?.category || ''] || 'Estetica';
      groupsUsed.add(group);
    });

    for (const group of Array.from(groupsUsed)) {
      const webhookUrl = group === 'Performance' ? settings.performanceWebhook : settings.esteticaWebhook;
      if (!webhookUrl) continue;

      const groupParts = record.parts.filter(p => {
        const originalPart = parts.find(part => part.id === p.partId);
        const g = settings.categoryGroups[originalPart?.category || ''] || 'Estetica';
        return g === group;
      });

      const partsDescription = groupParts.map(p => `• ${p.name}`).join('\n');
      const itemsList = group === 'Estetica' && record.freelanceFee > 0 
        ? (partsDescription ? `• Mão de Obra Freelance\n${partsDescription}` : `• Mão de Obra Freelance`)
        : partsDescription;

      const embed = {
        title: `🛠️ REGISTRO: ${group.toUpperCase()} - ${settings.workshopName}`,
        description: `Serviço de **${group === 'Performance' ? 'Performance' : 'Estetica'}** finalizado.`,
        color: group === 'Performance' ? 0x3b82f6 : 0xec4899,
        fields: [
          { name: "👤 Cliente", value: `${record.customerName} (ID: ${record.customerId})`, inline: true },
          { name: "👨‍🔧 Mecânico", value: record.mechanicName, inline: true },
          { name: "💰 Valor Total", value: `${settings.currencySymbol} ${record.finalPrice.toLocaleString()}`, inline: true },
          { name: "📦 Itens deste Grupo", value: itemsList || "Somente mão de obra básica." },
          { name: "📝 Notas", value: record.notes || "Sem observações." }
        ],
        footer: { text: `LSC Pro • ${new Date().toLocaleString()}` },
        timestamp: new Date().toISOString()
      };

      try {
        const payload: any = { embeds: [embed] };
        const formData = new FormData();
        formData.append('payload_json', JSON.stringify(payload));
        
        if (record.screenshot) {
          const res = await fetch(record.screenshot);
          const blob = await res.blob();
          formData.append('file', blob, 'service.png');
        }

        await fetch(webhookUrl, {
          method: 'POST',
          body: formData
        });
      } catch (err) {
        console.error(`Erro ao enviar webhook ${group}:`, err);
      }
    }
  };

  const runAiAnalysis = async () => {
    if (!screenshot) return;
    setIsAnalyzing(true);
    const result = await analyzeServiceScreenshot(screenshot, "Identifique o carro e modificações.");
    setAiNote(result || '');
    setIsAnalyzing(false);
  };

  const handleSave = async () => {
    const record: ServiceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      mechanicId: user.id,
      mechanicName: user.name,
      customerName,
      customerId,
      authorizedBy,
      parts: selectedPartIds.map(partId => {
        const fullPart = parts.find(part => part.id === partId)!;
        return { partId, name: fullPart.name, price: fullPart.price, quantity: 1 };
      }),
      inGameCost,
      freelanceFee,
      totalAmount,
      tax,
      finalPrice: finalTotal,
      screenshot: screenshot || undefined,
      timestamp: Date.now(),
      notes: aiNote
    };

    onSave(record);
    sendDiscordWebhook(record);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCustomerName('');
      setCustomerId('');
      setAuthorizedBy('');
      setInGameCost(0);
      setSelectedPartIds([]);
      setScreenshot(null);
      setAiNote('');
    }, 3000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24">
      <h2 className="text-3xl font-black mb-8 flex items-center text-white uppercase tracking-tighter">
        <i className="fa-solid fa-calculator mr-4 text-primary"></i>
        Nova Ordem de Serviço
      </h2>

      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary text-slate-950 px-8 py-4 rounded-2xl shadow-2xl font-black flex items-center shadow-primary/30 uppercase tracking-widest text-sm">
            <i className="fa-solid fa-circle-check mr-2 text-xl"></i>
            Serviço Registrado!
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-sm">
            <h3 className="text-sm font-black mb-8 flex items-center text-slate-500 uppercase tracking-[0.2em]">
              <i className="fa-solid fa-user-tag mr-3 text-primary/30"></i>
              Identificação do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Nome Completo</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary transition-all font-bold" placeholder="Cidadão" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">ID (Passaporte)</label>
                <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary font-mono transition-all" placeholder="12345" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Autorizador</label>
                <input type="text" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary transition-all font-bold" placeholder="Cargo Superior" />
              </div>
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] flex items-center">
                <i className="fa-solid fa-coins mr-3 text-primary/30"></i>
                Custo de Mão de Obra
              </h3>
              <div className="bg-primary/5 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-primary/20">
                MULTIPLICADOR: x{settings.freelanceMultiplier}
              </div>
            </div>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-2xl group-focus-within:text-primary transition-colors">{settings.currencySymbol}</span>
              <input type="number" value={inGameCost || ''} onChange={e => setInGameCost(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-[1.5rem] p-6 pl-16 text-4xl font-mono text-white focus:outline-none focus:ring-2 ring-primary/20 transition-all placeholder:text-slate-800" placeholder="0" />
            </div>
          </section>

          <div className="space-y-10">
            <h3 className="text-xl font-black text-white flex items-center px-4 uppercase tracking-tighter">
              <i className="fa-solid fa-layer-group mr-4 text-primary"></i>
              Catálogo Técnico
            </h3>
            
            {settings.categories.map(cat => {
              const catParts = parts.filter(p => p.category === cat);
              if (catParts.length === 0) return null;

              return (
                <div key={cat} className="space-y-5">
                  <div className="flex items-center space-x-4 px-4">
                    <div className="flex flex-col">
                        <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none">{cat}</h4>
                        <span className="text-[8px] font-bold text-slate-600 uppercase mt-1 tracking-tighter">GRUPO: {settings.categoryGroups[cat] || 'Estetica'}</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
                    {catParts.map(part => {
                      const isSelected = selectedPartIds.includes(part.id);
                      return (
                        <div 
                          key={part.id}
                          onClick={() => togglePart(part.id)}
                          className={`p-6 border-2 rounded-[1.5rem] cursor-pointer transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                            isSelected ? 'bg-primary border-primary shadow-xl shadow-primary/20 scale-[1.02]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {isSelected && <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8"></div>}
                          <div className="flex-1 relative z-10">
                            <p className={`font-black text-lg leading-tight uppercase tracking-tight ${isSelected ? 'text-slate-950' : 'text-slate-200'}`}>{part.name}</p>
                            <p className={`text-xs font-bold mt-1 ${isSelected ? 'text-slate-950/60' : 'text-slate-500'}`}>{settings.currencySymbol} {part.price.toLocaleString()}</p>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isSelected ? 'bg-slate-950 text-primary' : 'bg-slate-800 text-slate-600 group-hover:bg-slate-700'}`}>
                            <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-xs`}></i>
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

        <div className="space-y-6">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] sticky top-8 shadow-2xl overflow-hidden backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-[60px] -mr-20 -mt-20"></div>
            
            <h3 className="text-2xl font-black mb-8 tracking-tighter text-white border-b border-slate-800 pb-6 flex items-center uppercase">
              <i className="fa-solid fa-receipt mr-4 text-primary"></i>
              Fatura Final
            </h3>
            
            <div className="space-y-4 mb-8 min-h-[100px]">
              <div className="flex justify-between items-center text-xs p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Mão de Obra</span>
                <span className="font-mono text-primary font-black">{settings.currencySymbol} {freelanceFee.toLocaleString()}</span>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedPartIds.map(partId => {
                  const part = parts.find(p => p.id === partId)!;
                  const isPerf = settings.categoryGroups[part.category] === 'Performance';
                  return (
                    <div key={partId} className="flex justify-between items-center text-xs p-3 hover:bg-slate-800/30 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${isPerf ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]'}`}></span>
                        <span className="text-slate-300 font-bold uppercase tracking-tight">{part.name}</span>
                      </div>
                      <span className="font-mono text-slate-400">{settings.currencySymbol} {part.price.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800 pt-8 space-y-3">
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">
                <span>Subtotal</span>
                <span className="font-mono">{settings.currencySymbol} {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px] font-black uppercase tracking-widest px-1">
                <span>Imposto ({settings.taxRate * 100}%)</span>
                <span className="font-mono">{settings.currencySymbol} {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-4xl font-black text-primary border-t border-slate-800 pt-6 mt-4">
                <span className="tracking-tighter">TOTAL</span>
                <span className="font-mono tracking-tighter">{settings.currencySymbol}{Math.round(finalTotal).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-10 space-y-6">
              <div className="bg-slate-800/20 p-6 rounded-[1.5rem] border border-slate-800">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 text-center">Registro de Imagem</p>
                {!screenshot ? (
                   <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/50 hover:border-primary/20 transition-all group">
                    <i className="fa-solid fa-camera-retro text-4xl text-slate-700 mb-4 group-hover:scale-110 group-hover:text-primary/50 transition-all"></i>
                    <div className="text-center">
                      <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest block">Enviar Evidência</span>
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter block mt-1">(Ou pressione Ctrl+V)</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
                    <img src={screenshot} className="w-full h-48 object-cover" alt="service-evidence" />
                    <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                      <button onClick={() => setScreenshot(null)} className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all"><i className="fa-solid fa-trash-can"></i></button>
                      <button onClick={runAiAnalysis} disabled={isAnalyzing} className="w-12 h-12 bg-primary text-slate-950 rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all disabled:opacity-50">
                        {isAnalyzing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-brain"></i>}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSave}
                disabled={(!inGameCost && selectedPartIds.length === 0) || !customerName || !customerId}
                className="w-full bg-primary hover:opacity-90 text-slate-950 font-black py-6 rounded-[1.5rem] transition-all shadow-2xl shadow-primary/30 disabled:opacity-30 disabled:grayscale disabled:shadow-none uppercase tracking-widest text-sm"
              >
                FINALIZAR ATENDIMENTO
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ServiceCalculator;
