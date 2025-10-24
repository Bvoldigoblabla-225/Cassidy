import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export namespace GDBrowserAPI {
  const baseUrl = "https://gdbrowser.com/api";

  export async function level(
    levelId: string,
    params?: Record<string, any>
  ): Promise<LevelInfo> {
    return (await get("level", levelId, params)).data;
  }

  export interface LevelInfo {
    name: string;
    id: string;
    description: string;
    author: string;
    playerID: string;
    accountID: string;
    difficulty: string;
    downloads: number;
    likes: number;
    disliked: boolean;
    length: string;
    platformer: boolean;
    stars: number;
    orbs: number;
    diamonds: number;
    featured: boolean;
    epic: boolean;
    epicValue: number;
    legendary: boolean;
    mythic: boolean;
    gameVersion: string;
    editorTime: number;
    totalEditorTime: number;
    version: number;
    copiedID: string;
    twoPlayer: boolean;
    officialSong: number;
    customSong: string;
    coins: number;
    verifiedCoins: boolean;
    starsRequested: number;
    ldm: boolean;
    objects: number;
    large: boolean;
    cp: number;
    partialDiff: string;
    difficultyFace: string;
    songName: string;
    songAuthor: string;
    songSize: string;
    songID: string;
    songLink: string;
  }

  export async function profile(
    username: string,
    params?: Record<string, any>
  ): Promise<LevelCounts> {
    return (await get("profile", username, params)).data;
  }

  export interface RGBColor {
    r: number;
    g: number;
    b: number;
  }

  export interface LevelCounts {
    auto?: number;
    easy?: number;
    normal?: number;
    hard?: number;
    harder?: number;
    insane?: number;
    extreme?: number;
    weekly?: number;
    daily?: number;
    gauntlet?: number;
  }

  export interface UserStats {
    username: string;
    playerID: string;
    accountID: string;
    rank: number;
    stars: number;
    diamonds: number;
    coins: number;
    userCoins: number;
    demons: number;
    moons: number;
    cp: number;
    icon: number;
    friendRequests: boolean;
    messages: string;
    commentHistory: string;
    moderator: number;
    youtube: string;
    twitter: string;
    twitch: string;
    ship: number;
    ball: number;
    ufo: number;
    wave: number;
    robot: number;
    spider: number;
    swing: number;
    jetpack: number;
    col1: number;
    col2: number;
    colG: number;
    deathEffect: number;
    glow: boolean;
    classicDemonsCompleted: LevelCounts;
    platformerDemonsCompleted: LevelCounts;
    classicLevelsCompleted: LevelCounts;
    platformerLevelsCompleted: LevelCounts;
    col1RGB: RGBColor;
    col2RGB: RGBColor;
    colGRGB: RGBColor;
  }

  export async function search(
    query: string,
    params?: Record<string, any>
  ): Promise<Levels> {
    return (await get("search", query, params)).data;
  }

  export interface Level {
    name: string;
    id: string;
    description: string;
    author: string;
    playerID: string;
    accountID: string;
    difficulty: string;
    downloads: number;
    likes: number;
    disliked: boolean;
    length: string;
    platformer: boolean;
    stars: number;
    orbs: number;
    diamonds: number;
    featured: boolean;
    featuredPosition?: number;
    epic: boolean;
    epicValue: number;
    legendary: boolean;
    mythic: boolean;
    gameVersion: string;
    editorTime: number;
    totalEditorTime: number;
    version: number;
    copiedID: string;
    twoPlayer: boolean;
    officialSong: number;
    customSong: string;
    coins: number;
    verifiedCoins: boolean;
    starsRequested: number;
    ldm: boolean;
    objects: number;
    large: boolean;
    cp: number;
    partialDiff: string;
    difficultyFace: string;
    songName: string;
    songAuthor: string;
    songSize: string;
    songID: string;
    songLink: string;
    results?: number;
    pages?: number;
  }

  export type Levels = Level[];

  export async function comments(
    levelId: string,
    params?: Record<string, any>
  ): Promise<LevelComments> {
    return (await get("comments", levelId, params)).data;
  }

  export interface Icon {
    form: string;
    icon: number;
    col1: number;
    col2: number;
    colG?: number | null;
    glow: boolean;
  }

  export interface LevelComment {
    content: string;
    ID: string;
    likes: number;
    date: string;
    username: string;
    playerID: string;
    accountID: string;
    rank?: number | null;
    stars?: number | null;
    diamonds?: number | null;
    coins?: number | null;
    userCoins?: number | null;
    demons?: number | null;
    moons?: number | null;
    cp?: number | null;
    icon: Icon;
    col1RGB: RGBColor;
    col2RGB: RGBColor;
    colGRGB?: RGBColor | null;
    levelID: string;
    color: string;
    moderator: number;
    results?: number;
    pages?: number;
    range?: string;
    percent?: number;
  }

  export type LevelComments = LevelComment[];

  async function get(
    endpoint: string,
    identifier: string,
    params?: Record<string, any>
  ) {
    const start = Date.now();

    let response: AxiosResponse;
    try {
      response = await axios.get(
        `${baseUrl}/${endpoint}/${encodeURIComponent(identifier)}`,
        {
          params: params,
        } as AxiosRequestConfig
      );
    } catch (err) {
      throw err;
    }

    const end = Date.now();

    if (response.data === "-1") {
      throw new Error("The server response was '-1'");
    }

    return { data: response.data, ping: end - start };
  }
}
