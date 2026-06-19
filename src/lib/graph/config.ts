export function isEntraConfigured() {
  return Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
  );
}

// Graph access piggybacks on the same Entra ID app registration used for
// sign-in (delegated permissions), so "Graph configured" and "Microsoft
// sign-in available" are the same condition for this app.
export function isGraphConfigured() {
  return isEntraConfigured();
}

export function isDevLoginEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.AUTH_DEV_LOGIN_ENABLED === "true"
  );
}
