import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioLines, BookOpenCheck, Layers, ListChecks, Loader2, MessagesSquare, Sparkles, Trash2, Video } from "lucide-react";
import { LocalDateTime, SubmitButton } from "@/components/client";
import { DocumentRow, FeedbackForm, NotesView } from "@/components/LessonExtras";
import { Flashcards, Reveal } from "@/components/Motion";
import { AutoRefresh, NotesForm, PrintButton } from "@/components/RecapClient";
import { EmptyState, PageHeader, Stars } from "@/components/ui";
import { defineMessages } from "@/i18n";
import { languageName } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { deleteTranscript, requestSummary } from "@/lib/actions/classroom";
import { parseVocabulary } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { classroomPhase, getParticipantLesson, sessionHappened } from "@/lib/classroom";
import { getDb } from "@/lib/db";
import { isSummaryAvailable } from "@/lib/summary";
import { getLessonRecap } from "@/lib/queries";

const CRITERIA = ["clarity", "interaction", "content", "pace"] as const;

const M = defineMessages<{
  criteria: Record<(typeof CRITERIA)[number], string>; former: string; eyebrow: string; title: (language: string, name: string) => string;
  classroom: string; sheet: string; launching: string; regenerate: string; generate: string; after: string; writing: string; said: string;
  remember: string; vocabulary: string; word: string; translation: string; example: string; grammar: string; corrections: string;
  understand: string; practise: string; homework: string; written: (withTranscript: boolean) => string; checkTutor: string; aiOff: string;
  failed: string; none: string; cards: string; quizzes: string; correct: string; found: string; given: string; tutorNotes: string;
  chat: string; noChat: string; transcript: string; deleting: string; delete: string; showTranscript: (n: number) => string;
  documents: string; shareFromClass: string; noDocuments: string; rate: string; rateLater: string; studentFeedback: string;
  liked: string; improve: string; noFeedback: string; noFeedbackText: string;
}>({
  en: {
    criteria: { clarity: "Clarity", interaction: "Interaction", content: "Content and materials", pace: "Pace" }, former: "Former member",
    eyebrow: "Lesson summary", title: (language, name) => `${language} with ${name}`, classroom: "Classroom", sheet: "Revision sheet",
    launching: "Starting…", regenerate: "Regenerate", generate: "Generate the summary", after: "The summary will be available after the session.",
    writing: "The summary is being written, it usually takes less than a minute…", said: "What was said during the lesson", remember: "To remember",
    vocabulary: "Vocabulary", word: "Word", translation: "Translation", example: "Example", grammar: "Grammar and structures",
    corrections: "Your corrections", understand: "To understand better", practise: "Practise", homework: "Homework",
    written: (withTranscript) => `Written automatically by AI from ${withTranscript ? "the session transcript, " : ""}the tutor's notes, the written chat, the quizzes and the lesson documents, on`,
    checkTutor: "If in doubt, check with your tutor.",
    aiOff: "The automatic summary isn't enabled on the platform yet. The tutor's notes, the chat and the documents are still available below.",
    failed: "Writing the summary failed. Please try again in a moment.",
    none: "No summary yet. It's written automatically when the tutor closes the lesson, or right now with the button above.",
    cards: "Revision cards", quizzes: "Lesson quizzes", correct: "Correct answer:", found: "✔ found", given: "✘ answer given:", tutorNotes: "Tutor's notes",
    chat: "Chat during the lesson", noChat: "No written messages during this lesson.", transcript: "Session transcript", deleting: "Deleting…", delete: "Delete",
    showTranscript: (n) => `Show the ${n} sentences transcribed by the AI assistant (may contain mistakes)`, documents: "Lesson documents",
    shareFromClass: "Share documents from the classroom.", noDocuments: "No shared documents.", rate: "Rate the session",
    rateLater: "You'll be able to rate the session once it has taken place.", studentFeedback: "Student's feedback", liked: "Liked:", improve: "To improve:",
    noFeedback: "No feedback yet", noFeedbackText: "The student can rate the session when leaving the classroom or from this page.",
  },
  fr: {
    criteria: { clarity: "Clarté", interaction: "Interaction", content: "Contenu et supports", pace: "Rythme" }, former: "Ancien membre",
    eyebrow: "Résumé du cours", title: (language, name) => `${language} avec ${name}`, classroom: "Salle de classe", sheet: "Fiche de révision",
    launching: "Lancement…", regenerate: "Régénérer", generate: "Générer le résumé", after: "Le résumé sera disponible après la séance.",
    writing: "Le résumé est en cours de rédaction, cela prend généralement moins d'une minute…", said: "Ce qui s'est dit pendant le cours", remember: "À retenir",
    vocabulary: "Vocabulaire", word: "Mot", translation: "Traduction", example: "Exemple", grammar: "Grammaire et structures",
    corrections: "Tes corrections", understand: "Pour mieux comprendre", practise: "Pour t'entraîner", homework: "Devoirs",
    written: (withTranscript) => `Rédigé automatiquement par IA à partir ${withTranscript ? "de la transcription de la séance, " : ""}des notes du tuteur, de la discussion écrite, des quiz et des documents du cours, le`,
    checkTutor: "En cas de doute, vérifiez avec votre tuteur.",
    aiOff: "Le résumé automatique n'est pas encore activé sur la plateforme. Les notes du tuteur, la discussion et les documents restent disponibles ci-dessous.",
    failed: "La rédaction du résumé a échoué. Réessayez dans un instant.",
    none: "Aucun résumé pour l'instant. Il est rédigé automatiquement quand le tuteur clôture le cours, ou dès maintenant avec le bouton ci-dessus.",
    cards: "Cartes de révision", quizzes: "Quiz du cours", correct: "Bonne réponse :", found: "✔ trouvée", given: "✘ réponse donnée :", tutorNotes: "Notes du tuteur",
    chat: "Discussion pendant le cours", noChat: "Aucun message écrit pendant ce cours.", transcript: "Transcription de la séance", deleting: "Suppression…", delete: "Supprimer",
    showTranscript: (n) => `Afficher les ${n} phrases transcrites par l'assistant IA (peut contenir des erreurs)`, documents: "Documents du cours",
    shareFromClass: "Partagez des documents depuis la salle de classe.", noDocuments: "Aucun document partagé.", rate: "Noter la séance",
    rateLater: "Vous pourrez noter la séance une fois qu'elle aura eu lieu.", studentFeedback: "Retour de l'élève", liked: "A aimé :", improve: "À améliorer :",
    noFeedback: "Pas encore de retour", noFeedbackText: "L'élève peut noter la séance en quittant la classe ou depuis cette page.",
  },
});

export const generateMetadata = () => titled({ en: M.en.eyebrow, fr: M.fr.eyebrow });

function Card({ title, icon: Icon, children, action }: { title: string; icon?: typeof Sparkles; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Reveal>
    <section className="card p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">{Icon && <Icon size={20} className="text-clay-600" />}{title}</h2>
        {action}
      </div>
      {children}
    </section>
    </Reveal>
  );
}

export default async function LessonRecapPage({ params }: PageProps<"/cours/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/cours/${id}`);
  const room = await getParticipantLesson(id, user._id);
  if (!room) notFound();
  const { lesson, role, otherId } = room;

  const db = await getDb();
  const [recap, other, language, locale] = await Promise.all([
    getLessonRecap(lesson, user._id),
    db.users.findOne({ _id: otherId }, { projection: { name: 1 } }),
    db.languages.findOne({ slug: lesson.languageSlug }),
    getLocale(),
  ]);
  const t = M[locale];
  const otherName = other?.name ?? t.former;
  const happened = sessionHappened(lesson);
  const aiReady = isSummaryAvailable();
  const { summary } = recap;
  const pending = recap.summary_status === "pending";
  // Revision cards: the AI vocabulary when available, otherwise the tutor's list.
  const flashcards = summary?.vocabulary.length
    ? summary.vocabulary.map((v) => ({ front: v.term, back: v.translation, hint: v.example }))
    : parseVocabulary(recap.notes?.vocabulary ?? "").map((v) => ({ front: v.term, back: v.translation }));

  return (
    <>
      {pending && <AutoRefresh />}
      <PageHeader eyebrow={t.eyebrow} title={t.title(languageName(lesson.languageSlug, language?.name ?? lesson.languageSlug, locale), otherName)}>
        <span className="flex flex-wrap items-center gap-3">
          <LocalDateTime iso={lesson.startsAt.toISOString()} /> · {lesson.durationMinutes} min
          {classroomPhase(lesson) === "open" && (
            <Link href={`/classe/${lesson._id.toHexString()}`} className="btn-dark print:hidden"><Video size={16} /> {t.classroom}</Link>
          )}
          {happened && <PrintButton />}
        </span>
      </PageHeader>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 print:block">
        <div className="space-y-6">
          {/* AI revision sheet */}
          <Card
            title={t.sheet}
            icon={Sparkles}
            action={
              aiReady && happened && !pending && (!summary || role === "tutor") ? (
                <form action={requestSummary.bind(null, lesson._id.toHexString())} className="print:hidden">
                  <SubmitButton className={summary ? "btn-outline" : "btn-primary"} pendingText={t.launching}>{summary ? t.regenerate : t.generate}</SubmitButton>
                </form>
              ) : null
            }
          >
            {!happened ? (
              <p className="text-earth-600">{t.after}</p>
            ) : pending ? (
              <p className="flex items-center gap-2 text-earth-600"><Loader2 size={18} className="animate-spin" /> {t.writing}</p>
            ) : summary ? (
              <div className="space-y-6 text-earth-800">
                <p className="text-lg leading-relaxed">{summary.overview}</p>
                {summary.interaction && (
                  <div className="rounded-xl border-l-4 border-ochre-400 bg-ochre-100/50 p-4">
                    <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-ochre-800">{t.said}</h3>
                    <p className="leading-relaxed">{summary.interaction}</p>
                  </div>
                )}
                {summary.keyPoints.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.remember}</h3>
                    <ul className="list-disc space-y-1 pl-5">{summary.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {summary.vocabulary.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.vocabulary}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-earth-500">
                          <tr><th className="py-2 pr-4">{t.word}</th><th className="py-2 pr-4">{t.translation}</th><th className="py-2">{t.example}</th></tr>
                        </thead>
                        <tbody className="divide-y divide-sand-200">
                          {summary.vocabulary.map((v, i) => (
                            <tr key={i}>
                              <td className="py-2 pr-4 font-semibold">{v.term}</td>
                              <td className="py-2 pr-4">{v.translation}</td>
                              <td className="py-2 italic text-earth-600">{v.example}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {summary.grammar.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.grammar}</h3>
                    <ul className="list-disc space-y-1 pl-5">{summary.grammar.map((g, i) => <li key={i}>{g}</li>)}</ul>
                  </div>
                )}
                {summary.corrections && summary.corrections.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.corrections}</h3>
                    <ul className="space-y-2">
                      {summary.corrections.map((c, i) => (
                        <li key={i} className="rounded-xl bg-sand-50 p-3 text-sm">
                          <span className="text-clay-700 line-through">{c.said}</span> → <span className="font-semibold text-forest-700">{c.correct}</span>
                          {c.explanation && <p className="mt-1 text-earth-600">{c.explanation}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.explanations && summary.explanations.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.understand}</h3>
                    <div className="space-y-2">{summary.explanations.map((e, i) => <p key={i} className="rounded-xl bg-forest-100/60 p-3 text-sm leading-relaxed">{e}</p>)}</div>
                  </div>
                )}
                {summary.practice.length > 0 && (
                  <div className="rounded-xl bg-sand-50 p-5">
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.practise}</h3>
                    <ol className="list-decimal space-y-1 pl-5">{summary.practice.map((p, i) => <li key={i}>{p}</li>)}</ol>
                  </div>
                )}
                {summary.homework && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">{t.homework}</h3>
                    <p className="whitespace-pre-line">{summary.homework}</p>
                  </div>
                )}
                <p className="border-t border-sand-200 pt-3 text-xs text-earth-500">
                  {t.written(recap.transcript.length > 0)} <LocalDateTime iso={summary.generated_at} />. {t.checkTutor}
                </p>
              </div>
            ) : !aiReady ? (
              <p className="text-earth-600">{t.aiOff}</p>
            ) : (
              <p className="text-earth-600">{recap.summary_status === "failed" ? t.failed : t.none}</p>
            )}
          </Card>

          {flashcards.length > 0 && (
            <Card title={t.cards} icon={Layers}>
              <Flashcards cards={flashcards} />
            </Card>
          )}

          {recap.quizzes.length > 0 && (
            <Card title={t.quizzes} icon={ListChecks}>
              <ul className="space-y-3">
                {recap.quizzes.map((q, i) => (
                  <li key={i} className="rounded-xl bg-sand-50 p-4 text-sm">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-1">
                      {t.correct} <span className="font-semibold text-forest-700">{q.options[q.correctIndex]}</span>
                      {q.answerIndex !== null && (q.answerIndex === q.correctIndex
                        ? <span className="ml-2 text-forest-700">{t.found}</span>
                        : <span className="ml-2 text-clay-700">{t.given} {q.options[q.answerIndex]}</span>)}
                    </p>
                    {q.explanation && <p className="mt-1 text-earth-600">{q.explanation}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Tutor notes */}
          <Card title={t.tutorNotes} icon={BookOpenCheck}>
            {role === "tutor" ? <NotesForm lessonId={lesson._id.toHexString()} notes={recap.notes} /> : <NotesView notes={recap.notes} />}
          </Card>

          {/* Classroom chat */}
          <Card title={t.chat} icon={MessagesSquare}>
            {recap.chat.length ? (
              <ul className="space-y-2">
                {recap.chat.map((m) => (
                  <li key={m.id} className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.mine ? "ml-auto bg-clay-50" : "bg-sand-100"}`}>
                    <p className="text-xs font-semibold text-earth-500">{m.author_name}</p>
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-earth-600">{t.noChat}</p>
            )}
          </Card>

          {recap.transcript.length > 0 && (
            <Card
              title={t.transcript}
              icon={AudioLines}
              action={
                <form action={deleteTranscript.bind(null, lesson._id.toHexString())} className="print:hidden">
                  <SubmitButton className="btn-ghost text-clay-700" pendingText={t.deleting}><Trash2 size={15} /> {t.delete}</SubmitButton>
                </form>
              }
            >
              <details>
                <summary className="cursor-pointer text-sm text-earth-600">{t.showTranscript(recap.transcript.length)}</summary>
                <ul className="mt-3 space-y-1 text-sm">
                  {recap.transcript.map((line) => (
                    <li key={line.id}><span className={`font-semibold ${line.mine ? "text-clay-700" : "text-forest-700"}`}>{line.speaker_name}:</span> {line.text}</li>
                  ))}
                </ul>
              </details>
            </Card>
          )}
        </div>

        <aside className="space-y-6 print:hidden">
          <Card title={t.documents}>
            {recap.documents.length ? (
              <ul className="space-y-2">{recap.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}</ul>
            ) : (
              <p className="text-sm text-earth-600">{role === "tutor" ? t.shareFromClass : t.noDocuments}</p>
            )}
          </Card>

          {role === "student" ? (
            <Card title={t.rate}>
              {happened ? (
                <FeedbackForm lessonId={lesson._id.toHexString()} initial={recap.feedback} tutorName={otherName.split(" ")[0]} />
              ) : (
                <p className="text-sm text-earth-600">{t.rateLater}</p>
              )}
            </Card>
          ) : (
            <Card title={t.studentFeedback}>
              {recap.feedback ? (
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><Stars value={recap.feedback.rating} size={18} /> {recap.feedback.rating}/5</p>
                  <ul className="space-y-1">
                    {CRITERIA.map((key) => (
                      <li key={key} className="flex items-center justify-between"><span className="text-earth-600">{t.criteria[key]}</span><Stars value={recap.feedback![key]} /></li>
                    ))}
                  </ul>
                  {recap.feedback.liked && <p><span className="font-semibold">{t.liked}</span> {recap.feedback.liked}</p>}
                  {recap.feedback.improve && <p className="rounded-xl bg-ochre-100 p-3 text-ochre-800"><span className="font-semibold">{t.improve}</span> {recap.feedback.improve}</p>}
                </div>
              ) : (
                <EmptyState title={t.noFeedback}>{t.noFeedbackText}</EmptyState>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
