"use client";

import { UserLock } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const router = useRouter();
  async function submit(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    const cb = (await searchParams?.then(({ next }) => next)) || "/admin";
    const r = await authClient.signIn
      .email({
        email: data.get("email") as string,
        password: data.get("password") as string,
        callbackURL: cb,
      })
      .catch(() => toast.error("Failed to login"));
    if (typeof r !== "object") return toast.error("Invalid email or password");
    if (r.error) return toast.error(r.error.message);
    router.push(cb);
  }
  return (
    <div className="bg-[#1117] backdrop-blur-lg flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <form onSubmit={submit}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2">
                <a
                  href="/"
                  className="flex flex-col items-center gap-2 font-medium"
                >
                  <div className="flex size-8 items-center justify-center rounded-md">
                    <UserLock className="size-6" />
                  </div>
                  <span className="sr-only">Buzzy</span>
                </a>
                <h1 className="text-xl font-bold">Welcome to Buzzy.</h1>
                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a
                    href="https://cdn.dgnr.us/signup"
                    className="underline underline-offset-4"
                  >
                    Sign Up
                  </a>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid gap-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    autoFocus
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>
            </div>
          </form>
          <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
            Any attempts to bruteforce the system
            <br />
            will result in consequences.
          </div>
        </div>
      </div>
    </div>
  );
}
