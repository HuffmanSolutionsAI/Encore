"use client";

import Link from "next/link";

import { Button } from "@/components/design-system/Button";
import { Overline } from "@/components/design-system/Overline";
import { AuthFrame } from "@/components/layout/AuthFrame";

/** Landing page after Cognito's hosted-UI logout completes. */
export default function SignedOutPage() {
  return (
    <AuthFrame overline="Until next time">
      <Overline>You&rsquo;re signed out</Overline>
      <h1 className="t-h1 mt-3">Your encores stayed.</h1>
      <p className="t-editorial mt-3" style={{ fontSize: 17 }}>
        Come back any time — every rating is still on the shelf.
      </p>
      <div className="mt-8">
        <Link href="/auth/signin" className="block">
          <Button variant="primary" size="lg" className="w-full">
            Sign back in
          </Button>
        </Link>
      </div>
    </AuthFrame>
  );
}
