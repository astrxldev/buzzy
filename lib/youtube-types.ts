export type YoutubeLiveInfo =
  | {
      url: string;
      thumbnails: {
        url: string;
        width: number;
        height: number;
      };
      title: string;
    }
  | "none";
