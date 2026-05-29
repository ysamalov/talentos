"use client";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const FUNNEL_COLORS = ["#6366f1","#4f46e5","#3730a3","#10b981","#f59e0b","#a855f7","#059669"];
const SOURCE_COLORS = ["#6366f1","#10b981","#f59e0b","#3b82f6","#a855f7"];

const ВОРОНКА = [
  { stage:"Подали заявку", count:547 }, { stage:"AI скрининг", count:312 },
  { stage:"HR ревью", count:152 },      { stage:"Интервью", count:76 },
  { stage:"Оффер", count:22 },          { stage:"Наняты", count:18 },
];
const ПО_МЕСЯЦАМ = [
  { month:"Янв", applications:320, hires:6 }, { month:"Фев", applications:410, hires:9 },
  { month:"Мар", applications:380, hires:8 }, { month:"Апр", applications:490, hires:12 },
  { month:"Май", applications:540, hires:14 },{ month:"Июн", applications:547, hires:18 },
];
const ИСТОЧНИКИ = [
  { name:"LinkedIn", value:38 }, { name:"Рефералы", value:24 },
  { name:"HeadHunter", value:18 }, { name:"Напрямую", value:12 }, { name:"Другое", value:8 },
];
const АКТИВНОСТЬ = [
  { text:"AI оценил Алибека Жақсыбекова → 91/100 на Senior SWE",  time:"2 мин назад",  color:"#10b981" },
  { text:"Начат скрининг с Айгерим Сейткали",                       time:"5 мин назад",  color:"#6366f1" },
  { text:"Интервью — Нурсултан Бекенов → Чт 14:00 (Алматы)",       time:"12 мин назад", color:"#f59e0b" },
  { text:"Авто-отказ отправлен 47 кандидатам (DevOps)",              time:"18 мин назад", color:"#ef4444" },
  { text:"Онбординг-план создан для Дильназ Омаровой",               time:"32 мин назад", color:"#a855f7" },
  { text:"Разобрано 87 резюме — воронка Product Manager",            time:"1 час назад",  color:"#10b981" },
];

const TT = {
  contentStyle:{ background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, fontSize:11 },
  labelStyle:{ color:"#374151", fontWeight:600 },
};

interface OverviewData { total_candidates?:number; }

function StatCard({ label, value, delta, deltaUp, accent }:{label:string;value:string;delta:string;deltaUp:boolean;accent:string}) {
  return (
    <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
      <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] tracking-widest mb-1.5 uppercase">{label}</div>
      <div className="text-xl sm:text-2xl font-semibold font-mono tracking-tight" style={{color:accent}}>{value}</div>
      <div className={`text-xs mt-1 font-medium ${deltaUp?"text-emerald-600":"text-red-500"}`}>{delta}</div>
      <div className="h-0.5 bg-[hsl(var(--muted))] rounded-full mt-3 overflow-hidden">
        <div className="h-full rounded-full" style={{width:"65%",background:accent}}/>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: overview } = useQuery<OverviewData>({
    queryKey:["analytics-overview"],
    queryFn:()=>analyticsApi.overview().then((r)=>r.data),
  });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Всего кандидатов" value={String(overview?.total_candidates??547)} delta="↑ 48 за неделю" deltaUp accent="#6366f1"/>
        <StatCard label="AI обработано" value="312" delta="↑ 24 сегодня" deltaUp accent="#10b981"/>
        <StatCard label="Интервью сегодня" value="14" delta="↑ 3 от вчера" deltaUp accent="#f59e0b"/>
        <StatCard label="Офферов выслано" value="8" delta="↓ 2 отклонено" deltaUp={false} accent="#a855f7"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Воронка найма</span>
            <span className="text-[10px] font-mono bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] px-2 py-0.5 rounded-full">30 вакансий</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={ВОРОНКА} margin={{top:0,right:0,bottom:0,left:-20}}>
              <XAxis dataKey="stage" tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {ВОРОНКА.map((_,i)=><Cell key={i} fill={FUNNEL_COLORS[i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold">Активность</span>
            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ai-pulse"/><span className="text-[9px] font-mono text-emerald-600 font-semibold">ОНЛАЙН</span></div>
          </div>
          <div className="space-y-3">
            {АКТИВНОСТЬ.map((a,i)=>(
              <div key={i} className="flex gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{background:a.color}}/>
                <div className="min-w-0">
                  <div className="text-xs text-[hsl(var(--secondary-foreground))] leading-snug">{a.text}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono mt-0.5">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-sm font-semibold mb-4">Заявки vs Найм</div>
          <div className="flex gap-4 mb-3 text-[11px] flex-wrap">
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-3 h-0.5 rounded bg-[#6366f1] inline-block"/> Заявки</span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-3 h-0.5 rounded bg-emerald-500 inline-block"/> Наймы</span>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={ПО_МЕСЯЦАМ} margin={{top:0,right:0,bottom:0,left:-20}}>
              <XAxis dataKey="month" tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#9ca3af",fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip {...TT}/>
              <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false}/>
              <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-sm font-semibold mb-4">Источники кандидатов</div>
          <div className="flex items-center gap-4 flex-wrap">
            <ResponsiveContainer width={120} height={120}>
              <PieChart><Pie data={ИСТОЧНИКИ} cx="50%" cy="50%" innerRadius={32} outerRadius={54} dataKey="value" paddingAngle={2}>
                {ИСТОЧНИКИ.map((_,i)=><Cell key={i} fill={SOURCE_COLORS[i]}/>)}
              </Pie></PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-1.5 flex-1">
              {ИСТОЧНИКИ.map((s,i)=>(
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:SOURCE_COLORS[i]}}/>
                  <span className="text-[hsl(var(--muted-foreground))] flex-1">{s.name}</span>
                  <span className="font-mono font-medium">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
