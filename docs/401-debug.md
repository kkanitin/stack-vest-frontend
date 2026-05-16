# 401 Debugging — `/api/v1/users/me`

## Context

After Google OAuth success, `AuthContext.login()` calls `GET /api/v1/users/me` (and `POST` if user not found) with the Google ID token as a Bearer token. Both endpoints are returning **401 Unauthorized**.

The frontend code is structurally correct — the `Authorization: Bearer <token>` header matches the curl examples in `user_api.txt`. The issue is on the **backend** side.

---

## Checklist

### 1. Confirm `VITE_API_URL` is resolving

Add temporarily to `AuthContext.tsx` or browser console:

```ts
console.log(import.meta.env.VITE_API_URL)
```

Expected: `http://localhost:8080`
If `undefined` — the env var isn't being picked up. Restart the Vite dev server after any `.env.local` change.

---

### 2. Confirm the credential is a valid Google ID token

The `console.log("credential : ", credential)` already added in `login()` should output a string with **three dot-separated base64 segments**:

```
xxxxx.yyyyy.zzzzz
```

If it's empty, undefined, or malformed — the Google OAuth flow didn't complete successfully and the token is invalid before it even reaches the API.

---

### 3. Check for CORS preflight failure

Open **DevTools → Network tab**, filter by `/users/me`.

- If you see an **OPTIONS** request returning **401** — the Go backend is running the auth middleware **before** the CORS middleware. Auth should never run on preflight requests. Fix the middleware order on the backend.
- If you see the **GET/POST** request itself returning 401 — skip to step 4.

---

### 4. Backend JWT validation (most likely cause)

A 401 on the actual request means the backend received the token but rejected it. Common causes:

**Audience (`aud`) mismatch**
The backend validates the Google JWT `aud` claim against its configured Google Client ID. This must match `VITE_GOOGLE_CLIENT_ID` in `.env.local`:

```
VITE_GOOGLE_CLIENT_ID=531131087260-ukc34im00s87k4b8h0uv1nrl6rgp6nbn.apps.googleusercontent.com
```

Verify the backend is configured with the same client ID.

**Clock skew**
Google tokens have a short `exp` window. If the backend server clock is out of sync, the token will appear expired. Check that the Go server time is accurate.

---

## Files Involved

| File | Role |
|---|---|
| `src/api/users.ts` | `getMe` / `createMe` — sets the `Authorization` header |
| `src/context/AuthContext.tsx` | Calls `getMe ?? createMe`, stores token |
| `.env.local` | `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` |
