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
      <div className="rounded-2xl nb-border nb-shadow-lg bg-white p-6 flex flex-col gap-5">
        {/* Wordmark block */}
        <div className="flex items-center gap-3">
          <span className="nb-border nb-shadow-sm flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nb-lime)]">
            <SentryMark size={26} />
          </span>
          <div>
            <h3 className="text-3xl font-black uppercase tracking-tighter leading-none text-[var(--nb-ink)]">
              Sentry
            </h3>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              Autonomous computer-use agent
            </p>
          </div>
        </div>

        <p className="text-[15px] font-medium leading-relaxed text-zinc-700">
          Drop a task in plain language. Sentry takes the wheel of a real
          desktop in a sandbox and gets it done —{" "}
          <span className="bg-[var(--nb-lime)] px-1 font-bold">
            you watch every move
          </span>
          , keep the receipts, and hold the kill switch.
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          <Feature
            icon={<Eye className="h-5 w-5" />}
            label="Watched"
            detail="Live desktop"
            color="var(--nb-blue)"
          />
          <Feature
            icon={<ScrollText className="h-5 w-5" />}
            label="Verified"
            detail="Evidence trail"
            color="var(--nb-lime)"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Controlled"
            detail="Approval gates"
            color="var(--nb-pink)"
          />
        </div>
      </div>
    </motion.div>
  );
};

const Feature = ({
  icon,
  label,
  detail,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  color: string;
}) => {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl nb-border nb-shadow-sm bg-white px-2 py-3 text-center">
      <span
        className="nb-border flex h-8 w-8 items-center justify-center rounded-lg text-[var(--nb-ink)]"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <span className="text-xs font-black uppercase tracking-wide text-[var(--nb-ink)]">
        {label}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">
        {detail}
      </span>
    </div>
  );
};

/**
 * Header status pill. Replaces the old Vercel "Deploy" link with a neutral,
 * self-referential status indicator that reads as a product, not a demo.
 */
export const DeployButton = () => {
  return (
    <div className="flex flex-row gap-1.5 items-center rounded-lg nb-border nb-shadow-sm bg-[var(--nb-violet)] px-2.5 py-1.5 text-xs font-black uppercase tracking-wide text-white">
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--nb-lime)]" />
      <span>v2</span>
    </div>
  );
};
