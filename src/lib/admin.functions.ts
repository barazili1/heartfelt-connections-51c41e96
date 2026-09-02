import { createServerFn } from "@tanstack/react-start";

/**
 * Checks a typed player ID against the private admin access ID.
 * The ID lives in a server secret, so it never ships in the client bundle.
 */
export const checkAdminId = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }) => {
    const expected = process.env["ADMIN_ACCESS_ID"] ?? "";
    return { isAdmin: expected.length > 0 && data.id === expected };
  });
