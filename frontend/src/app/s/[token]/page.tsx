"use client";
/**
 * AI Screening — public page opened via temporary token link.
 * Candidate answers questions via text OR voice (Web Speech API).
 * No authentication required.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, CheckCircle, Loader2, AlertCircle, Mic, MicOff, Square } from "lucide-react";

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
  via?: "text" | "voice";
}

// Extend Window for browser Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
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

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // ── Check Speech API support ──────────────────────────────────────────────
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    setSpeechSupported(!!SR);
  }, []);

  // ── Load token ─────────────────────────────────────────────────────────────
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
          setMessages([{
            role: "assistant",
            content: `Здравствуйте, ${data.candidate.full_name}! 👋\n\nЯ — AI-ассистент по подбору персонала. Это займёт около 10 минут.\n\nМы проводим скрининг на позицию **${data.vacancy.title}** (${data.vacancy.department || ""}). Давайте начнём!\n\n${SCREENING_QUESTIONS[0]}`,
            timestamp: Date.now(),
          }]);
        }
        setLoading(false);
      })
      .catch(() => {
        const demoData: TokenData = {
          token,
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
  }, [messages, interimText]);

  // ── Stop listening helper ─────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  // ── Start voice input ─────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    setMicError(null);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMicError("Ваш браузер не поддерживает голосовой ввод. Используйте Chrome или Edge.");
      return;
    }

    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalTranscript = input; // start from existing text

    rec.onstart = () => {
      setIsListening(true);
      setInterimText("");
    };

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
          setInput(finalTranscript);
          setInterimText("");
        } else {
          interim += t;
        }
      }
      if (interim) setInterimText(interim);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return; // ignore silence
      if (e.error === "not-allowed") {
        setMicError("Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.");
      } else {
        setMicError(`Ошибка микрофона: ${e.error}`);
      }
      stopListening();
    };

    rec.onend = () => {
      // Auto-restart if still in listening mode (Chrome stops after silence)
      if (recognitionRef.current) {
        try { rec.start(); } catch {}
      } else {
        setIsListening(false);
        setInterimText("");
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }, [input, stopListening]);

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (isListening) {
      stopListening();
      // focus input so user can review/edit
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      startListening();
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (viaVoice = false) => {
    const text = input.trim();
    if (!text || sending) return;

    // Stop mic if active
    if (isListening) stopListening();

    const userMsg: Message = { role: "user", content: text, timestamp: Date.now(), via: viaVoice ? "voice" : "text" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const progress = Math.round((questionIdx / SCREENING_QUESTIONS.length) * 100);

  // ── Render ────────────────────────────────────────────────────────────────
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
          <div className="text-sm font-bold text-gray-900 truncate">AI Скрининг — {tokenData?.vacancy.title}</div>
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

      {/* Completed */}
      {completed ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
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
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl w-full mx-auto pb-2">
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
                    {msg.via === "voice" && (
                      <div className="flex items-center gap-1 mt-1.5 opacity-60">
                        <Mic size={9}/>
                        <span className="text-[9px]">голос</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI typing indicator */}
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

            {/* Live interim transcript */}
            {isListening && interimText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <div className="max-w-[80%] bg-indigo-100 border border-indigo-200 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-indigo-700 italic opacity-70">
                  {interimText}
                </div>
              </motion.div>
            )}

            <div ref={bottomRef}/>
          </div>

          {/* Mic error */}
          {micError && (
            <div className="max-w-2xl mx-auto w-full px-4 pb-1">
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle size={12} className="flex-shrink-0"/>
                {micError}
                <button onClick={() => setMicError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0">
            <div className="max-w-2xl mx-auto">

              {/* Voice recording indicator */}
              {isListening && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 mb-2 px-1">
                  <motion.div
                    className="w-2 h-2 bg-red-500 rounded-full"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}/>
                  <span className="text-xs text-gray-500">Говорите... нажмите ■ чтобы остановить</span>
                </motion.div>
              )}

              <div className="flex gap-2 items-end">
                {/* Text input */}
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isListening ? "Говорите или дополните текстом..." : "Введите ваш ответ или нажмите 🎤"}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 transition-colors pr-4"
                    disabled={sending}
                  />
                </div>

                {/* Mic button */}
                {speechSupported && (
                  <button
                    onClick={toggleMic}
                    disabled={sending}
                    title={isListening ? "Остановить запись" : "Говорить"}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-40
                      ${isListening
                        ? "bg-red-500 text-white shadow-lg shadow-red-200"
                        : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200"}`}>
                    {isListening ? <Square size={14}/> : <Mic size={15}/>}
                  </button>
                )}

                {/* Send button */}
                <button
                  onClick={() => sendMessage(isListening)}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-opacity hover:bg-indigo-700 flex-shrink-0">
                  <Send size={15}/>
                </button>
              </div>

              {/* Hint */}
              {!isListening && speechSupported && (
                <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                  🎤 Нажмите на микрофон чтобы ответить голосом — текст появится автоматически
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
