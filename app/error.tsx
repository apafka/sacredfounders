"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="eyebrow">Sacred Founders</p>
      <h1>The gate stuck</h1>
      <p className="lede">{error.message || "Something failed while opening Dragon World."}</p>
      <button className="btn-primary mt-6" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
