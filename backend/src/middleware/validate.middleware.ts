import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(422).json({ error: 'Dados inválidos', details: errors })
    }
    req[source] = result.data
    next()
  }
}

export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body')
}

export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query')
}
