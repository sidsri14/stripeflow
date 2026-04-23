import { useLocation, useNavigate } from 'react-router-dom';
import { User, Palette, Users, Shield, Webhook, Key } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Account', path: '/settings', icon: User },
  { label: 'Branding', path: '/branding', icon: Palette },
  { label: 'Team', path: '/team', icon: Users },
  { label: 'Security', path: '/security', icon: Shield },
  { label: 'Webhooks', path: '/webhooks', icon: Webhook },
  { label: 'API Keys', path: '/api-keys', icon: Key },
];

export const SettingsNav = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 flex-wrap mb-8 p-1.5 bg-stone-100 dark:bg-stone-800/50 rounded-2xl border border-warm-border dark:border-stone-700">
      {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
        const active = pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              active
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-sm border border-warm-border dark:border-stone-700'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${active ? 'text-emerald-500' : ''}`} />
            {label}
          </button>
        );
      })}
    </nav>
  );
};
