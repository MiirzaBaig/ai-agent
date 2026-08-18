import { motion } from "motion/react";
import { SentryMark } from "./icons";
import { Eye, ShieldCheck, ScrollText } from "lucide-react";

export const ProjectInfo = () => {
  return (
    <motion.div
      className="w-full flex flex-col items-center text-center px-6 pt-10 pb-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
    >
      {/* Big friendly eye */}
      <span className="nb-border nb-shadow flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--nb-lime)] mb-4">
        <SentryMark size={30} />
      </span>

      <h3 className="text-2xl font-black uppercase tracking-tight text-[var(--nb-ink)]">
        Sentry
      </h3>
      <p className="mt-1.5 max-w-sm text-[13px] font-medium leading-relaxed text-zinc-600">
        Drop a task in plain language —{" "}
        <span className="bg-[var(--nb-lime)] px-1 font-bold text-[var(--nb-ink)]">
          watch every move
        </span>
        , keep the receipts, hold the kill switch.
      </p>

      {/* Capability chips */}
      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
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
