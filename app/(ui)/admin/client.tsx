"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export function VersionCreateDialogForm() {
  return <form>Todo</form>;
}

export function RandomWelcomeMessage({ list }: { list?: string[] }) {
  const messages = list || [
    "What are we cooking today?",
    "I'm NOT an EMERGENCY FOOD!!",
    "Why are you here?",
    "The emergency food is ready sir.",
    "Who left the artifact stats like that?",
    "Don't forget to hydrate, boss.",
    "Another day, another reroll.",
    "Still reviewing artifacts? Respect.",
    "Let's make these builds shine.",
    "You came back… impressive.",
    "Processing luck… 0.3% found.",
    "Someone's gotta keep this event alive.",
    "New submissions incoming!",
    "Welcome back, brave reviewer.",
    "Did you bring Mora this time?",
    "Your approval power is unmatched.",
    "Remember: critique kindly, roast fairly.",
    "Time to bless—or curse—some artifacts.",
    "Don't worry, no 5★ drama yet.",
    "Admin mode: activated.",
  ];

  const [message, setMessage] = useState("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: false
  useEffect(
    () => setMessage(messages[Math.floor(Math.random() * messages.length)]),
    [messages.length],
  );

  return message;
}

export function SidebarLink({
  className,
  children,
  href,
  disabled,
  ...props
}: React.ComponentProps<typeof Link> & { disabled?: boolean }) {
  const target = useMemo(
    () =>
      href
        ? new URL(href.toString(), "https://example.com").pathname
        : undefined,
    [href],
  );
  const pathname = usePathname();
  return (
    <SidebarMenuButton
      disabled={disabled}
      className={cn(target === pathname ? "bg-accent" : "", className)}
      asChild={!disabled}
    >
      {disabled ? (
        children
      ) : (
        <Link href={href} {...props}>
          {children}
        </Link>
      )}
    </SidebarMenuButton>
  );
}
