export type MobileUpload = {
  data: Uint8Array | Buffer | null;
  name: string | null;
  type: string | null;
};

export async function retrieveMobileUploadService(
  accessKey: string,
  dependencies: {
    adminCheck: () => Promise<unknown>;
    consume: (accessKey: string) => Promise<MobileUpload | undefined>;
  },
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";

  const upload = await dependencies.consume(accessKey);
  if (!upload?.data || !upload.name || !upload.type) {
    throw new Error("Mobile upload is unavailable or already retrieved.");
  }

  const formData = new FormData();
  formData.set(
    "file",
    new File([Uint8Array.from(upload.data)], upload.name, {
      type: upload.type,
    }),
  );
  formData.set("name", upload.name);
  return formData;
}
