import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowDown,
  MessagesSquare,
  ClipboardList,
  Check,
} from "lucide-react";
import { Brand } from "@/components/brand";
const communities = [
  {
    role: "farmer",
    title: "I'm a farmer",
    detail: "Produce, inputs, payments, and expert advice.",
  },
  {
    role: "agronomist",
    title: "I'm an agronomist",
    detail: "Stay close to farmers and share local knowledge.",
  },
  {
    role: "manager",
    title: "I'm a manager",
    detail: "Connect the people and operations behind the farm.",
  },
  {
    role: "admin",
    title: "I'm an administrator",
    detail: "Manage accounts, produce demand, and collection points.",
  },
];
export default function Home() {
  return (
    <div className="home-page">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="public-header container">
        <Brand />
        <nav className="public-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#workspaces">Your workspace</a>
        </nav>
        <Link className="button button-small button-outline" href="/login">
          Sign in <ArrowUpRight size={17} />
        </Link>
      </header>
      <main id="main">
        <section className="hero container">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="small-rule" />
              NAROK COUNTY · AGRICULTURE & COMMUNITY
            </p>
            <h1>
              Farming in Narok.
              <br />
              <em>Connected.</em>
            </h1>
            <p className="hero-description">
              A shared workspace for Narok’s farmers, agronomists, and farm
              teams. Find produce opportunities, access farm inputs, and keep
              your records in order.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/register">
                Register as a farmer <ArrowUpRight size={18} />
              </Link>
              <a className="text-link" href="#how-it-works">
                Take a closer look <ArrowDown size={14} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="seed-icon">N.</span>
              <p>
                Less time keeping track.
                <br />
                <strong>More time growing what matters.</strong>
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="map-topline">
              <span>
                <span className="status-dot" />
                THE NAROK LANDSCAPE
              </span>
              <span>FARMING COMMUNITY</span>
            </div>
            {/* Local SVG has fixed dimensions and no external requests. */}
            <Image
              unoptimized
              className="field-map"
              src="/images/field-map.svg"
              width={640}
              height={450}
              alt="An illustration of cultivated highland fields inspired by Narok"
            />
            <div className="map-caption">
              <span>From our highlands to your next harvest.</span>
              <ArrowUpRight size={14} />
            </div>
            <div className="field-note">
              <span className="note-icon">
                <ArrowUpRight size={20} />
              </span>
              <div>
                <span className="eyebrow">CULTIVATING LOCAL CONNECTIONS</span>
                <strong>Local knowledge. Shared opportunity.</strong>
                <span>Produce · Inputs · People · Payments</span>
              </div>
            </div>
          </div>
        </section>
        <section className="purpose-strip">
          <div className="container purpose-inner">
            <p>
              Farming services for
              <br />
              <strong>Narok County.</strong>
            </p>
            {["Farmers", "Agronomists", "Farm teams"].map((name, i) => (
              <span key={name}>
                <span>0{i + 1}</span>
                {name}
              </span>
            ))}
          </div>
        </section>
        <section className="workflow container" id="how-it-works">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                YOUR FARM. YOUR RECORDS. YOUR COMMUNITY.
              </p>
              <h2>
                Practical tools.
                <br />
                For the work on the ground.
              </h2>
            </div>
            <p>
              Keep the daily details in order, so you can focus on the work that
              makes a difference.
            </p>
          </div>
          <div className="workflow-grid">
            {[
              {
                icon: MessagesSquare,
                title: "A direct line to your people.",
                body: "Reach an agronomist, share a question, and stay informed with news from your sub-county.",
              },
              {
                icon: ClipboardList,
                title: "Make the most of your produce.",
                body: "See open demand, keep track of supplies, and explore the inputs and products you need.",
              },
              {
                icon: Check,
                title: "Know where things stand.",
                body: "Keep purchases, sales, and payment records together. Clear information for your next decision.",
              },
            ].map((item, i) => (
              <article key={item.title}>
                <span className="step-number">
                  0{i + 1} / {["CONNECT", "MANAGE", "KEEP TRACK"][i]}
                </span>
                <item.icon className="line-icon" size={28} aria-hidden="true" />
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                <Link href="/login">
                  Open your workspace <ArrowUpRight size={13} />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="workspaces-section" id="workspaces">
          <div className="container workspace-section-inner">
            <div className="workspace-intro">
              <p className="eyebrow">YOUR PART IN THE NAROK LANDSCAPE</p>
              <h2>
                Different roles.
                <br />
                Shared progress.
              </h2>
              <p>
                A dedicated workspace for everyone who helps the farm thrive.
                Choose yours to get started.
              </p>
            </div>
            <div className="role-list">
              {communities.map((item, i) => (
                <Link key={item.role} href={`/login?role=${item.role}`}>
                  <span className="role-index">0{i + 1}</span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.detail}</p>
                  </div>
                  <span className="role-arrow">
                    <ArrowUpRight size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="closing container">
          <span className="eyebrow">SERVING THE NAROK FARMING COMMUNITY</span>
          <h2>Your farm. Your county. Your next step.</h2>
          <Link className="button button-primary" href="/register">
            Create your farmer account <ArrowUpRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="site-footer container">
        <div>
          <Brand />
          <p>Agriculture, rooted in Narok.</p>
        </div>
        <div className="footer-links">
          <a href="#how-it-works">How it works</a>
          <a href="#workspaces">Workspaces</a>
          <Link href="/login">Sign in</Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Smart Farm</span>
          <span>
            Narok North · Narok East · Narok South · Narok West · Kilgoris ·
            Emurua Dikirr
          </span>
        </div>
      </footer>
    </div>
  );
}
