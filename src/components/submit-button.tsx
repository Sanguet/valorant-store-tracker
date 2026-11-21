"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

export function SubmitButton({
  idle,
  pending: pendingLabel,
  variant = "quiet",
  className,
}: {
  idle: string;
  pending: string;
  variant?: "primary" | "quiet" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      className={className}
      aria-disabled={pending || undefined}
      aria-busy={pending || undefined}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : idle}
    </Button>
  );
}
