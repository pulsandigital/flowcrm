import { useState } from 'react';
import {
  CheckSquare, Plus, Clock, Search, X, Loader2, AlertCircle,
  Edit2, Trash2, CheckCircle2, Circle,
} from 'lucide-react';
import { useTasks, useInsertTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';

const PRIORITY_CFG: Record<string, { label: string; cls: string; dot: string }> = {
  urgente:{ label:'Urgente', cls:'badge bg-red-50 text-red-600',     dot:'bg-red-500' },
  alta:   { label:'Alta',    cls:'badge bg-orange-50 text-orange-600',dot:'bg-orange-500' },
  media:  { label:'Média',   cls:'badge bg-amber-50 text-amber-600',  dot:'bg-amber-400' },
  baixa:  { label:'Baixa',   cls:'badge-gray',                        dot:'bg-slate-300' },
};
const STATUS_CFG: Record<string, string> = {
  pendente:'badge-gold', em_progresso:'badge-blue', concluida:'badge-green', cancelada:'badge-gray',
};

const BLANK = { title:'', description:'', status:'pendente', priority:'media', dueDate:'', assignee:'' };

function TaskForm({ initial, onSave, onClose, loading, error, isEdit }: any) {
  const [f, setF] = useState(initial);
  const s = (k: string, v: any) => setF((p: any)=>({...p,[k]:v}));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{isEdit?'Editar Tarefa':'Nova Tarefa'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18}/></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error&&<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={14}/>{error}</div>}
          <div><label className="label">Título *</label><input className="input" value={f.title} onChange={e=>s('title',e.target.value)} placeholder="Ex: Follow-up com Mariana Costa"/></div>
          <div><label className="label">Descrição</label><textarea className="input resize-none" rows={2} value={f.description} onChange={e=>s('description',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prioridade</label>
              <select className="input" value={f.priority} onChange={e=>s('priority',e.target.value)}>
                {['urgente','alta','media','baixa'].map(p=><option key={p} value={p}>{PRIORITY_CFG[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={f.status} onChange={e=>s('status',e.target.value)}>
                {['pendente','em_progresso','concluida','cancelada'].map(st=><option key={st} value={st}>{st.replace('_',' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Prazo</label><input type="date" className="input" value={f.dueDate} onChange={e=>s('dueDate',e.target.value)}/></div>
            <div><label className="label">Responsável</label><input className="input" value={f.assignee} onChange={e=>s('assignee',e.target.value)} placeholder="Ex: Ana M."/></div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>onSave(f)} disabled={loading||!f.title.trim()} className="btn-primary min-w-[120px] justify-center">
            {loading?<><Loader2 size={15} className="animate-spin"/>Salvando...</>:isEdit?'Salvar':'Criar tarefa'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { data: tasks=[], isLoading, isError } = useTasks();
  const insertMut = useInsertTask();
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todos');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [formError, setFormError] = useState('');

  const filtered = tasks.filter((t: any) =>
    t.title.toLowerCase().includes(search.toLowerCase()) &&
    (priorityFilter==='todos'||t.priority===priorityFilter)
  );

  const pending   = tasks.filter((t: any)=>t.status==='pendente').length;
  const inProgress= tasks.filter((t: any)=>t.status==='em_progresso').length;
  const done      = tasks.filter((t: any)=>t.status==='concluida').length;

  const handleInsert = async (form: any) => {
    setFormError(''); try { await insertMut.mutateAsync(form); setShowForm(false); }
    catch(e:any){setFormError(e.message??'Erro.');}
  };
  const handleUpdate = async (form: any) => {
    if(!editing)return; setFormError('');
    try { await updateMut.mutateAsync({id:editing.id,data:form}); setEditing(null); }
    catch(e:any){setFormError(e.message??'Erro.');}
  };
  const handleDelete = async () => {
    if(!deleting)return;
    try { await deleteMut.mutateAsync(deleting.id); setDeleting(null); } catch{}
  };
  const toggleDone = async (t: any) => {
    const newStatus = t.status==='concluida'?'pendente':'concluida';
    await updateMut.mutateAsync({id:t.id,data:{...t,status:newStatus}});
  };

  return (
    <div className="p-6 space-y-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tarefas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isLoading?'Carregando...':`${pending} pendentes · ${inProgress} em progresso · ${done} concluídas`}
          </p>
        </div>
        <button className="btn-primary btn-sm" onClick={()=>{setShowForm(true);setFormError('');}}>
          <Plus size={14}/> Nova Tarefa
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {label:'Pendentes',   value:pending,   color:'text-gold-600 bg-gold-50'},
          {label:'Em progresso',value:inProgress,color:'text-blue-600 bg-blue-50'},
          {label:'Concluídas',  value:done,      color:'text-teal-600 bg-teal-50'},
        ].map(({label,value,color})=>(
          <div key={label} className="card px-4 py-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}><CheckSquare size={15}/></div>
            <div><div className="text-lg font-bold text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-9" placeholder="Buscar tarefas..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1">
          {['todos','urgente','alta','media','baixa'].map(p=>(
            <button key={p} onClick={()=>setPriorityFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                ${priorityFilter===p?'bg-primary-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {p==='todos'?'Todos':PRIORITY_CFG[p]?.label??p}
            </button>
          ))}
        </div>
      </div>

      {isError&&<div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"><AlertCircle size={16}/>Erro ao carregar tarefas.</div>}

      <div className="card overflow-hidden">
        {isLoading?(
          <div className="py-16 flex flex-col items-center gap-3 text-slate-400"><Loader2 size={28} className="animate-spin"/><span className="text-sm">Carregando tarefas...</span></div>
        ):filtered.length===0?(
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><CheckSquare size={24} className="text-slate-400"/></div>
            <p className="font-medium text-slate-700 mb-1">{search?'Nenhuma tarefa encontrada':'Nenhuma tarefa cadastrada'}</p>
            {!search&&<button className="btn-primary btn-sm mt-3" onClick={()=>setShowForm(true)}><Plus size={14}/> Nova Tarefa</button>}
          </div>
        ):(
          <div className="divide-y divide-slate-50">
            {filtered.map((task: any)=>(
              <div key={task.id} className={`flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors ${task.status==='concluida'?'opacity-60':''}`}>
                {/* Checkbox */}
                <button onClick={()=>toggleDone(task)} className="flex-shrink-0">
                  {task.status==='concluida'
                    ? <CheckCircle2 size={20} className="text-teal-500"/>
                    : <Circle size={20} className={task.priority==='urgente'||task.priority==='alta'?'text-red-400':'text-slate-300'}/>
                  }
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${task.status==='concluida'?'line-through text-slate-400':'text-slate-800'}`}>
                    {task.title}
                  </div>
                  {task.description&&<div className="text-xs text-slate-400 mt-0.5 truncate">{task.description}</div>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`badge ${STATUS_CFG[task.status]??'badge-gray'}`}>{task.status.replace('_',' ')}</span>
                    {task.dueDate&&(
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock size={11}/>{new Date(task.dueDate).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {task.assignee&&<span className="text-xs text-slate-400">{task.assignee}</span>}
                  </div>
                </div>

                {/* Priority + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${PRIORITY_CFG[task.priority]?.dot??'bg-slate-300'}`}/>
                    <span className="text-xs text-slate-500">{PRIORITY_CFG[task.priority]?.label}</span>
                  </div>
                  <button onClick={()=>{setEditing(task);setFormError('');}}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 size={13}/></button>
                  <button onClick={()=>setDeleting(task)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm&&<TaskForm initial={BLANK} onSave={handleInsert} onClose={()=>setShowForm(false)} loading={insertMut.isPending} error={formError}/>}
      {editing&&<TaskForm isEdit
        initial={{title:editing.title,description:editing.description,status:editing.status,priority:editing.priority,dueDate:editing.dueDate,assignee:editing.assignee}}
        onSave={handleUpdate} onClose={()=>setEditing(null)} loading={updateMut.isPending} error={formError}/>}
      {deleting&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-red-600"/></div>
            <h3 className="text-base font-semibold text-slate-900 text-center mb-1">Excluir tarefa</h3>
            <p className="text-sm text-slate-500 text-center mb-5">Excluir <strong>"{deleting.title}"</strong>?</p>
            <div className="flex gap-2">
              <button onClick={()=>setDeleting(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={handleDelete} disabled={deleteMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-all disabled:opacity-60">
                {deleteMut.isPending?<Loader2 size={15} className="animate-spin"/>:<Trash2 size={15}/>}Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
