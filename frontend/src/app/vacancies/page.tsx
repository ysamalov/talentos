"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, DollarSign, Bot, Plus, X, Clock, ChevronRight, Loader2 } from "lucide-react";
import { vacanciesApi } from "@/lib/api";

interface Vacancy {
  id:string; title:string; department:string; location:string; status:string;
  seniority_level:string; salary_min:number; salary_max:number;
  required_skills:string[]; applicant_count:number; ai_screening_enabled:boolean;
  description:string; requirements:string; days_open:number;
  sources:{ linkedin:number; hh:number; direct:number; referral:number };
}

const STATUS:Record<string,string> = {
  open:"text-emerald-700 bg-emerald-50 border-emerald-200",
  paused:"text-amber-700 bg-amber-50 border-amber-200",
  closed:"text-gray-500 bg-gray-50 border-gray-200",
};
const STATUS_RU:Record<string,string> = { open:"открыта", paused:"на паузе", closed:"закрыта" };
const DEPT_COLORS:Record<string,string> = {
  Engineering:"#6366f1", Product:"#10b981", Design:"#a855f7",
  Analytics:"#f59e0b", Infrastructure:"#3b82f6", Growth:"#ef4444",
};

const MOCK:Vacancy[] = [
  { id:"1", title:"Senior Software Engineer", department:"Engineering", location:"Алматы / Удалённо", status:"open", seniority_level:"Senior", salary_min:1400000, salary_max:1800000,
    required_skills:["React","Node.js","PostgreSQL","TypeScript","AWS"], applicant_count:87, ai_screening_enabled:true, days_open:14,
    description:"Ищем опытного fullstack-инженера для основного продукта. Проектирование масштабируемых систем, менторинг команды, влияние на техническую стратегию.",
    requirements:"6+ лет коммерческого опыта. React и Node.js. PostgreSQL и AWS. Опыт с распределёнными системами.",
    sources:{ linkedin:42, hh:28, direct:10, referral:7 } },
  { id:"2", title:"Product Manager", department:"Product", location:"Астана / Удалённо", status:"open", seniority_level:"Mid", salary_min:1200000, salary_max:1500000,
    required_skills:["Стратегия продукта","Аналитика","Agile","SQL","Figma"], applicant_count:112, ai_screening_enabled:true, days_open:21,
    description:"Product Manager для B2B платформы. Работа напрямую с CEO, роадмап, взаимодействие с разработкой.",
    requirements:"3+ года в product management. Data-driven подход. SQL и BI-инструменты.",
    sources:{ linkedin:55, hh:40, direct:10, referral:7 } },
  { id:"3", title:"Data Scientist", department:"Analytics", location:"Алматы", status:"open", seniority_level:"Senior", salary_min:1300000, salary_max:1600000,
    required_skills:["Python","Machine Learning","SQL","Statistics","MLflow"], applicant_count:94, ai_screening_enabled:true, days_open:18,
    description:"Data Scientist для ML-моделей в рекомендательной системе. Большие данные, A/B тесты, деплой в продакшн.",
    requirements:"5+ лет в data science. Python, sklearn, PyTorch. Опыт деплоя. Статистика.",
    sources:{ linkedin:44, hh:35, direct:10, referral:5 } },
  { id:"4", title:"DevOps Engineer", department:"Infrastructure", location:"Шымкент / Удалённо", status:"paused", seniority_level:"Senior", salary_min:1350000, salary_max:1650000,
    required_skills:["Kubernetes","Terraform","AWS","CI/CD","Linux"], applicant_count:63, ai_screening_enabled:true, days_open:30,
    description:"DevOps для облачной инфраструктуры. Kubernetes-кластеры, автоматизация деплоя, мониторинг.",
    requirements:"4+ года DevOps/SRE. Kubernetes, Terraform обязательно. AWS или GCP.",
    sources:{ linkedin:30, hh:22, direct:7, referral:4 } },
  { id:"5", title:"UX Designer", department:"Design", location:"Алматы", status:"open", seniority_level:"Mid", salary_min:900000, salary_max:1200000,
    required_skills:["Figma","User Research","Прототипирование","Design Systems"], applicant_count:78, ai_screening_enabled:false, days_open:12,
    description:"UX Designer для мобильного приложения и веб-платформы. От исследований до финального дизайна.",
    requirements:"3+ года UX/UI. Figma. User research. Портфолио с реальными кейсами.",
    sources:{ linkedin:40, hh:25, direct:8, referral:5 } },
  { id:"6", title:"Marketing Manager", department:"Growth", location:"Астана", status:"paused", seniority_level:"Senior", salary_min:1100000, salary_max:1400000,
    required_skills:["Growth маркетинг","SEO","Performance","CRM"], applicant_count:55, ai_screening_enabled:true, days_open:25,
    description:"Marketing Manager для масштабирования пользователей. Performance-кампании, SEO, аналитика.",
    requirements:"4+ года digital маркетинга. Google Ads, Meta Ads. B2B SaaS — плюс.",
    sources:{ linkedin:28, hh:18, direct:5, referral:4 } },
];

function fmt(v:number){ return (v/1000).toFixed(0)+"K ₸"; }

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function VacancyModal({ v, onClose }:{ v:Vacancy; onClose:()=>void }) {
  const src = v.sources;
  const total = src.linkedin+src.hh+src.direct+src.referral;
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="modal-base bg-black/50" onClick={onClose}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28,stiffness:300}}
        className="modal-sheet" onClick={(e)=>e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--muted))]"/>
        </div>
        <div className="flex items-start justify-between px-4 sm:px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:DEPT_COLORS[v.department]||"#6366f1"}}/>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{v.department} · {v.seniority_level}</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[hsl(var(--foreground))] leading-snug">{v.title}</h2>
            <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1"><MapPin size={10}/> {v.location}</span>
              <span className="flex items-center gap-1"><DollarSign size={10}/> {fmt(v.salary_min)}–{fmt(v.salary_max)}</span>
              <span className="flex items-center gap-1"><Clock size={10}/> {v.days_open} дней открыта</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] flex-shrink-0"><X size={14}/></button>
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-5 pb-safe overflow-y-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[{val:v.applicant_count,lbl:"Заявок",color:"#6366f1"},{val:Math.floor(v.applicant_count*.6),lbl:"AI обработано",color:"#10b981"},{val:Math.floor(v.applicant_count*.09),lbl:"Интервью",color:"#f59e0b"}].map((s)=>(
              <div key={s.lbl} className="bg-[hsl(var(--secondary)/0.5)] rounded-xl p-2.5 text-center border border-[hsl(var(--border))]">
                <div className="font-mono font-bold text-lg" style={{color:s.color}}>{s.val}</div>
                <div className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono uppercase mt-0.5 leading-tight">{s.lbl}</div>
              </div>
            ))}
          </div>
          <div><div className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-1.5">О вакансии</div><p className="text-sm text-[hsl(var(--secondary-foreground))] leading-relaxed">{v.description}</p></div>
          <div><div className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-1.5">Требования</div><p className="text-sm text-[hsl(var(--secondary-foreground))] leading-relaxed">{v.requirements}</p></div>
          <div>
            <div className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-2">Ключевые навыки</div>
            <div className="flex flex-wrap gap-1.5">{v.required_skills.map((s)=><span key={s} className="text-[11px] bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] px-2.5 py-1 rounded-full font-medium">{s}</span>)}</div>
          </div>
          {total>0&&(
            <div>
              <div className="text-[10px] font-mono font-semibold uppercase tracking-widest mb-2">Источники</div>
              <div className="space-y-2">
                {[{label:"LinkedIn",val:src.linkedin,color:"#0077b5"},{label:"HeadHunter",val:src.hh,color:"#e8001d"},{label:"Прямые",val:src.direct,color:"#6366f1"},{label:"Рефералы",val:src.referral,color:"#10b981"}].filter(s=>s.val>0).map((s)=>(
                  <div key={s.label} className="flex items-center gap-3">
                    <div className="text-xs w-20 flex-shrink-0" style={{color:s.color}}>{s.label}</div>
                    <div className="flex-1 h-2 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${(s.val/total)*100}%`,background:s.color}}/>
                    </div>
                    <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] w-5 text-right">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {v.ai_screening_enabled&&<div className="flex items-center gap-2 p-3 bg-[hsl(var(--primary)/0.05)] border border-[hsl(var(--primary)/0.15)] rounded-xl"><Bot size={13} className="text-[hsl(var(--primary))] flex-shrink-0"/><span className="text-xs text-[hsl(var(--primary))] font-medium leading-snug">AI скрининг включён</span></div>}
          <div className="flex gap-2 pt-1">
            <button className="flex-1 bg-[hsl(var(--primary))] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90">Смотреть кандидатов</button>
            <button className="border border-[hsl(var(--border))] text-[hsl(var(--secondary-foreground))] rounded-xl px-4 py-3 text-sm hover:bg-[hsl(var(--secondary))]">Изменить</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Vacancy Modal ────────────────────────────────────────────────────────
const DEPARTMENTS = ["Engineering","Product","Design","Analytics","Infrastructure","Growth","Sales","HR","Finance","Legal"];
const SENIORITY = ["Intern","Junior","Mid","Senior","Lead","Principal","Director"];

interface AddVacancyForm {
  title:string; department:string; location:string; seniority_level:string;
  salary_min:string; salary_max:string; description:string; requirements:string;
  required_skills:string; ai_screening_enabled:boolean;
}

function AddVacancyModal({ onClose, onAdded }:{ onClose:()=>void; onAdded:(v:Vacancy)=>void }) {
  const [form, setForm] = useState<AddVacancyForm>({
    title:"", department:"Engineering", location:"", seniority_level:"Mid",
    salary_min:"", salary_max:"", description:"", requirements:"",
    required_skills:"", ai_screening_enabled:true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const set = (k: keyof AddVacancyForm, v: string|boolean) =>
    setForm(prev => ({...prev, [k]:v}));

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Название вакансии обязательно"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        department: form.department,
        location: form.location.trim() || null,
        seniority_level: form.seniority_level,
        salary_min: form.salary_min ? parseInt(form.salary_min) : null,
        salary_max: form.salary_max ? parseInt(form.salary_max) : null,
        description: form.description.trim() || null,
        requirements: form.requirements.trim() || null,
        required_skills: form.required_skills.split(",").map(s=>s.trim()).filter(Boolean),
        ai_screening_enabled: form.ai_screening_enabled,
      };
      const resp = await vacanciesApi.create(payload);
      const v = resp.data;
      // Map API response to local Vacancy shape
      const newVacancy: Vacancy = {
        id: String(v.id),
        title: v.title,
        department: v.department || form.department,
        location: v.location || form.location || "—",
        status: v.status || "open",
        seniority_level: v.seniority_level || form.seniority_level,
        salary_min: v.salary_min || parseInt(form.salary_min)||0,
        salary_max: v.salary_max || parseInt(form.salary_max)||0,
        required_skills: v.required_skills || [],
        applicant_count: 0,
        ai_screening_enabled: v.ai_screening_enabled,
        description: form.description,
        requirements: form.requirements,
        days_open: 0,
        sources: { linkedin:0, hh:0, direct:0, referral:0 },
      };
      onAdded(newVacancy);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Ошибка при создании вакансии");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-[hsl(var(--primary))] transition-colors";
  const labelCls = "block text-[10px] font-mono font-semibold uppercase tracking-widest text-[hsl(var(--muted-foreground))] mb-1";

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
      onClick={onClose}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28,stiffness:300}}
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e=>e.stopPropagation()}>

        {/* Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--muted))]"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <div>
            <h2 className="font-bold text-[hsl(var(--foreground))]">Новая вакансия</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Заполните основные поля</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center"><X size={14}/></button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className={labelCls}>Название *</label>
            <input className={inputCls} placeholder="Senior Software Engineer"
              value={form.title} onChange={e=>set("title",e.target.value)}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Отдел</label>
              <select className={inputCls} value={form.department} onChange={e=>set("department",e.target.value)}>
                {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Уровень</label>
              <select className={inputCls} value={form.seniority_level} onChange={e=>set("seniority_level",e.target.value)}>
                {SENIORITY.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Локация</label>
            <input className={inputCls} placeholder="Алматы / Удалённо"
              value={form.location} onChange={e=>set("location",e.target.value)}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Зарплата от (₸)</label>
              <input className={inputCls} type="number" placeholder="1000000"
                value={form.salary_min} onChange={e=>set("salary_min",e.target.value)}/>
            </div>
            <div>
              <label className={labelCls}>Зарплата до (₸)</label>
              <input className={inputCls} type="number" placeholder="1500000"
                value={form.salary_max} onChange={e=>set("salary_max",e.target.value)}/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Навыки (через запятую)</label>
            <input className={inputCls} placeholder="React, TypeScript, Node.js"
              value={form.required_skills} onChange={e=>set("required_skills",e.target.value)}/>
          </div>

          <div>
            <label className={labelCls}>Описание</label>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Краткое описание вакансии..."
              value={form.description} onChange={e=>set("description",e.target.value)}/>
          </div>

          <div>
            <label className={labelCls}>Требования</label>
            <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Опыт, технологии, образование..."
              value={form.requirements} onChange={e=>set("requirements",e.target.value)}/>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-9 h-5 rounded-full transition-colors relative ${form.ai_screening_enabled?"bg-[hsl(var(--primary))]":"bg-[hsl(var(--muted))]"}`}
              onClick={()=>set("ai_screening_enabled",!form.ai_screening_enabled)}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ai_screening_enabled?"translate-x-4":"translate-x-0.5"}`}/>
            </div>
            <span className="text-sm text-[hsl(var(--foreground))]">AI скрининг</span>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Автоматически скринировать кандидатов</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[hsl(var(--border))] flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-[hsl(var(--border))] text-[hsl(var(--secondary-foreground))] rounded-xl py-2.5 text-sm hover:bg-[hsl(var(--secondary))] transition-colors">
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[hsl(var(--primary))] text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Создание...</> : "Создать вакансию"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>(MOCK);
  const [selected, setSelected] = useState<Vacancy|null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const counts = {
    open: vacancies.filter(v=>v.status==="open").length,
    paused: vacancies.filter(v=>v.status==="paused").length,
    closed: vacancies.filter(v=>v.status==="closed").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {(["open","paused","closed"] as const).map((s)=>(
            <span key={s} className={`text-[11px] font-mono px-2.5 py-1 rounded-full border font-medium ${STATUS[s]}`}>
              {counts[s]} {STATUS_RU[s]}
            </span>
          ))}
        </div>
        <button onClick={()=>setShowAdd(true)}
          className="flex items-center gap-1.5 bg-[hsl(var(--primary))] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-90 transition-opacity">
          <Plus size={13}/> Новая вакансия
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {vacancies.map((v,i)=>(
          <motion.div key={v.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*.04}}
            onClick={()=>setSelected(v)}
            className="bg-white border border-[hsl(var(--border))] rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-[hsl(var(--primary)/0.3)] transition-all group active:scale-[.99]">
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{background:DEPT_COLORS[v.department]||"#6366f1"}}/>
                <span className="text-xs text-[hsl(var(--muted-foreground))]">{v.department}</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${STATUS[v.status]||STATUS.open}`}>{STATUS_RU[v.status]||"открыта"}</span>
            </div>
            <h3 className="font-semibold text-sm text-[hsl(var(--foreground))] mb-1 leading-snug group-hover:text-[hsl(var(--primary))] transition-colors">{v.title}</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 line-clamp-2 leading-relaxed">{v.description||"—"}</p>
            <div className="flex flex-wrap gap-2 mb-3 text-[11px] text-[hsl(var(--muted-foreground))]">
              {v.location&&<span className="flex items-center gap-1"><MapPin size={10}/>{v.location}</span>}
              {(v.salary_min||v.salary_max)&&<span className="flex items-center gap-1"><DollarSign size={10}/>{v.salary_min?fmt(v.salary_min):"?"} – {v.salary_max?fmt(v.salary_max):"?"}</span>}
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {v.required_skills.slice(0,3).map((s)=><span key={s} className="text-[10px] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] px-2 py-0.5 rounded-full border border-[hsl(var(--border))]">{s}</span>)}
              {v.required_skills.length>3&&<span className="text-[10px] text-[hsl(var(--muted-foreground))]">+{v.required_skills.length-3}</span>}
            </div>
            {v.ai_screening_enabled&&<div className="flex items-center gap-1 text-[10px] text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.06)] px-2 py-1 rounded-md mb-3 w-fit"><Bot size={10}/> AI скрининг</div>}
            <div className="flex justify-between items-center pt-3 border-t border-[hsl(var(--border))]">
              {[{val:v.applicant_count,lbl:"заявок"},{val:Math.floor(v.applicant_count*.6),lbl:"обработано"},{val:Math.floor(v.applicant_count*.09),lbl:"интервью"}].map((s)=>(
                <div key={s.lbl} className="text-center"><div className="font-mono font-bold text-sm">{s.val}</div><div className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono">{s.lbl}</div></div>
              ))}
              <ChevronRight size={13} className="text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] transition-colors"/>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selected&&<VacancyModal v={selected} onClose={()=>setSelected(null)}/>}
        {showAdd&&<AddVacancyModal onClose={()=>setShowAdd(false)} onAdded={(v)=>setVacancies(prev=>[v,...prev])}/>}
      </AnimatePresence>
    </div>
  );
}
