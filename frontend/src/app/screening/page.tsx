"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, ChevronDown } from "lucide-react";

interface Message { role:"user"|"assistant"; content:string; timestamp:string; }

const INIT:Message[] = [
  { role:"assistant",content:"Добрый день, Алибек! Я AI-рекрутер TalentRush. Проведу ваш первичный скрининг на Senior Software Engineer. Займёт 10–15 минут. Готовы?",timestamp:"10:02" },
  { role:"user",content:"Да, готов!",timestamp:"10:03" },
  { role:"assistant",content:"Отлично! В резюме 7 лет с React и Node.js. Расскажите о наиболее сложной системе, которую проектировали — какие решения принимали и какие компромиссы?",timestamp:"10:03" },
  { role:"user",content:"Я руководил миграцией монолита e-commerce на микросервисы с нагрузкой 50M+ событий/день. Kafka, Redis, PostgreSQL с репликами. Zero-downtime через Strangler Fig.",timestamp:"10:05" },
  { role:"assistant",content:"Отличный ответ — Strangler Fig говорит об архитектурной зрелости.\n\nКак обеспечивали консистентность данных между микросервисами — eventual или strong consistency?",timestamp:"10:05" },
];

const REPLIES = [
  "Event Sourcing + CQRS — сильный подход для вашего масштаба. Отмечаю глубокое понимание архитектуры данных.\n\nОпыт управления? Руководили командой инженеров?",
  "Понятно. На этой роли — команда 4 инженеров.\n\nПоследний вопрос: ожидаемая компенсация и когда готовы выйти?",
  "Спасибо! Техническая глубина впечатляет.\n\n✅ Обновлённая оценка: 91/100. Рекомендую к HR-интервью. Свяжемся в течение 24 часов.",
];

export default function ScreeningPage() {
  const [messages,setMessages] = useState<Message[]>(INIT);
  const [input,setInput] = useState("");
  const [typing,setTyping] = useState(false);
  const [aiIdx,setAiIdx] = useState(0);
  const [showSidebar,setShowSidebar] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,typing]);

  const send = async () => {
    if(!input.trim()) return;
    setMessages((m)=>[...m,{role:"user",content:input,timestamp:"сейчас"}]);
    setInput(""); setTyping(true);
    await new Promise((r)=>setTimeout(r,1500));
    setTyping(false);
    if(aiIdx<REPLIES.length){
      setMessages((m)=>[...m,{role:"assistant",content:REPLIES[aiIdx],timestamp:"сейчас"}]);
      setAiIdx((i)=>i+1);
    }
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] gap-4 h-[calc(100dvh-96px)] min-h-[500px]">
      {/* Chat */}
      <div className="bg-white border border-[hsl(var(--border))] rounded-xl flex flex-col overflow-hidden min-h-0">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--secondary)/0.4)] flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-[hsl(var(--primary))]"/>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">AI Скрининг — Алибек Жақсыбеков</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] hidden sm:block">Senior Software Engineer</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">● Онлайн</span>
            {/* Mobile toggle for score panel */}
            <button onClick={()=>setShowSidebar(s=>!s)}
              className="lg:hidden w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]">
              <ChevronDown size={14} className={`transition-transform ${showSidebar?"rotate-180":""}`}/>
            </button>
          </div>
        </div>

        {/* Mobile score panel (collapsible) */}
        <AnimatePresence>
          {showSidebar && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
              className="lg:hidden border-b border-[hsl(var(--border))] overflow-hidden">
              <div className="p-3 bg-[hsl(var(--primary)/0.03)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[hsl(var(--foreground))]">AI оценка</span>
                  <span className="font-mono text-lg font-bold text-[hsl(var(--primary))]">91/100</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[{l:"Навыки",v:94,c:"#059669"},{l:"Опыт",v:88,c:"#6366f1"},{l:"Культура",v:82,c:"#d97706"}].map(x=>(
                    <div key={x.l} className="text-center">
                      <div className="font-mono font-bold" style={{color:x.c}}>{x.v}%</div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))]">{x.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-[hsl(var(--background))]">
          {messages.map((m,i)=>(
            <motion.div key={i} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              className={`flex gap-2 ${m.role==="user"?"flex-row-reverse":""}`}>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white
                ${m.role==="assistant"?"bg-[hsl(var(--primary))]":"bg-emerald-500"}`}>
                {m.role==="assistant"?<Bot size={12}/>:<User size={12}/>}
              </div>
              <div className={`max-w-[82%] sm:max-w-[78%] flex flex-col gap-0.5 ${m.role==="user"?"items-end":"items-start"}`}>
                <div className={`px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line
                  ${m.role==="assistant"?"bg-white border border-[hsl(var(--border))] text-[hsl(var(--foreground))] rounded-tl-sm shadow-sm":"bg-[hsl(var(--primary))] text-white rounded-tr-sm"}`}>
                  {m.content}
                </div>
                <div className={`text-[10px] text-[hsl(var(--muted-foreground))] font-mono ${m.role==="user"?"text-right":""}`}>
                  {m.role==="assistant"?"AI Рекрутер":"Алибек"} · {m.timestamp}
                </div>
              </div>
            </motion.div>
          ))}
          <AnimatePresence>
            {typing&&(
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white"><Bot size={12}/></div>
                <div className="bg-white border border-[hsl(var(--border))] rounded-xl px-3 py-2.5 flex gap-1.5 items-center shadow-sm">
                  {[0,.15,.3].map((d,i)=>(
                    <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--muted-foreground))]"
                      animate={{y:[0,-4,0]}} transition={{repeat:Infinity,duration:.8,delay:d}}/>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div className="p-2.5 sm:p-3 border-t border-[hsl(var(--border))] bg-white flex gap-2 flex-shrink-0">
          <input value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>e.key==="Enter"&&send()}
            placeholder="Введите ответ..."
            className="flex-1 bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm outline-none focus:border-[hsl(var(--primary))] transition-colors placeholder:text-[hsl(var(--muted-foreground))]"/>
          <button onClick={send} className="bg-[hsl(var(--primary))] text-white px-3 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center flex-shrink-0">
            <Send size={14}/>
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col gap-3 overflow-y-auto">
        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3">Оценка в реальном времени</div>
          <div className="flex flex-col items-center py-1">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#f1f5f9" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke="#6366f1" strokeWidth="8" strokeDasharray="264" strokeDashoffset="45" strokeLinecap="round"/>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-xl font-bold text-[hsl(var(--primary))]">91</span>
              </div>
            </div>
            <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] mt-2 tracking-widest">ОБЩЕЕ СООТВЕТСТВИЕ</div>
          </div>
          <div className="space-y-2.5 mt-3">
            {[{label:"Навыки",val:94,color:"#059669"},{label:"Опыт",val:88,color:"#6366f1"},{label:"Культура",val:82,color:"#d97706"}].map((item)=>(
              <div key={item.label}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[hsl(var(--muted-foreground))]">{item.label}</span>
                  <span className="font-mono font-semibold" style={{color:item.color}}>{item.val}%</span>
                </div>
                <div className="h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${item.val}%`,background:item.color}}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-xl p-4">
          <div className="text-xs font-semibold text-[hsl(var(--foreground))] mb-3">Выводы AI</div>
          <div className="space-y-2.5">
            {[
              {icon:"✓",label:"СИЛЬНАЯ СТОРОНА",text:"Глубокий опыт с распределёнными системами в production",color:"#059669",bg:"#ecfdf5"},
              {icon:"✓",label:"СИЛЬНАЯ СТОРОНА",text:"Архитектурные решения уровня Senior",color:"#059669",bg:"#ecfdf5"},
              {icon:"!",label:"ПРОБЕЛ",text:"Нет опыта ML/AI — требуется базовый MLOps",color:"#d97706",bg:"#fffbeb"},
              {icon:"⚠",label:"РИСК",text:"ЗП ($160K) на 8% выше бюджета",color:"#dc2626",bg:"#fef2f2"},
            ].map((ins,i)=>(
              <div key={i} className="flex gap-2.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold" style={{background:ins.bg,color:ins.color}}>{ins.icon}</div>
                <div>
                  <div className="text-[10px] font-mono font-bold mb-0.5" style={{color:ins.color}}>{ins.label}</div>
                  <div className="text-[11px] text-[hsl(var(--secondary-foreground))] leading-snug">{ins.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
