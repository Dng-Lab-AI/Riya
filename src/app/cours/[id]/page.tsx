import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AudioLines, BookOpenCheck, Layers, ListChecks, Loader2, MessagesSquare, Sparkles, Trash2, Video } from "lucide-react";
import { LocalDateTime, SubmitButton } from "@/components/client";
import { DocumentRow, FeedbackForm, NotesView } from "@/components/LessonExtras";
import { Flashcards, Reveal } from "@/components/Motion";
import { AutoRefresh, NotesForm, PrintButton } from "@/components/RecapClient";
import { EmptyState, PageHeader, Stars } from "@/components/ui";
import { deleteTranscript, requestSummary } from "@/lib/actions/classroom";
import { parseVocabulary } from "@/lib/constants";
import { requireUser } from "@/lib/auth";
import { classroomPhase, getParticipantLesson, sessionHappened } from "@/lib/classroom";
import { getDb } from "@/lib/db";
import { isSummaryAvailable } from "@/lib/summary";
import { getLessonRecap } from "@/lib/queries";

export const metadata: Metadata = { title: "Résumé du cours" };

const CRITERIA = [
  ["clarity", "Clarté"],
  ["interaction", "Interaction"],
  ["content", "Contenu et supports"],
  ["pace", "Rythme"],
] as const;

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
  const [recap, other, language] = await Promise.all([
    getLessonRecap(lesson, user._id),
    db.users.findOne({ _id: otherId }, { projection: { name: 1 } }),
    db.languages.findOne({ slug: lesson.languageSlug }),
  ]);
  const otherName = other?.name ?? "Ancien membre";
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
      <PageHeader eyebrow="Résumé du cours" title={`${language?.name ?? lesson.languageSlug} avec ${otherName}`}>
        <span className="flex flex-wrap items-center gap-3">
          <LocalDateTime iso={lesson.startsAt.toISOString()} /> · {lesson.durationMinutes} min
          {classroomPhase(lesson) === "open" && (
            <Link href={`/classe/${lesson._id.toHexString()}`} className="btn-dark print:hidden"><Video size={16} /> Salle de classe</Link>
          )}
          {happened && <PrintButton />}
        </span>
      </PageHeader>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8 print:block">
        <div className="space-y-6">
          {/* AI revision sheet */}
          <Card
            title="Fiche de révision"
            icon={Sparkles}
            action={
              aiReady && happened && !pending && (!summary || role === "tutor") ? (
                <form action={requestSummary.bind(null, lesson._id.toHexString())} className="print:hidden">
                  <SubmitButton className={summary ? "btn-outline" : "btn-primary"} pendingText="Lancement…">{summary ? "Régénérer" : "Générer le résumé"}</SubmitButton>
                </form>
              ) : null
            }
          >
            {!happened ? (
              <p className="text-earth-600">Le résumé sera disponible après la séance.</p>
            ) : pending ? (
              <p className="flex items-center gap-2 text-earth-600"><Loader2 size={18} className="animate-spin" /> Le résumé est en cours de rédaction, cela prend généralement moins d&apos;une minute…</p>
            ) : summary ? (
              <div className="space-y-6 text-earth-800">
                <p className="text-lg leading-relaxed">{summary.overview}</p>
                {summary.interaction && (
                  <div className="rounded-xl border-l-4 border-ochre-400 bg-ochre-100/50 p-4">
                    <h3 className="mb-1 text-sm font-bold uppercase tracking-wider text-ochre-800">Ce qui s&apos;est dit pendant le cours</h3>
                    <p className="leading-relaxed">{summary.interaction}</p>
                  </div>
                )}
                {summary.keyPoints.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">À retenir</h3>
                    <ul className="list-disc space-y-1 pl-5">{summary.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                  </div>
                )}
                {summary.vocabulary.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Vocabulaire</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="text-xs uppercase text-earth-500">
                          <tr><th className="py-2 pr-4">Mot</th><th className="py-2 pr-4">Traduction</th><th className="py-2">Exemple</th></tr>
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
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Grammaire et structures</h3>
                    <ul className="list-disc space-y-1 pl-5">{summary.grammar.map((g, i) => <li key={i}>{g}</li>)}</ul>
                  </div>
                )}
                {summary.corrections && summary.corrections.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Tes corrections</h3>
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
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Pour mieux comprendre</h3>
                    <div className="space-y-2">{summary.explanations.map((e, i) => <p key={i} className="rounded-xl bg-forest-100/60 p-3 text-sm leading-relaxed">{e}</p>)}</div>
                  </div>
                )}
                {summary.practice.length > 0 && (
                  <div className="rounded-xl bg-sand-50 p-5">
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Pour t&apos;entraîner</h3>
                    <ol className="list-decimal space-y-1 pl-5">{summary.practice.map((p, i) => <li key={i}>{p}</li>)}</ol>
                  </div>
                )}
                {summary.homework && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-earth-500">Devoirs</h3>
                    <p className="whitespace-pre-line">{summary.homework}</p>
                  </div>
                )}
                <p className="border-t border-sand-200 pt-3 text-xs text-earth-500">
                  Rédigé automatiquement par IA le <LocalDateTime iso={summary.generated_at} />, à partir {recap.transcript.length ? "de la transcription de la séance, " : ""}des notes du tuteur, de la discussion écrite, des quiz et des documents du cours. En cas de doute, vérifiez avec votre tuteur.
                </p>
              </div>
            ) : !aiReady ? (
              <p className="text-earth-600">Le résumé automatique n&apos;est pas encore activé sur la plateforme. Les notes du tuteur, la discussion et les documents restent disponibles ci-dessous.</p>
            ) : (
              <p className="text-earth-600">
                {recap.summary_status === "failed" ? "La rédaction du résumé a échoué. Réessayez dans un instant." : "Aucun résumé pour l'instant. Il est rédigé automatiquement quand le tuteur clôture le cours, ou dès maintenant avec le bouton ci-dessus."}
              </p>
            )}
          </Card>

          {flashcards.length > 0 && (
            <Card title="Cartes de révision" icon={Layers}>
              <Flashcards cards={flashcards} />
            </Card>
          )}

          {recap.quizzes.length > 0 && (
            <Card title="Quiz du cours" icon={ListChecks}>
              <ul className="space-y-3">
                {recap.quizzes.map((q, i) => (
                  <li key={i} className="rounded-xl bg-sand-50 p-4 text-sm">
                    <p className="font-semibold">{q.question}</p>
                    <p className="mt-1">
                      Bonne réponse : <span className="font-semibold text-forest-700">{q.options[q.correctIndex]}</span>
                      {q.answerIndex !== null && (q.answerIndex === q.correctIndex
                        ? <span className="ml-2 text-forest-700">✔ trouvée</span>
                        : <span className="ml-2 text-clay-700">✘ réponse donnée : {q.options[q.answerIndex]}</span>)}
                    </p>
                    {q.explanation && <p className="mt-1 text-earth-600">{q.explanation}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Tutor notes */}
          <Card title="Notes du tuteur" icon={BookOpenCheck}>
            {role === "tutor" ? <NotesForm lessonId={lesson._id.toHexString()} notes={recap.notes} /> : <NotesView notes={recap.notes} />}
          </Card>

          {/* Classroom chat */}
          <Card title="Discussion pendant le cours" icon={MessagesSquare}>
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
              <p className="text-earth-600">Aucun message écrit pendant ce cours.</p>
            )}
          </Card>

          {recap.transcript.length > 0 && (
            <Card
              title="Transcription de la séance"
              icon={AudioLines}
              action={
                <form action={deleteTranscript.bind(null, lesson._id.toHexString())} className="print:hidden">
                  <SubmitButton className="btn-ghost text-clay-700" pendingText="Suppression…"><Trash2 size={15} /> Supprimer</SubmitButton>
                </form>
              }
            >
              <details>
                <summary className="cursor-pointer text-sm text-earth-600">Afficher les {recap.transcript.length} phrases transcrites par l&apos;assistant IA (peut contenir des erreurs)</summary>
                <ul className="mt-3 space-y-1 text-sm">
                  {recap.transcript.map((t) => (
                    <li key={t.id}><span className={`font-semibold ${t.mine ? "text-clay-700" : "text-forest-700"}`}>{t.speaker_name} :</span> {t.text}</li>
                  ))}
                </ul>
              </details>
            </Card>
          )}
        </div>

        <aside className="space-y-6 print:hidden">
          <Card title="Documents du cours">
            {recap.documents.length ? (
              <ul className="space-y-2">{recap.documents.map((doc) => <DocumentRow key={doc.id} doc={doc} />)}</ul>
            ) : (
              <p className="text-sm text-earth-600">{role === "tutor" ? "Partagez des documents depuis la salle de classe." : "Aucun document partagé."}</p>
            )}
          </Card>

          {role === "student" ? (
            <Card title="Noter la séance">
              {happened ? (
                <FeedbackForm lessonId={lesson._id.toHexString()} initial={recap.feedback} tutorName={otherName.split(" ")[0]} />
              ) : (
                <p className="text-sm text-earth-600">Vous pourrez noter la séance une fois qu&apos;elle aura eu lieu.</p>
              )}
            </Card>
          ) : (
            <Card title="Retour de l'élève">
              {recap.feedback ? (
                <div className="space-y-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold"><Stars value={recap.feedback.rating} size={18} /> {recap.feedback.rating}/5</p>
                  <ul className="space-y-1">
                    {CRITERIA.map(([key, label]) => (
                      <li key={key} className="flex items-center justify-between"><span className="text-earth-600">{label}</span><Stars value={recap.feedback![key]} /></li>
                    ))}
                  </ul>
                  {recap.feedback.liked && <p><span className="font-semibold">A aimé :</span> {recap.feedback.liked}</p>}
                  {recap.feedback.improve && <p className="rounded-xl bg-ochre-100 p-3 text-ochre-800"><span className="font-semibold">À améliorer :</span> {recap.feedback.improve}</p>}
                </div>
              ) : (
                <EmptyState title="Pas encore de retour">L&apos;élève peut noter la séance en quittant la classe ou depuis cette page.</EmptyState>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
