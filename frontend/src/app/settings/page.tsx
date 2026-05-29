"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Linkedin, Globe, RefreshCw, CheckCircle, AlertCircle, Sliders, Bot, Bell, Users } from "lucide-react";

// ─── Типы ────────────────────────────────────────────────────────────────────
interface Weights { skills: number; experience: number; seniority: number; culture: number; }
interface Integration { id: string; name: string; icon: React.ReactNode; connected: boolean; color: string; description: string; last_sync?: string; candidates_imported?: number; }

const DEFAULT_WEIGHTS: Weights = { skills: 35, experience: 30, seniority: 20, culture: 15 };

const INTEGRATIONS: Integration[] = [
  { id:"linkedin", name:"LinkedIn Recruiter", icon:<Linkedin size={18} />, connected:false, color:"#0077b5",
    description:"Импорт кандидатов из LinkedIn. Синхронизация профилей, навыков, опыта работы.", candidates_imported:0 },
  { id:"hh", name:"HeadHunter (hh.ru/kz)", icon:<Globe size={18} />, connected:true, color:"#e8001d",
    description:"Интеграция с крупнейшей платформой по найму в СНГ. Авто-импорт резюме.", last_sync:"28.05.2025 14:30", candidates_imported:184 },
  { id:"hhkz", name:"HeadHunter Kazakhstan", icon:<Globe size={18} />, connected:false, color:"#c0392b",
    description:"Локальная версия HeadHunter для казахстанского рынка труда.", candidates_imported:0 },
  { id:"superjob", name:"SuperJob", icon:<Globe size={18} />, connected:false, color:"#f97316",
    description:"SuperJob — российская платформа поиска работы.", candidates_imported:0 },
];

// ─── Компонент слайдера веса ─────────────────────────────────────────────────
function WeightSlider({ label, description, value, onChange, color }: {
  label: string; description: string; value: number;
  onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <div>
          <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{label}</div>
          <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{description}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          <span className="font-mono text-2xl font-bold" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="mt-3">
        <input type="range" min={5} max={60} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }} />
        <div className="flex justify-between text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-1">
          <span>5%</span><span>60%</span>
        </div>
      </div>
    </div>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────
export default function SettingsPage() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"scoring"|"integrations"|"ai"|"notifications">("scoring");
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [syncing, setSyncing] = useState<string|null>(null);

  const total = weights.skills + weights.experience + weights.seniority + weights.culture;
  const isValid = total === 100;

  const setWeight = (key: keyof Weights) => (val: number) => {
    setWeights((w) => ({ ...w, [key]: val }));
    setSaved(false);
  };

  const normalize = () => {
    const sum = weights.skills + weights.experience + weights.seniority + weights.culture;
    if (sum === 0) return;
    setWeights({
      skills:    Math.round(weights.skills    / sum * 100),
      experience:Math.round(weights.experience/ sum * 100),
      seniority: Math.round(weights.seniority / sum * 100),
      culture:   100 - Math.round(weights.skills/sum*100) - Math.round(weights.experience/sum*100) - Math.round(weights.seniority/sum*100),
    });
  };

  const saveWeights = () => {
    if (!isValid) { normalize(); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const toggleIntegration = (id: string) => {
    setIntegrations((list) => list.map((i) => i.id === id ? { ...i, connected: !i.connected } : i));
  };

  const syncNow = async (id: string) => {
    setSyncing(id);
    await new Promise((r) => setTimeout(r, 2000));
    setIntegrations((list) => list.map((i) => i.id === id ? {
      ...i, last_sync: new Date().toLocaleString("ru-RU", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }),
      candidates_imported: (i.candidates_imported||0) + Math.floor(Math.random()*20+5),
    } : i));
    setSyncing(null);
  };

  const TABS = [
    { id:"scoring",       label:"Веса оценки",    icon:<Sliders size={14} /> },
    { id:"integrations",  label:"Интеграции",     icon:<Globe size={14} /> },
    { id:"ai",            label:"AI настройки",   icon:<Bot size={14} /> },
    { id:"notifications", label:"Уведомления",    icon:<Bell size={14} /> },
  ];

  return (
    <div className="max-w-3xl w-full">
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[hsl(var(--secondary))] p-1 rounded-xl border border-[hsl(var(--border))] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center
              ${activeTab===t.id ? "bg-white text-[hsl(var(--foreground))] shadow-sm" : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Веса оценки ─────────────────────────────────────────────────────── */}
      {activeTab === "scoring" && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="space-y-4">
          <div className="bg-[hsl(var(--primary)/0.04)] border border-[hsl(var(--primary)/0.15)] rounded-xl p-4 mb-2">
            <div className="flex items-start gap-3">
              <Bot size={15} className="text-[hsl(var(--primary))] mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">Как работает ранжирование</div>
                <p className="text-xs text-[hsl(var(--secondary-foreground))] leading-relaxed">
                  AI-оценка кандидата — взвешенная сумма четырёх компонентов. Каждый компонент (0–100) умножается на его вес, итого даёт финальный балл 0–100.
                  Формула: <code className="bg-white px-1 py-0.5 rounded border border-[hsl(var(--border))] font-mono text-[10px]">Оценка = Навыки×{weights.skills}% + Опыт×{weights.experience}% + Уровень×{weights.seniority}% + Культура×{weights.culture}%</code>
                  <br />Плюс семантическое сходство резюме и вакансии (cosine similarity на эмбеддингах, вес 20%).
                </p>
              </div>
            </div>
          </div>

          {/* Сумма */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${isValid ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <span className={`text-xs font-medium ${isValid ? "text-emerald-700" : "text-amber-700"}`}>
              {isValid ? "✓ Сумма весов = 100% — корректно" : `⚠ Сумма весов = ${total}% — должна быть 100%`}
            </span>
            {!isValid && (
              <button onClick={normalize} className="text-xs text-amber-700 font-semibold underline">Нормализовать</button>
            )}
          </div>

          <WeightSlider label="Навыки" description="Совпадение hard skills кандидата с требованиями вакансии"
            value={weights.skills} onChange={setWeight("skills")} color="#6366f1" />
          <WeightSlider label="Опыт" description="Релевантность опыта работы и его продолжительность"
            value={weights.experience} onChange={setWeight("experience")} color="#10b981" />
          <WeightSlider label="Уровень должности" description="Соответствие сeniority-уровня кандидата и вакансии"
            value={weights.seniority} onChange={setWeight("seniority")} color="#f59e0b" />
          <WeightSlider label="Культурный фит" description="Совместимость ценностей, стиля работы и мотивации"
            value={weights.culture} onChange={setWeight("culture")} color="#a855f7" />

          {/* Визуализация весов */}
          <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
            <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3 font-mono uppercase tracking-widest">Распределение весов</div>
            <div className="flex h-6 rounded-full overflow-hidden gap-0.5">
              {[
                { val:weights.skills,    color:"#6366f1", label:"Навыки" },
                { val:weights.experience,color:"#10b981", label:"Опыт" },
                { val:weights.seniority, color:"#f59e0b", label:"Уровень" },
                { val:weights.culture,   color:"#a855f7", label:"Культура" },
              ].map((s) => (
                <div key={s.label} title={`${s.label}: ${s.val}%`} className="rounded-sm transition-all"
                  style={{ width:`${s.val}%`, background:s.color }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {[{l:"Навыки",v:weights.skills,c:"#6366f1"},{l:"Опыт",v:weights.experience,c:"#10b981"},{l:"Уровень",v:weights.seniority,c:"#f59e0b"},{l:"Культура",v:weights.culture,c:"#a855f7"}].map((s)=>(
                <span key={s.l} className="flex items-center gap-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background:s.c }} /> {s.l} {s.v}%
                </span>
              ))}
            </div>
          </div>

          <button onClick={saveWeights}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${saved ? "bg-emerald-500 text-white" : "bg-[hsl(var(--primary))] text-white hover:opacity-90"}`}>
            {saved ? <><CheckCircle size={14} /> Сохранено!</> : <><Save size={14} /> Сохранить веса</>}
          </button>
        </motion.div>
      )}

      {/* ── Интеграции ───────────────────────────────────────────────────────── */}
      {activeTab === "integrations" && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 mb-4">
            <AlertCircle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              <strong>Mock-интеграция</strong> — данные демонстрационные. В продакшне подключаются через OAuth и официальные API каждой платформы.
            </p>
          </div>

          {integrations.map((intg) => (
            <div key={intg.id} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ background:intg.color }}>
                    {intg.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[hsl(var(--foreground))]">{intg.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{intg.description}</div>
                    {intg.connected && (
                      <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-[hsl(var(--muted-foreground))]">
                        {intg.last_sync && <span>Синхр.: {intg.last_sync}</span>}
                        {intg.candidates_imported ? <span className="text-emerald-600">↑ {intg.candidates_imported} кандидатов</span> : null}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {intg.connected && (
                    <button onClick={() => syncNow(intg.id)} disabled={syncing === intg.id}
                      className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] px-2.5 py-1.5 rounded-lg hover:bg-[hsl(var(--primary)/0.05)] disabled:opacity-50 transition-colors">
                      <RefreshCw size={11} className={syncing===intg.id?"animate-spin":""} />
                      {syncing===intg.id?"Синхр...":"Обновить"}
                    </button>
                  )}
                  <button onClick={() => toggleIntegration(intg.id)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors
                      ${intg.connected
                        ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        : "bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))] hover:opacity-90"}`}>
                    {intg.connected ? "Отключить" : "Подключить"}
                  </button>
                </div>
              </div>
              {intg.connected && (
                <div className="mt-3 pt-3 border-t border-[hsl(var(--border))] grid grid-cols-3 gap-3">
                  {[{lbl:"Статус", val:"Активна"},{lbl:"Кандидатов", val:String(intg.candidates_imported||0)},{lbl:"Автосинхр.", val:"Каждые 6ч"}].map((s) => (
                    <div key={s.lbl} className="text-center">
                      <div className="font-mono text-sm font-bold text-[hsl(var(--foreground))]">{s.val}</div>
                      <div className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono uppercase">{s.lbl}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* ── AI настройки ─────────────────────────────────────────────────────── */}
      {activeTab === "ai" && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="space-y-4">
          {[
            { label:"Модель по умолчанию", value:"Claude 3.5 Sonnet", options:["Claude 3.5 Sonnet","GPT-4o","Gemini Pro 1.5"] },
            { label:"Порог авто-отказа", value:"40", options:["30","40","50","60"] },
            { label:"Язык скрининга", value:"Русский", options:["Русский","Казахский","Английский"] },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
              <label className="text-xs font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest block mb-2">{item.label}</label>
              <select defaultValue={item.value} className="w-full bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))]">
                {item.options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          {[
            { label:"Автоматический скрининг новых заявок", desc:"AI автоматически запускает скрининг при поступлении резюме", defaultChecked:true },
            { label:"Авто-отказ при низкой оценке", desc:"Отправлять отказ кандидатам ниже порогового балла автоматически", defaultChecked:true },
            { label:"Генерация вопросов для интервью", desc:"AI генерирует вопросы на основе резюме и требований вакансии", defaultChecked:true },
            { label:"Семантический поиск по базе кандидатов", desc:"Использовать векторные эмбеддинги для поиска похожих кандидатов", defaultChecked:false },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-0.5">
                <input type="checkbox" defaultChecked={item.defaultChecked} className="sr-only peer" />
                <div className="w-9 h-5 bg-[hsl(var(--muted))] peer-checked:bg-[hsl(var(--primary))] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
          <button className="w-full bg-[hsl(var(--primary))] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Save size={14} /> Сохранить AI настройки
          </button>
        </motion.div>
      )}

      {/* ── Уведомления ──────────────────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} className="space-y-3">
          {[
            { label:"Новая заявка на вакансию", desc:"При поступлении нового резюме" },
            { label:"Кандидат прошёл AI скрининг", desc:"Когда AI завершил оценку кандидата" },
            { label:"Высокий AI балл (80+)", desc:"Кандидат получил оценку выше 80 баллов" },
            { label:"Назначено интервью", desc:"При создании или изменении расписания интервью" },
            { label:"Оффер принят / отклонён", desc:"Изменение статуса оффера" },
            { label:"Ежедневный дайджест", desc:"Сводка активности за день на email" },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-[hsl(var(--foreground))]">{item.label}</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-9 h-5 bg-[hsl(var(--muted))] peer-checked:bg-[hsl(var(--primary))] rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
          <button className="w-full bg-[hsl(var(--primary))] text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
            <Save size={14} /> Сохранить уведомления
          </button>
        </motion.div>
      )}
    </div>
  );
}
