
import React, { useState, useMemo } from 'react';
import { ServiceRecord, AppSettings, User } from '../types';

interface HistoryProps {
  user: User; // Added user prop to check permissions
  history: ServiceRecord[];
  settings: AppSettings;
}

const History: React.FC<HistoryProps> = ({ user, history, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);

  // Determine if the user should see all records or just their own
  const filteredByPermission = useMemo(() => {
    if (user.roleId === 'r_admin' || user.id === 'u1') return history;
    return history.filter(r => r.mechanicId === user.id);
  }, [history, user]);

  const filteredHistory = useMemo(() => {
    return filteredByPermission.filter(r => 
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.mechanicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.authorizedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [filteredByPermission, searchTerm]);

  const isManager = user.roleId === 'r_admin' || user.id === 'u1';

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold flex items-center text-white">
            <i className="fa-solid fa-clock-rotate-left mr-4 text-primary"></i>
            {isManager ? "Logs Globais de Serviço" : "Meus Registros de Serviço"}
          </h2>
          <p className="text-slate-400">
            {isManager 
              ? "Acompanhamento de todos os atendimentos realizados na oficina." 
              : "Acompanhamento dos seus atendimentos realizados."}
          </p>
        </div>
        <div className="relative max-w-sm w-full">
          <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"></i>
          <input 
            type="text" 
            placeholder="Pesquisar por cliente, ID ou mecânico..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 border-b border-slate-800 text-slate-400 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">ID Cliente</th>
                <th className="px-6 py-4">Mecânico</th>
                <th className="px-6 py-4">Autorizador</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">
                      {new Date(record.timestamp).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">{record.customerName}</td>
                    <td className="px-6 py-4"><span className="bg-slate-800 text-slate-300 font-mono text-xs px-2 py-1 rounded border border-slate-700">{record.customerId}</span></td>
                    <td className="px-6 py-4 text-slate-300">{record.mechanicName}</td>
                    <td className="px-6 py-4 text-slate-300 text-xs italic">{record.authorizedBy}</td>
                    <td className="px-6 py-4 text-primary font-bold">{settings.currencySymbol} {record.finalPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedRecord(record)}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-slate-500">
                    <i className="fa-solid fa-folder-open text-4xl mb-4 block"></i>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-height-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-xl font-bold text-white">Log de Atendimento #{selectedRecord.id}</h3>
              <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
                <i className="fa-solid fa-xmark text-xl text-white"></i>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-white">Dados do Atendimento</h4>
                  <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Data e Hora</span>
                      <span className="text-white">{new Date(selectedRecord.timestamp).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mecânico Atendente</span>
                      <span className="font-bold text-primary">{selectedRecord.mechanicName}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-3">
                      <span className="text-slate-400">Cliente</span>
                      <span className="text-white font-bold">{selectedRecord.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID do Cliente</span>
                      <span className="text-white font-mono">{selectedRecord.customerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Autorizado por</span>
                      <span className="text-white italic">{selectedRecord.authorizedBy}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-white">Custos do Serviço</h4>
                  <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700 space-y-3">
                    <div className="flex justify-between text-sm text-slate-300">
                       <span>Taxa de Mão de Obra (Freelance)</span>
                       <span>{settings.currencySymbol} {selectedRecord.freelanceFee.toLocaleString()}</span>
                    </div>
                    {selectedRecord.parts.map((p, idx) => (
                      <div key={idx} className="flex justify-between text-sm text-white">
                        <span><i className="fa-solid fa-plus text-primary mr-2 text-[10px]"></i> {p.name}</span>
                        <span className="font-mono">{settings.currencySymbol} {p.price.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="border-t border-slate-700 pt-3 flex justify-between font-bold text-lg text-primary">
                      <span>Total Pago</span>
                      <span>{settings.currencySymbol} {selectedRecord.finalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 text-white">Evidência Fotográfica</h4>
                {selectedRecord.screenshot ? (
                  <div className="rounded-2xl overflow-hidden border border-slate-700 shadow-lg bg-black group relative">
                    <img src={selectedRecord.screenshot} className="w-full object-contain" alt="Evidência" />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                       <p className="text-[10px] text-white">ID da Transação: {selectedRecord.id}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/50 h-64 rounded-2xl flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-700">
                    <i className="fa-solid fa-image-slash text-5xl mb-4"></i>
                    <p>Nenhuma foto anexada.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-800/50 border-t border-slate-800 text-right">
              <button 
                onClick={() => setSelectedRecord(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-2 rounded-xl transition-all"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;
