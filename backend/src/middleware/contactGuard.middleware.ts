import { Request, Response, NextFunction } from 'express'
import { detectContactInfo } from '../lib/contactFilter'

/**
 * Rejects requests that contain contact information in specified body fields.
 * Pass the field names to check as an array.
 */
export function contactGuard(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value: unknown = req.body?.[field]
      if (typeof value === 'string' && detectContactInfo(value)) {
        return res.status(422).json({
          error: 'Informações de contato direto detectadas',
          field,
          message:
            `O campo "${field}" contém telefone, e-mail ou redes sociais. ` +
            'A troca de contato fora da plataforma antes do aceite é proibida.',
        })
      }
    }
    next()
  }
}
