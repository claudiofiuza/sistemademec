
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
            reader.onload = (e) => setScreenshot(e.target?.result as string);
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const freelanceFee = useMemo(() => inGameCost * settings.freelanceMultiplier, [inGameCost, settings.freelanceMultiplier]);
  const subtotalParts = useMemo(() => selectedPartIds.reduce((sum, partId) => {
    const part = parts.find(p => p.id === partId);
    return sum + (part ? part.price : 0);
  }, 0), [selectedPartIds, parts]);

  // Tax is deducted from mechanic labor, not added to customer price
  const tax = useMemo(() => freelanceFee * settings.taxRate, [freelanceFee, settings.taxRate]);
  const finalTotal = subtotalParts + freelanceFee; // Total customer pays

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
      totalAmount: finalTotal,
      tax: tax, // This will be added to pendingTax in HR
      finalPrice: finalTotal,
      screenshot: screenshot || undefined,
      timestamp: Date.now(),
      notes: aiNote
    };

    onSave(record);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setCustomerName(''); setCustomerId(''); setAuthorizedBy(''); setInGameCost(0); setSelectedPartIds([]); setScreenshot(null); setAiNote('');
    }, 3000);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto pb-24 animate-in fade-in">
      <h2 className="text-3xl font-black mb-8 flex items-center text-white uppercase tracking-tighter">
        <i className="fa-solid fa-calculator mr-4 text-primary"></i>
        Nova Ordem de Serviço
      </h2>

      {showSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary text-slate-950 px-8 py-4 rounded-2xl shadow-2xl font-black flex items-center uppercase tracking-widest text-sm">
            <i className="fa-solid fa-circle-check mr-2 text-xl"></i>
            Serviço Registrado!
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem]">
            <h3 className="text-sm font-black mb-8 flex items-center text-slate-500 uppercase tracking-widest">
              <i className="fa-solid fa-user-tag mr-3 text-primary/30"></i> Identificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary font-bold" placeholder="NOME CLIENTE" />
              <input type="text" value={customerId} onChange={e => setCustomerId(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary font-mono" placeholder="ID CLIENTE" />
              <input type="text" value={authorizedBy} onChange={e => setAuthorizedBy(e.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:ring-1 ring-primary font-bold" placeholder="AUTORIZADO POR" />
            </div>
          </section>

          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem]">
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center">
              <i className="fa-solid fa-coins mr-3 text-primary/30"></i> Valor Gasto (G)
            </h3>
            <div className="relative group">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 font-black text-2xl group-focus-within:text-primary transition-colors">{settings.currencySymbol}</span>
              <input type="number" value={inGameCost || ''} onChange={e => setInGameCost(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-[1.5rem] p-6 pl-16 text-4xl font-mono text-white focus:outline-none focus:ring-2 ring-primary/20 transition-all" placeholder="0" />
            </div>
          </section>

          <div className="space-y-10">
            {settings.categories.map(cat => {
              const catParts = parts.filter(p => p.category === cat);
              if (catParts.length === 0) return null;
              return (
                <div key={cat} className="space-y-4">
                  <div className="flex items-center gap-4 px-4">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{cat}</h4>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catParts.map(part => {
                      const isSelected = selectedPartIds.includes(part.id);
                      return (
                        <div key={part.id} onClick={() => togglePart(part.id)} className={`p-5 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'bg-primary border-primary shadow-xl shadow-primary/20' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                          <div>
                            <p className={`font-black uppercase text-sm ${isSelected ? 'text-slate-950' : 'text-slate-200'}`}>{part.name}</p>
                            <p className={`text-[10px] font-bold ${isSelected ? 'text-slate-950/60' : 'text-slate-500'}`}>{settings.currencySymbol} {part.price.toLocaleString()}</p>
                          </div>
                          <i className={`fa-solid ${isSelected ? 'fa-check' : 'fa-plus'} text-xs ${isSelected ? 'text-slate-950' : 'text-slate-600'}`}></i>
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
          <section className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] sticky top-8 shadow-2xl overflow-hidden">
            <h3 className="text-2xl font-black mb-8 tracking-tighter text-white border-b border-slate-800 pb-6 flex items-center uppercase italic">
              <i className="fa-solid fa-receipt mr-4 text-primary"></i> FATURA FINAL
            </h3>
            
            <div className="space-y-3 mb-8">
              <div className="flex justify-between items-center text-xs p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <span className="text-slate-400 font-bold uppercase tracking-widest">Mão de Obra</span>
                <span className="font-mono text-primary font-black">{settings.currencySymbol} {freelanceFee.toLocaleString()}</span>
              </div>
              {selectedPartIds.map(partId => {
                const part = parts.find(p => p.id === partId)!;
                return (
                  <div key={partId} className="flex justify-between items-center text-[11px] p-2 hover:bg-slate-800/20 rounded-lg transition-colors">
                    <span className="text-slate-300 font-bold uppercase tracking-tight">• {part.name}</span>
                    <span className="font-mono text-slate-500">{settings.currencySymbol} {part.price.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-800 pt-6">
              <div className="flex justify-between text-4xl font-black text-primary">
                <span className="tracking-tighter">TOTAL</span>
                <span className="font-mono tracking-tighter">{settings.currencySymbol}{finalTotal.toLocaleString()}</span>
              </div>
              <p className="text-[9px] text-slate-600 uppercase font-black text-center mt-6 italic tracking-widest">IMPOSTOS JÁ INCLUSOS NO SERVIÇO</p>
            </div>

            <div className="mt-10 space-y-4">
              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-800/30 transition-all overflow-hidden group">
                {screenshot ? (
                   <img src={screenshot} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <i className="fa-solid fa-camera text-2xl text-slate-700 mb-2 group-hover:text-primary transition-colors"></i>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">ANEXAR PRINT (CTRL+V)</span>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              <button 
                onClick={handleSave}
                disabled={!customerName || !customerId || (!freelanceFee && selectedPartIds.length === 0)}
                className="w-full bg-primary hover:opacity-90 text-slate-950 font-black py-5 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-30 disabled:grayscale transition-all uppercase tracking-widest text-xs"
              >
                REGISTRAR ATENDIMENTO
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ServiceCalculator;
