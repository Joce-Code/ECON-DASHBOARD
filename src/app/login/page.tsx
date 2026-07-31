import { login, signup } from './actions'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#090d16]">
      <form className="w-full max-w-sm flex flex-col gap-4 bg-[#0f172a] border border-slate-800 p-8 rounded-xl shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-2">Focus Tracker</h1>
        
        {searchParams.error && (
          <div className="bg-red-900/50 border border-red-500 text-red-300 text-sm p-3 rounded">
            {searchParams.error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm text-slate-400" htmlFor="email">E-mail Corporativo</label>
          <input id="email" name="email" type="email" required className="bg-[#090d16] border border-slate-700 p-2 text-white rounded outline-none focus:border-blue-500 transition-colors" />
        </div>
        
        <div className="flex flex-col gap-1 mb-4">
          <label className="text-sm text-slate-400" htmlFor="password">Senha Segura</label>
          <input id="password" name="password" type="password" required className="bg-[#090d16] border border-slate-700 p-2 text-white rounded outline-none focus:border-blue-500 transition-colors" />
        </div>
        
        <button formAction={login} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors font-medium">Acessar Painel</button>
        <button formAction={signup} className="bg-transparent border border-slate-800 hover:bg-slate-800 text-slate-300 p-2 rounded transition-colors text-sm">Criar Conta</button>
      </form>
    </div>
  )
}
