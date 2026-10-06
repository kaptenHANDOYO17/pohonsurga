"use client";

import { useActionState } from "react";
import { CircleAlert, Loader2 } from "lucide-react";
import { adminSignIn, type AdminLoginState } from "../actions";

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState<AdminLoginState, FormData>(adminSignIn, undefined);
  const cls =
    "h-13 w-full rounded-2xl border border-gold/40 bg-parchment/60 px-4 py-3 text-base outline-none transition focus:border-leaf focus:bg-white focus:ring-4 focus:ring-leaf/15";
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-forest">Email admin</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={state?.email} className={cls} />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-forest">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={cls} />
      </div>
      {state?.error && (
        <div role="alert" className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
        </div>
      )}
      <button
        disabled={pending}
        className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 text-base font-semibold text-parchment hover:bg-forest-deep disabled:opacity-70"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />} Masuk
      </button>
    </form>
  );
}
