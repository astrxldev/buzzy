async function main() {
  const data: AvatarApiResponse = await fetch("https://gi.yatta.moe/api/v2/en/avatar").then(e => e.json());
  
}

main();

export interface AvatarApiResponse {
  response: number;
  data: Data;
}

export interface Data {
  props: { [key: string]: string };
  types: { [key: string]: string };
  items: { [key: string]: Avatar };
}

export interface Avatar {
  id: number | string;
  rank: number;
  name: string;
  element: string;
  weaponType: string;
  region: string;
  specialProp: string;
  bodyType: string;
  icon: string;
  birthday: number[];
  release: number;
  route: string;
}