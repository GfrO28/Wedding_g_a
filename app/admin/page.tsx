import { loginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin">) {
  const params = await searchParams;
  const hasError = params?.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="font-serif text-2xl text-neutral-800">Panel de boda</h1>
        <p className="text-sm text-neutral-500">
          Acceso privado para los novios.
        </p>
        <input
          type="password"
          name="password"
          placeholder="Contraseña"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {hasError && (
          <p className="text-sm text-red-600">Contraseña incorrecta.</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
