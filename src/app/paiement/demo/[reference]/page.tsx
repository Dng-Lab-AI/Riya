import { notFound } from "next/navigation";
import { FlaskConical, Lock } from "lucide-react";
import { defineMessages } from "@/i18n";
import { countryName, methodText } from "@/i18n/catalog";
import { getLocale, titled } from "@/i18n/server";
import { demoCheckout } from "@/lib/actions/payments";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { quoteLesson } from "@/lib/payments";
import { METHODS, formatMoney } from "@/lib/payments/countries";
import { activeProvider } from "@/lib/payments/provider";

const M = defineMessages({
  en: {
    demo: "Demo mode: no money is taken. Add a Flutterwave key to collect real payments.",
    amount: "Amount to pay", method: "Payment method", pay: "Pay", cancel: "Cancel the payment",
  },
  fr: {
    demo: "Mode démo : aucun argent n'est débité. Ajoutez une clé Flutterwave pour encaisser de vrais paiements.",
    amount: "Montant à payer", method: "Moyen de paiement", pay: "Payer", cancel: "Annuler le paiement",
  },
});

export const generateMetadata = () => titled({ en: "Payment (demo)", fr: "Paiement (démo)" });

// Stand-in for the provider's checkout while no payment key is configured.
export default async function DemoCheckoutPage({ params }: PageProps<"/paiement/demo/[reference]">) {
  if (activeProvider() !== "demo") notFound();
  const user = await requireUser("/tableau-de-bord");
  const reference = decodeURIComponent((await params).reference);
  const lesson = await (await getDb()).lessons.findOne({ "payment.reference": reference, studentId: user._id, "payment.status": "pending" });
  if (!lesson?.payment) notFound();

  const locale = await getLocale();
  const t = M[locale];
  const { methods } = quoteLesson(lesson.payment.country, lesson.price);
  const action = demoCheckout.bind(null, reference);
  const total = formatMoney(lesson.payment.amount, lesson.payment.currency, locale);

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <p className="mb-4 flex items-center gap-2 rounded-xl bg-ochre-100 px-4 py-3 text-sm text-ochre-800">
        <FlaskConical size={18} className="shrink-0" /> {t.demo}
      </p>
      <form action={action} className="card space-y-5 p-6">
        <div className="text-center">
          <p className="text-sm text-earth-500">{t.amount} · {countryName(lesson.payment.country, locale)}</p>
          <p className="font-display text-4xl font-semibold">{total}</p>
        </div>
        <fieldset className="space-y-2">
          <legend className="label">{t.method}</legend>
          {methods.map((id, i) => {
            const method = methodText(id, METHODS[id], locale);
            return (
              <label key={id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-sand-300 p-3 has-checked:border-clay-600 has-checked:bg-clay-50">
                <input type="radio" name="method" value={id} defaultChecked={i === 0} className="accent-clay-600" />
                <span>
                  <span className="block font-semibold">{method.label}</span>
                  <span className="block text-xs text-earth-500">{method.hint}</span>
                </span>
              </label>
            );
          })}
        </fieldset>
        <button name="outcome" value="pay" className="btn-primary w-full py-3"><Lock size={16} /> {t.pay} {total}</button>
        <button name="outcome" value="cancel" className="btn-ghost w-full">{t.cancel}</button>
      </form>
    </div>
  );
}
