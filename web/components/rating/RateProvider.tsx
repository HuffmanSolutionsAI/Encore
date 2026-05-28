"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { RateModal, type RatingSubject } from "./RateModal";
import type { Rating } from "@/lib/types";

interface OpenOpts {
  initialScore?: number | null;
  initialReview?: string | null;
  initialIsRelisten?: boolean;
  onSaved?: (saved: Rating) => void;
}

interface RateContextValue {
  openRate: (subject: RatingSubject, opts?: OpenOpts) => void;
}

const RateContext = createContext<RateContextValue | null>(null);

/**
 * Owns the single Rate modal for the whole signed-in shell. Any screen — the
 * Now-playing bar, the home hero, the album page — calls `openRate(subject)`.
 */
export function RateProvider({ children }: { children: React.ReactNode }) {
  const [subject, setSubject] = useState<RatingSubject | null>(null);
  const [opts, setOpts] = useState<OpenOpts>({});

  const openRate = useCallback((s: RatingSubject, o: OpenOpts = {}) => {
    setOpts(o);
    setSubject(s);
  }, []);

  return (
    <RateContext.Provider value={{ openRate }}>
      {children}
      {subject && (
        <RateModal
          subject={subject}
          initialScore={opts.initialScore ?? null}
          initialReview={opts.initialReview ?? null}
          initialIsRelisten={opts.initialIsRelisten ?? false}
          onClose={() => setSubject(null)}
          onSaved={opts.onSaved}
        />
      )}
    </RateContext.Provider>
  );
}

export function useRate(): RateContextValue {
  const ctx = useContext(RateContext);
  if (!ctx) throw new Error("useRate must be used inside <RateProvider>");
  return ctx;
}
