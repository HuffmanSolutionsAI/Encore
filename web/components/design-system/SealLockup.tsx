import { BRAND } from "./tokens";
import { RecordMark } from "./RecordMark";
import { Wordmark } from "./Wordmark";
import { DoubleRule } from "./DoubleRule";

/**
 * The vertical "seal" — record medallion over the wordmark, double rule, and
 * the tagline, stacked into an award stamp. The sign-in hero. Designed for an
 * Ink panel, so colors default to Paper / Paper-deep.
 */
export function SealLockup({
  recordSize = 132,
  wordSize = 52,
  color = BRAND.paper,
  muted = "#E8D9C2",
  tagline = true,
}: {
  recordSize?: number;
  wordSize?: number;
  color?: string;
  muted?: string;
  tagline?: boolean;
}) {
  return (
    <div className="flex flex-col items-center" style={{ gap: 22 }}>
      <RecordMark size={recordSize} />
      <Wordmark size={wordSize} color={color} />
      <DoubleRule width={Math.round(wordSize * 1.85)} />
      {tagline && (
        <div
          className="font-display"
          style={{ fontStyle: "italic", fontSize: Math.round(wordSize * 0.42), color: muted, letterSpacing: "-0.005em" }}
        >
          Music worth playing again.
        </div>
      )}
    </div>
  );
}
