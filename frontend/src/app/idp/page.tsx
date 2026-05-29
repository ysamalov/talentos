"use client";
import { motion } from "framer-motion";
import { Sparkles, CheckCircle2, Clock, Target } from "lucide-react";

const РОАДМАП = [
  { title:"Основы и качество поставки",       desc:"Стабильно выпускать качественный код. Вести 2+ кросс-командных проекта. Менторить 1 джуниора.",                          status:"done",   duration:"Q1–Q2 2024" },
  { title:"Лидерство в проектировании систем", desc:"Принимать архитектурные решения в продуктовой области. Проектировать системы для 100K+ пользователей.",               status:"active", duration:"Q3–Q4 2024" },
  { title:"Кросс-функциональное влияние",      desc:"Формировать техническую стратегию в 3+ командах. Представлять разработку в продуктовом планировании.",                  status:"future", duration:"Q1–Q2 2025" },
  { title:"Повышение до Staff Engineer",       desc:"Признанный эксперт в организации. Вести инициативы, охватывающие несколько продуктовых команд.",                        status:"future", duration:"Q3 2025"    },
];

const НАВЫКИ = [
  { name:"MLOps",                 p:"high"   }, { name:"Проектирование систем", p:"high"   },
  { name:"Лидерство в разработке",p:"high"   }, { name:"Kubernetes",            p:"medium" },
  { name:"Технические документы", p:"medium" }, { name:"Моделирование данных",  p:"medium" },
  { name:"Менторство",            p:"low"    }, { name:"Go / Rust",             p:"low"    },
];

const КУРСЫ = [
  { name:"Designing Data-Intensive Applications", provider:"O'Reilly"        },
  { name:"AWS Solutions Architect Professional",  provider:"AWS Training"    },
  { name:"Основы инженерного менеджмента",        provider:"Coursera"        },
  { name:"ML Engineering for Production",         provider:"DeepLearning.AI" },
];

const STATUS_CFG = {
  done:   { Icon:CheckCircle2, color:"#059669", bg:"#ecfdf5" },
  active: { Icon:Target,       color:"#6366f1", bg:"#eef2ff" },
  future: { Icon:Clock,        color:"#9ca3af", bg:"#f9fafb" },
};

const PRIORITY: Record<string, string> = {
  high:   "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-gray-50 text-gray-600 border-gray-200",
};

export default function IDPPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-white border border-[hsl(var(--border))] rounded-xl flex-wrap">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-base font-bold text-white flex-shrink-0">АЧ</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[hsl(var(--foreground))]">Алекс Чен</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Senior Software Engineer → Staff Engineer</div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] border border-[hsl(var(--primary)/0.15)] px-2 py-1 rounded-full flex-shrink-0">
            <Sparkles size={9} /> AI план
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)]">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Роадмап роста</span>
          </div>
          <div className="p-4">
            {РОАДМАП.map((step, i) => {
              const cfg = STATUS_CFG[step.status as keyof typeof STATUS_CFG];
              const Icon = cfg.Icon;
              return (
                <motion.div key={i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.07 }} className="flex gap-3 relative">
                  {i < РОАДМАП.length - 1 && <div className="absolute left-[15px] top-8 w-px bg-[hsl(var(--border))]" style={{ height:"calc(100% - 8px)" }} />}
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10" style={{ background:cfg.bg }}>
                    <Icon size={14} style={{ color:cfg.color }} />
                  </div>
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[13px] font-semibold text-[hsl(var(--foreground))]">{step.title}</div>
                      <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{step.duration}</span>
                    </div>
                    <div className="text-[12px] text-[hsl(var(--secondary-foreground))] leading-relaxed mt-1">{step.desc}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)]">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Рекомендуемое обучение</span>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {КУРСЫ.map((c, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-[hsl(var(--secondary)/0.4)] transition-colors">
                <div>
                  <div className="text-[13px] font-medium text-[hsl(var(--foreground))]">{c.name}</div>
                  <div className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">{c.provider}</div>
                </div>
                <button className="text-[11px] text-[hsl(var(--primary))] hover:underline font-medium flex-shrink-0 ml-3">Открыть →</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3">Прогноз повышения</div>
          <div className="text-center py-3">
            <div className="font-mono text-4xl font-bold text-emerald-600">14 мес</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1.5">До Staff Engineer</div>
          </div>
          <div className="border-t border-[hsl(var(--border))] pt-3 mt-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[hsl(var(--muted-foreground))]">Уверенность</span>
              <span className="font-mono text-emerald-600 font-bold">82%</span>
            </div>
            <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width:"82%" }} />
            </div>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2.5 leading-relaxed">
              На основе траектории роста, потребностей команды и темпа развития навыков.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)]">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Навыки для развития</span>
          </div>
          <div className="p-3 flex flex-wrap gap-1.5">
            {НАВЫКИ.map((s) => (
              <span key={s.name} className={`text-[11px] px-2.5 py-1 rounded-full border font-medium ${PRIORITY[s.p]}`}>{s.name}</span>
            ))}
          </div>
          <div className="px-3 pb-3 flex gap-3 text-[10px] font-mono flex-wrap">
            <span className="text-red-600">■ Высокий</span>
            <span className="text-amber-600">■ Средний</span>
            <span className="text-gray-500">■ Низкий</span>
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3">Текущий уровень</div>
          <div className="space-y-2.5">
            {[
              { label:"Техническая глубина", val:88 }, { label:"Проектирование систем", val:72 },
              { label:"Лидерство",           val:61 }, { label:"Кросс-командное влияние", val:55 },
              { label:"Коммуникация",        val:79 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[hsl(var(--muted-foreground))]">{item.label}</span>
                  <span className="font-mono text-[hsl(var(--secondary-foreground))] font-medium">{item.val}%</span>
                </div>
                <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[hsl(var(--primary))]" style={{ width:`${item.val}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
