import React, { useState, useEffect } from 'react';
import { DiscordIcon } from './DiscordIcon';
import { ShieldCheck, Lock, Cpu, LogOut, UserCheck, AlertTriangle, Ban } from 'lucide-react';

// ==========================================
// КОНФИГУРАЦИЯ
// ==========================================
const DISCORD_CLIENT_ID = '1468331655646417203'; 
const REDIRECT_URI = 'https://o-auth2-null-x.vercel.app/'; 

// ID сервера: (взято из вашего запроса)
const TARGET_GUILD_ID = '1458138848822431770'; 

// !!! ВАЖНО: ВСТАВЬТЕ СЮДА ID РОЛИ "STAFF" !!!
// Правой кнопкой по роли в настройках сервера -> Копировать ID
// Если ID не указан, проверка не пройдет.
const STAFF_ROLE_ID = '1458158245700046901'; 

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  email?: string;
}

const LoginPage: React.FC = () => {
  const [mainLogoError, setMainLogoError] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    // Проверка наличия токена в URL (после редиректа от Discord)
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get('access_token');

    if (accessToken) {
      // Очищаем хэш в URL
      window.history.replaceState({}, document.title, window.location.pathname);
      verifyUserAndRole(accessToken);
    }
  }, []);

  const verifyUserAndRole = async (token: string) => {
    setLoading(true);
    setAccessDenied(false);
    setStatusMessage('Identifying user...');

    try {
      // 1. Получаем данные пользователя
      const userRes = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!userRes.ok) throw new Error('Failed to fetch user');
      const userData = await userRes.json();

      // 2. Проверяем наличие роли на конкретном сервере
      setStatusMessage('Checking clearance...');
      
      const memberRes = await fetch(`https://discord.com/api/users/@me/guilds/${TARGET_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (memberRes.status === 404 || memberRes.status === 403) {
        // Пользователя нет на сервере или нет доступа
        setStatusMessage('User not found in target guild');
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      if (!memberRes.ok) throw new Error('Failed to fetch guild member info');

      const memberData = await memberRes.json();
      const roles: string[] = memberData.roles || [];

      // Проверка на наличие роли
      // Если вы еще не вставили ID, код выдаст предупреждение в консоль, но не пустит
      if (STAFF_ROLE_ID === 'REPLACE_WITH_REAL_ROLE_ID') {
        console.warn("⚠️ ВНИМАНИЕ: Вы не указали STAFF_ROLE_ID в коде! Авторизация не пройдет.");
      }

      if (roles.includes(STAFF_ROLE_ID)) {
        // УСПЕХ: Роль есть
        setUser(userData);
      } else {
        // ПРОВАЛ: Роли нет
        setAccessDenied(true);
      }

    } catch (error) {
      console.error('Auth Error:', error);
      setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    // Добавляем scope 'guilds.members.read', чтобы читать роли пользователя на сервере
    const scope = encodeURIComponent('identify guilds.members.read');
    const redirect = encodeURIComponent(REDIRECT_URI);
    const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${redirect}&response_type=token&scope=${scope}`;
    window.location.href = url;
  };

  const handleLogout = () => {
    setUser(null);
    setAccessDenied(false);
  };

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

      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
           }}>
      </div>

      {/* Dynamic Ambient Glows based on State */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className={`absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full blur-[120px] transition-colors duration-1000 ${accessDenied ? 'bg-red-600/10' : 'bg-purple-600/10'}`} />
        <div className={`absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] rounded-full blur-[100px] transition-colors duration-1000 ${accessDenied ? 'bg-orange-600/5' : 'bg-indigo-600/5'}`} />
      </div>

      {/* Floating Particles */}
      <style>{`
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(var(--y)) translateX(var(--x)); opacity: 0; }
        }
      `}</style>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
         {[...Array(40)].map((_, i) => (
           <div 
             key={i} 
             className={`absolute rounded-full shadow-[0_0_5px_rgba(168,85,247,0.4)] transition-colors duration-500 ${accessDenied ? 'bg-red-500/20' : 'bg-purple-500/20'}`}
             style={{
               left: `${Math.random() * 100}%`,
               top: `${Math.random() * 100}%`,
               width: `${Math.random() * 3 + 1}px`,
               height: `${Math.random() * 3 + 1}px`,
               '--x': `${(Math.random() - 0.5) * 100}px`,
               '--y': `${-100 - Math.random() * 100}px`,
               animation: `float-particle ${Math.random() * 15 + 10}s linear infinite`,
               animationDelay: `${Math.random() * -25}s`,
             } as React.CSSProperties} 
           />
         ))}
      </div>

      {/* --- LOGO (Top Left) --- */}
      <div className="absolute top-8 left-8 z-[100]">
        <img 
          src="images/logo.png" 
          alt="" 
          className="h-12 w-auto object-contain opacity-50 hover:opacity-100 transition-all duration-300"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
      </div>

      {/* --- MAIN CARD --- */}
      <div className="relative z-10 w-full max-w-[480px] p-4">
        <div className={`relative backdrop-blur-2xl border transition-all duration-500 rounded-[2.5rem] p-10 md:p-14 flex flex-col items-center shadow-2xl ${accessDenied ? 'bg-[#0f0505]/95 border-red-500/20 shadow-red-900/10' : 'bg-[#0a0a0a]/90 border-white/5'}`}>
          
          {/* Header */}
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

            {!user && !accessDenied && (
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.4em] pl-1">
                Staff Authorization
              </p>
            )}
          </div>

          {/* CONTENT AREA */}
          <div className="w-full mb-10">
            {loading ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{statusMessage}</span>
              </div>
            ) : accessDenied ? (
              /* ACCESS DENIED STATE */
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                  <Ban className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">ACCESS DENIED</h2>
                <p className="text-zinc-500 text-center text-xs leading-relaxed mb-8 max-w-[200px]">
                  You do not have the required Staff privileges to access this panel.
                </p>
                <button 
                    onClick={handleLogout}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/5 py-4 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3 h-3" />
                    Return
                  </button>
              </div>
            ) : user ? (
              /* User Profile State (SUCCESS) */
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
                  <img 
                    src={user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                    alt="Avatar"
                    className="w-24 h-24 rounded-full border-2 border-purple-500/50 relative z-10 p-1 bg-[#0a0a0a]"
                  />
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#0a0a0a] z-20"></div>
                </div>
                
                <h3 className="text-2xl font-black text-white mb-1 tracking-tight">{user.username}</h3>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <UserCheck className="w-3 h-3" />
                  Staff Verified
                </span>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all">
                    Dashboard
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider text-red-400 transition-all flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-3 h-3" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              /* Initial Login State */
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
            )}
          </div>

          {/* Footer Grid */}
          <div className={`grid grid-cols-3 gap-3 w-full opacity-60 transition-colors duration-500 ${accessDenied ? 'text-red-500/50' : ''}`}>
            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${accessDenied ? 'border-red-500/10' : ''}`}>
              <ShieldCheck className={`w-5 h-5 mb-2 ${accessDenied ? 'text-red-500' : 'text-emerald-500'}`} />
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Secure</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${accessDenied ? 'border-red-500/10' : ''}`}>
              <Cpu className={`w-5 h-5 mb-2 ${accessDenied ? 'text-red-500' : 'text-blue-500'}`} />
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Neural</span>
            </div>
            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.03] ${accessDenied ? 'border-red-500/10' : ''}`}>
              <Lock className={`w-5 h-5 mb-2 ${accessDenied ? 'text-red-500' : 'text-purple-500'}`} />
              <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Root</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginPage;