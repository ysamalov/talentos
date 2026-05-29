"use client";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const ВОРОНКА = [
  { stage:"Заявки",       count:547, fill:"#6366f1" }, { stage:"AI скрининг", count:312, fill:"#4f46e5" },
  { stage:"HR ревью",     count:152, fill:"#3730a3" }, { stage:"Интервью",    count:76,  fill:"#10b981" },
  { stage:"Тех. инт.",    count:41,  fill:"#f59e0b" }, { stage:"Оффер",       count:22,  fill:"#a855f7" },
  { stage:"Нанято",       count:18,  fill:"#059669" },
];
const ПО_МЕСЯЦАМ = [
  { month:"Янв", applications:320, hires:6 }, { month:"Фев", applications:410, hires:9 },
  { month:"Мар", applications:380, hires:8 }, { month:"Апр", applications:490, hires:12 },
  { month:"Май", applications:540, hires:14 }, { month:"Июн", applications:547, hires:18 },
];
const РЕШЕНИЯ = [
  { action:"Скрининг",    ai:312, human:22 }, { action:"Расписание", ai:67,  human:8  },
  { action:"Шортлист",    ai:89,  human:15 }, { action:"Отказы",     ai:203, human:12 },
  { action:"Офферы",      ai:18,  human:22 },
];

const TT = {
  contentStyle: { background:"#fff", border:"1px solid #e5e7eb", borderRadius:8, fontSize:11 },
  labelStyle: { color:"#374151", fontWeight:600 },
};

function MetricCard({ label, value, sub, color }: { label:string; value:string; sub:string; color:string }) {
  return (
    <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 md:p-5">
      <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] tracking-widest mb-2 uppercase">{label}</div>
      <div className="text-2xl md:text-3xl font-semibold font-mono tracking-tight" style={{ color }}>{value}</div>
      <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">{sub}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard label="AI решения"         value="78%" sub="от всех действий по кандидатам" color="#6366f1" />
        <MetricCard label="Среднее время найма" value="18д" sub="↓ на 11 дней vs рынок"         color="#059669" />
        <MetricCard label="Принятых офферов"    value="84%" sub="↑ 12% vs прошлый квартал"      color="#d97706" />
        <MetricCard label="Стоимость найма"     value="$1.2К" sub="↓ 67% экономия от AI"        color="#a855f7" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 md:p-5">
          <div className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Активность по месяцам</div>
          <div className="flex gap-4 mb-3 text-[11px] flex-wrap">
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-3 h-0.5 rounded bg-[#6366f1] inline-block" /> Заявки</span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-3 h-0.5 rounded bg-emerald-500 inline-block" /> Наймы</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={ПО_МЕСЯЦАМ} margin={{ top:0, right:0, bottom:0, left:-20 }}>
              <XAxis dataKey="month" tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Line type="monotone" dataKey="applications" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="hires" stroke="#10b981" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 md:p-5">
          <div className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">AI vs Человек</div>
          <div className="flex gap-4 mb-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-2 h-2 rounded-sm inline-block bg-indigo-400" /> AI</span>
            <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]"><span className="w-2 h-2 rounded-sm inline-block bg-emerald-400" /> Человек</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={РЕШЕНИЯ} margin={{ top:0, right:0, bottom:0, left:-20 }}>
              <XAxis dataKey="action" tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"#9ca3af", fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Bar dataKey="ai" fill="#818cf8" radius={[3,3,0,0]} />
              <Bar dataKey="human" fill="#6ee7b7" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 md:p-5">
        <div className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Конверсия воронки найма</div>
        <div className="space-y-2.5">
          {ВОРОНКА.map((f) => {
            const pct = Math.round((f.count / 547) * 100);
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <div className="text-xs text-[hsl(var(--secondary-foreground))] w-28 flex-shrink-0">{f.stage}</div>
                <div className="flex-1 h-5 bg-[hsl(var(--muted))] rounded overflow-hidden">
                  <div className="h-full rounded flex items-center justify-end pr-2" style={{ width:`${pct}%`, background:f.fill }}>
                    <span className="text-[10px] font-mono font-bold text-white">{f.count}</span>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-[hsl(var(--muted-foreground))] w-8 text-right">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
