
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

  const freelanceFee = useMemo(() => inGameCost * settings.freelanceMultiplier, [inGameCost, settings.freelanceMultiplier]);
  const subtotalParts = useMemo(() => selectedPartIds.reduce((sum, partId) => sum + (parts.find(p => p.id === partId)?.price || 0), 0), [selectedPartIds, parts]);
  const totalAmount = subtotalParts + freelanceFee;
  const tax = totalAmount * settings.taxRate;
  const finalTotal = totalAmount + tax;

  const togglePart = (partId: string) => {
    setSelectedPartIds(prev => prev.includes(partId) ? prev.filter(id => id !== partId) : [...prev, partId]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
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
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCustomerName(''); setCustomerId(''); setAuthorizedBy('');
      setInGameCost(0); setSelectedPartIds([]); setScreenshot(null); setAiNote('');
    }, 3000);
  };

  return (
    <div className="p-12 max-w-7xl mx-auto pb-32 animate-in fade-in duration-500">
      <h2 className="text-4xl font-black mb-12 flex items-center text-white uppercase tracking-tighter italic">
        <i className="fa-solid fa-calculator mr-5 text-emerald-500"></i>
        Nova Ordem de Serviço
      </h2>

      {showSuccess && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-emerald-500 text-slate-950 px-12 py-5 rounded-[2rem] shadow-[0_0_40px_rgba(16,185,129,0.4)] font-black flex items-center uppercase tracking-widest text-sm italic">
            <i className="fa-solid fa-circle-check mr-3 text-2xl"></i>
            Registro Efetuado com Sucesso!
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Cliente */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-10 rounded-[3rem] shadow-2xl backdrop-blur-md">
            <h3 className="text-[11px] font-black mb-10 flex items-center text-slate-500 uppercase tracking-[0.4em]">
              <i className="fa-solid fa-user-tag mr-4 text-emerald-500 opacity-40"></i>
              Identificação do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-2">Nome Completo</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white focus:outline-none focus:ring-4 ring-emerald-500/10 transition-all font-bold uppercase italic tracking-tight" placeholder="Cidadão" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-2">ID Passaporte</label>
                <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white focus:outline-none focus:ring-4 ring-emerald-500/10 font-mono transition-all" placeholder="00000" />
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-2">Autorizador</label>
                <input type="text" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-5 text-white focus:outline-none focus:ring-4 ring-emerald-500/10 transition-all font-bold uppercase" placeholder="Superior" />
              </div>
            </div>
          </section>

          {/* Mão de Obra */}
          <section className="bg-slate-900/60 border border-slate-800/80 p-10 rounded-[3rem] shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center">
                <i className="fa-solid fa-coins mr-4 text-emerald-500 opacity-40"></i>
                Custo Base Mechanic
              </h3>
              <div className="bg-emerald-500/10 text-emerald-500 px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-lg">
                MULTIPLICADOR: x{settings.freelanceMultiplier}
              </div>
            </div>
            <div className="relative group">
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-700 font-black text-4xl group-focus-within:text-emerald-500 transition-colors italic">{settings.currencySymbol}</span>
              <input type="number" value={inGameCost || ''} onChange={e => setInGameCost(Number(e.target.value))} className="w-full bg-slate-950 border border-slate-800 rounded-[2.5rem] p-10 pl-24 text-5xl font-mono text-white focus:outline-none focus:ring-4 ring-emerald-500/10 transition-all placeholder:text-slate-900 tracking-tighter" placeholder="0" />
            </div>
          </section>

          {/* Catálogo */}
          <div className="space-y-16">
            <h3 className="text-2xl font-black text-white flex items-center px-4 uppercase tracking-tighter italic">
              <i className="fa-solid fa-layer-group mr-5 text-emerald-500"></i>
              Catálogo de Componentes
            </h3>
            
            {settings.categories.map(cat => {
              const catParts = parts.filter(p => p.category === cat);
              if (catParts.length === 0) return null;
              return (
                <div key={cat} className="space-y-8">
                  <div className="flex items-center space-x-6 px-4">
                    <div className="flex flex-col">
                        <h4 className="text-[12px] font-black text-emerald-500 uppercase tracking-[0.4em] leading-none italic">{cat}</h4>
                        <span className="text-[9px] font-black text-slate-700 uppercase mt-2 tracking-widest">{settings.categoryGroups[cat] || 'Geral'}</span>
                    </div>
                    <div className="h-px bg-slate-800/60 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
                    {catParts.map(part => {
                      const isSelected = selectedPartIds.includes(part.id);
                      return (
                        <div 
                          key={part.id}
                          onClick={() => togglePart(part.id)}
                          className={`p-8 border-2 rounded-[2.5rem] cursor-pointer transition-all duration-300 flex items-center justify-between group relative overflow-hidden ${
                            isSelected ? 'bg-emerald-500 border-emerald-500 shadow-2xl shadow-emerald-500/20 scale-[1.03]' : 'bg-slate-900 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex-1 relative z-10">
                            <p className={`font-black text-xl leading-none uppercase tracking-tighter italic ${isSelected ? 'text-slate-950' : 'text-slate-100'}`}>{part.name}</p>
                            <p className={`text-xs font-black mt-2 tracking-widest ${isSelected ? 'text-slate-950/70' : 'text-slate-600'}`}>{settings.currencySymbol} {part.price.toLocaleString()}</p>
                          </div>
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelected ? 'bg-slate-950 text-emerald-500 shadow-lg' : 'bg-slate-800 text-slate-700 group-hover:bg-slate-700'}`}>
                            <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-sm`}></i>
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

        {/* Fatura */}
        <div className="space-y-8">
          <section className="bg-slate-900 border border-slate-800/80 p-10 rounded-[3.5rem] sticky top-12 shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] -mr-24 -mt-24 pointer-events-none"></div>
            
            <h3 className="text-3xl font-black mb-10 tracking-tighter text-white border-b border-slate-800/60 pb-8 flex items-center uppercase italic">
              <i className="fa-solid fa-receipt mr-5 text-emerald-500"></i>
              Resumo O.S.
            </h3>
            
            <div className="space-y-5 mb-10">
              <div className="flex justify-between items-center text-sm p-6 bg-slate-950 border border-slate-800/60 rounded-[1.8rem] shadow-inner">
                <span className="text-slate-500 font-black uppercase tracking-[0.2em]">Freelance Work</span>
                <span className="font-mono text-emerald-500 font-black text-lg">{settings.currencySymbol} {freelanceFee.toLocaleString()}</span>
              </div>
              
              <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {selectedPartIds.map(partId => {
                  const part = parts.find(p => p.id === partId)!;
                  const isPerf = settings.categoryGroups[part.category] === 'Performance';
                  return (
                    <div key={partId} className="flex justify-between items-center text-xs p-5 hover:bg-slate-800/40 rounded-[1.2rem] transition-all border border-transparent hover:border-slate-800/60 group">
                      <div className="flex items-center gap-4">
                        <span className={`w-3 h-3 rounded-full ${isPerf ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]' : 'bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.6)]'}`}></span>
                        <span className="text-slate-300 font-black uppercase tracking-tight italic group-hover:text-white transition-colors">{part.name}</span>
                      </div>
                      <span className="font-mono text-slate-500 font-bold">{settings.currencySymbol} {part.price.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-10 space-y-4">
              <div className="flex justify-between text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] px-2">
                <span>Subtotal Operacional</span>
                <span className="font-mono">{settings.currencySymbol} {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] font-black uppercase tracking-[0.3em] px-2">
                <span>Taxa Governamental ({settings.taxRate * 100}%)</span>
                <span className="font-mono">{settings.currencySymbol} {tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-5xl font-black text-emerald-500 border-t border-slate-800 pt-10 mt-6 shadow-text">
                <span className="tracking-tighter italic">TOTAL</span>
                <span className="font-mono tracking-tighter">{settings.currencySymbol}{Math.round(finalTotal).toLocaleString()}</span>
              </div>
            </div>

            <div className="mt-12 space-y-8">
              <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner">
                <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] mb-6 text-center">Registro de Evidência</p>
                {!screenshot ? (
                   <label className="flex flex-col items-center justify-center h-56 border-2 border-dashed border-slate-800 rounded-[2rem] cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all group">
                    <i className="fa-solid fa-camera-retro text-5xl text-slate-800 mb-5 group-hover:scale-110 group-hover:text-emerald-500/60 transition-all duration-500"></i>
                    <div className="text-center">
                      <span className="text-[11px] text-slate-600 font-black uppercase tracking-[0.3em] block">Anexar Print</span>
                      <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest block mt-2 opacity-60">(CTRL + V)</span>
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                ) : (
                  <div className="relative group rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl">
                    <img src={screenshot} className="w-full h-56 object-cover transition-all duration-700 group-hover:scale-110" alt="service-evidence" />
                    <div className="absolute inset-0 bg-slate-950/90 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6 backdrop-blur-sm">
                      <button onClick={() => setScreenshot(null)} className="w-16 h-16 bg-red-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all"><i className="fa-solid fa-trash-can text-xl"></i></button>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={handleSave}
                disabled={(!inGameCost && selectedPartIds.length === 0) || !customerName || !customerId}
                className="w-full bg-emerald-500 hover:scale-[1.02] active:scale-95 text-slate-950 font-black py-8 rounded-[2.5rem] transition-all shadow-[0_20px_40px_rgba(16,185,129,0.25)] disabled:opacity-20 disabled:grayscale disabled:shadow-none uppercase tracking-[0.25em] text-xs italic"
              >
                AUTORIZAR REGISTRO FINAL
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ServiceCalculator;
