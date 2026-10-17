import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FEF9F0] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center text-5xl mb-4 shadow-inner">
        ⭐
      </div>
      <h1 className="text-3xl font-extrabold text-amber-900 mb-2">Oops! Page Not Found</h1>
      <p className="text-gray-600 mb-6 max-w-sm">
        Lumi couldn&apos;t find this star trail! Let&apos;s go back to learning English together.
      </p>
      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-bold shadow-md hover:shadow-lg transition-all"
      >
        🌟 Go Back Home
      </Link>
    </main>
  );
}
