"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Download, X, Bot, AlertTriangle, CheckCircle, Video, Brain, Copy, ExternalLink, Loader2, Plus, User } from "lucide-react";
import { tokensApi, candidatesApi, vacanciesApi } from "@/lib/api";

interface ScoreBreakdown {
  skills:number; experience:number; seniority:number; culture:number;
  weights:{skills:number;experience:number;seniority:number;culture:number};
  strengths:string[]; risks:string[]; missing_skills:string[];
  recommendation:string; summary:string;
}
interface Candidate {
  id:string; full_name:string; initials:string; role:string;
  score:number; skills:number; stage:string; color:string;
  location:string; source:string; experience_years:number;
  expected_salary:number; breakdown:ScoreBreakdown; skills_list:string[];
  vacancy_id:string;
  candidate_id?:string; // real Candidate UUID (id is CandidateVacancy.id when loaded from API)
}

const STAGE:Record<string,string> = {
  applied:"bg-blue-50 text-blue-700 border-blue-200",
  ai_screening:"bg-indigo-50 text-indigo-700 border-indigo-200",
  hr_review:"bg-purple-50 text-purple-700 border-purple-200",
  interview:"bg-amber-50 text-amber-700 border-amber-200",
  technical_interview:"bg-orange-50 text-orange-700 border-orange-200",
  offer:"bg-emerald-50 text-emerald-700 border-emerald-200",
  hired:"bg-green-50 text-green-700 border-green-200",
  rejected:"bg-red-50 text-red-600 border-red-200",
};
const STAGE_RU:Record<string,string> = {
  applied:"Заявка",ai_screening:"AI скрининг",hr_review:"HR ревью",
  interview:"Интервью",technical_interview:"Тех. интервью",
  offer:"Оффер",hired:"Нанят",rejected:"Отказ",
};
const SRC_RU:Record<string,string> = {linkedin:"LinkedIn",hh:"HeadHunter",referral:"Реферал",direct:"Прямая"};
const SRC_ICON:Record<string,string> = {linkedin:"🔵",hh:"🔴",referral:"🟢",direct:"🟣"};

const MOCK:Candidate[] = [
  { id:"1", vacancy_id:"v1", full_name:"Алибек Жақсыбеков",initials:"АЖ",role:"Senior Software Engineer",score:91,skills:94,stage:"interview",color:"#6366f1",
    location:"Алматы",source:"linkedin",experience_years:7,expected_salary:1600000,
    skills_list:["React","Node.js","PostgreSQL","TypeScript","Redis","Docker"],
    breakdown:{skills:94,experience:90,seniority:92,culture:85,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["7 лет fullstack опыта","Опыт с высоконагруженными системами","Fintech бэкграунд совпадает"],
      risks:["Ожидания (₸1.6M) на 8% выше бюджета"],missing_skills:["Kubernetes","Terraform"],
      recommendation:"Настоятельно рекомендуем",summary:"Сильный fullstack с релевантным fintech опытом. Высокое совпадение по навыкам (94%). Небольшой пробел по DevOps — не критично. Рекомендуем к тех. интервью."} },
  { id:"2", vacancy_id:"v2", full_name:"Айгерим Сейткали",initials:"АС",role:"Product Manager",score:88,skills:89,stage:"ai_screening",color:"#10b981",
    location:"Астана",source:"hh",experience_years:5,expected_salary:1400000,
    skills_list:["Стратегия продукта","SQL","Figma","Agile","A/B тесты"],
    breakdown:{skills:89,experience:85,seniority:88,culture:90,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["Опыт в B2B SaaS","Высокий культурный фит 90%","Аналитический подход"],
      risks:["Нет опыта в международных командах"],missing_skills:["Mixpanel"],
      recommendation:"Рекомендуем",summary:"Опытный PM с фокусом на данных. Культурный фит 90% — один из лучших. Рекомендуем к HR-интервью."} },
  { id:"3", vacancy_id:"v3", full_name:"Нурсултан Бекенов",initials:"НБ",role:"Data Scientist",score:79,skills:82,stage:"hr_review",color:"#f59e0b",
    location:"Алматы",source:"referral",experience_years:4,expected_salary:1300000,
    skills_list:["Python","Machine Learning","SQL","PyTorch","Statistics"],
    breakdown:{skills:82,experience:74,seniority:78,culture:82,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["ML-публикации","Опыт деплоя моделей"],
      risks:["Опыт (4г) ниже Senior уровня","Нет MLflow"],missing_skills:["MLflow","Feast","Spark"],
      recommendation:"Возможно",summary:"Технически сильный, но недостаточно опыта для Senior. Можно рассмотреть на Middle."} },
  { id:"4", vacancy_id:"v4", full_name:"Дильназ Омарова",initials:"ДО",role:"UX Designer",score:93,skills:96,stage:"offer",color:"#a855f7",
    location:"Алматы",source:"linkedin",experience_years:6,expected_salary:1150000,
    skills_list:["Figma","User Research","Design Systems","Motion Design"],
    breakdown:{skills:96,experience:91,seniority:93,culture:88,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["Портфолио мирового уровня","Design system с нуля","Топовые европейские стартапы"],
      risks:["Требует релокацию"],missing_skills:[],
      recommendation:"Настоятельно рекомендуем",summary:"Исключительный кандидат. 96% совпадение — лучший результат в потоке. Готова к релокации."} },
  { id:"5", vacancy_id:"v5", full_name:"Тимур Абдрахманов",initials:"ТА",role:"DevOps Engineer",score:71,skills:74,stage:"applied",color:"#3b82f6",
    location:"Шымкент",source:"hh",experience_years:3,expected_salary:1000000,
    skills_list:["Docker","CI/CD","Linux","Nginx","Git"],
    breakdown:{skills:74,experience:65,seniority:70,culture:75,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["Базовые DevOps навыки","Open source активность"],
      risks:["Нет Kubernetes и Terraform","Опыт ниже необходимого"],missing_skills:["Kubernetes","Terraform","AWS"],
      recommendation:"Возможно",summary:"Хороший потенциал, но не дотягивает по ключевым требованиям. Рассмотреть через 1–2 года."} },
  { id:"6", vacancy_id:"v1", full_name:"Сабина Касымова",initials:"СК",role:"Senior Software Engineer",score:84,skills:87,stage:"technical_interview",color:"#ec4899",
    location:"Алматы",source:"linkedin",experience_years:5,expected_salary:1500000,
    skills_list:["React","TypeScript","GraphQL","PostgreSQL","AWS","Jest"],
    breakdown:{skills:87,experience:82,seniority:83,culture:85,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["Сильный frontend + бэкенд","Опыт в продуктовых компаниях"],
      risks:["Нет опыта с высокой нагрузкой >10M DAU"],missing_skills:["Node.js","Redis"],
      recommendation:"Рекомендуем",summary:"Хороший fullstack с фокусом на frontend. 87% совпадение. Рекомендуем к техническому интервью."} },
  { id:"7", vacancy_id:"v2", full_name:"Максат Жунусов",initials:"МЖ",role:"Marketing Manager",score:62,skills:65,stage:"rejected",color:"#9ca3af",
    location:"Алматы",source:"hh",experience_years:2,expected_salary:900000,
    skills_list:["SMM","Canva","Email маркетинг"],
    breakdown:{skills:65,experience:52,seniority:58,culture:70,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["Коммуникативные навыки"],
      risks:["Критически мало опыта (2г из 4+)","Нет performance маркетинга","Нет B2B опыта"],missing_skills:["Google Ads","Meta Ads","SEO","CRM"],
      recommendation:"Отказ",summary:"Не соответствует требованиям. Недостаточно опыта, отсутствуют ключевые навыки."} },
  { id:"8", vacancy_id:"v3", full_name:"Жансая Тулеубаева",initials:"ЖТ",role:"Data Scientist",score:86,skills:91,stage:"hr_review",color:"#10b981",
    location:"Астана",source:"referral",experience_years:5,expected_salary:1350000,
    skills_list:["Python","PyTorch","SQL","MLflow","NLP","Spark"],
    breakdown:{skills:91,experience:84,seniority:85,culture:80,weights:{skills:35,experience:30,seniority:20,culture:15},
      strengths:["NLP специализация — редкий навык","MLflow — точное совпадение","Реферал от сотрудника"],
      risks:["Нет опыта в системах >1M пользователей"],missing_skills:["Feast","Airflow"],
      recommendation:"Рекомендуем",summary:"Сильный кандидат с нужной специализацией. NLP+MLflow — редкое совпадение. Реферальный найм снижает риски."} },
];

const REC_STYLE:Record<string,string> = {
  "Настоятельно рекомендуем":"bg-emerald-50 text-emerald-700 border-emerald-200",
  "Рекомендуем":"bg-blue-50 text-blue-700 border-blue-200",
  "Возможно":"bg-amber-50 text-amber-700 border-amber-200",
  "Отказ":"bg-red-50 text-red-600 border-red-200",
};

function ScoreColor(v:number){ return v>=85?"#059669":v>=70?"#d97706":"#dc2626"; }

// ─── Token Link Modal ─────────────────────────────────────────────────────────
function TokenLinkModal({ type, link, onClose }: { type: "ai_screening"|"video_presentation"; link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${typeof window !== "undefined" ? window.location.origin : ""}${link}`;

  const copy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}>
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type==="ai_screening"?"bg-indigo-100":"bg-purple-100"}`}>
            {type==="ai_screening" ? <Brain size={20} className="text-indigo-600"/> : <Video size={20} className="text-purple-600"/>}
          </div>
          <div>
            <h3 className="font-bold text-[hsl(var(--foreground))] text-sm">
              {type==="ai_screening" ? "Ссылка на AI скрининг" : "Ссылка на видеопрезентацию"}
            </h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Действует 7 дней</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center">
            <X size={12}/>
          </button>
        </div>

        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
          {type==="ai_screening"
            ? "Отправьте эту ссылку кандидату для прохождения AI-скрининга. Ответы будут записаны и проанализированы."
            : "Отправьте эту ссылку кандидату для записи видеопрезентации. AI проанализирует речь и скорректирует итоговый балл."}
        </p>

        <div className="bg-[hsl(var(--secondary))] rounded-xl p-3 flex items-center gap-2 mb-4">
          <code className="text-xs text-[hsl(var(--foreground))] flex-1 truncate font-mono">{fullUrl}</code>
          <button onClick={copy}
            className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${copied?"bg-emerald-100 text-emerald-700":"bg-white border border-[hsl(var(--border))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]"}`}>
            {copied ? <CheckCircle size={11}/> : <Copy size={11}/>}
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>

        <a href={link} target="_blank" rel="noopener noreferrer"
          className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 ${type==="ai_screening"?"bg-indigo-600":"bg-purple-600"}`}>
          <ExternalLink size={14}/> Открыть ссылку
        </a>
      </motion.div>
    </motion.div>
  );
}

// ─── Candidate Modal ───────────────────────────────────────────────────────────
function CandidateModal({c,onClose}:{c:Candidate;onClose:()=>void}) {
  const b = c.breakdown;
  const overall = Math.round(b.skills*(b.weights.skills/100)+b.experience*(b.weights.experience/100)+b.seniority*(b.weights.seniority/100)+b.culture*(b.weights.culture/100));

  const [loadingScreening, setLoadingScreening] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [tokenModal, setTokenModal] = useState<{type:"ai_screening"|"video_presentation";link:string}|null>(null);

  const handleGenerateToken = async (type: "ai_screening"|"video_presentation") => {
    const setter = type === "ai_screening" ? setLoadingScreening : setLoadingVideo;
    setter(true);
    try {
      // In demo mode (no real API), generate a mock token link
      let link: string;
      try {
        const resp = await tokensApi.generate(c.candidate_id || c.id, c.vacancy_id, type);
        link = resp.data.link;
      } catch (apiErr: any) {
        alert(`Не удалось создать ссылку: ${apiErr?.response?.data?.detail || apiErr?.message || "Ошибка сервера"}`);
        setter(false);
        return;
      }
      setTokenModal({ type, link });
    } finally {
      setter(false);
    }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="modal-base bg-black/50" onClick={onClose}>
      <motion.div initial={{y:"100%"}} animate={{y:0}} exit={{y:"100%"}}
        transition={{type:"spring",damping:28,stiffness:300}}
        className="modal-sheet" onClick={(e)=>e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--muted))]"/>
        </div>

        <div className="flex items-start gap-3 px-4 sm:px-6 py-4 border-b border-[hsl(var(--border))]">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{background:c.color}}>{c.initials}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-bold text-[hsl(var(--foreground))] truncate">{c.full_name}</h2>
                <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate">{c.role} · {c.location}</div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] flex-shrink-0"><X size={14}/></button>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${STAGE[c.stage]}`}>{STAGE_RU[c.stage]}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{SRC_ICON[c.source]} {SRC_RU[c.source]}</span>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{c.experience_years}л опыта</span>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-4 space-y-4 pb-safe overflow-y-auto">
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            {[{lbl:"Опыт",val:`${c.experience_years}л`},{lbl:"Ожидания",val:`${(c.expected_salary/1000).toFixed(0)}K ₸`},{lbl:"Оценка AI",val:String(overall)}].map((s)=>(
              <div key={s.lbl} className="bg-[hsl(var(--secondary)/0.5)] rounded-xl p-2.5 text-center border border-[hsl(var(--border))]">
                <div className="font-mono font-bold text-sm text-[hsl(var(--foreground))]">{s.val}</div>
                <div className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono uppercase mt-0.5">{s.lbl}</div>
              </div>
            ))}
          </div>

          {/* AI Score breakdown */}
          <div className="bg-[hsl(var(--primary)/0.04)] border border-[hsl(var(--primary)/0.15)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={13} className="text-[hsl(var(--primary))]"/>
                <span className="text-xs font-semibold text-[hsl(var(--foreground))]">Объяснение AI оценки</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-xl font-bold text-[hsl(var(--primary))]">{overall}</span>
                <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono ml-1">/100</span>
              </div>
            </div>
            <div className="space-y-2 mb-3">
              {[
                {label:"Навыки",   score:b.skills,     weight:b.weights.skills},
                {label:"Опыт",     score:b.experience, weight:b.weights.experience},
                {label:"Уровень",  score:b.seniority,  weight:b.weights.seniority},
                {label:"Культура", score:b.culture,    weight:b.weights.culture},
              ].map((item)=>{
                const color = ScoreColor(item.score);
                const contrib = Math.round(item.score*(item.weight/100));
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[hsl(var(--muted-foreground))] font-medium">{item.label}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[hsl(var(--muted-foreground))]">{item.weight}%</span>
                        <span className="font-bold" style={{color}}>{item.score}</span>
                        <span className="text-[hsl(var(--muted-foreground))]+{contrib}"> = +{contrib}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden border border-[hsl(var(--border))]">
                      <div className="h-full rounded-full" style={{width:`${item.score}%`,background:color}}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white rounded-lg p-3 border border-[hsl(var(--border))]">
              <p className="text-xs text-[hsl(var(--secondary-foreground))] leading-relaxed">{b.summary}</p>
            </div>
            <div className="mt-2.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${REC_STYLE[b.recommendation]||"bg-gray-50 text-gray-600 border-gray-200"}`}>{b.recommendation}</span>
            </div>
          </div>

          {/* Strengths / Risks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-mono font-semibold text-emerald-700 uppercase tracking-widest mb-1.5">✓ Сильные стороны</div>
              <div className="space-y-1.5">
                {b.strengths.map((s,i)=>(
                  <div key={i} className="flex items-start gap-2 text-xs text-[hsl(var(--secondary-foreground))] bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                    <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0"/>{s}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono font-semibold text-red-600 uppercase tracking-widest mb-1.5">⚠ Риски</div>
              <div className="space-y-1.5">
                {b.risks.map((r,i)=>(
                  <div key={i} className="flex items-start gap-2 text-xs text-[hsl(var(--secondary-foreground))] bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
                    <AlertTriangle size={10} className="text-red-500 mt-0.5 flex-shrink-0"/>{r}
                  </div>
                ))}
              </div>
              {b.missing_skills.length>0&&(
                <div className="mt-2">
                  <div className="text-[10px] font-mono text-amber-600 mb-1.5 font-semibold">НЕДОСТАЮЩИЕ НАВЫКИ</div>
                  <div className="flex flex-wrap gap-1">
                    {b.missing_skills.map((s)=>(
                      <span key={s} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Skills */}
          <div>
            <div className="text-[10px] font-mono font-semibold text-[hsl(var(--foreground))] uppercase tracking-widest mb-1.5">Навыки</div>
            <div className="flex flex-wrap gap-1.5">
              {c.skills_list.map((s)=>(
                <span key={s} className="text-[11px] bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] border border-[hsl(var(--border))] px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>

          {/* Actions — now with token generation */}
          <div className="pt-1 border-t border-[hsl(var(--border))] space-y-2">
            <p className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] uppercase tracking-widest">Создать ссылку для кандидата</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleGenerateToken("ai_screening")}
                disabled={loadingScreening}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[hsl(var(--primary))] text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
                {loadingScreening ? <Loader2 size={14} className="animate-spin"/> : <Brain size={14}/>}
                AI скрининг
              </button>
              <button
                onClick={() => handleGenerateToken("video_presentation")}
                disabled={loadingVideo}
                className="flex-1 flex items-center justify-center gap-1.5 border border-[hsl(var(--border))] text-[hsl(var(--secondary-foreground))] rounded-xl py-3 text-sm hover:bg-[hsl(var(--secondary))] transition-colors disabled:opacity-60">
                {loadingVideo ? <Loader2 size={14} className="animate-spin"/> : <Video size={14}/>}
                Видеопрезентация
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Token link popup */}
      <AnimatePresence>
        {tokenModal && (
          <TokenLinkModal
            type={tokenModal.type}
            link={tokenModal.link}
            onClose={() => setTokenModal(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}


// ─── Add Candidate Modal ──────────────────────────────────────────────────────
const COLORS = ["#6366f1","#10b981","#f59e0b","#a855f7","#3b82f6","#ef4444","#ec4899","#0ea5e9"];
const SOURCES = [{val:"linkedin",lbl:"LinkedIn"},{val:"hh",lbl:"HeadHunter"},{val:"referral",lbl:"Реферал"},{val:"direct",lbl:"Прямой"}];

interface AddCandidateForm {
  full_name:string; email:string; phone:string;
  location:string; source:string; vacancy_id:string;
}

function AddCandidateModal({ onClose, onAdded }:{ onClose:()=>void; onAdded:(c:Candidate)=>void }) {
  const [form, setForm] = useState<AddCandidateForm>({
    full_name:"", email:"", phone:"", location:"", source:"linkedin", vacancy_id:"",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string|null>(null);

  const set = (k: keyof AddCandidateForm, v: string) =>
    setForm(prev => ({...prev, [k]:v}));

  const handleSubmit = async () => {
    if (!form.full_name.trim()) { setError("Имя кандидата обязательно"); return; }
    if (!form.email.trim()) { setError("Email обязателен"); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        source: form.source,
        vacancy_id: form.vacancy_id.trim() || null,
        tags: [],
      };
      const resp = await candidatesApi.create(payload);
      const initials = form.full_name.trim().split(" ").map((w:string)=>w[0]?.toUpperCase()||"").slice(0,2).join("");
      const color = COLORS[Math.floor(Math.random()*COLORS.length)];
      const newCandidate: Candidate = {
        id: String(resp.data.id || Date.now()),
        candidate_id: String(resp.data.id || Date.now()),
        vacancy_id: form.vacancy_id || "v1",
        full_name: form.full_name.trim(),
        initials,
        role: "—",
        score: 0,
        skills: 0,
        stage: "applied",
        color,
        location: form.location || "—",
        source: form.source,
        experience_years: 0,
        expected_salary: 0,
        skills_list: [],
        breakdown: {
          skills:0,experience:0,seniority:0,culture:0,
          weights:{skills:35,experience:30,seniority:20,culture:15},
          strengths:[],risks:[],missing_skills:[],
          recommendation:"—",summary:"Кандидат добавлен вручную, AI-анализ ещё не выполнен.",
        },
      };
      onAdded(newCandidate);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Ошибка при создании кандидата");
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
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e=>e.stopPropagation()}>

        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[hsl(var(--muted))]"/>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))] flex-shrink-0">
          <div>
            <h2 className="font-bold text-[hsl(var(--foreground))]">Новый кандидат</h2>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">AI-скоринг запустится автоматически</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center"><X size={14}/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className={labelCls}>Имя и фамилия *</label>
            <input className={inputCls} placeholder="Алибек Жақсыбеков"
              value={form.full_name} onChange={e=>set("full_name",e.target.value)}/>
          </div>

          <div>
            <label className={labelCls}>Email *</label>
            <input className={inputCls} type="email" placeholder="alibek@example.com"
              value={form.email} onChange={e=>set("email",e.target.value)}/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Телефон</label>
              <input className={inputCls} type="tel" placeholder="+7 777 000 00 00"
                value={form.phone} onChange={e=>set("phone",e.target.value)}/>
            </div>
            <div>
              <label className={labelCls}>Город</label>
              <input className={inputCls} placeholder="Алматы"
                value={form.location} onChange={e=>set("location",e.target.value)}/>
            </div>
          </div>

          <div>
            <label className={labelCls}>Источник</label>
            <div className="grid grid-cols-2 gap-2">
              {SOURCES.map(s=>(
                <button key={s.val} onClick={()=>set("source",s.val)}
                  className={`text-xs py-2 rounded-lg border transition-colors ${form.source===s.val?"bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]":"bg-white text-[hsl(var(--secondary-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]"}`}>
                  {SRC_ICON[s.val]} {s.lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>ID вакансии (необязательно)</label>
            <input className={inputCls} placeholder="UUID вакансии"
              value={form.vacancy_id} onChange={e=>set("vacancy_id",e.target.value)}/>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">Скопируйте из URL вакансии или оставьте пустым</p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-[hsl(var(--border))] flex gap-2 flex-shrink-0">
          <button onClick={onClose}
            className="flex-1 border border-[hsl(var(--border))] text-[hsl(var(--secondary-foreground))] rounded-xl py-2.5 text-sm hover:bg-[hsl(var(--secondary))] transition-colors">
            Отмена
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 bg-[hsl(var(--primary))] text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin"/> Сохранение...</> : <><User size={14}/> Добавить</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>(MOCK);
  const [filter,setFilter] = useState("all");
  const [search,setSearch] = useState("");
  const [selected,setSelected] = useState<Candidate|null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Load real candidate_id and vacancy_id from API and patch into candidates
  useState(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;
    fetch("/api/v1/candidates/?limit=200", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) return;
        // Merge API data into MOCK by index (same order from seed)
        setCandidates(prev => prev.map((c, i) => {
          const api = data[i];
          if (!api) return c;
          return {
            ...c,
            id: api.id,
            candidate_id: api.candidate_id,
            vacancy_id: api.vacancy_id || c.vacancy_id,
            stage: api.stage || c.stage,
            score: api.ai_score ?? c.score,
          };
        }));
      })
      .catch(() => {});
  });

  const filtered = candidates.filter((c)=>{
    if(filter==="high"&&c.score<80) return false;
    if(filter==="rejected"&&c.stage!=="rejected") return false;
    if(search&&!c.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a,b)=>b.score-a.score);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {[{id:"all",label:"Все"},{id:"high",label:"Оценка 80+"},{id:"rejected",label:"Отказы"}].map((f)=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors border
                ${filter===f.id?"bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]":"bg-white text-[hsl(var(--secondary-foreground))] border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))]"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]"/>
            <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск..."
              className="bg-white border border-[hsl(var(--border))] rounded-lg pl-8 pr-3 py-1.5 text-sm outline-none focus:border-[hsl(var(--primary))] w-36 sm:w-48 transition-colors"/>
          </div>
          <button className="hidden sm:flex items-center gap-1.5 text-xs border border-[hsl(var(--border))] px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--secondary))] bg-white text-[hsl(var(--secondary-foreground))]">
            <Download size={12}/> Экспорт
          </button>
        </div>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((c)=>(
          <motion.div key={c.id} initial={{opacity:0}} animate={{opacity:1}}
            onClick={()=>setSelected(c)}
            className="bg-white border border-[hsl(var(--border))] rounded-xl p-3 cursor-pointer active:scale-[.99] transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:c.color}}>{c.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">{c.full_name}</span>
                  <span className="font-mono text-sm font-bold flex-shrink-0" style={{color:ScoreColor(c.score)}}>{c.score}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">{c.role}</span>
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border font-semibold flex-shrink-0 ${STAGE[c.stage]}`}>{STAGE_RU[c.stage]}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="table-scroll">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--secondary)/0.5)]">
                {["Кандидат","Источник","Оценка","Навыки","Этап",""].map((h)=>(
                  <th key={h} className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] text-left px-4 py-3 tracking-widest uppercase font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c,i)=>(
                <motion.tr key={c.id} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:i*.025}}
                  onClick={()=>setSelected(c)}
                  className="border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--secondary)/0.4)] transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{background:c.color}}>{c.initials}</div>
                      <div>
                        <div className="text-sm font-medium text-[hsl(var(--foreground))]">{c.full_name}</div>
                        <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{c.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--muted-foreground))]">{SRC_ICON[c.source]} {SRC_RU[c.source]}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold" style={{color:ScoreColor(c.score)}}>{c.score}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${c.skills}%`,background:c.skills>=85?"#059669":c.skills>=70?"#6366f1":"#d97706"}}/>
                      </div>
                      <span className="text-[11px] font-mono text-[hsl(var(--muted-foreground))]">{c.skills}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap ${STAGE[c.stage]}`}>{STAGE_RU[c.stage]}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[hsl(var(--primary))] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Открыть →</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected&&<CandidateModal c={selected} onClose={()=>setSelected(null)}/>}
        {showAdd&&<AddCandidateModal onClose={()=>setShowAdd(false)} onAdded={(c)=>setCandidates(prev=>[c,...prev])}/>}
      </AnimatePresence>
    </div>
  );
}
