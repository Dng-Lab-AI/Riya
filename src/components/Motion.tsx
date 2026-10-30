"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, RotateCcw, Shuffle } from "lucide-react";

// Small animation helpers. All of them respect the visitor's "reduce motion" setting.

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Children appear one after another as the group scrolls into view.
export function Stagger({ children, className }: { children: React.ReactNode[]; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={reduce ? false : "hidden"} whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={{ show: { transition: { staggerChildren: 0.07 } } }}>
      {children.map((child, i) => (
        <motion.div key={i} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } }}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export type Flashcard = { front: string; back: string; hint?: string };

// Flip cards for revising the lesson's vocabulary.
export function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const reduce = useReducedMotion();

  if (!cards.length) return null;
  const done = position >= order.length;
  const card = cards[order[Math.min(position, order.length - 1)]];

  const next = (knewIt: boolean) => {
    if (knewIt) setKnown((set) => new Set(set).add(order[position]));
    setFlipped(false);
    setPosition((p) => p + 1);
  };
  const restart = (onlyUnknown: boolean, shuffle = false) => {
    let ids = cards.map((_, i) => i);
    if (onlyUnknown) ids = ids.filter((i) => !known.has(i));
    if (shuffle) ids = [...ids].sort(() => Math.random() - 0.5);
    setOrder(ids.length ? ids : cards.map((_, i) => i));
    if (!onlyUnknown) setKnown(new Set());
    setPosition(0);
    setFlipped(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-earth-600">
        <span>{done ? "Terminé !" : `Carte ${position + 1} / ${order.length}`}</span>
        <span>{known.size} connue{known.size > 1 ? "s" : ""} sur {cards.length}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-sand-200">
        <motion.div className="h-full bg-forest-500" animate={{ width: `${(Math.min(position, order.length) / order.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 rounded-2xl bg-forest-100 p-8 text-center text-forest-800">
            <p className="font-display text-2xl font-semibold">Bravo ! 🎉</p>
            <p className="mt-1">Vous connaissez {known.size} mot{known.size > 1 ? "s" : ""} sur {cards.length}.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {known.size < cards.length && <button onClick={() => restart(true)} className="btn-primary"><RotateCcw size={16} /> Revoir les mots à retravailler</button>}
              <button onClick={() => restart(false, true)} className="btn-outline"><Shuffle size={16} /> Recommencer dans le désordre</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key={position} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="mt-5">
            <button onClick={() => setFlipped((f) => !f)} className="block w-full [perspective:1000px]" aria-label={flipped ? "Voir le mot" : "Voir la traduction"}>
              <motion.div
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: "easeInOut" }}
                className="relative h-48 w-full [transform-style:preserve-3d]"
              >
                <div className="pattern-bogolan absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-sand-300 bg-white p-6 [backface-visibility:hidden]">
                  <p className="font-display text-3xl font-semibold text-earth-900">{card.front}</p>
                  <p className="mt-3 text-xs text-earth-500">Touchez pour voir la traduction</p>
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-forest-800 p-6 text-sand-50 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="font-display text-2xl font-semibold">{card.back || "—"}</p>
                  {card.hint && <p className="mt-2 text-center text-sm italic text-sand-200">{card.hint}</p>}
                </div>
              </motion.div>
            </button>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => next(false)} className="btn-outline"><RotateCcw size={16} /> À revoir</button>
              <button onClick={() => next(true)} className="btn bg-forest-600 text-white hover:bg-forest-700"><Check size={16} /> Je sais</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
