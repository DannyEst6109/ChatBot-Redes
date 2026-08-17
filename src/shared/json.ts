export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export class ValidationError extends Error {
  constructor(message: string, readonly field?: string) {
    super(field ? `${field}: ${message}` : message)
    this.name = 'ValidationError'
  }
}

export function optionalString(
  object: Record<string, unknown>,
  field: string,
): string | undefined {
  const value = object[field]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('must be a non-empty string', field)
  }
  return value.trim()
}

export function requiredString(object: Record<string, unknown>, field: string): string {
  const value = optionalString(object, field)
  if (value === undefined) throw new ValidationError('is required', field)
  return value
}

export function optionalBoolean(
  object: Record<string, unknown>,
  field: string,
): boolean | undefined {
  const value = object[field]
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new ValidationError('must be a boolean', field)
  return value
}

export function optionalInteger(
  object: Record<string, unknown>,
  field: string,
  minimum: number,
  maximum: number,
): number | undefined {
  const value = object[field]
  if (value === undefined) return undefined
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ValidationError(`must be an integer between ${minimum} and ${maximum}`, field)
  }
  return value as number
}

export function optionalStringArray(
  object: Record<string, unknown>,
  field: string,
): string[] | undefined {
  const value = object[field]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ValidationError('must be an array of strings', field)
  }
  return value.map((entry) => entry.trim()).filter(Boolean)
}

export function ensureNoUnknownFields(
  object: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const unknown = Object.keys(object).filter((key) => !allowed.includes(key))
  if (unknown.length > 0) throw new ValidationError(`unknown fields: ${unknown.join(', ')}`)
}

export function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue
}

