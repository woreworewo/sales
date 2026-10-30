export default function Loading() {
  return (
    <main className="loading-shell" aria-busy="true" aria-label="Memuat workspace">
      <div className="skeleton skeleton-title" />
      <div className="stats">
        {[1, 2, 3].map((n) => (
          <div className="skeleton skeleton-stat" key={n} />
        ))}
      </div>
      {[1, 2, 3, 4].map((n) => (
        <div className="skeleton skeleton-row" key={n} />
      ))}
    </main>
  );
}
