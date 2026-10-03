import { createHmac, timingSafeEqual } from "node:crypto";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(signingInput, secret) {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

function createJwt({ secret, issuer, subject, audience, email, displayName, ttlSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256" };
  const payload = {
    iss: issuer,
    sub: subject,
    aud: audience,
    email,
    displayname: displayName,
    iat: now,
    exp: now + ttlSeconds
  };
  const signingInput = `${encode(header)}.${encode(payload)}`;
  return `${signingInput}.${sign(signingInput, secret)}`;
}

function verifyJwt(token, secret) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) throw new Error("Malformed JWT");
  const expected = sign(`${encodedHeader}.${encodedPayload}`, secret);
  const left = Buffer.from(encodedSignature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("JWT signature verification failed");
  }
  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
}

function configuration() {
  const audience = process.env.JWT_AUDIENCE ?? `${required("VANILLA_BASE_URL").replace(/\/$/, "")}`;
  return {
    secret: required("VANILLA_JWT_SECRET"),
    issuer: required("JWT_ISSUER"),
    subject: required("JWT_SUB"),
    audience,
    email: required("JWT_EMAIL"),
    displayName: required("JWT_DISPLAYNAME"),
    ttlSeconds: Number(process.env.JWT_TTL_SECONDS ?? 300)
  };
}

async function main() {
  const config = configuration();
  const token = createJwt(config);

  if (process.argv.includes("--self-test")) {
    const claims = verifyJwt(token, config.secret);
    if (claims.iss !== config.issuer || claims.sub !== config.subject || claims.aud !== config.audience) {
      throw new Error("JWT self-test claims did not round-trip");
    }
    console.error(`JWT self-test passed; expires in ${config.ttlSeconds} seconds`);
    return;
  }

  if (process.argv.includes("--api-test")) {
    const baseUrl = required("VANILLA_BASE_URL").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/v2/users/me`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`Vanilla JWT API test failed (${response.status}): ${body}`);
    console.error("Vanilla JWT API test passed");
    return;
  }

  process.stdout.write(`${token}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
