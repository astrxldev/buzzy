type AdminDependencies = {
  isAdmin: () => Promise<unknown>;
  capture: (event: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => unknown;
  publish: (event: "update" | "ping" | "refresh", data: unknown) => unknown;
};

async function authorize(dependencies: AdminDependencies) {
  if (!(await dependencies.isAdmin())) throw new Error("Unauthorized");
}

export async function resetDonationGoal(
  dependencies: AdminDependencies & {
    resetGoal: (at: Date) => Promise<unknown>;
    now: () => Date;
  },
) {
  await authorize(dependencies);
  dependencies.capture({
    distinctId: "admin",
    event: "donation_admin_goal_reset",
  });
  await dependencies.resetGoal(dependencies.now());
  dependencies.publish("update", null);
}

export async function publishTestPopup(dependencies: AdminDependencies) {
  await authorize(dependencies);
  dependencies.capture({
    distinctId: "admin",
    event: "donation_admin_test_popup",
  });
  dependencies.publish("ping", {
    id: "test",
    name: "Mr. Buzz",
    message: "นี่คือข้อความทดสอบโดเนท",
    amount: 67,
  });
}

export async function reloadDonationWidget(dependencies: AdminDependencies) {
  await authorize(dependencies);
  dependencies.capture({
    distinctId: "admin",
    event: "donation_admin_widget_reload",
  });
  dependencies.publish("refresh", null);
}

export async function resendDonationPopup<
  T extends {
    id: string;
    name: string;
    amount: number;
    message: string | null;
    image: Buffer | null;
  },
>(
  id: string,
  dependencies: AdminDependencies & {
    resetSent: (id: string) => Promise<T | undefined>;
    imageToDataUrl: (image: Buffer) => Promise<string>;
  },
) {
  await authorize(dependencies);
  const donation = await dependencies.resetSent(id);
  if (!donation) throw new Error("not found");
  dependencies.capture({
    distinctId: "admin",
    event: "donation_admin_resend",
    properties: { id },
  });
  dependencies.publish("ping", {
    ...donation,
    message: donation.message ?? "",
    image: donation.image
      ? await dependencies.imageToDataUrl(donation.image)
      : undefined,
  });
}

export async function getDonationImage(
  id: string,
  dependencies: Pick<AdminDependencies, "isAdmin"> & {
    findImage: (id: string) => Promise<Buffer | null | undefined>;
  },
) {
  if (!(await dependencies.isAdmin())) throw new Error("Unauthorized");
  const image = await dependencies.findImage(id);
  if (image === undefined) throw new Error("not found");
  if (image === null) throw new Error("no image");
  return image;
}
