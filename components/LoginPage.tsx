import React, { useState, useEffect } from 'react';
import { DiscordIcon } from './DiscordIcon';
import { ShieldCheck, Lock, Cpu, LogOut, UserCheck, AlertTriangle, Ban, Users, Search, Circle, ExternalLink } from 'lucide-react';

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const DISCORD_CLIENT_ID = '1468331655646417203'; 
const REDIRECT_URI = 'https://o-auth2-null-x.vercel.app/'; 
const TARGET_GUILD_ID = '1458138848822431770'; 
const STAFF_ROLE_ID = '1458158245700046901'; 

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  email?: string;
}

interface StaffMember {
  id: string;
  username: string;
  avatarUrl: string;
  role: 'Administrator' | 'Moderator' | 'Support' | 'Staff';
  status: 'online' | 'idle' | 'dnd' | 'offline';
}

const MOCK_STAFF_LIST: StaffMember[] = [
  { id: '1', username: 'Nexus', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Nexus', role: 'Administrator', status: 'online' },
  { id: '2', username: 'Cipher', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cipher', role: 'Moderator', status: 'dnd' },
  { id: '3', username: 'Void', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Void', role: 'Support', status: 'idle' },
  { id: '4', username: 'Glitch', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Glitch', role: 'Staff', status: 'online' },
  { id: '5', username: 'Echo', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Echo', role: 'Moderator', status: 'offline' },
];

const LoginPage: React.FC = () => {
  const [mainLogoError, setMainLogoError] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Staff List State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      verifyUserAndRole(accessToken);
    }
  }, []);

  const verifyUserAndRole = async (token: string) => {
    setLoading(true);
    setAccessDenied(false);
    setStatusMessage('Identifying user...');

    try {
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) throw new Error('Failed to fetch user');
      const userData = await userRes.json();

      setStatusMessage('Checking clearance...');
      const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${TARGET_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (memberRes.status === 404 || memberRes.status === 403) {
        setStatusMessage('User not found in target guild');
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!memberRes.ok) throw new Error('Failed to fetch guild member info');

      const memberData = await memberRes.json();
      const roles: string[] = memberData.roles || [];

      if (roles.includes(STAFF_ROLE_ID)) {
        setUser(userData);
        // Загружаем список сотрудников (симуляция, т.к. API не дает список юзеров без бота)
        loadStaffList();
      } else {
        setAccessDenied(true);
      }

    } catch (error) {
      console.error('Auth Error:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = () => {
    // В реальном приложении здесь был бы запрос к вашему API боту
    // Поскольку User Token не имеет права получать список участников гильдии, используем мок
    setTimeout(() => {
        setStaffList(MOCK_STAFF_LIST);
    }, 800);
  };

  const handleLogin = () => {
    const scope = encodeURIComponent('identify guilds.members.read');
    const redirect = encodeURIComponent(REDIRECT_URI);
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleLogout = () => {
    setUser(null);
    setAccessDenied(false);
    setStaffList([]);
  };

  const filteredStaff = staffList.filter(member => 
    member.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white overflow-hidden flex flex-col items-center justify-center relative selection:bg-purple-500/30 font-sans">
      
      {/* --- BACKGROUND EFFECTS --- */}
      <div className="absolute inset-0 z-0 opacity-[0.07]" 
           style={{ 
             backgroundImage: 'linear-gradient(to right, #808080 1px, transparent 1px), linear-gradient(to bottom, #808080 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(circle at center, black 30%, transparent 80%)'
           }}>
      </div>
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>

      {/* Dynamic Ambient Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${accessDenied ? 'bg-red-600/10' : 'bg-purple-600/10'}`} />
        <div className={`absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-1000 ${accessDenied ? 'bg-orange-600/5' : 'bg-indigo-600/5'}`} />
      </div>

      {/* --- MAIN CONTAINER --- */}
      <div className={`relative z-10 w-full transition-all duration-700 ease-in-out ${user ? 'max-w-4xl' : 'max-w-[480px]'} p-4`}>
        <div className={`relative backdrop-blur-2xl border transition-all duration-500 rounded-[2.5rem] flex flex-col items-center shadow-2xl overflow-hidden
            ${accessDenied 
                ? 'bg-[#0f0505]/95 border-red-500/20 shadow-red-900/10 p-10 md:p-14' 
                : user 
                    ? 'bg-[#0a0a0a]/95 border-white/5 p-8 min-h-[600px]' 
                    : 'bg-[#0a0a0a]/90 border-white/5 p-10 md:p-14'
            }`}>
          
          {/* 
            HEADER SECTION 
            (Compact version for Dashboard, Full for Login)
          */}
          {!user && (
              <div className="text-center mb-12 relative w-full flex flex-col items-center">
                {!mainLogoError ? (
                   <div className="mb-8 relative group">
                      <div className={`absolute -inset-10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition duration-1000 ${accessDenied ? 'bg-red-500/10' : 'bg-purple-500/5'}`}></div>
                      <img 
                        src="images/logo.png" 
                        alt=""
                        className={`h-32 md:h-40 w-auto object-contain relative z-10 drop-shadow-[0_0_35px_rgba(168,85,247,0.1)] transition-all duration-500 ${accessDenied ? 'grayscale contrast-125' : ''}`}
                        onError={() => setMainLogoError(true)}
                      />
                   </div>
                ) : (
                   <h1 className="text-5xl font-black tracking-tighter mb-4">
                     <span className="text-white">NULL</span>
                     <span className={`text-purple-500 ml-1 ${accessDenied ? 'text-red-500' : 'text-purple-500'}`}>X</span>
                   </h1>
                )}
                {!accessDenied && (
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] pl-1">
                    Staff Authorization
                  </p>
                )}
              </div>
          )}

          {/* 
             STATE MANAGER
          */}

          {loading ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest animate-pulse">{statusMessage}</span>
            </div>
          ) : accessDenied ? (
            /* ACCESS DENIED */
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                <Ban className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">ACCESS DENIED</h2>
              <p className="text-zinc-500 text-center text-xs leading-relaxed mb-8 max-w-[200px]">
                You do not have the required Staff privileges to access this panel.
              </p>
              <button onClick={handleLogout} className="w-full bg-white/5 hover:bg-white/10 border border-white/5 py-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2">
                <LogOut className="w-3 h-3" /> Return
              </button>
            </div>
          ) : user ? (
            /* ==============================
               STAFF DASHBOARD VIEW
               ============================== */
            <div className="w-full flex flex-col md:flex-row gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* LEFT: User Profile */}
                <div className="w-full md:w-1/3 flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl p-6 h-fit">
                    <div className="flex items-center gap-4 mb-6">
                        <img 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                            alt="Me" 
                            className="w-16 h-16 rounded-full border border-purple-500/30"
                        />
                        <div className="overflow-hidden">
                            <h3 className="text-lg font-bold text-white truncate">{user.username}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Online
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 mb-8">
                        <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                            <span className="text-zinc-500">Role</span>
                            <span className="text-purple-400 font-medium">Staff Member</span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                            <span className="text-zinc-500">ID</span>
                            <span className="text-zinc-400 font-mono">{user.id.slice(0,8)}...</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleLogout}
                        className="mt-auto w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-3 h-3" /> Disconnect
                    </button>
                </div>

                {/* RIGHT: Staff Directory */}
                <div className="w-full md:w-2/3 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                Staff Directory
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md border border-purple-500/20">
                                    {staffList.length} Active
                                </span>
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1">Authorized personnel currently on database.</p>
                        </div>
                        <div className="hidden md:block p-2 bg-white/5 rounded-full">
                            <Users className="w-5 h-5 text-zinc-400" />
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative mb-6 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-purple-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search staff members..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                        />
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2 custom-scrollbar">
                        {filteredStaff.length > 0 ? (
                            filteredStaff.map((member) => (
                                <div key={member.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={member.avatarUrl} alt={member.username} className="w-10 h-10 rounded-full bg-zinc-800" />
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a] 
                                                ${member.status === 'online' ? 'bg-emerald-500' : 
                                                  member.status === 'dnd' ? 'bg-red-500' : 
                                                  member.status === 'idle' ? 'bg-yellow-500' : 'bg-zinc-500'}`} 
                                            />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{member.username}</h4>
                                            <span className={`text-[10px] font-semibold uppercase tracking-wider
                                                ${member.role === 'Administrator' ? 'text-red-400' : 
                                                  member.role === 'Moderator' ? 'text-blue-400' : 
                                                  'text-zinc-500'}`}>
                                                {member.role}
                                            </span>
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg transition-all text-zinc-400 hover:text-white">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-zinc-600 text-xs uppercase tracking-widest">
                                No members found
                            </div>
                        )}
                    </div>
                </div>
            </div>
          ) : (
            /* INITIAL LOGIN */
            <>
                <div className="w-full mb-10">
                    <button 
                        onClick={handleLogin}
                        className="relative w-full bg-[#0F0F11] hover:bg-[#151518] border border-white/5 hover:border-white/10 text-white py-5 px-8 rounded-2xl flex items-center justify-between gap-4 transition-all duration-300 group hover:shadow-[0_0_40px_rgba(88,101,242,0.15)]"
                    >
                        <div className="flex items-center gap-5">
                            <div className="bg-[#5865F2] p-2.5 rounded-xl shadow-lg shadow-[#5865F2]/20 group-hover:scale-110 transition-transform">
                                <DiscordIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Authorization</span>
                                <span className="text-lg font-black text-zinc-100 tracking-tight">Login with Discord</span>
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </div>
                    </button>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full opacity-60">
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                        <ShieldCheck className="w-5 h-5 text-emerald-500 mb-2" />
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Secure</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                        <Cpu className="w-5 h-5 text-blue-500 mb-2" />
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Neural</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
                        <Lock className="w-5 h-5 text-purple-500 mb-2" />
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Root</span>
                    </div>
                </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default LoginPage;