import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X, Zap, Home, ShoppingBag, Package, Gift, HelpCircle } from 'lucide-react';

const NAV_LINKS = [
  { to: '/', label: 'Accueil', icon: Home },
  { to: '/recharger', label: 'Recharger', icon: Zap },
  { to: '/commandes', label: 'Mes commandes', icon: Package },
  { to: '/compte', label: 'Récompenses', icon: Gift },
  { to: '/aide', label: 'Aide', icon: HelpCircle },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-rose-100 bg-white/80 px-4 py-6 backdrop-blur-lg lg:flex">
      <Link to="/" className="mb-8 flex items-center gap-2 px-2">
        <div className="grid h-10 w-10 place-items-center rounded-2xl gradient-brand shadow-soft">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <div>
          <span className="block text-xl font-extrabold leading-none text-ink">Kolo</span>
          <span className="block text-xs text-rose-400">Recharge jeux</span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? 'gradient-brand text-white shadow-soft'
                    : 'text-ink/70 hover:bg-rose-50 hover:text-rose-600'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl bg-rose-50 p-4">
        <p className="text-sm font-semibold text-ink">Besoin d'aide ?</p>
        <a
          href="https://wa.me/22890000000"
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-rose-600"
        >
          WhatsApp support
        </a>
      </div>
    </aside>
  );
}

export function MobileBar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-4 py-3 glass lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand shadow-soft">
            <ShoppingBag className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-extrabold text-ink">Kolo</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="grid h-10 w-10 place-items-center rounded-xl bg-white shadow-soft"
        >
          <Menu className="h-5 w-5 text-ink" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col bg-white p-4 shadow-soft-lg animate-slide-in-left">
            <div className="mb-6 flex items-center justify-between">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand">
                  <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-extrabold text-ink">Kolo</span>
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50"
              >
                <X className="h-5 w-5 text-ink" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition-all ${
                        isActive
                          ? 'gradient-brand text-white shadow-soft'
                          : 'text-ink/70 hover:bg-rose-50'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-rose-100 bg-white/90 px-2 py-2 backdrop-blur-lg lg:hidden">
        {NAV_LINKS.slice(0, 4).map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  isActive ? 'text-rose-600' : 'text-ink/50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {link.label.split(' ')[0]}
            </NavLink>
          );
        })}
        <Link
          to="/recharger"
          className="flex items-center gap-1 rounded-2xl gradient-brand px-4 py-2 text-xs font-bold text-white shadow-soft"
        >
          <Zap className="h-4 w-4" />
          Recharger
        </Link>
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-rose-100 bg-white/60 px-4 py-10 lg:pl-72">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand">
              <ShoppingBag className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold text-ink">Kolo</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-ink/60">
            La façon la plus rapide de recharger tes jeux au Togo. Flooz, Mix by Yas, livraison en moins de 2 minutes.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">Liens</h4>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><Link to="/recharger" className="hover:text-rose-600">Recharger</Link></li>
            <li><Link to="/commandes" className="hover:text-rose-600">Mes commandes</Link></li>
            <li><Link to="/compte" className="hover:text-rose-600">Récompenses</Link></li>
            <li><Link to="/aide" className="hover:text-rose-600">Aide</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">À propos</h4>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><span className="hover:text-rose-600">Comment ça marche</span></li>
            <li><span className="hover:text-rose-600">Sécurité</span></li>
            <li><span className="hover:text-rose-600">Dépense responsable</span></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-ink">Contact</h4>
          <ul className="space-y-2 text-sm text-ink/60">
            <li><a href="https://wa.me/22890000000" className="hover:text-rose-600">WhatsApp</a></li>
            <li><a href="https://facebook.com" className="hover:text-rose-600">Facebook</a></li>
            <li><a href="https://t.me" className="hover:text-rose-600">Telegram</a></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-5xl text-center text-xs text-ink/40">
        © {new Date().getFullYear()} Kolo. Noms de jeux mentionnés à titre indicatif — aucune marque affiliée.
      </p>
    </footer>
  );
}
