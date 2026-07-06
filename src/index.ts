import { Hono } from "hono";

type Env = {
  DOMAIN: string;
  OIDC_ISSUER: string;
};

const OIDC_ISSUER_REL = "http://openid.net/specs/connect/1.0/issuer";

const app = new Hono<{ Bindings: Env }>();

app.get("/.well-known/webfinger", (c) => {
  const resource = c.req.query("resource");
  if (!resource) {
    return c.json({ error: "missing resource parameter" }, 400);
  }

  const match = resource.match(/^acct:(.+)@(.+)$/);
  if (!match || match[2] !== c.env.DOMAIN) {
    return c.json({ error: "unknown resource" }, 404);
  }

  const rel = c.req.query("rel");
  if (rel && rel !== OIDC_ISSUER_REL) {
    return c.json({ error: "unsupported rel" }, 404);
  }

  return c.json(
    {
      subject: resource,
      links: [{ rel: OIDC_ISSUER_REL, href: c.env.OIDC_ISSUER }],
    },
    200,
    { "Content-Type": "application/jrd+json" },
  );
});

export default app;
