import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlaskConical, Lock } from "lucide-react";
import { demoCheckout } from "@/lib/actions/payments";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { quoteLesson } from "@/lib/payments";
import { METHODS, formatMoney } from "@/lib/payments/countries";
import { activeProvider } from "@/lib/payments/provider";

export const metadata: Metadata = { title: "Paiement (démo)" };

// Stand-in for the provider's checkout while no payment key is configured (never in production).
export default async function DemoCheckoutPage({ params }: PageProps<"/paiement/demo/[reference]">) {
  if (activeProvider() !== "demo") notFound();
  const user = await requireUser("/tableau-de-bord");
  const reference = decodeURIComponent((await params).reference);
  const lesson = await (await getDb()).lessons.findOne({ "payment.reference": reference, studentId: user._id, "payment.status": "pending" });
  if (!lesson?.payment) notFound();

  const { methods } = quoteLesson(lesson.payment.country, lesson.price);
  const action = demoCheckout.bind(null, reference);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="mb-4 flex items-center gap-2 rounded-xl bg-ochre-100 px-4 py-3 text-sm text-ochre-800">
        <FlaskConical size={18} className="shrink-0" /> Mode démo : aucun argent n&apos;est débité. Ajoutez une clé Flutterwave pour encaisser de vrais paiements.
      </p>
      <form action={action} className="card space-y-5 p-6">
        <div className="text-center">
          <p className="text-sm text-earth-500">Montant à payer · {lesson.payment.country}</p>
          <p className="font-display text-4xl font-semibold">{formatMoney(lesson.payment.amount, lesson.payment.currency)}</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="label">Moyen de paiement</legend>
          {methods.map((id, i) => (
            <label key={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-sand-300 p-3 has-checked:border-clay-600 has-checked:bg-clay-50">
              <input type="radio" name="method" value={id} defaultChecked={i === 0} className="accent-clay-600" />
              <span>
                <span className="block font-semibold">{METHODS[id].label}</span>
                <span className="block text-xs text-earth-500">{METHODS[id].hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <button name="outcome" value="pay" className="btn-primary w-full py-3"><Lock size={16} /> Payer {formatMoney(lesson.payment.amount, lesson.payment.currency)}</button>
        <button name="outcome" value="cancel" className="btn-ghost w-full">Annuler le paiement</button>
      </form>
    </div>
  );
}
