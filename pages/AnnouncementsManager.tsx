
import React, { useState } from 'react';
import { User, Announcement } from '../types';

interface AnnouncementsManagerProps {
  user: User;
  announcements: Announcement[];
  setAnnouncements: (a: Announcement[]) => void;
  users: User[];
}

const AnnouncementsManager: React.FC<AnnouncementsManagerProps> = ({ user, announcements, setAnnouncements, users }) => {
  const [annForm, setAnnForm] = useState<Partial<Announcement>>({ title: '', content: '', targetUserId: 'all', type: 'info' });

  const handleAnnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title || !annForm.content) return;
    const newAnn: Announcement = {
      id: Math.random().toString(36).substr(2, 9),
      title: annForm.title!,
      content: annForm.content!,
      authorId: user.id,
      authorName: user.name,
      targetUserId: annForm.targetUserId || 'all',
      timestamp: Date.now(),
      type: annForm.type as any || 'info'
    };
    setAnnouncements([newAnn, ...announcements]);
    setAnnForm({ title: '', content: '', targetUserId: 'all', type: 'info' });
    alert('Comunicado publicado com sucesso!');
  };

  const removeAnn = (id: string) => {
    if (window.confirm("Deseja realmente remover este comunicado?")) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-10">
      <header>
        <h2 className="text-3xl font-black text-white flex items-center">
          <i className="fa-solid fa-bullhorn mr-4 text-primary"></i>
          Sistema de Comunicados
        </h2>
        <p className="text-slate-400">Publique avisos e anúncios para toda a equipe ou membros específicos.</p>
      </header>

      <form onSubmit={handleAnnSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl space-y-6">
        <h3 className="text-xl font-bold text-slate-200">Novo Comunicado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título do Anúncio</label>
             <input 
              type="text" 
              value={annForm.title} 
              onChange={e => setAnnForm({...annForm, title: e.target.value})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary" 
              placeholder="Ex: Reunião de Equipe" 
              required 
             />
           </div>
           <div className="space-y-2">
             <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gravidade / Tipo</label>
             <select 
              value={annForm.type} 
              onChange={e => setAnnForm({...annForm, type: e.target.value as any})} 
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary"
             >
               <option value="info">Informação (Azul)</option>
               <option value="warning">Alerta (Amarelo)</option>
               <option value="urgent">Urgente (Vermelho)</option>
             </select>
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destinatário</label>
           <select 
            value={annForm.targetUserId} 
            onChange={e => setAnnForm({...annForm, targetUserId: e.target.value})} 
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary"
           >
             <option value="all">Todos os Funcionários</option>
             {users.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
           </select>
        </div>

        <div className="space-y-2">
           <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mensagem</label>
           <textarea 
            value={annForm.content} 
            onChange={e => setAnnForm({...annForm, content: e.target.value})} 
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white outline-none focus:ring-1 ring-primary min-h-[150px]" 
            placeholder="Descreva o comunicado em detalhes..." 
            required 
           />
        </div>

        <button type="submit" className="bg-primary text-slate-950 font-black px-12 py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
          PUBLICAR AGORA
        </button>
      </form>

      <div className="space-y-6">
        <h3 className="text-xl font-bold text-white">Anúncios Ativos</h3>
        <div className="grid grid-cols-1 gap-4">
          {announcements.map(ann => (
            <div key={ann.id} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex justify-between items-start group">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${ann.type === 'urgent' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ann.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}></span>
                  <h4 className="font-bold text-slate-100">{ann.title}</h4>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-widest">
                    PARA: {ann.targetUserId === 'all' ? 'TODOS' : users.find(u => u.id === ann.targetUserId)?.name || 'Usuário'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{ann.content}</p>
                <p className="text-[10px] text-slate-600 font-medium">Postado por {ann.authorName} em {new Date(ann.timestamp).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => removeAnn(ann.id)} 
                className="text-slate-700 hover:text-red-500 p-3 opacity-0 group-hover:opacity-100 transition-all"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          ))}
          {announcements.length === 0 && (
            <div className="text-center py-20 bg-slate-900/50 border border-dashed border-slate-800 rounded-3xl text-slate-600">
               <i className="fa-solid fa-message-slash text-4xl mb-4 opacity-20"></i>
               <p>Nenhum comunicado ativo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementsManager;
