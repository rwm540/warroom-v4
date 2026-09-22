import React, { useState } from 'react';
import { FaqItem } from '../../data/home';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FaqAccordionProps {
  faqs: FaqItem[];
}

export default function FaqAccordion({ faqs }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id || null);

  const toggleFaq = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <div className="mx-4 my-6 space-y-3 dir-rtl">
      {/* Title */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-cyan-950/70 border border-cyan-400/50 flex items-center justify-center text-cyan-400">
          <HelpCircle size={15} />
        </div>
        <h2 className="text-sm font-black text-white">
          پرسش‌های متداول
        </h2>
      </div>

      {/* Accordion Items */}
      <div className="space-y-2">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="rounded-2xl bg-[#0a0f24]/80 backdrop-blur-xl border border-cyan-500/25 overflow-hidden transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full p-3.5 text-right flex items-center justify-between gap-2 hover:bg-[#101938] transition-colors focus:outline-none"
                aria-expanded={isOpen}
              >
                <span className="text-xs font-bold text-slate-100">
                  {faq.question}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-cyan-400 transition-transform duration-200 flex-shrink-0 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-3.5 pb-3.5 pt-1 text-xs text-slate-300 border-t border-cyan-500/20 leading-relaxed text-right">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
