"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot, FolderOpen, Hand, ListChecks, Maximize2, Mic, MicOff, MessageSquare, Minimize2, MonitorUp, NotebookPen, PenLine, PhoneOff, Presentation,
  Send, Smile, Subtitles, Trash2, Upload, Video, VideoOff, Wifi, WifiOff, X,
} from "lucide-react";
import { updateLesson } from "@/lib/actions/lessons";
import { LESSON_FILE_TYPES, REACTIONS, withDe } from "@/lib/constants";
import {
  AssistantPanel, Confetti, ConsentPrompt, QuizCard, QuizComposer, ReactionLayer, Whiteboard, makeConfetti, useSpeechSupported, useTranscription,
  type AssistantState, type ConfettiPiece, type FloatingReaction, type QuizState, type Stroke,
} from "./ClassroomTools";
import { DocumentRow, DocumentViewer, FeedbackForm, NotesView, type FeedbackValues, type Notes, type SharedDocument } from "./LessonExtras";
import { Avatar } from "./ui";

// Face-to-face video lesson between a student and a tutor, peer to peer over WebRTC,
// with shared documents, a whiteboard, quizzes, reactions, live notes and an AI assistant.
// Everything else than audio/video goes through /api/classe/[id], polled once a second.
// The tutor always makes the WebRTC offer; a "hello" from the student asks for a fresh one.

type Person = { id: string; name: string; avatar_url: string };
type ChatLine = { id: string; author_id: string; body: string; created_at: string };
type Signal = { type: string; payload: unknown };
type ClassEvent = { id: string; type: "reaction" | "stroke" | "clear"; author_id: string; payload: unknown };
type Panel = "chat" | "documents" | "notes" | "quiz" | "assistant" | null;

type Props = {
  lessonId: string;
  role: "student" | "tutor";
  me: Person;
  other: Person;
  startsAt: string;
  durationMinutes: number;
  languageName: string;
  iceServers: RTCIceServer[];
  initialNotes: Notes | null;
  initialFeedback: FeedbackValues | null;
  aiAvailable: boolean;
  speechLangs: { code: string; label: string }[];
};

type SyncResponse = {
  open: boolean;
  peerOnline: boolean;
  documents: SharedDocument[];
  presentedFileId: string | null;
  boardOpen: boolean;
  notes: Notes | null;
  hands: { me: boolean; other: boolean };
  quiz: QuizState | null;
  assistant: AssistantState;
  signalCursor: string;
  chatCursor: string | null;
  eventsCursor: string;
  transcriptCursor: string;
  signals: Signal[];
  chat: ChatLine[];
  events: ClassEvent[];
  transcript: { id: string; speaker_id: string; text: string }[];
};

const POLL_MS = 1000;
const NOTES_SAVE_DELAY_MS = 1200;
const CAPTION_MS = 7000;
const EMPTY_NOTES: Notes = { keyPoints: "", vocabulary: "", homework: "" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getLocalMedia(): Promise<{ stream: MediaStream | null; error: string | null }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { stream: null, error: "Votre navigateur ne permet pas l'accès à la caméra (une connexion https est nécessaire)." };
  }
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: { echoCancellation: true, noiseSuppression: true } }), error: null };
  } catch {
    try {
      return { stream: await navigator.mediaDevices.getUserMedia({ audio: true }), error: "Caméra indisponible : vous rejoindrez en audio uniquement." };
    } catch {
      return { stream: null, error: "Accès à la caméra et au micro refusé. Autorisez-les dans votre navigateur pour être vu et entendu." };
    }
  }
}

function VideoView({ stream, muted, mirrored, className }: { stream: MediaStream | null; muted?: boolean; mirrored?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={`${className} ${mirrored ? "-scale-x-100" : ""}`} />;
}

// The current time, ticking every second. It is null on the server and during
// hydration, so server and browser render the same HTML (no countdown mismatch).
let clockNow = 0;
function subscribeClock(onTick: () => void) {
  const id = setInterval(() => {
    clockNow = Date.now();
    onTick();
  }, 1000);
  return () => clearInterval(id);
}
function useClock(): number | null {
  return useSyncExternalStore(subscribeClock, () => (clockNow ||= Date.now()), () => null);
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const noopSubscribe = () => () => {};

// Fullscreen for the whole classroom (videos, stage and controls), where the browser allows it.
function useFullscreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const supported = useSyncExternalStore(noopSubscribe, () => document.fullscreenEnabled, () => false);

  useEffect(() => {
    const sync = () => setActive(!!ref.current && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else ref.current?.requestFullscreen().catch(() => {});
  }, []);

  // "F" toggles fullscreen, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key.toLowerCase() !== "f" || e.ctrlKey || e.metaKey || e.altKey || target.closest("input, textarea, select, [contenteditable]")) return;
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { ref, active, supported, toggle };
}

function ControlButton({ on = true, danger, label, onClick, children }: { on?: boolean; danger?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
        danger ? "bg-clay-600 text-white hover:bg-clay-700" : on ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-earth-900 hover:bg-sand-100"
      }`}
    >
      {children}
    </motion.button>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ochre-400 px-1 text-[11px] font-bold text-forest-900">
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function Classroom(props: Props) {
  const { lessonId, role, me, other, startsAt, durationMinutes, languageName, iceServers, initialNotes, initialFeedback, aiAvailable, speechLangs } = props;
  const api = `/api/classe/${lessonId}`;
  const otherFirst = other.name.split(" ")[0];

  const [phase, setPhase] = useState<"lobby" | "live" | "ended">("lobby");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connState, setConnState] = useState<RTCPeerConnectionState>("new");
  const [peerOnline, setPeerOnline] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [unreadChat, setUnreadChat] = useState(0);
  const [documents, setDocuments] = useState<SharedDocument[]>([]);
  const [newDocs, setNewDocs] = useState(0);
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const [notes, setNotes] = useState<Notes>(initialNotes ?? EMPTY_NOTES);
  const [notesSaved, setNotesSaved] = useState(true);
  // Stage: what the tutor shows to both ("board" or a document), or what the student opened for themselves.
  const [presentedId, setPresentedId] = useState<string | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);
  const [ownView, setOwnView] = useState<string | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [hands, setHands] = useState({ me: false, other: false });
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [hiddenQuizId, setHiddenQuizId] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [assistant, setAssistant] = useState<AssistantState>({ enabled: false, myConsent: null, otherConsent: null });
  const [speechLang, setSpeechLang] = useState(speechLangs[0]?.code ?? "fr-FR");
  const [captionsOn, setCaptionsOn] = useState(true);
  const [caption, setCaption] = useState<{ text: string; at: number } | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // Kept in a ref so a parent re-render never tears down a live call.
  const iceServersRef = useRef(iceServers);
  const panelRef = useRef<Panel>(panel);
  const quizRef = useRef<QuizState | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const now = useClock();
  const speechSupported = useSpeechSupported();
  const { ref: fullscreenRef, active: isFullscreen, supported: canFullscreen, toggle: toggleFullscreen } = useFullscreen();

  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);

  const postJson = useCallback(
    (body: unknown) => fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    [api],
  );

  const burst = useCallback(() => {
    setConfetti(makeConfetti());
    setTimeout(() => setConfetti([]), 2600);
  }, []);

  const spawnReaction = useCallback((emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setReactions((list) => [...list, { id, emoji, x: 10 + Math.random() * 75 }]);
    setTimeout(() => setReactions((list) => list.filter((r) => r.id !== id)), 2800);
  }, []);

  // Camera and microphone, requested as soon as the lobby opens.
  useEffect(() => {
    let cancelled = false;
    getLocalMedia().then(({ stream, error }) => {
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(error);
      setCamOn(!!stream?.getVideoTracks().length);
      setMediaReady(true);
    });
    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenTrackRef.current?.stop();
    };
  }, []);

  // The live session: polling, signalling and the peer connection.
  useEffect(() => {
    if (phase !== "live") return;
    let stopped = false;
    const cursors: Record<string, string | null> = { signals: null, chat: null, events: null, transcript: null };
    let knownDocs: number | null = null;
    let pending: RTCIceCandidateInit[] = [];

    // Signals are posted one after another so the peer receives them in order
    // (an ICE candidate must never overtake the offer it belongs to).
    let queue = Promise.resolve();
    const post = (body: unknown) => {
      queue = queue.then(() => fetch(api, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(() => undefined, () => undefined));
      return queue;
    };
    const sendSignal = (type: string, payload?: unknown) => post({ kind: "signal", type, payload });

    const createPc = () => {
      pcRef.current?.close();
      pending = [];
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
      const stream = localStreamRef.current ?? new MediaStream();
      const audio = stream.getAudioTracks()[0];
      const video = screenTrackRef.current ?? stream.getVideoTracks()[0];
      // Without a local track we still open a send/receive slot, so we can receive
      // the other side and start sharing the screen later without renegotiating.
      if (role === "tutor") {
        if (audio) pc.addTrack(audio, stream);
        else pc.addTransceiver("audio", { direction: "sendrecv" });
        if (video) pc.addTrack(video, stream);
        else pc.addTransceiver("video", { direction: "sendrecv" });
      } else {
        if (audio) pc.addTrack(audio, stream);
        if (video) pc.addTrack(video, stream);
      }
      pc.ontrack = (event) => setRemoteStream(event.streams[0] ?? new MediaStream([event.track]));
      pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal("candidate", event.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        if (pcRef.current !== pc) return;
        setConnState(pc.connectionState);
        if (pc.connectionState === "failed") {
          if (role === "tutor") makeOffer();
          else sendSignal("hello");
        }
      };
      pcRef.current = pc;
      setConnState("new");
      return pc;
    };

    const makeOffer = async () => {
      const pc = createPc();
      await pc.setLocalDescription(await pc.createOffer());
      await sendSignal("offer", pc.localDescription!.toJSON());
    };

    const flushCandidates = async (pc: RTCPeerConnection) => {
      for (const candidate of pending.splice(0)) await pc.addIceCandidate(candidate).catch(() => {});
    };

    const handle = async ({ type, payload }: Signal) => {
      const pc = pcRef.current;
      if (type === "hello" && role === "tutor") {
        await makeOffer();
      } else if (type === "offer" && role === "student") {
        const fresh = createPc();
        await fresh.setRemoteDescription(payload as RTCSessionDescriptionInit);
        for (const t of fresh.getTransceivers()) if (!t.sender.track) t.direction = "sendrecv";
        await flushCandidates(fresh);
        await fresh.setLocalDescription(await fresh.createAnswer());
        await sendSignal("answer", fresh.localDescription!.toJSON());
      } else if (type === "answer" && role === "tutor" && pc?.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        await flushCandidates(pc);
      } else if (type === "candidate") {
        if (pc?.remoteDescription) await pc.addIceCandidate(payload as RTCIceCandidateInit).catch(() => {});
        else pending.push(payload as RTCIceCandidateInit);
      } else if (type === "bye") {
        pc?.close();
        pcRef.current = null;
        setRemoteStream(null);
        setConnState("new");
      }
    };

    const applyEvents = (events: ClassEvent[], first: boolean) => {
      if (first) {
        // First sync replays the whiteboard since its last clear.
        setStrokes(events.filter((e) => e.type === "stroke").map((e) => ({ id: e.id, ...(e.payload as Omit<Stroke, "id">) })));
        return;
      }
      for (const event of events) {
        if (event.author_id === me.id && event.type !== "clear") continue; // already shown locally
        if (event.type === "reaction") spawnReaction((event.payload as { emoji: string }).emoji);
        else if (event.type === "stroke") setStrokes((list) => [...list, { id: event.id, ...(event.payload as Omit<Stroke, "id">) }]);
        else if (event.type === "clear") setStrokes([]);
      }
    };

    const applyQuiz = (next: QuizState | null) => {
      const previous = quizRef.current;
      quizRef.current = next;
      setQuiz(next);
      // The tutor celebrates with the student when a right answer comes in.
      if (role === "tutor" && next && next.answerIndex !== null && previous?.id === next.id && previous.answerIndex === null && next.answerIndex === next.correctIndex) burst();
    };

    const loop = async () => {
      let first = true;
      while (!stopped) {
        try {
          const params = new URLSearchParams(Object.entries(cursors).filter(([, v]) => v) as [string, string][]);
          const res = await fetch(`${api}?${params}`, { cache: "no-store" });
          if (res.ok) {
            const data: SyncResponse = await res.json();
            if (stopped) break;
            cursors.signals = data.signalCursor;
            cursors.chat = data.chatCursor ?? cursors.chat;
            cursors.events = data.eventsCursor;
            cursors.transcript = data.transcriptCursor;

            setPeerOnline(data.peerOnline);
            setPresentedId(data.presentedFileId);
            setBoardOpen(data.boardOpen);
            setHands(data.hands);
            setAssistant(data.assistant);
            applyQuiz(data.quiz);
            setDocuments(data.documents);
            if (knownDocs !== null && data.documents.length > knownDocs && panelRef.current !== "documents") {
              setNewDocs((n) => n + data.documents.length - (knownDocs ?? 0));
            }
            knownDocs = data.documents.length;
            // The tutor edits notes locally; the student follows the saved version.
            if (role === "student" && data.notes) setNotes(data.notes);
            if (data.chat.length) {
              setChat((lines) => [...lines, ...data.chat]);
              if (panelRef.current !== "chat" && !first) setUnreadChat((n) => n + data.chat.filter((m) => m.author_id !== me.id).length);
            }
            applyEvents(data.events, first);
            const spoken = data.transcript.filter((t) => t.speaker_id !== me.id).at(-1);
            if (spoken) setCaption({ text: spoken.text, at: Date.now() });

            for (const signal of data.signals) await handle(signal).catch((err) => console.error("signal", signal.type, err));
            if (first) {
              first = false;
              await sendSignal("hello");
              if (role === "tutor") await makeOffer();
            }
          }
        } catch {
          // Network hiccup: keep polling.
        }
        await sleep(POLL_MS);
      }
    };
    loop();

    const sayBye = () => navigator.sendBeacon(api, JSON.stringify({ kind: "signal", type: "bye" }));
    window.addEventListener("pagehide", sayBye);
    return () => {
      stopped = true;
      window.removeEventListener("pagehide", sayBye);
      sayBye();
      pcRef.current?.close();
      pcRef.current = null;
      setRemoteStream(null);
    };
  }, [phase, api, role, me.id, spawnReaction, burst]);

  useEffect(() => {
    if (panel === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, panel]);

  // Tutor notes are saved automatically a moment after typing stops.
  useEffect(() => {
    if (role !== "tutor" || notesSaved) return;
    const id = setTimeout(() => {
      postJson({ kind: "notes", ...notes }).then((res) => res.ok && setNotesSaved(true)).catch(() => {});
    }, NOTES_SAVE_DELAY_MS);
    return () => clearTimeout(id);
  }, [notes, notesSaved, role, postJson]);

  // AI assistant: transcribe my own voice while I agreed and my microphone is on.
  const transcribing = phase === "live" && assistant.enabled && assistant.myConsent === true && micOn && speechSupported;
  const sendTranscript = useCallback((text: string) => postJson({ kind: "transcript", text, lang: speechLang }).catch(() => {}), [postJson, speechLang]);
  const { error: speechError } = useTranscription(transcribing, speechLang, sendTranscript);

  const editNotes = (key: keyof Notes) => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes((old) => ({ ...old, [key]: event.target.value }));
    setNotesSaved(false);
  };

  const openPanel = (next: Exclude<Panel, null>) => {
    setPanel((current) => (current === next ? null : next));
    if (next === "chat") setUnreadChat(0);
    if (next === "documents") setNewDocs(0);
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUpload({ busy: true, error: null });
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${api}/documents`, { method: "POST", body: form }).catch(() => null);
      if (!res?.ok) {
        const message = res ? ((await res.json().catch(() => null))?.error ?? "Échec de l'envoi.") : "Connexion perdue.";
        setUpload({ busy: false, error: `${file.name} : ${message}` });
        return;
      }
    }
    setUpload({ busy: false, error: null });
  };

  // The tutor's choice is shown to both; the student's only to themselves.
  const showOnStage = (target: string | null) => {
    if (role === "student") return setOwnView(target);
    if (target === "board") {
      setBoardOpen(true);
      setPresentedId(null);
      postJson({ kind: "board", open: true });
    } else if (target) {
      setPresentedId(target);
      setBoardOpen(false);
      postJson({ kind: "present", fileId: target });
    } else {
      if (boardOpen) postJson({ kind: "board", open: false });
      if (presentedId) postJson({ kind: "present", fileId: null });
      setBoardOpen(false);
      setPresentedId(null);
    }
  };

  const removeDocument = async (fileId: string) => {
    await fetch(`${api}/documents?fichier=${fileId}`, { method: "DELETE" });
    setDocuments((docs) => docs.filter((d) => d.id !== fileId));
  };

  const addStroke = (stroke: Omit<Stroke, "id">) => {
    setStrokes((list) => [...list, { ...stroke, id: `local-${Date.now()}` }]);
    postJson({ kind: "stroke", ...stroke });
  };

  const react = (emoji: string) => {
    spawnReaction(emoji);
    setReactionsOpen(false);
    postJson({ kind: "reaction", emoji });
  };

  const toggleHand = () => {
    setHands((h) => ({ ...h, me: !h.me }));
    postJson({ kind: "hand", raised: !hands.me });
  };

  const answerQuiz = async (index: number) => {
    if (!quiz) return;
    const res = await postJson({ kind: "answer", quizId: quiz.id, index }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok || !data) return;
    const next = { ...quiz, answerIndex: data.answerIndex ?? index, correctIndex: data.correctIndex, explanation: data.explanation };
    quizRef.current = next;
    setQuiz(next);
    if (data.correct) burst();
  };

  const launchQuiz = async (draftQuiz: { question: string; options: string[]; correctIndex: number; explanation: string }) => {
    const res = await postJson({ kind: "quiz", ...draftQuiz }).catch(() => null);
    if (!res?.ok) return (await res?.json().catch(() => null))?.error ?? "Impossible de lancer le quiz.";
    setHiddenQuizId(null);
    return null;
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  };

  const videoSender = () => pcRef.current?.getTransceivers().find((t) => t.receiver.track.kind === "video")?.sender;

  const stopShare = () => {
    screenTrackRef.current?.stop();
    screenTrackRef.current = null;
    videoSender()?.replaceTrack(localStreamRef.current?.getVideoTracks()[0] ?? null);
    setSharing(false);
  };

  const toggleShare = async () => {
    if (sharing) return stopShare();
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      screenTrackRef.current = track;
      track.onended = stopShare;
      await videoSender()?.replaceTrack(track);
      setSharing(true);
    } catch {
      // The user closed the screen picker.
    }
  };

  const sendChat = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await postJson({ kind: "chat", body });
  };

  const leave = () => {
    if (sharing) stopShare();
    if (role === "tutor" && !notesSaved) postJson({ kind: "notes", ...notes }).then(() => setNotesSaved(true));
    setPhase("ended");
  };

  const start = new Date(startsAt).getTime();
  const end = start + durationMinutes * 60 * 1000;
  const clock = now === null ? "" : now < start ? `Début dans ${formatDuration(start - now)}` : now < end ? `${formatDuration(end - now)} restantes` : `Dépassement ${formatDuration(now - end)}`;
  const connected = connState === "connected";
  const stage = ownView ?? (boardOpen ? "board" : presentedId);
  const stageDoc = stage && stage !== "board" ? (documents.find((d) => d.id === stage) ?? null) : null;
  const onStage = stage === "board" || !!stageDoc;
  const showQuiz = quiz && hiddenQuizId !== quiz.id;
  const showCaption = captionsOn && assistant.enabled && caption && now !== null && now - caption.at < CAPTION_MS;

  if (phase === "ended") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-forest-900 px-4 py-16 text-sand-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
          <p className="font-display text-4xl font-semibold">Asante sana !</p>
          <p className="mt-2 text-sand-200">Vous avez quitté la salle de classe.</p>
          {role === "student" && (
            <div className="mt-8 rounded-2xl bg-white p-6 text-earth-900">
              <h2 className="mb-4 font-display text-xl font-semibold">Comment s&apos;est passée la séance ?</h2>
              <FeedbackForm lessonId={lessonId} initial={initialFeedback} tutorName={otherFirst} />
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <button onClick={() => setPhase("live")} className="btn bg-ochre-400 text-forest-900 hover:bg-ochre-300">Rejoindre à nouveau</button>
            <Link href={`/cours/${lessonId}`} className="btn bg-white/10 text-white hover:bg-white/20">
              {role === "student" ? "Voir le résumé et les notes du cours" : "Compléter les notes et le résumé"}
            </Link>
            {role === "tutor" && now !== null && now >= start && (
              <form action={updateLesson.bind(null, lessonId, "complete")}>
                <button className="btn w-full bg-white/10 text-white hover:bg-white/20">Marquer le cours comme terminé</button>
              </form>
            )}
            <Link href="/tableau-de-bord" className="btn bg-white/10 text-white hover:bg-white/20">Retour à mes cours</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-forest-900 px-4 py-10 text-sand-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-earth-900 ring-1 ring-white/10">
            {localStream?.getVideoTracks().length && camOn ? (
              <VideoView stream={localStream} muted mirrored className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center"><Avatar name={me.name} src={me.avatar_url} size={96} /></div>
            )}
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
              <ControlButton on={micOn} label={micOn ? "Couper le micro" : "Activer le micro"} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</ControlButton>
              <ControlButton on={camOn} label={camOn ? "Couper la caméra" : "Activer la caméra"} onClick={toggleCam}>{camOn ? <Video size={20} /> : <VideoOff size={20} />}</ControlButton>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-ochre-300">Salle de classe · {languageName}</p>
            <h1 className="mt-3 font-display text-3xl font-semibold">Prêt·e pour votre cours avec {otherFirst} ?</h1>
            <p className="mt-2 text-sand-200">Vérifiez votre caméra et votre micro, puis rejoignez la classe.</p>
            <ul className="mt-4 space-y-1 text-sm text-sand-300">
              <li>✏️ Tableau blanc partagé, documents et quiz</li>
              <li>👏 Réactions et main levée</li>
              <li>🤖 Assistant IA : sous-titres et résumé du cours (avec votre accord)</li>
            </ul>
            {mediaError && <p className="mt-4 rounded-xl bg-clay-600/20 p-3 text-sm text-clay-100">{mediaError}</p>}
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setPhase("live")} disabled={!mediaReady} className="btn mt-6 bg-ochre-400 px-7 py-3 text-base text-forest-900 hover:bg-ochre-300">
              {mediaReady ? "Rejoindre la classe" : "Préparation de la caméra…"}
            </motion.button>
            <p className="mt-4 text-sm text-sand-300">{clock}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  const selfTile = (
    <div className="relative aspect-video w-36 overflow-hidden rounded-xl bg-earth-800 ring-2 ring-white/20 sm:w-56">
      {localStream?.getVideoTracks().length && camOn ? (
        <VideoView stream={localStream} muted mirrored className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center"><Avatar name={me.name} src={me.avatar_url} size={48} /></div>
      )}
      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px]">Vous{sharing ? " · écran partagé" : ""}{hands.me ? " ✋" : ""}</span>
    </div>
  );

  const remoteView = remoteStream && connected ? (
    <VideoView stream={remoteStream} className={onStage ? "h-full w-full bg-black object-cover" : "h-full w-full object-contain"} />
  ) : (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-2 text-center">
      <Avatar name={other.name} src={other.avatar_url} size={onStage ? 40 : 112} />
      {!onStage && <p className="text-sand-200">{peerOnline ? "Connexion en cours…" : `${otherFirst} n'a pas encore rejoint la classe.`}</p>}
    </div>
  );

  const canCloseStage = role === "tutor" || !!ownView;

  return (
    <div ref={fullscreenRef} className={`flex flex-col bg-earth-900 text-sand-50 ${isFullscreen ? "h-screen" : "h-[calc(100vh-4rem)]"}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">Cours {withDe(languageName)} avec {other.name}</p>
          <p className="text-xs text-sand-300">{clock}</p>
        </div>
        <div className="flex items-center gap-2">
          {assistant.enabled && (
            <span className="chip bg-ochre-400/20 text-ochre-100" title="Assistant IA actif">
              <Bot size={13} /> {transcribing ? "IA à l'écoute" : "Assistant IA"}
            </span>
          )}
          <span className={`chip ${connected ? "bg-forest-600 text-white" : "bg-white/10 text-sand-200"}`}>
            {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
            {connected ? "Connecté" : peerOnline ? "Connexion…" : `En attente de ${otherFirst}`}
          </span>
          {canFullscreen && (
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Quitter le plein écran (F ou Échap)" : "Plein écran (F)"}
              aria-label={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 p-3">
          <ReactionLayer reactions={reactions} />
          <Confetti pieces={confetti} />

          <AnimatePresence>
            {role === "student" && assistant.enabled && assistant.myConsent === null && (
              <ConsentPrompt tutorName={otherFirst} onAnswer={(accepted) => { setAssistant((a) => ({ ...a, myConsent: accepted })); postJson({ kind: "consent", accepted }); }} />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hands.other && (
              <motion.div initial={{ opacity: 0, y: -16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16 }} className="absolute left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-ochre-400 px-4 py-2 font-semibold text-forest-900 shadow-lg">
                <motion.span animate={{ rotate: [0, 18, -10, 18, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>✋</motion.span>
                {otherFirst} lève la main
                {role === "tutor" && <button onClick={() => postJson({ kind: "hand", raised: false, forOther: true })} className="rounded-full bg-forest-900/10 px-2 py-0.5 text-xs hover:bg-forest-900/20">Baisser</button>}
              </motion.div>
            )}
          </AnimatePresence>

          {onStage ? (
            // The whiteboard or a document takes the stage; both video feeds move to a column on the side.
            <motion.div key={stage} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex h-full gap-3">
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-earth-800">
                <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    {stage === "board" ? <PenLine size={16} className="shrink-0 text-ochre-300" /> : <Presentation size={16} className="shrink-0 text-ochre-300" />}
                    <span className="truncate">{stage === "board" ? "Tableau blanc partagé" : stageDoc?.name}</span>
                  </span>
                  {canCloseStage && (
                    <button onClick={() => showOnStage(null)} className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs hover:bg-white/20">
                      {role === "tutor" ? "Arrêter la présentation" : "Fermer"}
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 p-2">
                  {stage === "board" ? (
                    <Whiteboard strokes={strokes} onStroke={addStroke} onClear={role === "tutor" ? () => { setStrokes([]); postJson({ kind: "clear" }); } : undefined} />
                  ) : (
                    stageDoc && <DocumentViewer doc={stageDoc} dark />
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <div className="relative aspect-video w-36 overflow-hidden rounded-xl bg-black ring-2 ring-white/20 sm:w-56">
                  {remoteView}
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 text-[10px]">{other.name}{hands.other ? " ✋" : ""}</span>
                </div>
                {selfTile}
              </div>
            </motion.div>
          ) : (
            <div className="relative h-full overflow-hidden rounded-2xl bg-black">
              {remoteView}
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 px-2 py-1 text-xs">{other.name}</span>
              <div className="absolute bottom-3 right-3">{selfTile}</div>
            </div>
          )}

          <AnimatePresence>
            {showCaption && (
              <motion.p key={caption!.at} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-6 bottom-20 z-20 mx-auto w-fit max-w-2xl rounded-xl bg-black/75 px-4 py-2 text-center text-lg leading-snug">
                <span className="mr-2 text-xs font-semibold uppercase text-ochre-300">{otherFirst}</span>{caption!.text}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showQuiz && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4">
                <QuizCard quiz={quiz!} role={role} onAnswer={answerQuiz} onClose={() => setHiddenQuizId(quiz!.id)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {panel && (
            <motion.aside
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-40 flex flex-col bg-earth-900 sm:static sm:w-96 sm:border-l sm:border-white/10"
            >
              <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 p-2">
                {([["chat", "Discussion"], ["documents", "Documents"], ["notes", "Notes"], ...(role === "tutor" ? [["quiz", "Quiz"]] : []), ["assistant", "Assistant IA"]] as [Exclude<Panel, null>, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => openPanel(key)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${panel === key ? "bg-white/15 font-semibold" : "text-sand-300 hover:bg-white/10"}`}>
                    {label}
                  </button>
                ))}
                <button onClick={() => setPanel(null)} aria-label="Fermer le panneau" className="ml-auto shrink-0 rounded-full p-1.5 hover:bg-white/10"><X size={18} /></button>
              </div>

              {panel === "chat" && (
                <>
                  <div className="flex-1 space-y-2 overflow-y-auto p-3">
                    {chat.length === 0 && <p className="text-center text-sm text-sand-300">Écrivez ici les mots nouveaux, les corrections, les liens…</p>}
                    {chat.map((m) => {
                      const mine = m.author_id === me.id;
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${mine ? "ml-auto bg-clay-600" : "bg-white/10"}`}>
                          <p className="whitespace-pre-line break-words">{m.body}</p>
                        </motion.div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendChat} className="flex gap-2 border-t border-white/10 p-3">
                    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Message…" className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm outline-none placeholder:text-sand-300" />
                    <button className="rounded-full bg-clay-600 p-2.5 hover:bg-clay-700" aria-label="Envoyer"><Send size={16} /></button>
                  </form>
                </>
              )}

              {panel === "documents" && (
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {role === "tutor" && (
                    <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 p-4 text-sm hover:border-ochre-300 ${upload.busy ? "opacity-60" : ""}`}>
                      <Upload size={18} /> {upload.busy ? "Envoi en cours…" : "Partager un document"}
                      <input
                        type="file"
                        multiple
                        className="sr-only"
                        disabled={upload.busy}
                        accept={Object.keys(LESSON_FILE_TYPES).join(",")}
                        onChange={(e) => {
                          uploadFiles(e.target.files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  {upload.error && <p className="rounded-lg bg-clay-600/30 p-2 text-sm">{upload.error}</p>}
                  {documents.length === 0 ? (
                    <p className="text-center text-sm text-sand-300">
                      {role === "tutor" ? "PDF, images, audio, Word, PowerPoint… (15 Mo max). Votre élève les voit immédiatement." : "Les documents partagés par votre tuteur apparaîtront ici."}
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {documents.map((doc) => {
                        const shown = stage === doc.id;
                        return (
                          <DocumentRow key={doc.id} doc={doc} dark>
                            <button
                              onClick={() => showOnStage(shown ? null : doc.id)}
                              title={role === "tutor" ? (shown ? "Arrêter la présentation" : "Présenter à l'élève") : "Afficher en grand"}
                              aria-label={role === "tutor" ? `Présenter ${doc.name}` : `Afficher ${doc.name}`}
                              className={`rounded-full p-2 ${shown ? "bg-ochre-400 text-forest-900" : "hover:bg-white/10"}`}
                            >
                              <Presentation size={16} />
                            </button>
                            {role === "tutor" && (
                              <button onClick={() => removeDocument(doc.id)} title="Retirer" aria-label={`Retirer ${doc.name}`} className="rounded-full p-2 hover:bg-white/10"><Trash2 size={16} /></button>
                            )}
                          </DocumentRow>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {panel === "notes" && (
                <div className="flex-1 overflow-y-auto p-3">
                  {role === "tutor" ? (
                    <div className="space-y-3 text-sm">
                      <p className="text-xs text-sand-300">
                        Votre élève voit ces notes en direct, et elles servent à préparer son résumé de révision. {notesSaved ? "✓ Enregistré" : "Enregistrement…"}
                      </p>
                      <label className="block">
                        <span className="mb-1 block font-semibold">Points clés</span>
                        <textarea value={notes.keyPoints} onChange={editNotes("keyPoints")} rows={5} className="w-full rounded-xl bg-white/10 p-3 outline-none" placeholder="Ce qu'on a vu, les erreurs fréquentes…" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-semibold">Vocabulaire <span className="font-normal text-sand-300">(une ligne par mot : mot = traduction)</span></span>
                        <textarea value={notes.vocabulary} onChange={editNotes("vocabulary")} rows={6} className="w-full rounded-xl bg-white/10 p-3 font-mono outline-none" placeholder={"habari = comment ça va ?\nasante = merci"} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block font-semibold">Devoirs</span>
                        <textarea value={notes.homework} onChange={editNotes("homework")} rows={3} className="w-full rounded-xl bg-white/10 p-3 outline-none" />
                      </label>
                    </div>
                  ) : (
                    <NotesView notes={notes} dark />
                  )}
                </div>
              )}

              {panel === "quiz" && role === "tutor" && (
                <div className="flex-1 overflow-y-auto p-3">
                  <QuizComposer api={api} aiAvailable={aiAvailable} live={quiz} onLaunch={launchQuiz} onEnd={() => postJson({ kind: "quiz-close" })} />
                </div>
              )}

              {panel === "assistant" && (
                <div className="min-h-0 flex-1">
                  <AssistantPanel
                    api={api}
                    role={role}
                    otherName={other.name}
                    state={assistant}
                    aiAvailable={aiAvailable}
                    speechSupported={speechSupported}
                    transcribing={transcribing}
                    speechError={speechError}
                    lang={speechLang}
                    langs={speechLangs}
                    onLang={setSpeechLang}
                    captions={captionsOn}
                    onCaptions={setCaptionsOn}
                    onToggle={(enabled) => { setAssistant((a) => ({ ...a, enabled, myConsent: enabled ? true : a.myConsent })); postJson({ kind: "assistant", enabled }); }}
                    onConsent={(accepted) => { setAssistant((a) => ({ ...a, myConsent: accepted })); postJson({ kind: "consent", accepted }); }}
                  />
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <div className="relative flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-4 py-3 sm:gap-3">
        <ControlButton on={micOn} label={micOn ? "Couper le micro" : "Activer le micro"} onClick={toggleMic}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</ControlButton>
        <ControlButton on={camOn} label={camOn ? "Couper la caméra" : "Activer la caméra"} onClick={toggleCam}>{camOn ? <Video size={20} /> : <VideoOff size={20} />}</ControlButton>
        <ControlButton on={!sharing} label={sharing ? "Arrêter le partage d'écran" : "Partager l'écran"} onClick={toggleShare}><MonitorUp size={20} /></ControlButton>
        <ControlButton on={stage !== "board"} label={stage === "board" ? "Fermer le tableau" : "Tableau blanc"} onClick={() => showOnStage(stage === "board" ? null : "board")}><PenLine size={20} /></ControlButton>
        <span className="relative">
          <ControlButton on={!reactionsOpen} label="Réagir" onClick={() => setReactionsOpen((o) => !o)}><Smile size={20} /></ControlButton>
          <AnimatePresence>
            {reactionsOpen && (
              <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-14 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full bg-white p-1.5 shadow-xl">
                {REACTIONS.map((emoji) => (
                  <motion.button key={emoji} whileHover={{ scale: 1.35, y: -4 }} whileTap={{ scale: 0.9 }} onClick={() => react(emoji)} className="rounded-full p-1.5 text-2xl" aria-label={`Réagir ${emoji}`}>
                    {emoji}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </span>
        <ControlButton on={!hands.me} label={hands.me ? "Baisser la main" : "Lever la main"} onClick={toggleHand}><Hand size={20} /></ControlButton>
        <span className="relative">
          <ControlButton on={panel !== "chat"} label="Discussion" onClick={() => openPanel("chat")}><MessageSquare size={20} /></ControlButton>
          <Badge count={unreadChat} />
        </span>
        <span className="relative">
          <ControlButton on={panel !== "documents"} label="Documents" onClick={() => openPanel("documents")}><FolderOpen size={20} /></ControlButton>
          <Badge count={newDocs} />
        </span>
        <ControlButton on={panel !== "notes"} label="Notes du cours" onClick={() => openPanel("notes")}><NotebookPen size={20} /></ControlButton>
        {role === "tutor" && <ControlButton on={panel !== "quiz"} label="Quiz" onClick={() => openPanel("quiz")}><ListChecks size={20} /></ControlButton>}
        <ControlButton on={panel !== "assistant"} label="Assistant IA et sous-titres" onClick={() => openPanel("assistant")}>{assistant.enabled ? <Subtitles size={20} /> : <Bot size={20} />}</ControlButton>
        <ControlButton danger label="Quitter la classe" onClick={leave}><PhoneOff size={20} /></ControlButton>
      </div>
    </div>
  );
}
