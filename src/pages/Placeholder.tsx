import { Link } from 'react-router-dom';
import { ArrowLeft, Construction } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  subtitle: string;
}

export function Placeholder({ title, subtitle }: PlaceholderProps) {
  return (
    <div className="lg:pl-64">
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-20 text-center lg:pt-0">
        <div className="grid h-20 w-20 place-items-center rounded-3xl bg-rose-50 shadow-soft">
          <Construction className="h-10 w-10 text-rose-500" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold text-ink">{title}</h1>
        <p className="mt-2 max-w-sm text-ink/50">{subtitle}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-brand px-6 py-3 text-sm font-extrabold text-white shadow-soft transition-transform hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
