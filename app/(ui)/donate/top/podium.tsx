"use client";

import { Award, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

const styles = [
  {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/5",
    height: "h-48",
    text: "text-yellow-600",
  },
  {
    border: "border-zinc-400/50",
    bg: "bg-zinc-400/5",
    height: "h-36",
    text: "text-zinc-500",
  },
  {
    border: "border-amber-700/50",
    bg: "bg-amber-700/5",
    height: "h-32",
    text: "text-amber-700",
  },
];

interface TopDonateRow {
  name: string;
  amount: number;
  image?: string;
}

export function Podium({ data }: { data: TopDonateRow[] }) {
  // [1,2,3] -> [2,1,3]
  const order = [data[1], data[0], data[2]].filter(Boolean);

  return (
    <div className="flex justify-center items-end gap-4 mt-6">
      {order.map((donor, index) => {
        const rank = index === 0 ? 1 : index === 1 ? 0 : 2;
        const s = styles[rank];
        const initial = donor.name?.charAt(0).toUpperCase() ?? "?";

        return (
          <div key={rank} className="relative flex flex-col items-center">
            <div className="absolute -top-8 z-10">
              {rank === 0 ? (
                <Trophy size={28} className="text-yellow-500" />
              ) : (
                <Award size={28} className={s.text} />
              )}
            </div>
            <Card
              className={`${s.border} ${s.bg} ${s.height} w-36 flex flex-col items-center justify-end pb-0 backdrop-blur-md`}
            >
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <Avatar className="size-10">
                  <AvatarImage src={donor.image} />
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-sm truncate w-full text-center">
                  {donor.name}
                </span>
                <span className={`text-lg font-bold ${s.text}`}>
                  {donor.amount}฿
                </span>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
