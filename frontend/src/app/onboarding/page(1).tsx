"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

const INIT = [
  { text:"Заполнить трудовой договор и форму И-9",              tag:"HR · День 1",       done:true  },
  { text:"Настроить ноутбук, аккаунты и рабочее окружение",     tag:"IT · День 1",       done:true  },
  { text:"Познакомиться с руководителем и командой",            tag:"Культура · День 1", done:true  },
  { text:"Изучить продуктовый роадмап и OKR с CPO",             tag:"Стратегия · День 2",done:false },
  { text:"Пройти обучение по безопасности и комплаенсу",        tag:"Юридич. · День 2",  done:false },
  { text:"Наблюдать за 3 customer discovery звонками",          tag:"Продукт · День 3",  done:false },
  { text:"Назначить 1:1 с 5 ключевыми стейкхолдерами",         tag:"Нетворк · День 4",  done:false },
  { text:"Презентовать 30-дневный план руководству",            tag:"Неделя 2",          done:false },
];

const ЦЕЛИ = [
  { period:"30 дней — Изучение", color:"#6366f1", borderColor:"#c7d2fe",
    text:"Составить карту всех стейкхолдеров. Посетить 3+ интервью с пользователями. Глубокий анализ продуктовой аналитики. Презентовать наблюдения CPO." },
  { period:"60 дней — Вклад", color:"#d97706", borderColor:"#fde68a",
    text:"Взять в работу первую фичу end-to-end. Выстроить еженедельные ревью метрик. Выстроить отношения с 5+ тимлидами. Предложить корректировки роадмапа." },
  { period:"90 дней — Лидерство", color:"#059669", borderColor:"#a7f3d0",
    text:"Выпустить первую фичу. Презентовать роадмап Q3 руководству. Показать измеримый эффект на 2+ KPI. Полная автономия в своей зоне ответственности." },
];

export default function OnboardingPage() {
  const [checklist, setChecklist] = useState(INIT);
  const toggle = (i: number) => setChecklist((c) => c.map((item, idx) => idx === i ? { ...item, done: !item.done } : item));
  const done = checklist.filter((c) => c.done).length;
  const pct = Math.round((done / checklist.length) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-white border border-[hsl(var(--border))] rounded-xl">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-base font-bold text-white flex-shrink-0">ПН</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[hsl(var(--foreground))]">Прия Наир</div>
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Product Manager · Выход: 3 июня 2025</div>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">● Нанята</span>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Прогресс 1-й недели</span>
            <span className="text-xs font-mono text-[hsl(var(--primary))] font-semibold">{done}/{checklist.length}</span>
          </div>
          <div className="h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden mb-1">
            <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }} className="h-full rounded-full bg-[hsl(var(--primary))]" transition={{ duration:0.6 }} />
          </div>
          <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">{pct}% выполнено</div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)]">
            <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Чеклист первой недели</span>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--primary))]"><Sparkles size={10} /> Создан AI</div>
          </div>
          <div className="divide-y divide-[hsl(var(--border))]">
            {checklist.map((item, i) => (
              <motion.div key={i} whileTap={{ scale:0.98 }}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-[hsl(var(--secondary)/0.4)] transition-colors"
                onClick={() => toggle(i)}>
                <div className="mt-0.5 flex-shrink-0">
                  {item.done ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Circle size={16} className="text-[hsl(var(--muted-foreground))]" />}
                </div>
                <div>
                  <div className={`text-[13px] leading-snug ${item.done ? "text-[hsl(var(--muted-foreground))] line-through" : "text-[hsl(var(--foreground))]"}`}>{item.text}</div>
                  <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-0.5">{item.tag}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.4)]">
          <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Цели на 30/60/90 дней</span>
          <div className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--primary))]"><Sparkles size={10} /> Создан AI</div>
        </div>
        <div className="p-4 space-y-5">
          {ЦЕЛИ.map((g, i) => (
            <motion.div key={i} initial={{ opacity:0, x:8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.1 }}>
              <div className="text-[11px] font-mono font-bold mb-2 tracking-wide uppercase" style={{ color:g.color }}>{g.period}</div>
              <div className="text-[13px] text-[hsl(var(--secondary-foreground))] leading-relaxed pl-3 border-l-2" style={{ borderColor:g.borderColor }}>{g.text}</div>
              {i < ЦЕЛИ.length - 1 && <div className="border-b border-[hsl(var(--border))] mt-5" />}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
