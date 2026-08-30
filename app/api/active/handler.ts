type VersionFile = {
  exists: () => Promise<boolean>;
  text: () => Promise<string>;
  write: (value: string) => Promise<unknown>;
};

export function createActiveHandler(dependencies: {
  file: VersionFile;
  randomUUID: () => string;
  isDevelopment: () => boolean;
  stream: (options: {
    motd: { data: string; event: string };
    signal: AbortSignal;
  }) => Response | Promise<Response>;
}) {
  return async function GET(req: Request) {
    let version = "DEV";
    if (!dependencies.isDevelopment()) {
      if (!(await dependencies.file.exists())) {
        version = dependencies.randomUUID();
        await dependencies.file.write(version);
      } else {
        version = await dependencies.file.text();
        if (!version) {
          version = dependencies.randomUUID();
          await dependencies.file.write(version);
        }
      }
    }

    return dependencies.stream({
      motd: { data: version, event: "version" },
      signal: req.signal,
    });
  };
}
