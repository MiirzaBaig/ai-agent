import { ArrowUp, Square } from "lucide-react";
import { motion } from "motion/react";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isInitializing: boolean;
  isLoading: boolean;
  status: string;
  stop: () => void;
}

export const Input = ({
  input,
  handleInputChange,
  isInitializing,
  isLoading,
  status,
  stop,
}: InputProps) => {
  return (
    <motion.div
      className="relative w-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.div
        className="relative"
        animate={{ scale: 1 }}
        transition={{
          duration: 0.5,
          ease: [0.4, 0, 0.2, 1],
        }}
      >
        <motion.div
          animate={{ boxShadow: "0 0 0 0 rgba(59, 130, 246, 0)" }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
          className="rounded-2xl"
        >
          <input
            type="text"
            className="w-full h-13 sm:h-14 px-4 pr-16 text-base sm:text-sm font-semibold bg-white text-[var(--nb-ink)] rounded-xl nb-border nb-shadow focus:outline-none focus:-translate-x-0.5 focus:-translate-y-0.5 transition-transform duration-100 placeholder:font-medium placeholder:text-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
            value={input ?? ""}
            placeholder="Tell me what to do..."
            onChange={handleInputChange}
            disabled={isLoading || isInitializing}
          />
        </motion.div>
      </motion.div>
      {status === "streaming" || status === "submitted" ? (
        <motion.button
          type="button"
          onClick={stop}
          className="cursor-pointer absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-[var(--nb-pink)] nb-border nb-shadow-sm touch-manipulation"
          title="Stop generation"
          aria-label="Stop generation"
          animate={{
            scale: [1, 1.05, 1],
          }}
          transition={{
            scale: {
              duration: 1.5,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: 0.5,
            },
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Square className="h-4 w-4 text-white fill-white" />
        </motion.button>
      ) : (
        <motion.button
          type="submit"
          disabled={isLoading || !input?.trim() || isInitializing}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center bg-[var(--nb-lime)] nb-border nb-shadow-sm disabled:bg-zinc-200 disabled:shadow-none disabled:cursor-not-allowed touch-manipulation"
          animate={{
            scale: input?.trim() ? 1 : 0.96,
            boxShadow: input?.trim() 
              ? [
                  "0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                  "0 8px 12px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)",
                  "0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
                ]
              : "0 2px 4px -1px rgba(0, 0, 0, 0.2), 0 1px 2px -1px rgba(0, 0, 0, 0.1)",
          }}
          transition={{
            duration: 0.25,
            ease: [0.4, 0, 0.2, 1],
            boxShadow: {
              duration: 1.2,
              ease: "easeInOut",
              repeat: input?.trim() ? Infinity : 0,
              repeatDelay: 0.8,
            },
          }}
          whileHover={input?.trim() ? { scale: 1.03 } : {}}
          whileTap={input?.trim() ? { scale: 0.97 } : {}}
        >
          <motion.div
            animate={{
              y: input?.trim() ? [0, -3, 0] : 0,
              rotate: input?.trim() ? [0, 8, -8, 0] : 0,
            }}
            transition={{
              duration: 1.8,
              ease: [0.4, 0, 0.6, 1],
              repeat: input?.trim() ? Infinity : 0,
              repeatDelay: 0.8,
            }}
          >
            <ArrowUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </motion.div>
        </motion.button>
      )}
    </motion.div>
  );
};
