import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Remonter en haut"
      className="fixed bottom-24 right-4 z-40 grid h-12 w-12 place-items-center rounded-full bg-white shadow-soft-lg transition-transform hover:scale-110 active:scale-95 lg:bottom-6 lg:right-6"
    >
      <ArrowUp className="h-5 w-5 text-rose-500" />
    </button>
  );
}
