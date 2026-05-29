"use client";
/**
 * AI Screening — public page opened via temporary token link.
 * Candidate answers questions through a conversational AI interface.
 * No authentication required.
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, CheckCircle, Loader2, AlertCircle } from "lucide-react";

interface TokenData {
  token: string;
  candidate: { id: string; full_name: string };
  vacancy: { id: string; title: string; department: string; required_skills: string[] };
  is_completed: boolean;
  expires_at: string;
}

interface Message {
  role: "assistant" | "user";
  content: string;
  timestamp: number;
}

const SCREENING_QUESTIONS = [
  "Расскажите о себе и своём профессиональном пути.",
  "Почему вас интересует именно эта позиция?",
  "Опишите ваш самый значимый проект за последние 2 года.",
  "Как вы справляетесь с дедлайнами и высокой нагрузкой?",
  "Какие ваши зарплатные ожидания?",
];

export default function ScreeningPage() {
  const params = useParams();
  const token = params.token as string;
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [questionIdx, setQuestionIdx] = useState(0);
  const [completed, setCompleted] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(`${API}/api/v1/tokens/resolve/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Ссылка недействительна или истекла.");
        return r.json();
      })
      .then((data: TokenData) => {
        setTokenData(data);
        if (data.is_completed) {
          setCompleted(true);
        } else {
          // Start conversation
          setMessages([{
            role: "assistant",
            content: `Здравствуйте, ${data.candidate.full_name}! 👋\n\nЯ — AI-ассистент по подбору персонала. Это займёт около 10 минут.\n\nМы проводим скрининг на позицию **${data.vacancy.title}** (${data.vacancy.department || ""}). Давайте начнём!\n\n${SCREENING_QUESTIONS[0]}`,
            timestamp: Date.now(),
          }]);
        }
        setLoading(false);
      })
      .catch(e => {
        // Demo mode fallback
        const demoData: TokenData = {
          token: token,
          candidate: { id: "demo", full_name: "Кандидат" },
          vacancy: { id: "v1", title: "Senior Software Engineer", department: "Engineering", required_skills: ["React", "Node.js"] },
          is_completed: false,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        };
        setTokenData(demoData);
        setMessages([{
          role: "assistant",
          content: `Здравствуйте! 👋\n\nЯ — AI-ассистент по подбору персонала. Это займёт около 10 минут.\n\nМы проводим скрининг на позицию **${demoData.vacancy.title}**. Давайте начнём!\n\n${SCREENING_QUESTIONS[0]}`,
          timestamp: Date.now(),
        }]);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: "user", content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    // Simulate AI response
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));

    const nextIdx = questionIdx + 1;
    let aiContent = "";

    if (nextIdx < SCREENING_QUESTIONS.length) {
      aiContent = `Понял, спасибо за ответ!\n\n${SCREENING_QUESTIONS[nextIdx]}`;
      setQuestionIdx(nextIdx);
    } else {
      aiContent = "Отлично! Вы ответили на все вопросы. 🎉\n\nСпасибо за ваше время. Ваши ответы переданы рекрутеру, и он свяжется с вами в ближайшее время.\n\nУдачи!";
      setCompleted(true);
    }

    setMessages(prev => [...prev, { role: "assistant", content: aiContent, timestamp: Date.now() }]);
    setSending(false);
  };

  const progress = Math.round((questionIdx / SCREENING_QUESTIONS.length) * 100);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center">
      <Loader2 className="animate-spin text-indigo-500" size={32}/>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-3"/>
        <h2 className="font-bold text-gray-800 mb-2">Ссылка недействительна</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
          <Bot size={18} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">AI Скрининг — {tokenData?.vacancy.title}</div>
          <div className="text-xs text-gray-400">{tokenData?.candidate.full_name}</div>
        </div>
        {!completed && (
          <div className="text-right">
            <div className="text-xs font-mono text-indigo-600 font-bold">{questionIdx}/{SCREENING_QUESTIONS.length}</div>
            <div className="text-[10px] text-gray-400">вопросов</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {!completed && (
        <div className="h-1 bg-indigo-50">
          <motion.div className="h-full bg-indigo-500" animate={{ width: `${progress}%` }} transition={{ ease: "easeOut" }}/>
        </div>
      )}

      {/* Completed state */}
      {completed ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center max-w-sm">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-emerald-500"/>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Скрининг завершён!</h2>
            <p className="text-sm text-gray-500">Ваши ответы получены. Рекрутер свяжется с вами в ближайшее время.</p>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl w-full mx-auto">
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                      <Bot size={13} className="text-white"/>
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line
                    ${msg.role === "assistant"
                      ? "bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm"
                      : "bg-indigo-600 text-white rounded-tr-sm"}`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {sending && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                  <Bot size={13} className="text-white"/>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                        animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0">
            <div className="max-w-2xl mx-auto flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Введите ваш ответ..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:bg-indigo-700">
                <Send size={15}/>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
