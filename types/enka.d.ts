export interface EnkaNetworkUser {
  playerInfo: PlayerInfo;
  avatarInfoList: Character[];
  ttl: number;
  uid: string;
}

export interface PlayerInfo {
  nickname: string;
  level: number;
  signature: string;
  worldLevel: number;
  nameCardId: number;
  profilePicture: ProfilePicture;
  finishedAchievementNum: number;
  towerFloorIndex: number;
  towerLevelIndex: number;
  showAvatarInfoList: ShowAvatarInfo[];
  [key: string]: any;
}

export interface ProfilePicture {
  avatarId: number;
  id?: number;
  costume_id?: number;
}

export interface ShowAvatarInfo {
  avatarId: number;
  level: number;
  costumeId: number;
}

export interface Character {
  avatarId: number;
  propMap: { [key: string]: number };
  fightPropMap: { [key: string]: number };
  skillDepotId: number;
  talentIdList: number[];
  inherentProudSkillList: number[];
  equipList: Equipment[];
}

export interface Equipment {
  itemId: number;
  reliquary?: Artifact;
  flat: Flat;
  weapon?: Weapon;
}

export interface Artifact {
  level: number;
  mainPropId: number;
  appendPropIdList: number[];
}

export interface Weapon {
  level: number;
  promoteLevel: number;
}

export interface Flat {
  nameTextMapHash: string;
  reliquaryMainstat?: {
    mainPropId: string;
    statValue: number;
  };
  reliquarySubstats?: {
    appendPropId: string;
    statValue: number;
  }[];
  weaponStats?: {
    appendPropId: string;
    statValue: number;
  }[];
  setNameTextMapHash: string;
  rankLevel: number;
  [key: string]: any;
}
