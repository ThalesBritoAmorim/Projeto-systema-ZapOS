import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  Filter, 
  MessageSquare, 
  User, 
  Users,
  Shield,
  Settings,
  LogOut, 
  Clock, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  History,
  Send,
  MoreVertical,
  ChevronRight,
  Paperclip,
  Phone,
  Image as ImageIcon,
  UserPlus,
  UserMinus,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// --- Types ---
interface OS {
  id_os: number;
  tipo_os: 'requisicao' | 'incidente';
  titulo: string;
  descricao: string;
  possui_anexo: boolean;
  nome_usuario: string;
  nivel_urgencia: 'baixa' | 'media' | 'alta';
  data_execucao: string;
  numero_whatsapp: string;
  status: 'em_atendimento' | 'pendente' | 'agendada' | 'encerrada';
  data_abertura: string;
  historico?: Historico[];
}

interface Historico {
  id_historico: number;
  descricao_atualizacao: string;
  data_hora_atualizacao: string;
  tipo_atualizacao: string;
}

// --- Components ---

const Login = ({ onLogin }: { onLogin: (data: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) onLogin(data);
      else setError(data.error);
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl shadow-zinc-200 border border-zinc-100 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-emerald-500 rounded-xl">
            <LayoutDashboard className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 leading-none">ZapOS</h1>
            <p className="text-zinc-500 text-sm mt-1">Gestão inteligente de serviços</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Usuário</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="Digite seu usuário" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              placeholder="••••••••" 
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button 
            type="submit" 
            className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-lg hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
          >
            Entrar no Sistema
          </button>
        </form>
        <p className="mt-6 text-center text-zinc-400 text-xs">
          Use admin / admin123 para testar
        </p>
      </div>
    </div>
  );
};

const WhatsAppSim = ({ onNewOS }: { onNewOS: () => void }) => {
    const [messages, setMessages] = useState<{from: string, text: string, type: 'bot' | 'user', hasAttachment?: boolean}[]>([]);
    const [input, setInput] = useState('');
    const [phone, setPhone] = useState('5511999999999');

    const sendMessage = async (textOverride?: string, isAttachment = false) => {
        const textToSend = textOverride || input;
        if (!textToSend && !isAttachment) return;

        const newMsg = { from: phone, text: isAttachment ? "📷 Foto/Anexo enviado" : textToSend, type: 'user' as const, hasAttachment: isAttachment };
        setMessages(prev => [...prev, newMsg]);
        if (!textOverride) setInput('');

        const res = await fetch('/api/whatsapp/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: phone, text: textToSend, attachment: isAttachment ? "mock-file-url.png" : null }),
        });
        const data = await res.json();
        setMessages(prev => [...prev, { from: 'ZapOS', text: data.message, type: 'bot' }]);
        
        if (data.message.includes('OS aberta com sucesso') || data.message.includes('OS agendada')) {
            onNewOS();
        }
    };

    return (
        <div className="bg-white border border-zinc-200 rounded-2xl flex flex-col h-[600px] overflow-hidden shadow-2xl">
            <div className="bg-emerald-600 p-4 flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                    <Phone size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Simulador de WhatsApp</h3>
                    <p className="text-emerald-100 text-[10px]">Mencione @bot para ser atendido</p>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5]">
                {messages.length === 0 && (
                    <div className="text-center text-zinc-500 text-xs mt-10 p-4 bg-white/80 rounded-lg mx-10 space-y-2">
                        <p>O robô agora atende em grupos!</p>
                        <p className="font-bold">Comandos:</p>
                        <p>• @bot abrir nova OS</p>
                        <p>• @bot atualizar status da OS [ID]</p>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm ${
                            m.type === 'user' ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                        }`}>
                            {m.hasAttachment && <div className="bg-zinc-200/50 rounded-lg p-2 mb-2 flex items-center justify-center border border-zinc-200"><ImageIcon size={40} className="text-zinc-400" /></div>}
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-zinc-50 border-t flex flex-col gap-2">
                <div className="flex gap-2">
                    <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && sendMessage()}
                        className="flex-1 px-4 py-2 rounded-full border border-zinc-200 text-sm focus:outline-none"
                        placeholder="Digite sua mensagem..."
                    />
                    <button 
                        onClick={() => sendMessage(undefined, false)}
                        className="p-2 bg-emerald-600 rounded-full text-white hover:bg-emerald-700 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
                <div className="flex justify-center">
                    <button 
                        onClick={() => sendMessage('sim', true)}
                        className="px-3 py-1 bg-white border border-zinc-200 rounded-full text-[10px] font-bold text-zinc-600 hover:bg-zinc-50 flex items-center gap-1"
                    >
                        <Paperclip size={12} /> Simular Envio de Anexo
                    </button>
                </div>
            </div>
            <div className="p-2 bg-zinc-100 text-[10px] text-center text-zinc-400">
                Simulando número: {phone}
            </div>
        </div>
    );
};

const UsersView = ({ currentUser, token }: { currentUser: any, token: string }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({ username: '', password: '', nome_completo: '', role: 'user' as any });
    const [msg, setMsg] = useState({ type: '', text: '' });

    const fetchUsers = async () => {
        const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setUsers(data);
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        const data = await res.json();
        if (res.ok) {
            setMsg({ type: 'success', text: 'Usuário criado com sucesso' });
            setNewUser({ username: '', password: '', nome_completo: '', role: 'user' });
            fetchUsers();
        } else {
            setMsg({ type: 'error', text: data.error });
        }
    };

    const toggleStatus = async (id: number, currentStatus: boolean, role: string) => {
        if (currentUser.role === 'admin' && role === 'superadmin') return;
        
        await fetch(`/api/users/${id}`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ativo: !currentStatus })
        });
        fetchUsers();
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <UserPlus className="text-emerald-500" /> Cadastrar Novo Usuário
                </h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Nome Completo</label>
                        <input required value={newUser.nome_completo} onChange={e => setNewUser({...newUser, nome_completo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Usuário (Login)</label>
                        <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Senha</label>
                        <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1 uppercase">Role / Perfil</label>
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                            <option value="user">Técnico (User)</option>
                            <option value="admin">Administrador</option>
                            {currentUser.role === 'superadmin' && <option value="superadmin">Super Admin</option>}
                        </select>
                    </div>
                    <div className="md:col-span-4">
                        <button type="submit" className="bg-zinc-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-zinc-800 transition-all">Criar Usuário</button>
                    </div>
                </form>
                {msg.text && <p className={`mt-4 text-sm font-bold ${msg.type === 'error' ? 'text-red-500' : 'text-emerald-500'}`}>{msg.text}</p>}
            </div>

            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-zinc-50 border-b border-zinc-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Nome</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Usuário</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Perfil</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {users.map((u: any) => (
                            <tr key={u.id_admin} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold">{u.nome_completo}</td>
                                <td className="px-6 py-4 text-sm text-zinc-500">@{u.username}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        u.role === 'superadmin' ? 'bg-purple-50 border-purple-100 text-purple-600' :
                                        u.role === 'admin' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                        'bg-zinc-50 border-zinc-100 text-zinc-400'
                                    }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${u.ativo ? 'text-emerald-500' : 'text-red-500'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                        {u.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {u.role !== 'superadmin' || currentUser.role === 'superadmin' ? (
                                        <button 
                                            onClick={() => toggleStatus(u.id_admin, u.ativo, u.role)}
                                            className={`p-2 rounded-lg transition-all ${u.ativo ? 'text-red-400 hover:bg-red-50' : 'text-emerald-400 hover:bg-emerald-50'}`}
                                            title={u.ativo ? 'Desativar' : 'Ativar'}
                                        >
                                            {u.ativo ? <UserMinus size={18} /> : <CheckCircle2 size={18} />}
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [osList, setOsList] = useState<OS[]>([]);
  const [selectedOS, setSelectedOS] = useState<OS | null>(null);
  const [filters, setFilters] = useState({ status: 'todas', tipo: 'todas', urgencia: 'todas' });
  const [showSim, setShowSim] = useState(false);
  const [view, setView] = useState<'dashboard' | 'users'>('dashboard');

  useEffect(() => {
    const savedToken = localStorage.getItem('zap_os_token');
    const savedUser = localStorage.getItem('zap_os_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (token) fetchOS();
  }, [token]);

  const fetchOS = async () => {
    const res = await fetch('/api/os', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setOsList(data);
  };

  const fetchDetails = async (id: number) => {
    const res = await fetch(`/api/os/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setSelectedOS(data);
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch(`/api/os/${id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    fetchDetails(id);
    fetchOS();
  };

  const onLogin = (data: any) => {
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('zap_os_token', data.token);
    localStorage.setItem('zap_os_user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear();
  };

  const filteredOS = useMemo(() => {
    return osList.filter(os => {
      const matchStatus = filters.status === 'todas' || os.status === filters.status;
      const matchTipo = filters.tipo === 'todas' || os.tipo_os === filters.tipo;
      const matchUrgencia = filters.urgencia === 'todas' || os.nivel_urgencia === filters.urgencia;
      return matchStatus && matchTipo && matchUrgencia;
    });
  }, [osList, filters]);

  if (!token) return <Login onLogin={onLogin} />;

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-72 bg-white border-r border-zinc-200 flex flex-col shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-2 bg-emerald-500 rounded-lg">
              <LayoutDashboard className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-bold">ZapOS</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${view === 'dashboard' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            {(user?.role === 'admin' || user?.role === 'superadmin') && (
                <button 
                    onClick={() => setView('users')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${view === 'users' ? 'bg-emerald-50 text-emerald-700' : 'text-zinc-500 hover:bg-zinc-50'}`}
                >
                    <Settings size={20} /> Gestão de Usuários
                </button>
            )}
            <button 
                onClick={() => setShowSim(!showSim)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${showSim ? 'bg-zinc-100 text-zinc-900 border border-zinc-200' : 'text-zinc-500 hover:bg-zinc-50'}`}
            >
              <MessageSquare size={20} /> Simular WhatsApp
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-zinc-500" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.nome}</p>
              <p className="text-xs text-zinc-400 truncate">@{user?.username}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
          >
            <LogOut size={16} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 lg:p-8 overflow-y-auto">
        {view === 'users' ? (
            <>
                <header className="mb-8">
                    <h2 className="text-2xl font-bold">Gestão de Acessos</h2>
                    <p className="text-zinc-500">Controle de usuários, perfis e permissões</p>
                </header>
                <UsersView currentUser={user} token={token!} />
            </>
        ) : (
            <>
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    {/* ... header content ... */}
          <div>
            <h2 className="text-2xl font-bold">Painel de Atendimentos</h2>
            <p className="text-zinc-500">Monitoramento em tempo real de chamados</p>
          </div>
          <button 
            onClick={fetchOS}
            className="flex items-center justify-center gap-2 bg-white border border-zinc-200 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-50 transition-all"
          >
            Atualizar Lista
          </button>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Total de OS</p>
            <h3 className="text-3xl font-bold">{osList.length}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm border-l-4 border-l-amber-500">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Pendentes</p>
            <h3 className="text-3xl font-bold">{osList.filter(o => o.status === 'pendente').length}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm border-l-4 border-l-emerald-500">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Concluídas</p>
            <h3 className="text-3xl font-bold">{osList.filter(o => o.status === 'encerrada').length}</h3>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm border-l-4 border-l-red-500">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Urgência Alta</p>
            <h3 className="text-3xl font-bold">{osList.filter(o => o.nivel_urgencia === 'alta').length}</h3>
          </div>
        </div>

        {/* Filters and Table Container */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-100 flex flex-wrap gap-4 items-center bg-zinc-50/50">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-600">Filtros:</span>
                </div>
                <select 
                    value={filters.status}
                    onChange={e => setFilters({...filters, status: e.target.value})}
                    className="text-sm border-none bg-white px-3 py-1 rounded-lg ring-1 ring-zinc-200 focus:ring-emerald-500"
                >
                    <option value="todas">Todos Status</option>
                    <option value="pendente">Pendentes</option>
                    <option value="em_atendimento">Em Atendimento</option>
                    <option value="agendada">Agendadas</option>
                    <option value="encerrada">Encerradas</option>
                </select>
                <select 
                    value={filters.tipo}
                    onChange={e => setFilters({...filters, tipo: e.target.value})}
                    className="text-sm border-none bg-white px-3 py-1 rounded-lg ring-1 ring-zinc-200 focus:ring-emerald-500"
                >
                    <option value="todas">Todos Tipos</option>
                    <option value="requisicao">Requisição</option>
                    <option value="incidente">Incidente</option>
                </select>
                <select 
                    value={filters.urgencia}
                    onChange={e => setFilters({...filters, urgencia: e.target.value})}
                    className="text-sm border-none bg-white px-3 py-1 rounded-lg ring-1 ring-zinc-200 focus:ring-emerald-500"
                >
                    <option value="todas">Todas Urgências</option>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-zinc-100 bg-zinc-50/30">
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Título / Tipo</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Solicitante</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Urgência</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Abertura</th>
                            <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {filteredOS.map((os) => (
                            <tr key={os.id_os} className="hover:bg-zinc-50 transition-colors cursor-pointer group" onClick={() => fetchDetails(os.id_os)}>
                                <td className="px-6 py-4 font-mono text-zinc-400 text-sm">#{os.id_os}</td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-zinc-900 line-clamp-1">{os.titulo}</p>
                                    <span className={`text-[10px] font-bold uppercase ${os.tipo_os === 'incidente' ? 'text-red-500' : 'text-blue-500'}`}>
                                        {os.tipo_os}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm text-zinc-700">{os.nome_usuario}</p>
                                    <div className="flex items-center gap-1 text-zinc-400 text-xs">
                                        <Phone size={10} /> {os.numero_whatsapp}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                        os.nivel_urgencia === 'alta' ? 'bg-red-50 border-red-100 text-red-600' :
                                        os.nivel_urgencia === 'media' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                        'bg-zinc-50 border-zinc-100 text-zinc-500'
                                    }`}>
                                        {os.nivel_urgencia}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            os.status === 'encerrada' ? 'bg-zinc-400' :
                                            os.status === 'pendente' ? 'bg-amber-500' :
                                            os.status === 'agendada' ? 'bg-blue-500' : 'bg-emerald-500'
                                        }`} />
                                        <span className="text-sm capitalize text-zinc-600">{os.status.replace('_', ' ')}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-xs text-zinc-400 font-medium">
                                    {format(new Date(os.data_abertura), "dd MMM, HH:mm", { locale: ptBR })}
                                </td>
                                <td className="px-6 py-4">
                                    <button className="p-1 hover:bg-zinc-200 rounded text-zinc-400 transition-colors">
                                        <ChevronRight size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredOS.length === 0 && (
                    <div className="p-12 text-center text-zinc-400">
                        Nenhum registro encontrado com os filtros selecionados.
                    </div>
                )}
            </div>
        </div>
        </>
      )}
      </main>

      {/* Details Side Panel */}
      {selectedOS && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex justify-end">
            <div className="w-full max-w-xl bg-white h-screen overflow-y-auto flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <span className="text-zinc-400 font-mono text-xs">DETALHES DO CHAMADO</span>
                        <h3 className="text-2xl font-bold">OS #{selectedOS.id_os}</h3>
                    </div>
                    <button 
                        onClick={() => setSelectedOS(null)}
                        className="p-2 hover:bg-zinc-100 rounded-full transition-all"
                    >
                        <ChevronRight className="rotate-0" /> Fechar
                    </button>
                </div>

                <div className="space-y-8">
                    <section>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Informações Gerais</h4>
                        <div className="bg-zinc-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Solicitante</p>
                                <p className="text-sm font-semibold">{selectedOS.nome_usuario}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">WhatsApp</p>
                                <p className="text-sm font-semibold">{selectedOS.numero_whatsapp}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Data de Abertura</p>
                                <p className="text-xs font-semibold">{format(new Date(selectedOS.data_abertura), "Pp", { locale: ptBR })}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold">Previsão/Execução</p>
                                <p className="text-xs font-semibold text-emerald-600">{format(new Date(selectedOS.data_execucao), "Pp", { locale: ptBR })}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Descrição do Chamado</h4>
                        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
                            <h5 className="font-bold text-lg mb-2">{selectedOS.titulo}</h5>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{selectedOS.descricao}</p>
                            {selectedOS.possui_anexo && (
                                <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700">
                                    <Paperclip size={16} />
                                    <span className="text-xs font-bold">Anexo disponível no WhatsApp</span>
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Anexos e Mídia</h4>
                        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-5 flex flex-wrap gap-4">
                            {selectedOS.possui_anexo ? (
                                <div className="group relative w-24 h-24 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col items-center justify-center gap-1 hover:border-emerald-300 transition-all overflow-hidden">
                                    <ImageIcon size={24} className="text-emerald-500" />
                                    <span className="text-[10px] font-bold text-zinc-400">ANEXO_01.PNG</span>
                                    <div className="absolute inset-0 bg-emerald-600/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-white text-[10px] font-bold">VER ANEXO</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-400 italic">Nenhum anexo enviado para esta OS.</p>
                            )}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Mudar Status / Adicionar Interação</h4>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['pendente', 'em_atendimento', 'agendada', 'encerrada'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => updateStatus(selectedOS.id_os, s)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                                        selectedOS.status === s 
                                        ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                                        : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400'
                                    }`}
                                >
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                          <input 
                            id="new-interaction"
                            className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            placeholder="Adicionar nota ou interação interna..."
                            onKeyPress={async (e) => {
                              if (e.key === 'Enter') {
                                const target = e.target as HTMLInputElement;
                                if (target.value) {
                                  await fetch(`/api/os/${selectedOS.id_os}`, {
                                    method: 'PATCH',
                                    headers: { 
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ descricao_atualizacao: target.value })
                                  });
                                  target.value = '';
                                  fetchDetails(selectedOS.id_os);
                                }
                              }
                            }}
                          />
                          <button 
                            onClick={async () => {
                              const input = document.getElementById('new-interaction') as HTMLInputElement;
                              if (input.value) {
                                await fetch(`/api/os/${selectedOS.id_os}`, {
                                  method: 'PATCH',
                                  headers: { 
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({ descricao_atualizacao: input.value })
                                });
                                input.value = '';
                                fetchDetails(selectedOS.id_os);
                              }
                            }}
                            className="p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 transition-all"
                          >
                            <PlusCircle size={20} />
                          </button>
                        </div>
                    </section>

                    <section className="pb-10">
                        <div className="flex items-center gap-2 mb-4">
                            <History size={18} className="text-zinc-400" />
                            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Linha do Tempo / Histórico</h4>
                        </div>
                        <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-0 before:w-px before:bg-zinc-100">
                            {selectedOS.historico?.map((h) => (
                                <div key={h.id_historico} className="flex gap-6 relative">
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-200 flex items-center justify-center shrink-0 z-10">
                                        <Clock size={14} className="text-zinc-400" />
                                    </div>
                                    <div className="flex-1 pb-4">
                                        <p className="text-xs font-bold text-zinc-400 mb-1">
                                            {format(new Date(h.data_hora_atualizacao), "dd/MM/yyyy HH:mm")}
                                        </p>
                                        <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 shadow-sm">
                                            <p className="text-sm text-zinc-700">{h.descricao_atualizacao}</p>
                                            <span className="text-[10px] text-zinc-400 font-bold uppercase mt-2 block">{h.tipo_atualizacao.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {selectedOS.historico?.length === 0 && (
                                <p className="text-sm text-zinc-400 ml-10 italic">Nenhuma atualização registrada ainda.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
      )}

      {/* WhatsApp Simulation Modal */}
      {showSim && (
          <div className="fixed bottom-6 right-6 z-40 w-full max-w-sm">
              <WhatsAppSim onNewOS={fetchOS} />
          </div>
      )}
    </div>
  );
}
