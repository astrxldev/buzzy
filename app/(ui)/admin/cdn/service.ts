export interface CdnImportDependencies<TTransaction, TResult> {
  adminCheck: () => Promise<unknown>;
  fetch: (url: string) => Promise<Response>;
  transaction: <T>(
    callback: (transaction: TTransaction) => Promise<T>,
  ) => Promise<T>;
  importFile: (file: File, transaction: TTransaction) => Promise<TResult>;
  afterImport: () => Promise<void> | void;
}

function filenameFromDisposition(value: string | null) {
  return value?.match(/filename="?([^";]+)"?/i)?.[1];
}

export async function responseToFile(response: Response) {
  if (!response.ok) {
    throw new Error(
      `File failed to download (${response.status} ${response.statusText})`,
    );
  }

  const dispositionName = filenameFromDisposition(
    response.headers.get("Content-Disposition"),
  );
  const pathName = response.url
    ? decodeURIComponent(new URL(response.url).pathname).match(
        /\/([^/]+)$/,
      )?.[1]
    : undefined;
  const contentType = response.headers.get("Content-Type")?.split(";")[0];
  const extension = contentType?.split("/")[1];
  const blob = await response.blob();

  return new File(
    [blob],
    dispositionName || pathName || `file.${extension || "dat"}`,
    { type: contentType || blob.type },
  );
}

export async function fetchToCdnService<TTransaction, TResult>(
  urls: string[],
  dependencies: CdnImportDependencies<TTransaction, TResult>,
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";

  try {
    return await dependencies.transaction((transaction) =>
      Promise.all(
        urls.map(async (url) => {
          const response = await dependencies.fetch(url);
          return dependencies.importFile(
            await responseToFile(response),
            transaction,
          );
        }),
      ),
    );
  } finally {
    await dependencies.afterImport();
  }
}
