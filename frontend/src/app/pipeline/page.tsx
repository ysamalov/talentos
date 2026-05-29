"use client";
import { motion } from "framer-motion";

interface KCard { n: string; r: string; s: number; c: string; }

const STAGES: Record<string, KCard[]> = {
  "Заявка":        [{ n:"Дэвид Ким", r:"DevOps", s:71, c:"#3b82f6" }, { n:"Том Уилсон", r:"SWE", s:55, c:"#9ca3af" }, { n:"Лин Вэй", r:"PM", s:63, c:"#10b981" }],
  "AI Скрининг":   [{ n:"Мария Сантос", r:"PM", s:88, c:"#10b981" }, { n:"Крис Эванс", r:"SWE", s:77, c:"#6366f1" }],
  "HR Ревью":      [{ n:"Джеймс Пак", r:"Data", s:79, c:"#f59e0b" }, { n:"Айша Джонсон", r:"Data", s:86, c:"#10b981" }],
  "Интервью":      [{ n:"Алекс Чен", r:"SWE", s:91, c:"#6366f1" }, { n:"Рэйчел Ким", r:"Design", s:84, c:"#a855f7" }],
  "Тех. интервью": [{ n:"Сара Лю", r:"SWE", s:84, c:"#ec4899" }],
  "Оффер":         [{ n:"Прия Наир", r:"UX", s:93, c:"#a855f7" }],
  "Нанят":         [{ n:"Марк Дэвис", r:"Eng", s:95, c:"#10b981" }],
  "Отказ":         [{ n:"М. Браун", r:"Маркетинг", s:42, c:"#9ca3af" }],
};

function scoreColor(s: number) {
  return s >= 85 ? "#059669" : s >= 70 ? "#d97706" : "#dc2626";
}

export default function PipelinePage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-sm text-[hsl(var(--muted-foreground))]">Вакансия:</span>
        <select className="bg-white border border-[hsl(var(--border))] rounded-lg px-3 py-1.5 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]">
          <option>Senior Software Engineer</option>
          <option>Product Manager</option>
          <option>Data Scientist</option>
        </select>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] ai-pulse flex-shrink-0" />
          <span className="text-[11px] font-mono text-[hsl(var(--primary))]">AI сортировка активна</span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0" style={{ minHeight: 380 }}>
        {Object.entries(STAGES).map(([stage, cards]) => (
          <div key={stage} className="flex-shrink-0 w-44 md:w-48 bg-[hsl(var(--secondary))] rounded-xl overflow-hidden border border-[hsl(var(--border))]">
            <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-[hsl(var(--border))]">
              <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] truncate">{stage}</span>
              <span className="text-[10px] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded-full font-mono flex-shrink-0 ml-1">{cards.length}</span>
            </div>
            <div className="p-2 space-y-2">
              {cards.map((c, i) => (
                <motion.div key={c.n} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className="bg-white border border-[hsl(var(--border))] rounded-lg p-2.5 cursor-pointer hover:shadow-sm hover:border-[hsl(var(--border-strong))] transition-all">
                  <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-0.5 truncate">{c.n}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))] mb-2">{c.r}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold" style={{ color: scoreColor(c.s) }}>{c.s}/100</span>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: c.c }}>
                      {c.n.split(" ").map((x: string) => x[0]).join("")}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
