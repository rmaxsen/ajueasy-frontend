import { Outlet, Link } from 'react-router-dom'
import { Scale } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Lado esquerdo — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col justify-center items-center p-12 text-white">
        <div className="max-w-sm text-center">
          <Scale className="h-16 w-16 mx-auto mb-6 opacity-90" />
          <h1 className="text-4xl font-bold mb-4">Ajueasy</h1>
          <p className="text-lg text-white/80">
            Assessoria jurídica fácil, segura e transparente para todos.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 text-center">
            {[
              { n: '5.000+', l: 'Advogados' },
              { n: '98%', l: 'Satisfação' },
              { n: '12.000+', l: 'Casos resolvidos' },
            ].map((s) => (
              <div key={s.l}>
                <div className="text-2xl font-bold">{s.n}</div>
                <div className="text-sm text-white/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lado direito — form */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-12 bg-background">
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden text-primary font-bold text-xl">
          <Scale className="h-6 w-6" />
          Ajueasy
        </Link>
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
