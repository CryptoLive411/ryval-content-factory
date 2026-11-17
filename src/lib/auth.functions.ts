import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function isAlreadyRegistered(message: string) {
  return /already|registered|exists/i.test(message);
}

async function findUserByEmail(email: string) {
  const target = email.toLowerCase();
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);
  return data.users.find((user) => user.email?.toLowerCase() === target) ?? null;
}

/** Local signup: mark the account confirmed so inbox links are not required. */
export const ensureLocalAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (!created.error) return { ok: true as const };

    if (!isAlreadyRegistered(created.error.message)) {
      throw new Error(created.error.message);
    }

    const existing = await findUserByEmail(data.email);
    if (!existing) throw new Error(created.error.message);
    if (existing.email_confirmed_at) return { ok: true as const };

    const updated = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      email_confirm: true,
    });
    if (updated.error) throw new Error(updated.error.message);
    return { ok: true as const };
  });
