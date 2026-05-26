import { APP_NAME, BRAND_LINE, RATING_PROMPT, isRemoteConfigured } from "@/lib/config";
import { Card } from "@/components/design-system/Card";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { StarRating } from "@/components/design-system/StarRating";
import { EncoreButton } from "@/components/design-system/EncoreButton";

/**
 * Branded placeholder home (web M0). The real onboarding + now-playing
 * routes replace this in M1/M2.
 */
export default function Home() {
  const configured = isRemoteConfigured();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <header className="flex flex-col items-center gap-3">
          <h1 className="font-display text-5xl text-encore-accent">{APP_NAME}</h1>
          <DoubleRule width={92} />
          <p className="text-encore-soft text-base">{BRAND_LINE}</p>
        </header>

        <Card padding="lg" className="w-full">
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="font-display text-xl">Nothing in here yet.</p>
            <p className="text-encore-soft">
              Rate the last song that stopped you in your tracks.
            </p>
            <div className="pt-1">
              <StarRating score={4.5} size={30} />
            </div>
          </div>
        </Card>

        <div className="w-full">
          <EncoreButton kind="brass" icon={<StarIcon />}>
            {RATING_PROMPT}
          </EncoreButton>
        </div>

        <p className="text-encore-faint text-xs">Milestone 0 — foundations (web)</p>

        {!configured && (
          <Card padding="md" className="w-full">
            <div className="text-encore-soft text-sm space-y-2">
              <p className="font-semibold text-encore">Not configured yet.</p>
              <p>
                Copy <code className="font-mono">.env.local.example</code> to{" "}
                <code className="font-mono">.env.local</code> and fill the values from
                <code className="font-mono"> terraform output</code> in
                <code className="font-mono"> infra/</code>. Sign-in, now-playing, and
                ratings all need it.
              </p>
            </div>
          </Card>
        )}
      </div>
    </main>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden>
      <path
        d="M12 2.5l2.928 6.193 6.822.92-4.987 4.65 1.232 6.737L12 17.77l-5.995 3.23 1.232-6.737L2.25 9.613l6.822-.92L12 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}
