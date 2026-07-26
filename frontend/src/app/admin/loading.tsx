export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-gray-200" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="mt-3 h-7 w-28 rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="mt-8 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
