import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { ReactNode } from "react";
import { ErrorModal } from "@/components/error";

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
