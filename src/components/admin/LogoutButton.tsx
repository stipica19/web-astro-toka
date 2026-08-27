import { useState } from "react";
import { LogOut } from "lucide-react";
import { authClient } from "../../lib/auth-client";

export default function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await authClient.signOut();
    // Puni reload: middleware tako ponovo procijeni sesiju i preusmjeri na prijavu.
    window.location.href = "/admin/prijava";
  }

  // Dugme stoji u tamnom sidebaru i prati izgled ostalih stavki menija.
  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-cream/70 transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-50"
    >
      <LogOut className="size-5 shrink-0" aria-hidden="true" />
      {pending ? "Odjava..." : "Odjava"}
    </button>
  );
}
