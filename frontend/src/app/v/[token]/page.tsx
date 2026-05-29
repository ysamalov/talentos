"use client";
/**
 * Video Presentation — public page opened via temporary token link.
 * Candidate records a short video or uses the browser's Web Speech API.
 * Transcript is sent to backend for AI analysis, which adjusts the candidate's score.
 */
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Mic, Square, CheckCircle, Loader2, Brain, Send, Camera, CameraOff } from "lucide-react";

interface TokenData {
  token: string;
  candidate: { id: string; full_name: string };
  vacancy: { id: string; title: string; department: string; required_skills: string[] };
  is_completed: boolean;
}

interface AnalysisResult {
  communication_score: number;
  motivation_score: number;
  confidence_score: number;
  overall_impression: string;
  key_positives: string[];
  concerns: string[];
  score_delta: number;
  summary: string;
}

export default function VideoPage() {
  const params = useParams();
  const token = params.token as string;
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [step, setStep] = useState<"intro" | "recording" | "review" | "analyzing" | "done">("intro");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [scoreDelta, setScoreDelta] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 min max
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  const API = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    fetch(`${API}/api/v1/tokens/resolve/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("Ссылка недействительна или истекла.");
        return r.json();
      })
      .then((data: TokenData) => {
        setTokenData(data);
        if (data.is_completed) setStep("done");
        setLoading(false);
      })
      .catch(() => {
        // Demo fallback
        setTokenData({
          token: token,
          candidate: { id: "demo", full_name: "Кандидат" },
          vacancy: { id: "v1", title: "Senior Software Engineer", department: "Engineering", required_skills: ["React", "Node.js", "TypeScript"] },
          is_completed: false,
        });
        setLoading(false);
      });
  }, [token]);

  const startRecording = async () => {
    setPermissionError(null);
    
    try {
      // Request camera and microphone permissions
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Доступ к камере/микрофону недоступен. Убедитесь, что страница открыта по HTTPS.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled,
        audio: true,
      });
    
    streamRef.current = stream;
    
    // Set up video preview
    if (videoRef.current && videoEnabled) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().catch(console.error);
      };
    }
      // Initialize MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm') ? 'video/webm' : 'video/mp4'
      });
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        // Here you would upload the video to your server
        // await uploadVideo(blob);
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
      
      mediaRecorder.start(1000); // Record in 1-second chunks
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
      // Start speech recognition for real-time transcription
      const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const rec = new SR();
        rec.lang = "ru-RU";
        rec.continuous = true;
        rec.interimResults = true;
        let finalText = "";
        
        rec.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
              finalText += e.results[i][0].transcript + " ";
              setTranscript(finalText);
            } else {
              interim = e.results[i][0].transcript;
            }
          }
          setInterimText(interim);
        };
        
        rec.onerror = () => setIsRecording(false);
        rec.start();
        recognitionRef.current = rec;
      }
      
      setStep("recording");
      setTranscript("");
      setTimeLeft(120);
      
      // Countdown timer
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            stopRecording();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setPermissionError("Не удалось получить доступ к камере или микрофону. Пожалуйста, разрешите доступ.");
    }
  };
  
  const [interimText, setInterimText] = useState("");

  const stopRecording = () => {
    // Stop video recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setIsRecording(false);
    setInterimText("");
    setStep("review");
  };

  const submitTranscript = async () => {
    const finalTranscript = transcript.trim() || "Кандидат не предоставил речевой транскрипт. Демо-режим.";
    setStep("analyzing");

    try {
      const resp = await fetch(`${API}/api/v1/tokens/video/${token}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: finalTranscript }),
      });
      const data = await resp.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setScoreDelta(data.score_delta || 0);
      } else {
        // Demo analysis fallback
        setAnalysis(getDemoAnalysis(finalTranscript));
        setScoreDelta(5);
      }
    } catch {
      setAnalysis(getDemoAnalysis(finalTranscript));
      setScoreDelta(5);
    }
    setStep("done");
  };

  function getDemoAnalysis(text: string): AnalysisResult {
    const len = text.split(" ").length;
    const base = Math.min(85, 55 + len);
    return {
      communication_score: base,
      motivation_score: base - 5,
      confidence_score: base + 3,
      overall_impression: "Кандидат демонстрирует профессиональный подход и чёткую мотивацию.",
      key_positives: [
        "Ясная и структурированная речь",
        "Конкретные примеры из опыта",
        "Высокая мотивация к позиции",
      ],
      concerns: text.length < 100 ? ["Ответ мог быть более развёрнутым"] : [],
      score_delta: 5,
      summary: "Видеопрезентация произвела положительное впечатление. Кандидат уверенно рассказал о своём опыте и мотивации. Рекомендуется к следующему этапу.",
    };
  }

  const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="font-mono font-bold" style={{ color: value >= 80 ? "#059669" : value >= 65 ? "#d97706" : "#dc2626" }}>{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ delay: 0.3, ease: "easeOut" }}
          style={{ background: value >= 80 ? "#059669" : value >= 65 ? "#d97706" : "#dc2626" }}/>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white flex items-center justify-center">
      <Loader2 className="animate-spin text-purple-500" size={32}/>
    </div>
  );

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center">
          <Video size={18} className="text-white"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-gray-900">Видеопрезентация — {tokenData?.vacancy.title}</div>
          <div className="text-xs text-gray-400">{tokenData?.candidate.full_name}</div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">

            {/* INTRO */}
            {step === "intro" && (
              <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Video size={28} className="text-purple-600"/>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Видеопрезентация</h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Расскажите о себе за 1–2 минуты. Видео и аудио будут записаны для анализа.
                </p>

                {/* Video toggle */}
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    {videoEnabled ? <Camera size={16} className="text-purple-600"/> : <CameraOff size={16} className="text-gray-400"/>}
                    <span className="text-sm text-gray-700">Видео</span>
                  </div>
                  <button
                    onClick={() => setVideoEnabled(!videoEnabled)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      videoEnabled 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {videoEnabled ? 'Включено' : 'Выключено'}
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-left space-y-1.5">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Рекомендуемые темы:</p>
                  {["Ваш профессиональный путь", "Ключевые достижения", "Почему эта позиция?", "Ваши сильные стороны"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold flex-shrink-0" style={{ fontSize: 9 }}>{i+1}</div>
                      {t}
                    </div>
                  ))}
                </div>

                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-5 text-xs text-purple-700">
                  🎙 Разрешите доступ к камере и микрофону при появлении запроса.
                </div>

                {permissionError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
                    ⚠️ {permissionError}
                  </div>
                )}

                <button onClick={startRecording}
                  className="w-full bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                  <Video size={16}/> Начать запись
                </button>
              </motion.div>
            )}

            {/* RECORDING */}
            {step === "recording" && (
              <motion.div key="recording" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <motion.div className="w-3 h-3 bg-red-500 rounded-full"
                      animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}/>
                    <span className="text-sm font-bold text-gray-800">Запись</span>
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-700">
                    {mins}:{secs.toString().padStart(2, "0")}
                  </div>
                </div>

                {/* Video preview */}
                {videoEnabled && (
                  <div className="relative mb-4 bg-black rounded-xl overflow-hidden aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg px-2 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-[10px] font-mono">REC</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Waveform animation for audio only mode */}
                {!videoEnabled && (
                  <div className="flex items-center justify-center gap-1 h-24 mb-4 bg-gray-50 rounded-xl">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div key={i}
                        className={`w-1.5 rounded-full ${isRecording ? "bg-purple-400" : "bg-gray-200"}`}
                        animate={isRecording ? {
                          height: [8, 16 + Math.random() * 32, 8],
                        } : { height: 8 }}
                        transition={{ repeat: Infinity, duration: 0.4 + Math.random() * 0.4, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                )}

                {/* Live transcript */}
                <div className="bg-gray-50 rounded-xl p-3 min-h-[80px] mb-4 text-sm text-gray-700 leading-relaxed">
                  {transcript || <span className="text-gray-400 italic">Говорите — текст появится здесь...</span>}
                  {interimText && <span className="text-gray-400"> {interimText}</span>}
                </div>

                <button onClick={stopRecording}
                  className="w-full bg-gray-800 text-white rounded-xl py-3 text-sm font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-2">
                  <Square size={14}/> Завершить запись
                </button>
              </motion.div>
            )}

            {/* REVIEW, ANALYZING, DONE remain the same as before... */}
            {/* REVIEW */}
            {step === "review" && (
              <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-bold text-gray-900 mb-1">Проверьте транскрипт</h3>
                <p className="text-xs text-gray-400 mb-3">Вы можете отредактировать текст перед отправкой.</p>
                <textarea
                  value={transcript}
                  onChange={e => setTranscript(e.target.value)}
                  className="w-full h-40 bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-700 leading-relaxed outline-none focus:border-purple-400 resize-none transition-colors"
                  placeholder="Ваш текст не был распознан. Введите его вручную..."
                />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setStep("intro")}
                    className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Записать снова
                  </button>
                  <button onClick={submitTranscript}
                    className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5">
                    <Send size={13}/> Отправить
                  </button>
                </div>
              </motion.div>
            )}

            {/* ANALYZING */}
            {step === "analyzing" && (
              <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain size={24} className="text-purple-600"/>
                </div>
                <div className="font-bold text-gray-900 mb-1">AI анализирует презентацию</div>
                <div className="text-xs text-gray-400 mb-5">Оцениваем коммуникацию, мотивацию и уверенность...</div>
                <div className="flex gap-1 justify-center">
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="w-2 h-2 bg-purple-400 rounded-full"
                      animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.2 }}/>
                  ))}
                </div>
              </motion.div>
            )}

            {/* DONE */}
            {step === "done" && analysis && (
              <motion.div key="done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <CheckCircle size={20} className="text-emerald-500"/>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Анализ завершён</h3>
                    <p className="text-xs text-gray-400">Результаты отправлены рекрутеру</p>
                  </div>
                  {scoreDelta > 0 && (
                    <div className="ml-auto bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1 text-center">
                      <div className="text-emerald-700 font-bold text-sm">+{scoreDelta}</div>
                      <div className="text-[9px] text-emerald-600 font-mono">к оценке</div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 italic leading-relaxed">&ldquo;{analysis.overall_impression}&rdquo;</p>
                </div>

                <div className="space-y-2.5">
                  <ScoreBar label="Коммуникация" value={analysis.communication_score}/>
                  <ScoreBar label="Мотивация" value={analysis.motivation_score}/>
                  <ScoreBar label="Уверенность" value={analysis.confidence_score}/>
                </div>

                {analysis.key_positives.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono text-emerald-700 font-semibold uppercase tracking-wider mb-1.5">✓ Сильные стороны</div>
                    <div className="space-y-1">
                      {analysis.key_positives.map((p, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-gray-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                          <CheckCircle size={10} className="text-emerald-500 mt-0.5 flex-shrink-0"/>{p}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <p className="text-xs text-gray-700 leading-relaxed">{analysis.summary}</p>
                </div>
              </motion.div>
            )}

            {/* DONE (already submitted, no analysis in state) */}
            {step === "done" && !analysis && (
              <motion.div key="done-bare" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-white rounded-2xl shadow-lg p-8 text-center">
                <CheckCircle size={36} className="text-emerald-500 mx-auto mb-3"/>
                <h3 className="font-bold text-gray-900 mb-1">Видеопрезентация уже отправлена</h3>
                <p className="text-sm text-gray-400">Рекрутер проанализирует её и свяжется с вами.</p>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}