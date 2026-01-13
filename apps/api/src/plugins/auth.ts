import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import helmet from "@fastify/helmet";
import { randomBytes, createHash } from "node:crypto";
import { request } from "undici";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { RedisStore } from "connect-redis";

declare module "fastify" {
  interface Session {
    // transient OIDC values for login flow
    oidc_state?: string;
    oidc_nonce?: string;
    oidc_verifier?: string;

    // authenticated user session
    user?: {
      sub: string;
      email?: string;
      name?: string;
      groups?: string[];
    };
  }

  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function base64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function pkcePair() {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export async function authPlugin(app: FastifyInstance) {
  const {
    APP_PUBLIC_ORIGIN,
    OKTA_ISSUER,
    OKTA_CLIENT_ID,
    OKTA_CLIENT_SECRET,
    OKTA_REDIRECT_URI,
    SESSION_SECRET,
    COOKIE_SECURE
  } = process.env;

  if (!APP_PUBLIC_ORIGIN) throw new Error("APP_PUBLIC_ORIGIN missing");
  if (!OKTA_ISSUER || !OKTA_CLIENT_ID || !OKTA_CLIENT_SECRET || !OKTA_REDIRECT_URI) {
    throw new Error("Okta env vars missing");
  }
  if (!SESSION_SECRET) throw new Error("SESSION_SECRET missing");

  const cookieSecure = (COOKIE_SECURE ?? "false") === "true";

  // Security headers
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "frame-ancestors": ["'none'"]
      }
    }
  });

  await app.register(cookie, { secret: SESSION_SECRET });

  const sessionTtl = Number(process.env.SESSION_TTL_SECONDS ?? 28800);

const redisStore = new RedisStore({
  client: app.redis as any,
  ttl: sessionTtl
});

await app.register(session, {
  secret: SESSION_SECRET,
  store: redisStore,
  cookieName: "__Host-recipeos",
  cookie: {
    secure: cookieSecure,
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  },
  saveUninitialized: false
});


  // JWKS for verifying ID tokens
  const jwks = createRemoteJWKSet(new URL(`${OKTA_ISSUER}/v1/keys`));

  // Route guard
  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.session.user) {
      return reply.code(401).send({ error: "unauthenticated" });
    }
  });

  // Start login
  app.get("/login", async (req, reply) => {
    const state = base64url(randomBytes(16));
    const nonce = base64url(randomBytes(16));
    const { verifier, challenge } = pkcePair();

    // Store OIDC transient state in session (typed)
    req.session.oidc_state = state;
    req.session.oidc_nonce = nonce;
    req.session.oidc_verifier = verifier;

    const authorizeUrl = new URL(`${OKTA_ISSUER}/v1/authorize`);
    authorizeUrl.searchParams.set("client_id", OKTA_CLIENT_ID);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "openid profile email");
    authorizeUrl.searchParams.set("redirect_uri", OKTA_REDIRECT_URI);
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("nonce", nonce);
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    return reply.redirect(authorizeUrl.toString());
  });

  // Callback: exchange code for tokens, verify ID token, create session
  app.get("/auth/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string; error_description?: string };

    if (q.error) {
      return reply.code(400).send({ error: q.error, description: q.error_description });
    }

    const code = q.code;
    const state = q.state;

    if (!code || !state) {
      return reply.code(400).send({ error: "missing code/state" });
    }

    const expectedState = req.session.oidc_state;
    const expectedNonce = req.session.oidc_nonce;
    const verifier = req.session.oidc_verifier;

    if (!expectedState || !expectedNonce || !verifier) {
      return reply.code(400).send({ error: "missing session state" });
    }
    if (state !== expectedState) {
      return reply.code(400).send({ error: "state mismatch" });
    }

    const tokenUrl = `${OKTA_ISSUER}/v1/token`;

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("redirect_uri", OKTA_REDIRECT_URI);
    body.set("code_verifier", verifier);

    const basic = Buffer.from(`${OKTA_CLIENT_ID}:${OKTA_CLIENT_SECRET}`).toString("base64");

    const tokenResp = await request(tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${basic}`
      },
      body: body.toString()
    });

    const tokenJson = (await tokenResp.body.json()) as any;

    if (tokenResp.statusCode < 200 || tokenResp.statusCode >= 300) {
      return reply.code(400).send({ error: "token exchange failed", details: tokenJson });
    }

    if (!tokenJson.id_token) {
      return reply.code(400).send({ error: "no id_token", details: tokenJson });
    }

    // Verify ID token
    const { payload } = await jwtVerify(tokenJson.id_token, jwks, {
      issuer: OKTA_ISSUER,
      audience: OKTA_CLIENT_ID
    });

    if (payload.nonce !== expectedNonce) {
      return reply.code(400).send({ error: "nonce mismatch" });
    }

    const email =
      (payload.email as string | undefined) ??
      (payload.preferred_username as string | undefined);

    // Belt-and-braces: Okta assignment should enforce domain, but we also check.
    if (!email || !email.toLowerCase().endsWith("@premierfoods.co.uk")) {
      req.session.user = undefined;
      return reply.code(403).send({ error: "forbidden: domain" });
    }

    req.session.user = {
      sub: String(payload.sub),
      email,
      name: (payload.name as string | undefined) ?? undefined,
      groups: (payload.groups as string[] | undefined) ?? undefined
    };

    // Clear transient OIDC values
    req.session.oidc_state = undefined;
    req.session.oidc_nonce = undefined;
    req.session.oidc_verifier = undefined;

    return reply.redirect(APP_PUBLIC_ORIGIN);
  });

  // Logout (local session)
  app.get("/logout", async (req, reply) => {
    req.session.user = undefined;
    return reply.redirect(APP_PUBLIC_ORIGIN);
  });

  // Who am I
  app.get("/me", async (req, reply) => {
    return reply.send({ user: req.session.user ?? null });
  });
}
