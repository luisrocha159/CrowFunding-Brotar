/** Estado HTTP, o cero cuando no hay una respuesta válida de la API. */
export class SessionError extends Error {
  constructor(readonly status: number) { super('No se pudo completar la operación de sesión.') }
}
