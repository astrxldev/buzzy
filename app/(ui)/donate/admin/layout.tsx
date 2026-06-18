import { ErrorModal } from "@/components/error";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { ReactNode } from "react";

export default async function DonateAdminLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      <ErrorBoundary errorComponent={ErrorModal}>{modal}</ErrorBoundary>
      {children}
    </>
  );
}
