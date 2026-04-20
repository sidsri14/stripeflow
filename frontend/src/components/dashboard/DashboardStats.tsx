import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, RotateCcw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '../../utils/cn';

interface DashboardStatsProps {
  stats: {
    totalVolume: number;
    paidVolume: number;
    paidRate: number;
    paidThisMonth: number;
    counts: {
      pending: number;
      paid: number;
      overdue: number;
      abandoned: number;
    };
    timeseries?: Array<{ date: string, volume: number, paid: number }>;
  } | null;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Paid Revenue',
      value: `$${((stats?.paidVolume ?? 0) / 100).toLocaleString()}`,
      sub: 'Successfully collected',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
    },
    {
      label: 'Pending Invoices',
      value: stats?.counts?.pending ?? 0,
      sub: 'Awaiting payment',
      icon: <RotateCcw className="w-5 h-5 text-blue-500" />,
      color: 'blue',
    },
    {
      label: 'Overdue Invoices',
      value: stats?.counts?.overdue ?? 0,
      sub: 'Requires attention',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500" />,
      color: 'rose',
    },
    {
      label: 'Total Invoiced',
      value: `$${((stats?.totalVolume ?? 0) / 100).toLocaleString()}`,
      sub: 'Lifetime volume',
      icon: <TrendingUp className="w-5 h-5 text-indigo-500" />,
      color: 'indigo',
    },
    {
      label: 'Collection Rate',
      value: `${stats?.paidRate ?? 0}%`,
      sub: 'Success percentage',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      color: 'emerald',
    }
  ];

  return (
    <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => (
        <motion.div
           key={card.label}
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: idx * 0.05 }}
           className="p-5 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-500/30 transition-all group cursor-pointer"
        >
          <div className="flex justify-between items-start mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 group-hover:text-stone-500 transition-colors">
              {card.label}
            </p>
            <div className={cn(
              "p-2 rounded-xl shrink-0 transition-all",
              card.color === 'emerald' ? "bg-emerald-50 dark:bg-emerald-900/20 group-hover:bg-emerald-100" :
              card.color === 'blue' ? "bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100" :
              card.color === 'indigo' ? "bg-indigo-50 dark:bg-indigo-900/20 group-hover:bg-indigo-100" :
              "bg-rose-50 dark:bg-rose-900/20 group-hover:bg-rose-100"
            )}>
              {card.icon}
            </div>
          </div>
          <h4 className="text-2xl font-black text-stone-800 dark:text-stone-100 mb-0.5 tracking-tight">
            {card.value}
          </h4>
          <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wide">
            {card.sub}
          </p>
        </motion.div>
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-3 p-6 rounded-3xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-stone-800 dark:text-stone-100">Revenue Trends (30 Days)</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Collected</span>
            </div>
            <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-indigo-400" />
               <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Invoiced</span>
            </div>
          </div>
        </div>
        
        <div className="h-72 w-full">
          {stats?.timeseries && stats.timeseries.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.timeseries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 600 }} dy={10} minTickGap={30} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa', fontWeight: 600 }} tickFormatter={(val) => `$${val/100}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', backgroundColor: '#fff' }}
                  labelStyle={{ fontWeight: '800', color: '#18181b', marginBottom: '8px', fontSize: '12px' }}
                  itemStyle={{ fontSize: '11px', fontWeight: '600' }}
                  formatter={(value: any, name: any) => [`$${(Number(value)/100).toFixed(2)}`, name === 'paid' ? 'Collected' : 'Invoiced']}
                />
                <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorInv)" />
                <Area type="monotone" dataKey="paid" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPaid)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-stone-300 gap-2">
               <TrendingUp className="w-10 h-10 opacity-20" />
               <p className="text-[10px] font-black uppercase tracking-widest">Not enough data to show trends</p>
             </div>
          )}
        </div>
      </motion.div>
    </div>
    </>
  );
};
