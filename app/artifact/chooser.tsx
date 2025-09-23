"use client";

import Avatar from "@/components/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function CharacterChooser() {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="password">UID</Label>
        <Input id="password" type="number" required placeholder="887654321" />
      </div>
      <ScrollArea>
        <div className="flex gap-2">
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
          <Avatar
            char={{
              name: "Traveler",
              stars: 5,
              vision: "anemo",
              weapon: "sword",
              image: "1234567890",
              version: "5.7",
            }}
            scale={0.6}
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  );
}
