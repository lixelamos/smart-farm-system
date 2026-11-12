"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container error-screen">
      <p className="eyebrow">SMART FARM · NAROK COUNTY</p>
      <h1>We couldn’t load this page.</h1>
      <p>The service may be temporarily unavailable. Please try again.</p>
      <button className="button button-primary" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
