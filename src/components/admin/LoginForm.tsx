import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn } from "lucide-react";
import { authClient } from "../../lib/auth-client";

const loginSchema = z.object({
  email: z.email("Unesi ispravan email."),
  password: z.string().min(1, "Unesi lozinku."),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);

    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      // Namjerno ne otkrivamo da li email postoji — ista poruka za oba slučaja.
      setFormError("Pogrešan email ili lozinka.");
      return;
    }

    window.location.href = "/admin";
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          {...register("email")}
          className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 outline-none focus:border-gold-dark"
        />
        {errors.email && <p className="mt-1.5 text-gold-dark">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="password" className="block font-medium">
          Lozinka
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
          className="mt-2 w-full rounded-lg border border-line bg-surface px-4 py-3 outline-none focus:border-gold-dark"
        />
        {errors.password && <p className="mt-1.5 text-gold-dark">{errors.password.message}</p>}
      </div>

      {formError && (
        <p role="alert" className="rounded-lg border border-gold-dark/40 bg-gold/10 px-4 py-3">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold px-6 py-3 font-medium text-ink transition-colors hover:bg-gold-dark disabled:opacity-60"
      >
        <LogIn className="size-5" aria-hidden="true" />
        {isSubmitting ? "Prijava..." : "Prijavi se"}
      </button>
    </form>
  );
}
