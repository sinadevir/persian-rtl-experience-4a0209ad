/**
 * Generated Swagger types mark optional fields as `T | null`; with `exactOptionalPropertyTypes` the form helpers'
 * `undefined` would not fit. `Loose` also accepts `undefined` (JSON.stringify drops it, which the API treats as absent).
 */
export type Loose<T> = T extends (infer U)[] ? Loose<U>[] : T extends object ? { [K in keyof T]?: Loose<T[K]> | undefined } : T;
export type LooseSchemas<S> = { [K in keyof S]: Loose<S[K]> };
