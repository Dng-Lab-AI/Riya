"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Greeting = { text: string; language: string };

export function HeroGreetings({ greetings }: { greetings: Greeting[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % greetings.length), 2400);
    return () => clearInterval(id);
  }, [greetings.length]);

  const current = greetings[index];
  if (!current) return null;

  return (
    <span className="relative inline-flex h-[1.2em] min-w-[6ch] items-baseline overflow-hidden align-bottom">
      <AnimatePresence mode="wait">
        <motion.span
          key={current.text}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="whitespace-nowrap text-clay-600"
          title={current.language}
        >
          {current.text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
