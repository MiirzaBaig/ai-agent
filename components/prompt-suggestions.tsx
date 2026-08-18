import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const suggestions = [
  {
    text: "Research a topic online",
    prompt:
      "Open a browser, search for the latest news on AI agents, and summarize the top 3 headlines.",
  },
  {
    text: "Draft a file from research",
    prompt:
      "Look up today's weather in Dubai, then save a short report to weather.txt.",
  },
  {
    text: "Inspect the environment",
    prompt:
      "Show me the system information, current time, and the contents of the home directory.",
  },
];

export const PromptSuggestions = ({
  onSelectPrompt,
  disabled,
}: {
  onSelectPrompt: (prompt: string) => void;
  disabled: boolean;
}) => {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  const handleClick = (prompt: string, index: number) => {
    setClickedIndex(index);
    onSelectPrompt(prompt);
    // Reset after animation
    setTimeout(() => setClickedIndex(null), 600);
  };

  if (disabled) return null;

  return (
    <div className="px-4 pb-3">
      <motion.div
        className="flex items-center gap-2 mb-2.5"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Sparkles className="h-3.5 w-3.5 text-[var(--nb-ink)]" />
        <span className="text-xs font-black text-[var(--nb-ink)] uppercase tracking-[0.14em]">
          Try asking
        </span>
      </motion.div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            onClick={() => handleClick(suggestion.prompt, index)}
            disabled={disabled}
            className="group px-3 py-1.5 rounded-lg text-sm font-bold text-[var(--nb-ink)] bg-white nb-border nb-shadow-sm nb-press hover:bg-[var(--nb-lime)] disabled:opacity-50 disabled:cursor-not-allowed"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{
              opacity: 1,
              scale: clickedIndex === index ? [1, 0.95, 1] : 1,
              y: 0,
            }}
            transition={{
              opacity: { duration: 0.3, delay: index * 0.05 },
              scale: { duration: 0.3 },
              y: { duration: 0.3, delay: index * 0.05, ease: "easeOut" },
            }}
            whileHover={!disabled ? { scale: 1.05, y: -1 } : {}}
            whileTap={!disabled ? { scale: 0.95 } : {}}
          >
            {suggestion.text}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
