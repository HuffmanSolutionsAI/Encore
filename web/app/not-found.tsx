import Link from "next/link";

import { Wordmark } from "@/components/design-system/Wordmark";
import { DoubleRule } from "@/components/design-system/DoubleRule";
import { Card } from "@/components/design-system/Card";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
        <header className="flex flex-col items-center gap-3">
          <Wordmark size={34} />
          <DoubleRule width={80} />
        </header>
        <Card padding={28} className="w-full">
          <p className="t-h3 mb-2">We couldn&rsquo;t find that page.</p>
          <p className="t-small mb-5">The record may have moved, or the link wasn&rsquo;t quite right.</p>
          <Link href="/" className="text-brand font-semibold text-sm">
            Back to now playing →
          </Link>
        </Card>
      </div>
    </main>
  );
}
