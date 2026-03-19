/**
 * Iugu Payment Service
 *
 * Runs in two modes:
 *  - SANDBOX (default): IUGU_API_KEY not set → simulates responses locally,
 *    no real money moves. Safe for development / MVP phase.
 *  - PRODUCTION: IUGU_API_KEY + IUGU_ACCOUNT_ID set → real Iugu API calls.
 *
 * To activate production:
 *   1. Create an Iugu Marketplace account (requires CNPJ)
 *   2. Set IUGU_API_KEY and IUGU_ACCOUNT_ID in your env
 *   3. Set IUGU_SANDBOX=false (or remove the var)
 */

import https from 'node:https'

const IUGU_API_KEY = process.env.IUGU_API_KEY ?? ''
const IUGU_ACCOUNT_ID = process.env.IUGU_ACCOUNT_ID ?? ''
const IUGU_SANDBOX = process.env.IUGU_SANDBOX !== 'false' // default: sandbox

const IUGU_BASE =
  IUGU_SANDBOX && !IUGU_API_KEY
    ? 'https://sandbox.iugu.com/v1'
    : 'https://api.iugu.com/v1'

const isSandboxMode = !IUGU_API_KEY

// ─── HTTP helper ──────────────────────────────────────────────────────────────

function iuguRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const encoded = Buffer.from(`${IUGU_API_KEY}:`).toString('base64')
    const payload = body ? JSON.stringify(body) : undefined

    const url = new URL(`${IUGU_BASE}${path}`)
    const options: https.RequestOptions = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        Authorization: `Basic ${encoded}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data)
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed?.errors?.join(', ') ?? `Iugu error ${res.statusCode}`))
          } else {
            resolve(parsed as T)
          }
        } catch {
          reject(new Error('Invalid JSON from Iugu'))
        }
      })
    })

    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IuguInvoice {
  id: string
  status: 'pending' | 'paid' | 'canceled' | 'refunded' | 'expired' | 'in_protest' | 'chargeback'
  secure_url: string   // Payment URL to show the client
  pix_qrcode?: string
  pix_qrcode_text?: string
  total: string        // e.g. "R$ 500,00"
}

export interface IuguTransfer {
  id: string
  amount_cents: number
  status: string
}

// ─── Sandbox helpers ──────────────────────────────────────────────────────────

function sandboxInvoiceId() {
  return `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function sandboxUrl(invoiceId: string, amount: number) {
  return `https://sandbox.iugu.com/invoices/${invoiceId}?amount=${amount}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a payment invoice for the given contract.
 * Returns the invoice ID and the URL the client should use to pay.
 */
export async function createInvoice(opts: {
  clientEmail: string
  clientName: string
  amountCents: number   // e.g. 50000 = R$ 500,00
  description: string
  dueDate: string       // YYYY-MM-DD
  contractId: string
}): Promise<{ invoiceId: string; invoiceUrl: string }> {
  if (isSandboxMode) {
    // Simulate: return a fake invoice immediately
    const invoiceId = sandboxInvoiceId()
    return {
      invoiceId,
      invoiceUrl: sandboxUrl(invoiceId, opts.amountCents),
    }
  }

  const invoice = await iuguRequest<IuguInvoice>('POST', '/invoices', {
    account_id: IUGU_ACCOUNT_ID,
    email: opts.clientEmail,
    due_date: opts.dueDate,
    ensure_workday_due_date: true,
    items: [
      {
        description: opts.description,
        quantity: 1,
        price_cents: opts.amountCents,
      },
    ],
    payer: {
      name: opts.clientName,
      email: opts.clientEmail,
    },
    custom_variables: [{ name: 'contract_id', value: opts.contractId }],
    payable_with: ['pix', 'credit_card', 'bank_slip'],
  })

  return {
    invoiceId: invoice.id,
    invoiceUrl: invoice.secure_url,
  }
}

/**
 * Fetch an invoice status from Iugu.
 * In sandbox mode returns a simulated 'paid' status.
 */
export async function getInvoice(invoiceId: string): Promise<IuguInvoice> {
  if (isSandboxMode || invoiceId.startsWith('sandbox_')) {
    return {
      id: invoiceId,
      status: 'paid',
      secure_url: sandboxUrl(invoiceId, 0),
      total: 'R$ 0,00',
    }
  }
  return iuguRequest<IuguInvoice>('GET', `/invoices/${invoiceId}`)
}

/**
 * Refund a paid invoice back to the client.
 * In sandbox mode, no-ops.
 */
export async function refundInvoice(invoiceId: string): Promise<void> {
  if (isSandboxMode || invoiceId.startsWith('sandbox_')) return
  await iuguRequest('POST', `/invoices/${invoiceId}/refund`)
}

/**
 * Transfer funds from the platform account to a lawyer's sub-account.
 * In sandbox mode, simulates success.
 *
 * @param receiverAccountId - Lawyer's Iugu sub-account ID
 * @param amountCents       - Amount to transfer (platform keeps its fee beforehand)
 */
export async function transferToLawyer(opts: {
  receiverAccountId: string
  amountCents: number
  description: string
}): Promise<{ transferId: string }> {
  if (isSandboxMode) {
    return { transferId: `sandbox_transfer_${Date.now()}` }
  }

  const result = await iuguRequest<IuguTransfer>('POST', '/transfers', {
    receiver_id: opts.receiverAccountId,
    amount_cents: opts.amountCents,
    description: opts.description,
  })

  return { transferId: result.id }
}

export { isSandboxMode }
