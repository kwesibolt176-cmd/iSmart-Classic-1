import * as jose from 'jsr:@panva/jose@6'

console.log('main function started')

const JWT_SECRET = Deno.env.get('JWT_SECRET')
const SUPABASE_JWKS = parseJwks(Deno.env.get('SUPABASE_JWKS'))
const VERIFY_JWT = Deno.env.get('VERIFY_JWT') === 'true'

// Keep the reconciliation credential inside the edge-runtime process. Operators
// can supply a dedicated value. Otherwise derive a domain-separated credential
// from the existing server-only service-role key. Edge Runtime workers prohibit
// Deno.env.set(), so both this dispatcher and the worker derive the same value
// without mutating the container environment or exposing it externally.
async function reconciliationSecret() {
  const configured = Deno.env.get('MERCHANT_RECONCILIATION_SECRET')
  if (configured) return configured

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for reconciliation scheduling')
  }

  const source = new TextEncoder().encode(`merchant-reconciliation:v1:${serviceRoleKey}`)
  const digest = await crypto.subtle.digest('SHA-256', source)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

const RECONCILIATION_SECRET = await reconciliationSecret()

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000
const RECONCILIATION_INITIAL_DELAY_MS = 30 * 1000
let reconciliationRunning = false

// NOTE:(kallebysantos) We don't check for valid keys but just the bare array parsing,
// let this for 'jose' lib verification
export function parseJwks(raw: string | undefined): jose.JSONWebKeySet | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.keys && Array.isArray(parsed.keys)) {
      return parsed as jose.JSONWebKeySet
    }
    return null
  } catch {
    return null
  }
}

/**
 * Extract JWT token from Authorization header
 *
 * Parses the Authorization header to extract the Bearer token.
 * Expects format: "Bearer <token>"
 *
 * @param req - The HTTP request object
 * @returns The JWT token string
 * @throws Error if Authorization header is missing or malformed
 */
function getAuthToken(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    throw new Error('Missing authorization header')
  }
  const [bearer, token] = authHeader.split(' ')
  if (bearer !== 'Bearer') {
    throw new Error(`Auth header is not 'Bearer {token}'`)
  }
  return token
}

async function isValidLegacyJWT(jwt: string): Promise<boolean> {
  if (!JWT_SECRET) {
    console.error('JWT_SECRET not available for HS256 token verification')
    return false
  }

  const encoder = new TextEncoder();
  const secretKey = encoder.encode(JWT_SECRET);

  try {
    await jose.jwtVerify(jwt, secretKey);
  } catch (e) {
    console.error('Symmetric Legacy JWT verification error', e);
    return false;
  }
  return true;
}

async function isValidJWT(jwt: string): Promise<boolean> {
  if (!SUPABASE_JWKS) {
    console.error('JWKS not available for ES256/RS256 token verification')
    return false
  }

  try {
    const localJwks = jose.createLocalJWKSet(SUPABASE_JWKS);
    await jose.jwtVerify(jwt, localJwks);
  } catch (e) {
    console.error('Asymmetric JWT verification error', e);
    return false
  }

  return true;
}

/**
 * Verify JWT token, handling both legacy (HS256) and newer (ES256/RS256) algorithms
 * 
 * This function automatically detects the algorithm used in the token and applies
 * the appropriate verification method:
 * - HS256: Uses JWT_SECRET (symmetric key)
 * - ES256/RS256: Uses JWKS endpoint (asymmetric public keys)
 * 
 * This fix ensures compatibility with both legacy tokens and newer asymmetric tokens,
 * resolving the "Key for the ES256 algorithm must be of type CryptoKey" error.
 * 
 * @param jwt - The JWT token string to verify
 * @returns Promise resolving to true if verification succeeds, false otherwise
 */
async function isValidHybridJWT(jwt: string): Promise<boolean> {
  const { alg: jwtAlgorithm } = jose.decodeProtectedHeader(jwt)

  if (jwtAlgorithm === 'HS256') {
    console.log(`Legacy token type detected, attempting ${jwtAlgorithm} verification.`)

    return await isValidLegacyJWT(jwt)
  }

  if (jwtAlgorithm === 'ES256' || jwtAlgorithm === 'RS256') {
    return await isValidJWT(jwt)
  }

  return false;
}

async function invokeWorker(serviceName: string, req: Request) {
  const servicePath = `/home/deno/functions/${serviceName}`
  console.error(`serving the request with ${servicePath}`)

  const memoryLimitMb = 150
  const workerTimeoutMs = 1 * 60 * 1000
  const noModuleCache = false
  const importMapPath = null
  const envVarsObj = Deno.env.toObject()
  const envVars = Object.keys(envVarsObj).map((k) => [k, envVarsObj[k]])

  const worker = await EdgeRuntime.userWorkers.create({
    servicePath,
    memoryLimitMb,
    workerTimeoutMs,
    noModuleCache,
    importMapPath,
    envVars,
  })
  return await worker.fetch(req)
}

async function runReconciliation() {
  if (reconciliationRunning) {
    console.warn('merchant reconciliation skipped because the previous run is still active')
    return
  }

  reconciliationRunning = true
  try {
    // Re-enter through the local HTTP listener so Edge Runtime attaches the
    // internal request metadata required by UserWorker.fetch(). Directly
    // constructing a Request and passing it to a worker is unsupported.
    const response = await fetch(
      'http://127.0.0.1:9000/reconcile-merchant-transactions',
      {
        method: 'POST',
        headers: { 'X-Reconciliation-Secret': RECONCILIATION_SECRET },
      },
    )
    if (!response.ok) {
      console.error(`merchant reconciliation failed with status ${response.status}`)
    } else {
      console.log('merchant reconciliation completed')
    }
  } catch (error) {
    console.error('merchant reconciliation failed', error)
  } finally {
    reconciliationRunning = false
  }
}

setTimeout(() => {
  void runReconciliation()
  setInterval(() => void runReconciliation(), RECONCILIATION_INTERVAL_MS)
}, RECONCILIATION_INITIAL_DELAY_MS)

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const { pathname } = url
  const path_parts = pathname.split('/')
  const service_name = path_parts[1]
  const isReconciliationRequest = service_name === 'reconcile-merchant-transactions' &&
    req.headers.has('X-Reconciliation-Secret')

  if (
    req.method !== 'OPTIONS' &&
    VERIFY_JWT &&
    !isReconciliationRequest
  ) {
    try {
      const token = getAuthToken(req)
      const isValidJWT = await isValidHybridJWT(token);

      if (!isValidJWT) {
        return new Response(JSON.stringify({ msg: 'Invalid JWT' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    } catch (e) {
      console.error(e)
      return new Response(JSON.stringify({ msg: e.toString() }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  if (!service_name || service_name === '') {
    const error = { msg: 'missing function name in request' }
    return new Response(JSON.stringify(error), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    return await invokeWorker(service_name, req)
  } catch (e) {
    const error = { msg: e.toString() }
    return new Response(JSON.stringify(error), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
