import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container error-screen">
      <h1>That page isn’t here.</h1>
      <p>Return to your farming community.</p>
      <Link className="button button-primary" href="/">
        Back to home
      </Link>
    </main>
  );
}
