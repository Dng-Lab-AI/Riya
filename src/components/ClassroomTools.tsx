"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot, Check, Eraser, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { BOARD_COLORS } from "@/lib/constants";

// Interactive pieces of the classroom: whiteboard, floating reactions, confetti,
// quizzes, speech transcription and the AI assistant panel.

// ── Whiteboard ────────────────────────────────────────────

export type Stroke = { id: string; color: string; width: number; points: [number, number][] };

const MAX_POINTS = 600;
const ERASER = "#ffffff";

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Omit<Stroke, "id">, w: number, h: number) {
  if (!stroke.points.length) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = (stroke.width * w) / 1000;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const [x0, y0] = stroke.points[0];
  ctx.moveTo(x0 * w, y0 * h);
  for (const [x, y] of stroke.points.slice(1)) ctx.lineTo(x * w, y * h);
  if (stroke.points.length === 1) ctx.lineTo(x0 * w + 0.1, y0 * h);
  ctx.stroke();
}

export function Whiteboard({ strokes, onStroke, onClear }: { strokes: Stroke[]; onStroke: (s: Omit<Stroke, "id">) => void; onClear?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<[number, number][] | null>(null);
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [width, setWidth] = useState(4);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // Keep a 16:10 drawing area that fits the stage, so both screens show the same board.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width: cw, height: ch } = entry.contentRect;
      const w = Math.min(cw, (ch * 16) / 10);
      setSize({ w: Math.floor(w), h: Math.floor((w * 10) / 16) });
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !size.w) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size.w * ratio;
    canvas.height = size.h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size.w, size.h);
    for (const s of strokes) drawStroke(ctx, s, size.w, size.h);
  }, [strokes, size]);

  const point = (event: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height))];
  };

  const onDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = [point(event)];
  };
  const onMove = (event: React.PointerEvent) => {
    const pts = drawing.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!pts || !ctx) return;
    const next = point(event);
    const last = pts[pts.length - 1];
    if (Math.hypot(next[0] - last[0], next[1] - last[1]) < 0.002) return;
    pts.push(next);
    drawStroke(ctx, { color, width, points: [last, next] }, size.w, size.h);
  };
  const onUp = () => {
    const pts = drawing.current;
    drawing.current = null;
    if (!pts?.length) return;
    const step = Math.ceil(pts.length / MAX_POINTS);
    onStroke({ color, width, points: step > 1 ? pts.filter((_, i) => i % step === 0) : pts });
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {BOARD_COLORS.filter((c) => c !== ERASER).map((c) => (
          <button key={c} onClick={() => { setColor(c); if (width > 12) setWidth(4); }} aria-label={`Couleur ${c}`} className={`h-7 w-7 rounded-full ring-2 ${color === c ? "ring-ochre-300" : "ring-white/20"}`} style={{ background: c }} />
        ))}
        <span className="mx-1 h-6 w-px bg-white/20" />
        {[2, 4, 8].map((w) => (
          <button key={w} onClick={() => { setWidth(w); if (color === ERASER) setColor(BOARD_COLORS[0]); }} aria-label={`Épaisseur ${w}`} className={`flex h-7 w-7 items-center justify-center rounded-full ${width === w && color !== ERASER ? "bg-white/20" : "hover:bg-white/10"}`}>
            <span className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
        <button onClick={() => { setColor(ERASER); setWidth(24); }} className={`flex items-center gap-1 rounded-full px-3 py-1 ${color === ERASER ? "bg-white/20" : "hover:bg-white/10"}`}><Eraser size={15} /> Gomme</button>
        {onClear && <button onClick={onClear} className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 hover:bg-white/10"><Trash2 size={15} /> Tout effacer</button>}
      </div>
      <div ref={wrapRef} className="flex min-h-0 flex-1 items-center justify-center">
        <canvas
          ref={canvasRef}
          style={{ width: size.w, height: size.h }}
          className="touch-none rounded-xl shadow-lg"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>
    </div>
  );
}

// ── Reactions and confetti ────────────────────────────────

export type FloatingReaction = { id: string; emoji: string; x: number };

export function ReactionLayer({ reactions }: { reactions: FloatingReaction[] }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            className="absolute bottom-6 text-5xl drop-shadow-lg"
            style={{ left: `${r.x}%` }}
            initial={{ y: 0, opacity: 0, scale: 0.4 }}
            animate={reduce ? { opacity: [0, 1, 0] } : { y: -320, opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1, 0.9], x: [0, -14, 12, -6] }}
            transition={{ duration: reduce ? 1.2 : 2.6, ease: "easeOut" }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

export type ConfettiPiece = { id: number; x: number; y: number; rotate: number; color: string; delay: number };
const CONFETTI_COLORS = ["#edb33a", "#d2643a", "#2f7a4a", "#f4c95d", "#fbf7f0", "#b84e28"];

// Pieces are generated in event handlers (never during render) and passed in.
export function makeConfetti(count = 48): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x: (Math.random() - 0.5) * 700,
    y: -Math.random() * 420 - 80,
    rotate: Math.random() * 720 - 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.15,
  }));
}

export function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  const reduce = useReducedMotion();
  if (reduce || !pieces.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute h-3 w-2 rounded-sm"
          style={{ background: p.color }}
          initial={{ x: 0, y: 40, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [40, p.y, p.y + 600], opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: 2.2, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// ── Quiz ──────────────────────────────────────────────────

export type QuizState = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number | null;
  correctIndex: number | null;
  explanation: string;
  closed: boolean;
};

export function QuizCard({ quiz, role, onAnswer, onClose }: { quiz: QuizState; role: "student" | "tutor"; onAnswer: (index: number) => void; onClose: () => void }) {
  const answered = quiz.answerIndex !== null;
  const correct = answered && quiz.correctIndex !== null && quiz.answerIndex === quiz.correctIndex;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative w-full max-w-lg rounded-3xl bg-sand-50 p-6 text-earth-900 shadow-2xl"
    >
      <button onClick={onClose} aria-label="Masquer le quiz" className="absolute right-3 top-3 rounded-full p-1.5 hover:bg-sand-200"><X size={18} /></button>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-clay-600">Quiz éclair</p>
      <h3 className="mt-2 font-display text-2xl font-semibold">{quiz.question}</h3>
      <div className="mt-5 grid gap-2">
        {quiz.options.map((option, i) => {
          const isAnswer = quiz.answerIndex === i;
          const isCorrect = quiz.correctIndex === i;
          const tone = answered || role === "tutor"
            ? isCorrect ? "border-forest-500 bg-forest-100 text-forest-800" : isAnswer ? "border-clay-500 bg-clay-50 text-clay-800" : "border-sand-200 bg-white opacity-70"
            : "border-sand-300 bg-white hover:-translate-y-0.5 hover:border-clay-500 hover:shadow";
          return (
            <motion.button
              key={i}
              whileTap={{ scale: 0.97 }}
              disabled={answered || role === "tutor" || quiz.closed}
              onClick={() => onAnswer(i)}
              className={`flex items-center justify-between rounded-2xl border-2 px-4 py-3 text-left font-semibold transition ${tone}`}
            >
              <span><span className="mr-2 text-earth-400">{String.fromCharCode(65 + i)}.</span>{option}</span>
              {(answered || role === "tutor") && isCorrect && <Check size={18} />}
            </motion.button>
          );
        })}
      </div>
      <AnimatePresence>
        {answered && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 overflow-hidden">
            <p className={`font-display text-xl font-semibold ${correct ? "text-forest-700" : "text-clay-700"}`}>
              {role === "tutor" ? (correct ? "Bonne réponse de votre élève !" : "Votre élève s'est trompé.") : correct ? "Bravo, c'est juste ! 🎉" : "Pas tout à fait…"}
            </p>
            {quiz.explanation && <p className="mt-1 text-sm text-earth-700">{quiz.explanation}</p>}
          </motion.div>
        )}
      </AnimatePresence>
      {!answered && role === "tutor" && <p className="mt-4 flex items-center gap-2 text-sm text-earth-500"><Loader2 size={15} className="animate-spin" /> En attente de la réponse de votre élève…</p>}
    </motion.div>
  );
}

type Draft = { question: string; options: string[]; correctIndex: number; explanation: string };
const EMPTY_DRAFT: Draft = { question: "", options: ["", "", "", ""], correctIndex: 0, explanation: "" };

export function QuizComposer({ api, aiAvailable, live, onLaunch, onEnd }: { api: string; aiAvailable: boolean; live: QuizState | null; onLaunch: (d: Draft) => Promise<string | null>; onEnd: () => void }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = useState<"ai" | "launch" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggest = async () => {
    setBusy("ai");
    setError(null);
    const res = await fetch(`${api}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "quiz" }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok && data?.quiz) {
      const q = data.quiz as Draft;
      setDraft({ question: q.question, options: [...q.options, "", "", "", ""].slice(0, 4), correctIndex: q.correctIndex, explanation: q.explanation });
    } else setError(data?.error ?? "L'assistant n'a pas pu proposer de question.");
    setBusy(null);
  };

  const launch = async () => {
    setBusy("launch");
    const failure = await onLaunch({ ...draft, options: draft.options.filter((o) => o.trim()) });
    setError(failure);
    if (!failure) setDraft(EMPTY_DRAFT);
    setBusy(null);
  };

  const field = "w-full rounded-xl bg-white/10 p-2.5 text-sm outline-none placeholder:text-sand-300";
  return (
    <div className="space-y-3 text-sm">
      {live && (
        <div className="rounded-xl bg-white/5 p-3">
          <p className="font-semibold">Quiz en cours : {live.question}</p>
          <p className="mt-1 text-sand-300">
            {live.answerIndex === null ? "En attente de la réponse…" : `Réponse : ${live.options[live.answerIndex]} ${live.answerIndex === live.correctIndex ? "✔" : "✘"}`}
          </p>
          <button onClick={onEnd} className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">Terminer ce quiz</button>
        </div>
      )}
      {aiAvailable && (
        <button onClick={suggest} disabled={!!busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ochre-400 px-3 py-2 font-semibold text-forest-900 hover:bg-ochre-300 disabled:opacity-60">
          {busy === "ai" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Proposer une question avec l&apos;IA
        </button>
      )}
      <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="Question (ex. : Comment dit-on « merci » ?)" className={field} />
      {draft.options.map((option, i) => (
        <label key={i} className="flex items-center gap-2">
          <input type="radio" name="correct" checked={draft.correctIndex === i} onChange={() => setDraft({ ...draft, correctIndex: i })} className="accent-ochre-400" aria-label={`Bonne réponse : ${String.fromCharCode(65 + i)}`} />
          <input value={option} onChange={(e) => setDraft({ ...draft, options: draft.options.map((o, j) => (j === i ? e.target.value : o)) })} placeholder={`Réponse ${String.fromCharCode(65 + i)}${i > 1 ? " (facultative)" : ""}`} className={field} />
        </label>
      ))}
      <input value={draft.explanation} onChange={(e) => setDraft({ ...draft, explanation: e.target.value })} placeholder="Explication affichée après la réponse (facultatif)" className={field} />
      <p className="text-xs text-sand-300">Cochez la bonne réponse.</p>
      {error && <p className="rounded-lg bg-clay-600/30 p-2">{error}</p>}
      <button onClick={launch} disabled={!!busy || !draft.question.trim() || draft.options.filter((o) => o.trim()).length < 2} className="w-full rounded-xl bg-clay-600 px-3 py-2 font-semibold hover:bg-clay-700 disabled:opacity-50">
        {busy === "launch" ? "Lancement…" : "Lancer le quiz"}
      </button>
    </div>
  );
}

// ── Speech transcription (browser Web Speech API) ─────────

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
export function useSpeechSupported() {
  return useSyncExternalStore(noop, () => !!recognitionCtor(), () => false);
}

// Transcribes this participant's microphone while `active`; finished sentences go to onFinal.
export function useTranscription(active: boolean, lang: string, onFinal: (text: string) => void) {
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    const Ctor = active ? recognitionCtor() : null;
    if (!Ctor) return;
    let stopped = false;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) onFinalRef.current(text);
        } else pending += result[0].transcript;
      }
      setInterim(pending.trim());
    };
    rec.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        stopped = true;
        setError("Le navigateur a refusé la reconnaissance vocale.");
      } else if (event.error === "language-not-supported") {
        stopped = true;
        setError("Cette langue n'est pas reconnue par votre navigateur. Choisissez-en une autre.");
      }
    };
    // Browsers stop listening after a silence; restart until the assistant is switched off.
    rec.onend = () => {
      if (!stopped) {
        try {
          rec.start();
        } catch {
          // already started
        }
      }
    };
    try {
      rec.start();
    } catch (err) {
      console.warn("Reconnaissance vocale", err);
    }
    return () => {
      stopped = true;
      rec.onend = null;
      rec.stop();
      setInterim("");
      setError(null);
    };
  }, [active, lang]);

  return { interim, error };
}

// ── AI assistant panel ────────────────────────────────────

export type AssistantState = { enabled: boolean; myConsent: boolean | null; otherConsent: boolean | null };

export function AssistantPanel(props: {
  api: string;
  role: "student" | "tutor";
  otherName: string;
  state: AssistantState;
  aiAvailable: boolean;
  speechSupported: boolean;
  transcribing: boolean;
  speechError: string | null;
  lang: string;
  langs: { code: string; label: string }[];
  onLang: (code: string) => void;
  captions: boolean;
  onCaptions: (on: boolean) => void;
  onToggle: (enabled: boolean) => void;
  onConsent: (accepted: boolean) => void;
}) {
  const { api, role, otherName, state, aiAvailable, speechSupported, transcribing, speechError, lang, langs, onLang, captions, onCaptions, onToggle, onConsent } = props;
  const [question, setQuestion] = useState("");
  const [answers, setAnswers] = useState<{ q: string; a: string | null }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [answers]);

  const ask = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const q = question.trim();
    if (!q) return;
    setQuestion("");
    setAnswers((list) => [...list, { q, a: null }]);
    const res = await fetch(`${api}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "ask", question: q }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    const answer = res?.ok ? data.answer : (data?.error ?? "L'assistant n'a pas pu répondre.");
    setAnswers((list) => list.map((item, i) => (i === list.length - 1 && item.a === null ? { ...item, a: answer } : item)));
  }, [api, question]);

  const consentLabel = (c: boolean | null) => (c === true ? "transcription acceptée" : c === false ? "transcription refusée" : "en attente de réponse");

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-white/10 p-3 text-sm">
        <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
          <Bot size={22} className="mt-0.5 shrink-0 text-ochre-300" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Assistant IA Riya</p>
            <p className="text-xs text-sand-300">
              Avec votre accord à tous les deux, il écoute la séance pour afficher des sous-titres et préparer un résumé complet du cours.
            </p>
            {role === "tutor" ? (
              <button onClick={() => onToggle(!state.enabled)} className={`mt-2 rounded-full px-3 py-1 text-xs font-semibold ${state.enabled ? "bg-white/10 hover:bg-white/20" : "bg-ochre-400 text-forest-900 hover:bg-ochre-300"}`}>
                {state.enabled ? "Désactiver l'assistant" : "Activer l'assistant"}
              </button>
            ) : !state.enabled ? (
              <p className="mt-2 text-xs text-sand-300">Votre tuteur peut l&apos;activer.</p>
            ) : null}
          </div>
        </div>

        {state.enabled && (
          <div className="space-y-2 rounded-xl bg-white/5 p-3 text-xs">
            <p className="flex items-center justify-between gap-2">
              <span>Vous : {consentLabel(state.myConsent)}</span>
              <button onClick={() => onConsent(!state.myConsent)} className="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20">{state.myConsent ? "Arrêter" : "Accepter"}</button>
            </p>
            <p>{otherName.split(" ")[0]} : {consentLabel(state.otherConsent)}</p>
            {state.myConsent && (
              <>
                {!speechSupported && <p className="rounded-lg bg-clay-600/30 p-2">Votre navigateur ne sait pas transcrire la voix. Utilisez Chrome ou Edge.</p>}
                {speechError && <p className="rounded-lg bg-clay-600/30 p-2">{speechError}</p>}
                {transcribing && <p className="flex items-center gap-1.5 text-forest-100"><span className="h-2 w-2 animate-pulse rounded-full bg-clay-500" /> Transcription de votre voix en cours</p>}
                <label className="flex items-center justify-between gap-2">
                  <span>Langue parlée</span>
                  <select value={lang} onChange={(e) => onLang(e.target.value)} className="rounded-lg bg-white/10 px-2 py-1 outline-none">
                    {langs.map((l) => <option key={l.code} value={l.code} className="text-earth-900">{l.label}</option>)}
                  </select>
                </label>
                <p className="text-sand-300">La reconnaissance vocale ne connaît pas encore toutes les langues africaines : choisissez la langue que vous parlez le plus pendant la séance.</p>
              </>
            )}
          </div>
        )}
        <label className="flex items-center justify-between gap-2 text-xs">
          <span>Sous-titres de {otherName.split(" ")[0]}</span>
          <input type="checkbox" checked={captions} onChange={(e) => onCaptions(e.target.checked)} className="accent-ochre-400" disabled={!state.enabled} />
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {!aiAvailable ? (
          <p className="text-center text-sand-300">Les questions à l&apos;IA ne sont pas encore activées sur la plateforme.</p>
        ) : answers.length === 0 ? (
          <p className="text-center text-sand-300">Une question pendant le cours ? « Que veut dire <em>asante</em> ? », « Comment se prononce… ? »</p>
        ) : (
          answers.map((item, i) => (
            <div key={i} className="space-y-1.5">
              <p className="ml-auto max-w-[85%] rounded-2xl bg-clay-600 px-3 py-2">{item.q}</p>
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[90%] rounded-2xl bg-white/10 px-3 py-2">
                {item.a === null ? <Loader2 size={16} className="animate-spin" /> : <p className="whitespace-pre-line">{item.a}</p>}
              </motion.div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
      {aiAvailable && (
        <form onSubmit={ask} className="flex gap-2 border-t border-white/10 p-3">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Demander à l'assistant…" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-sand-300" />
          <button className="rounded-full bg-ochre-400 p-2.5 text-forest-900 hover:bg-ochre-300" aria-label="Demander"><Sparkles size={16} /></button>
        </form>
      )}
    </div>
  );
}

export function ConsentPrompt({ tutorName, onAnswer }: { tutorName: string; onAnswer: (accepted: boolean) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-x-3 top-3 z-40 mx-auto max-w-lg rounded-2xl bg-sand-50 p-5 text-earth-900 shadow-2xl">
      <p className="flex items-center gap-2 font-semibold"><Bot size={20} className="text-clay-600" /> {tutorName} a activé l&apos;assistant IA</p>
      <p className="mt-1 text-sm text-earth-700">
        Il transcrit ce que vous dites pour afficher des sous-titres et rédiger le résumé de votre cours. La transcription reste privée entre vous et votre tuteur. Vous pouvez arrêter à tout moment.
      </p>
      <div className="mt-4 flex gap-2">
        <button onClick={() => onAnswer(true)} className="btn-primary">Accepter</button>
        <button onClick={() => onAnswer(false)} className="btn-outline">Refuser</button>
      </div>
    </motion.div>
  );
}
