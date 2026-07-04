"use client";

import {
  Check,
  Copy,
  CopyCheck,
  ImageOff,
  MessageSquareWarning,
  Send,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { Note } from "@/lib/db/schema";
import { addNote, debugUploadSlip, deleteNote, discordCall } from "../../api";

// by chatgpt
const lePalette = [
  {
    bg: "#A34A5B",
    border: "#C26779",
    text: "#FAFAF9",
  },
  {
    bg: "#3D7EA6",
    border: "#5A9BC6",
    text: "#F8FAFC",
  },
  {
    bg: "#7A5A48",
    border: "#9B7763",
    text: "#FAFAF9",
  },
  {
    bg: "#6F5BA7",
    border: "#8C77C8",
    text: "#FAFAF9",
  },
  {
    bg: "#4F8C5A",
    border: "#6DAC79",
    text: "#F8FAFC",
  },
  {
    bg: "#A67C00",
    border: "#C59A17",
    text: "#FFF8E1",
  },
  {
    bg: "#8E4B73",
    border: "#AD6791",
    text: "#FAFAF9",
  },
  {
    bg: "#2E7D6A",
    border: "#4C9D89",
    text: "#F8FAFC",
  },
  {
    bg: "#A65D3A",
    border: "#C57A53",
    text: "#FFF7ED",
  },
  {
    bg: "#5C6673",
    border: "#7B8696",
    text: "#F8FAFC",
  },
  {
    bg: "#4B5FA3",
    border: "#6880C5",
    text: "#F8FAFC",
  },
  {
    bg: "#7A8742",
    border: "#99A75E",
    text: "#F7FEE7",
  },
];

function colorFor(queueId: string, noteIndex: number) {
  const seed = parseInt(queueId.slice(-8), 16);
  return lePalette[(seed + noteIndex * 7) % lePalette.length];
}

export function NotesPanel({
  sid,
  initialNotes,
}: {
  sid: string;
  initialNotes: Note[];
}) {
  const [notes, setNotes] = useState(initialNotes);
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [closeCooldown, setCloseCooldown] = useState(false);

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    try {
      const note = await addNote(sid, text.trim());
      setNotes((prev) => [note, ...prev]);
      setText("");
    } catch (e) {
      toast.error(`${e}`);
    }
    setAdding(false);
    setCardOpen(false);
  }

  async function handleDelete(noteId: string) {
    try {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      await deleteNote(sid, noteId);
    } catch (e) {
      toast.error(`${e}`);
    }
  }

  return (
    <div className="relative h-full w-full overflow-y-auto p-3">
      <div className="mb-3 flex items-center gap-2">
        <HoverCard
          openDelay={0}
          closeDelay={200}
          open={cardOpen}
          onOpenChange={(r) => r || closeCooldown || setCardOpen(r)}
        >
          <HoverCardTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                setCloseCooldown(true);
                setCardOpen(true);
                setTimeout(() => setCloseCooldown(false), 300);
              }}
            >
              + เพิ่มโน๊ต
            </Button>
          </HoverCardTrigger>
          <HoverCardContent side="bottom" align="start" className="w-auto">
            <div className="flex items-center gap-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="พิมพ์โน๊ต..."
                className="min-w-48"
                autoFocus
              />
              <Button
                size="icon"
                type="button"
                onClick={handleAdd}
                disabled={adding || !text.trim()}
              >
                <Send />
              </Button>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
        {notes.map((n, i, _, pal = colorFor(sid, i)) => (
          <div
            key={n.id}
            className="group relative min-h-50 px-2"
            style={{
              background: `${pal.bg}bb`,
              border: `${pal.border} 1px solid`,
            }}
          >
            <span className="text-sm" style={{ color: pal.text }}>
              {n.text}
            </span>
            <Button
              type="button"
              onClick={() => handleDelete(n.id)}
              // className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              variant="destructive"
              size="icon-sm"
              className="absolute -top-1.5 -right-1.5 size-5 opacity-0 backdrop-blur-md group-hover:opacity-100"
            >
              <X />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (copied) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button
      variant="link"
      onClick={copy}
      disabled={copied}
      className="text-white"
    >
      {copied ? <CopyCheck /> : <Copy />} คัดลอก username
    </Button>
  );
}

export function CallButton({ user }: { user: string }) {
  const [state, setState] = useState<"ready" | "loading" | "success" | "error">(
    "ready",
  );
  return (
    <Button
      disabled={state === "loading"}
      onClick={() => {
        setState("loading");
        discordCall(user).then((r) => setState(r ? "success" : "error"));
      }}
      variant={
        state === "error"
          ? "destructive"
          : state === "success"
            ? "secondary"
            : "default"
      }
    >
      {state === "success" ? (
        <Check />
      ) : state === "loading" ? (
        <Spinner />
      ) : (
        <MessageSquareWarning />
      )}
      เรียกในดิสคอร์ด
    </Button>
  );
}

export function DebugSlipUpload({ sid }: { sid: string }) {
  const ref = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <button
        className="flex w-40 cursor-pointer flex-col items-center justify-center rounded-md border bg-card"
        onClick={() => ref.current?.click()}
        type="button"
      >
        <ImageOff />
        ยังไม่จ่าย
        <span className="text-xs">กดเพื่ออัพสลิป</span>
      </button>
      <input
        ref={ref}
        hidden
        type="file"
        accept="image/*"
        onChange={(ev) => {
          if (ev.target.files?.length)
            debugUploadSlip(sid, ev.target.files.item(0)!);
        }}
      />
    </>
  );
}
