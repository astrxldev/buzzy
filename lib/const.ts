import type { element } from "./db/schema";

export const base = process.env.BASE_URL!;

export const AmberElementMap: Record<
  string,
  (typeof element.enumValues)[number]
> = {
  Ice: "cryo",
  Water: "hydro",
  Fire: "pyro",
  Wind: "anemo",
  Rock: "geo",
  Grass: "dendro",
  Electric: "electro",
};

export const uidRegex = /^(?:[0-35-9]|18)[0-9]{8}$/;