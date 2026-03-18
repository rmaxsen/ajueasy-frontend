import { Link } from 'react-router-dom'
import { Scale } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 font-bold text-lg text-primary mb-3">
              <Scale className="h-5 w-5" />
              <span>Ajueasy</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Conectando clientes e advogados de forma simples, segura e transparente.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Plataforma</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/buscar" className="hover:text-foreground">Buscar Advogados</Link></li>
              <li><Link to="/marketplace" className="hover:text-foreground">Publicar Demanda</Link></li>
              <li><Link to="/correspondentes" className="hover:text-foreground">Correspondentes</Link></li>
              <li><Link to="/feed" className="hover:text-foreground">Feed Jurídico</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Para Advogados</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/cadastro?role=lawyer" className="hover:text-foreground">Cadastrar-se</Link></li>
              <li><Link to="/planos" className="hover:text-foreground">Planos e Preços</Link></li>
              <li><Link to="/como-funciona" className="hover:text-foreground">Como Funciona</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3 text-sm">Institucional</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
              <li><Link to="/termos" className="hover:text-foreground">Termos de Uso</Link></li>
              <li><Link to="/privacidade" className="hover:text-foreground">Política de Privacidade</Link></li>
              <li><Link to="/seguranca" className="hover:text-foreground">Confiança e Segurança</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2024 Ajueasy. Todos os direitos reservados.</p>
          <p>Plataforma de intermediação jurídica — não prestamos serviços advocatícios.</p>
        </div>
      </div>
    </footer>
  )
}
