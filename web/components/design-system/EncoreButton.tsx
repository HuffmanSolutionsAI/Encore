import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, type ButtonVariant } from "./Button";

// Back-compat shim. Older screens use `kind`; the design system standardised
// on `variant` (see Button.tsx). Maps the legacy names and delegates.
interface EncoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: "primary" | "secondary" | "brass";
  icon?: ReactNode;
  children: ReactNode;
}

const KIND_TO_VARIANT: Record<NonNullable<EncoreButtonProps["kind"]>, ButtonVariant> = {
  primary: "primary",
  secondary: "ghost",
  brass: "brass",
};

export function EncoreButton({ kind = "primary", ...rest }: EncoreButtonProps) {
  return <Button variant={KIND_TO_VARIANT[kind]} {...rest} />;
}
