"use client";

import { Activity, Coins, Cpu, ArrowDownUp } from "lucide-react";
import { getModel } from "@/lib/models";
import type { SessionUsage } from "@/lib/use-usage";

type SessionTelemetryProps = {
  usage: SessionUsage;
  cost: number;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `<$0.01`;
  return `$${usd.toFixed(usd < 1 ? 3 : 2)}`;
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[var(--nb-ink)]">{icon}</span>
      <span className="text-[11px] tabular-nums font-black text-[var(--nb-ink)]">
        {value}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </span>
    </div>
  );
}

export function SessionTelemetry({ usage, cost }: SessionTelemetryProps) {
  const activeModel = usage.models[usage.models.length - 1];
  const modelLabel = activeModel ? getModel(activeModel).label : "—";
  const totalTokens = usage.inputTokens + usage.outputTokens;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-300/70 nb-paper px-4 py-1.5">
      <Stat
        icon={<Activity className="h-3.5 w-3.5" />}
        label={usage.runs === 1 ? "run" : "runs"}
        value={String(usage.runs)}
      />
      <Stat
        icon={<ArrowDownUp className="h-3.5 w-3.5" />}
        label="tokens"
        value={formatTokens(totalTokens)}
      />
      <Stat
        icon={<Coins className="h-3.5 w-3.5" />}
        label="est. cost"
        value={formatCost(cost)}
      />
      <div className="ml-auto flex items-center gap-1.5">
        <Cpu className="h-3.5 w-3.5 text-zinc-400" />
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          {modelLabel}
        </span>
      </div>
    </div>
  );
}
