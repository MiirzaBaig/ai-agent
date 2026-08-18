import { motion } from "motion/react";
import { SentryMark } from "./icons";
import { Eye, ShieldCheck, ScrollText } from "lucide-react";

export const ProjectInfo = () => {
  return (
    <motion.div
      className="w-full px-2 sm:px-4 py-2"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
    >
      <div className="rounded-xl nb-border nb-shadow bg-white px-4 py-3.5 flex flex-col gap-3">
        {/* Compact wordmark row */}
        <div className="flex items-center gap-2.5">
          <span className="nb-border flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nb-lime)]">
            <SentryMark size={18} />
          </span>
          <div className="min-w-0">
            <h3 className="text-lg font-black uppercase tracking-tight leading-none text-[var(--nb-ink)]">
              Sentry
            </h3>
          </div>
          <p className="ml-auto text-[13px] font-medium text-zinc-600 leading-snug">
            Drop a task —{" "}
            <span className="bg-[var(--nb-lime)] px-1 font-bold">
              watch every move
            </span>
            , keep the receipts.
          </p>
        </div>

        {/* Inline capability chips */}
        <div className="flex flex-wrap gap-1.5">
          <Chip
            icon={<Eye className="h-3 w-3" />}
            label="Watched"
            color="var(--nb-blue)"
          />
          <Chip
            icon={<ScrollText className="h-3 w-3" />}
            label="Verified"
            color="var(--nb-lime)"
          />
          <Chip
            icon={<ShieldCheck className="h-3 w-3" />}
            label="Controlled"
            color="var(--nb-pink)"
          />
        </div>
      </div>
    </motion.div>
  );
};

const Chip = ({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) => {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md nb-border bg-white pl-1 pr-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--nb-ink)]">
      <span
        className="flex h-4 w-4 items-center justify-center rounded"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      {label}
    </span>
  );
};

/**
 * Header status pill. Replaces the old Vercel "Deploy" link with a neutral,
 * self-referential status indicator that reads as a product, not a demo.
 */
export const DeployButton = () => {
  return (
    <div className="flex flex-row gap-1.5 items-center rounded-lg nb-border nb-shadow-sm bg-[var(--nb-violet)] px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--nb-lime)]" />
      <span>v2</span>
    </div>
  );
};
