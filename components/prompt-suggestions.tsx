import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

const suggestions = [
  {
    text: "What's the weather in Dubai?",
    prompt: "What's the weather in Dubai?",
  },
  {
    text: "Create a text file",
    prompt: "Create a new text file called notes.txt with some sample content",
  },
  {
    text: "Check system info",
    prompt: "Show me the system information and current time",
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
        <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
          Try asking
        </span>
      </motion.div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            onClick={() => handleClick(suggestion.prompt, index)}
            disabled={disabled}
            className="group px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-700 bg-zinc-50 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-zinc-50 disabled:hover:text-zinc-700"
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
