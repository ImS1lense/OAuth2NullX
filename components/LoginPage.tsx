import React, { useState, useEffect } from 'react';
import { DiscordIcon } from './DiscordIcon';
import { ShieldCheck, Lock, Cpu, LogOut, Ban, Users, Search, RefreshCw, AlertCircle } from 'lucide-react';

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const DISCORD_CLIENT_ID = '1468331655646417203'; 
const TARGET_GUILD_ID = '1458138848822431770'; 
const STAFF_ROLE_ID = '1458158245700046901'; // ID роли, дающей доступ к панели

// 1. КОНФИГУРАЦИЯ РОЛЕЙ (ОТ НИЗШЕГО К ВЫСШЕМУ)
const ROLE_DEFINITIONS: Record<string, { name: string, color: string, weight: number }> = {
    // Trainee
    "1459285694458626222": { name: "Стажёр", color: "text-blue-400", weight: 1 },
    // Jr Moder
    "1458158059187732666": { name: "Младший модератор", color: "text-emerald-400", weight: 2 },
    // Moder
    "1458158896894967879": { name: "Модератор", color: "text-purple-400", weight: 3 },
    // Sr Moder
    "1458159110720589944": { name: "Старший модератор", color: "text-red-500", weight: 4 },
    // Chief Moder
    "1458159802105594061": { name: "Шеф модератор", color: "text-red-600", weight: 5 },
    // Curator
    "1458277039399374991": { name: "Куратор", color: "text-amber-400", weight: 6 },
};

// 2. СПРАВОЧНИК СОТРУДНИКОВ (ID -> RoleID)
// Внесите сюда ID своих сотрудников, чтобы:
// а) Видеть их роль (Куратор, Модератор и т.д.) вместо "Active Staff".
// б) Видеть их в списке, даже если они OFFLINE (Inactive).
interface KnownStaff {
    id: string;
    roleId: string;
    fallbackName: string; // Имя для отображения, если юзер offline и виджет его не видит
}

const KNOWN_STAFF_DIRECTORY: KnownStaff[] = [
    // ПРИМЕРЫ (Замените ID на реальные ID ваших сотрудников):
    // { id: "123456789", roleId: "1458159110720589944", fallbackName: "Egorov" },
    // { id: "987654321", roleId: "1458158896894967879", fallbackName: "lowcode" },
    
    // Тестовый неактивный пользователь для демонстрации:
    { id: "000000000000000001", roleId: "1458277039399374991", fallbackName: "Offline Curator (Example)" },
];

// Функция для выбора правильного Redirect URI
const getRedirectUri = () => {
  if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost') return 'http://localhost:3000/';
      if (host === '192.168.1.5') return 'http://192.168.1.5:3000/';
  }
  return 'https://o-auth2-null-x.vercel.app/';
};

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name?: string;
  roles?: string[]; 
}

interface WidgetMember {
  id: string;
  username: string;
  status: string;
  avatar_url: string;
  game?: { name: string };
}

interface StaffDisplay {
  id: string;
  username: string;
  avatarUrl: string;
  roleName: string;
  roleColor?: string; 
  isCurrentUser: boolean;
  status: string;
  weight: number; // Для сортировки
}

const LoginPage: React.FC = () => {
  const [mainLogoError, setMainLogoError] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [userRoleInfo, setUserRoleInfo] = useState<{name: string, color: string} | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Staff List State
  const [staffList, setStaffList] = useState<StaffDisplay[]>([]);
  const [isStaffLoading, setIsStaffLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      verifyUserAndRole(accessToken);
    }
  }, []);

  // Вспомогательная функция для определения лучшей роли из списка ID ролей
  const getBestRole = (roles: string[]) => {
      let bestRole = { name: 'Staff Member', color: 'text-zinc-500', weight: 0 };
      
      roles.forEach(roleId => {
          const def = ROLE_DEFINITIONS[roleId];
          if (def && def.weight > bestRole.weight) {
              bestRole = def;
          }
      });
      return bestRole;
  };

  const verifyUserAndRole = async (token: string) => {
    setLoading(true);
    setAccessDenied(false);
    setStatusMessage('Authenticating...');

    try {
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) throw new Error('Failed to fetch user');
      const userData = await userRes.json();

      setStatusMessage('Verifying Clearance...');
      const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${TARGET_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (memberRes.status === 404 || memberRes.status === 403) {
        setStatusMessage('User not found in target guild');
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      const memberData = await memberRes.json();
      const roles: string[] = memberData.roles || [];

      if (roles.includes(STAFF_ROLE_ID)) {
        setUser({ ...userData, roles });
        const roleInfo = getBestRole(roles);
        setUserRoleInfo(roleInfo);
        
        // Запускаем сборку списка сотрудников
        fetchStaffList(userData.id, roles, userData, roleInfo);
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

  const fetchStaffList = async (
      currentUserId: string, 
      currentUserRoles: string[], 
      currentUserData: any,
      currentUserRoleInfo: {name: string, color: string, weight?: number}
    ) => {
    setIsStaffLoading(true);
    setWidgetError(false);
    
    // Словарь для быстрого доступа к списку сотрудников
    const staffMap = new Map<string, StaffDisplay>();

    // 1. Сначала добавляем всех из KNOWN_STAFF_DIRECTORY (по умолчанию считаем offline)
    KNOWN_STAFF_DIRECTORY.forEach(known => {
        const roleDef = ROLE_DEFINITIONS[known.roleId] || { name: 'Staff Member', color: 'text-zinc-500', weight: 0 };
        
        staffMap.set(known.id, {
            id: known.id,
            username: known.fallbackName,
            avatarUrl: 'https://cdn.discordapp.com/embed/avatars/0.png', // Дефолт, если виджет не найдет
            roleName: roleDef.name,
            roleColor: roleDef.color,
            status: 'offline', // По умолчанию
            isCurrentUser: known.id === currentUserId,
            weight: roleDef.weight
        });
    });

    try {
      // 2. Получаем онлайн пользователей через Widget
      const response = await fetch(`https://discord.com/api/guilds/${TARGET_GUILD_ID}/widget.json`);

      if (response.status === 403) {
        throw new Error('Widget disabled');
      }
      
      const data = await response.json();
      const members: WidgetMember[] = data.members || [];

      // 3. Мержим данные виджета
      members.forEach(m => {
          if (m.id === currentUserId) return; // Пропускаем себя, добавим в конце

          const existing = staffMap.get(m.id);
          
          if (existing) {
              // Если юзер есть в справочнике -> обновляем статус, аватар и имя
              existing.status = m.status;
              existing.avatarUrl = m.avatar_url;
              existing.username = m.username; // Обновляем имя на актуальное
          } else {
              // Если юзера нет в справочнике -> добавляем как обычного активного стаффа
              staffMap.set(m.id, {
                  id: m.id,
                  username: m.username,
                  avatarUrl: m.avatar_url,
                  roleName: 'Active Staff',
                  roleColor: 'text-zinc-500',
                  status: m.status,
                  isCurrentUser: false,
                  weight: 0
              });
          }
      });
      
    } catch (e) {
      console.error("Widget fetch failed:", e);
      setWidgetError(true);
    }

    // 4. Добавляем ТЕКУЩЕГО пользователя (перезаписываем, чтобы данные были точными)
    // Текущий пользователь всегда Online для себя
    staffMap.set(currentUserId, {
        id: currentUserId,
        username: currentUserData.username,
        avatarUrl: currentUserData.avatar 
            ? `https://cdn.discordapp.com/avatars/${currentUserId}/${currentUserData.avatar}.png` 
            : 'https://cdn.discordapp.com/embed/avatars/0.png',
        roleName: currentUserRoleInfo.name,
        roleColor: currentUserRoleInfo.color,
        status: 'online',
        isCurrentUser: true,
        weight: 100 // Всегда сверху или спец сортировка
    });

    // 5. Превращаем Map в массив и сортируем
    const finalArray = Array.from(staffMap.values());

    finalArray.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;

        // Сортировка по весу роли (Curator > Chief > ... > Trainee > Active Staff)
        if (a.weight !== b.weight) {
            return b.weight - a.weight;
        }

        // Если роли равны, сортировка по статусу
        const statusWeight = (s: string) => {
            if (s === 'online') return 3;
            if (s === 'idle') return 2;
            if (s === 'dnd') return 1;
            return 0; // offline
        };
        const swA = statusWeight(a.status);
        const swB = statusWeight(b.status);
        if (swA !== swB) return swB - swA;
        
        return a.username.localeCompare(b.username);
    });

    setStaffList(finalArray);
    setIsStaffLoading(false);
  };

  const handleLogin = () => {
    const scope = encodeURIComponent('identify guilds.members.read');
    const redirect = encodeURIComponent(getRedirectUri());
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleLogout = () => {
    setUser(null);
    setAccessDenied(false);
    setStaffList([]);
    setUserRoleInfo(null);
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
          
          {/* HEADER SECTION */}
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

          {/* STATE MANAGER */}
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
                
                {/* LEFT: User Profile - Ширина увеличена с 1/3 до 420px для длинных ников */}
                <div className="w-full md:w-[420px] shrink-0 flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl p-6 h-fit">
                    <div className="flex items-center gap-4 mb-6">
                        <img 
                            src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                            alt="Me" 
                            className="w-16 h-16 rounded-full border border-purple-500/30"
                        />
                        <div className="overflow-hidden">
                            <h3 className="text-lg font-bold text-white truncate" title={user.username}>{user.username}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Authorized
                            </div>
                        </div>
                    </div>
                    
                    <div className="space-y-2 mb-8">
                        <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                            <span className="text-zinc-500">Role</span>
                            <span className={`font-medium ${userRoleInfo?.color || 'text-purple-400'}`}>
                                {userRoleInfo?.name || 'Staff Member'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-xs py-2 border-b border-white/5">
                            <span className="text-zinc-500">ID</span>
                            <span className="text-zinc-400 font-mono">{user.id.slice(0,10)}...</span>
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
                <div className="w-full md:flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-3">
                                Staff Directory
                                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md border border-purple-500/20">
                                    {isStaffLoading ? '...' : staffList.length}
                                </span>
                            </h2>
                            <p className="text-xs text-zinc-500 mt-1">
                                {widgetError 
                                    ? <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Widget Offline - Showing Registry Only</span> 
                                    : 'Synced with Widget + Registry.'}
                            </p>
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
                            placeholder="Search personnel..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#050505] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                        />
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-2 custom-scrollbar">
                        {isStaffLoading ? (
                             <div className="flex flex-col items-center justify-center py-12 gap-2 text-zinc-500">
                                <RefreshCw className="w-6 h-6 animate-spin" />
                                <span className="text-[10px] uppercase tracking-widest">Syncing Database...</span>
                             </div>
                        ) : filteredStaff.length > 0 ? (
                            filteredStaff.map((member) => (
                                <div key={member.id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/30 transition-all duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img src={member.avatarUrl} alt={member.username} className="w-10 h-10 rounded-full bg-zinc-800" />
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a] 
                                                ${member.status === 'online' ? 'bg-emerald-500' : 
                                                  member.status === 'idle' ? 'bg-yellow-500' : 
                                                  member.status === 'dnd' ? 'bg-red-500' : 'bg-zinc-500'}`}></div>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{member.username}</h4>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${member.roleColor || 'text-zinc-500 group-hover:text-purple-400'}`}>
                                                {member.roleName}
                                            </span>
                                        </div>
                                    </div>
                                    {member.isCurrentUser && (
                                       <div className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/20">YOU</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-zinc-600 text-xs uppercase tracking-widest">
                                {widgetError ? 'Widget Disabled & Registry Empty' : 'No active members found'}
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