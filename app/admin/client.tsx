"use client";

import { useEffect, useState } from "react";

export function VersionCreateDialogForm() {
  return <form>Todo</form>;
}

export function RandomWelcomeMessage({ list }: { list?: string[] }) {
  const messages = list || [
    "What are we cooking today?",
    "What are we doing today?",
    "Why are you here?",
    "The food is ready sir.",
    "Who left the artifact stats like that?",
    "Don’t forget to hydrate, boss.",
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
    "Don’t worry, no 5★ drama yet.",
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
