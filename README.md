# tailscale-cloudflare-sso

A tiny Cloudflare Worker that serves a [WebFinger](https://datatracker.ietf.org/doc/html/rfc7033)
endpoint so [Tailscale's custom OIDC](https://tailscale.com/kb/1240/sso-custom-oidc)
sign-in can discover your Cloudflare Zero Trust issuer.

Cloudflare Zero Trust already exposes a full OIDC IdP when you create a SaaS
application. The only piece missing on your own domain is
`/.well-known/webfinger` — which is exactly what this worker provides.

## Flow

```
1. User enters user@example.com in Tailscale login
2. Tailscale → GET https://example.com/.well-known/webfinger?resource=acct:user@example.com
3. This worker returns a JRD pointing to the Cloudflare Zero Trust issuer
4. Tailscale → GET <issuer>/.well-known/openid-configuration
5. Standard OIDC Authorization Code flow via Cloudflare Access
6. User is signed in to the tailnet
```

## Setup

### 1. Cloudflare Zero Trust — SaaS Application

In the Cloudflare Zero Trust dashboard:

1. **Access → Applications → Add an application → SaaS**
2. Protocol: **OIDC**
3. Redirect URL: `https://login.tailscale.com/a/oauth_response`
4. Scopes: `openid`, `email`, `profile`
5. Create an **Access Policy** restricting who may sign in (email list, domain, group, etc.)
6. Save and copy the **Client ID**, **Client Secret**, and **Issuer URL**

The issuer URL looks like:

```
https://<team-name>.cloudflareaccess.com/cdn-cgi/access/sso/oidc/<client-id>
```

### 2. Deploy this worker

```sh
npm install
```

Edit `wrangler.toml`:

- Set `DOMAIN` to the domain whose users you want to authenticate (e.g. `example.com`).
- Uncomment `routes` and set your zone, **or** attach a custom domain in the Cloudflare dashboard.

Store the issuer URL as a secret and deploy:

```sh
npx wrangler secret put OIDC_ISSUER
npx wrangler deploy
```

### 3. Verify

```sh
curl "https://example.com/.well-known/webfinger?resource=acct:user@example.com&rel=http%3A%2F%2Fopenid.net%2Fspecs%2Fconnect%2F1.0%2Fissuer"
```

Expected response:

```json
{
  "subject": "acct:user@example.com",
  "links": [
    {
      "rel": "http://openid.net/specs/connect/1.0/issuer",
      "href": "https://<team-name>.cloudflareaccess.com/cdn-cgi/access/sso/oidc/<client-id>"
    }
  ]
}
```

### 4. Tailscale — Custom OIDC

In the [Tailscale admin console](https://login.tailscale.com/admin):

1. **Identity providers → Custom OIDC** (or sign up with OIDC when creating a new tailnet)
2. Email: any address on your domain, e.g. `user@example.com`
3. **Issuer URL** / **Client ID** / **Client Secret**: values from step 1
4. **Prompts**: `login`

## Local development

Copy the example env file and run the dev server:

```sh
cp .dev.vars.example .dev.vars
# edit .dev.vars, put in your real OIDC_ISSUER
npx wrangler dev
```

Then:

```sh
curl "http://localhost:8787/.well-known/webfinger?resource=acct:user@example.com"
```

## Managing access

Add or remove users in the Cloudflare Zero Trust Access Policy. The worker
never has to change.

## Credits

Based on the write-up at
<https://haqops.com/blog/tailscale-cloudflare-sso> (approach and code).
