import { profile, projects, socials } from "@/content/profile";
import { Icon } from "./icons";

// Colors, radii and glow come from the design-system tokens in globals.css (#85).
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const link = `rounded-sm underline underline-offset-4 decoration-primary/60 hover:text-primary ${focus}`;

function SectionTitle({ id, index, children }: { id: string; index: string; children: string }) {
  return (
    <h2 id={id} className="flex items-baseline gap-3 text-2xl font-semibold tracking-tight">
      <span aria-hidden="true" className="font-mono text-sm font-normal text-primary">
        {index}
      </span>
      {children}
    </h2>
  );
}

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className={`sr-only rounded-control bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 ${focus}`}
      >
        Skip to content
      </a>

      <header className="mx-auto w-full max-w-3xl px-6 pt-20 pb-12 sm:pt-28">
        <p className="font-mono text-sm text-primary">
          &gt; Hi, I&apos;m<span aria-hidden="true" className="caret">_</span>
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
        <p className="mt-4 text-xl">{profile.headline}</p>
        <p className="mt-1 text-muted">
          {profile.studying} · {profile.location}
        </p>
        <nav aria-label="Sections" className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
            <li><a className={link} href="#about">about</a></li>
            <li><a className={link} href="#projects">projects</a></li>
            <li><a className={link} href="#contact">contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-16 px-6 pb-20">
        <section id="about" aria-labelledby="about-title" className="scroll-mt-8">
          <SectionTitle id="about-title" index="01">About</SectionTitle>
          {profile.about.map((p) => (
            <p key={p} className="mt-4 leading-7 text-muted">{p}</p>
          ))}
        </section>

        <section id="projects" aria-labelledby="projects-title" className="scroll-mt-8">
          <SectionTitle id="projects-title" index="02">Projects</SectionTitle>
          <ul className="mt-6 space-y-6">
            {projects.map((project) => (
              <li
                key={project.name}
                className="hud-corners rounded-card border border-border bg-surface p-6 transition-shadow duration-200 hover:shadow-glow"
              >
                <article aria-labelledby={`project-${project.name}`}>
                  <h3 id={`project-${project.name}`} className="text-lg font-semibold">
                    {project.name}
                  </h3>
                  <p className="mt-2 leading-7 text-muted">{project.description}</p>
                  <ul aria-label="Technologies" className="mt-4 flex flex-wrap gap-2">
                    {project.tech.map((t) => (
                      <li
                        key={t}
                        className="rounded-control border border-border px-2.5 py-1 font-mono text-xs text-muted"
                      >
                        {t}
                      </li>
                    ))}
                  </ul>
                  <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
                    <li>
                      <a className={link} href={project.repo} target="_blank" rel="noopener noreferrer">
                        Source code<span className="sr-only"> of {project.name} (opens in a new tab)</span>
                      </a>
                    </li>
                    {project.demos?.map((demo) => (
                      <li key={demo.href}>
                        <a className={link} href={demo.href} target="_blank" rel="noopener noreferrer">
                          Live: {demo.label}<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </article>
              </li>
            ))}
          </ul>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-8">
          <SectionTitle id="contact-title" index="03">Contact</SectionTitle>
          <p className="mt-4 leading-7 text-muted">Want to work together or just say hi? Find me here:</p>
          <ul className="mt-6 flex flex-wrap gap-4">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  {...(s.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer me" })}
                  className={`inline-flex items-center gap-2 rounded-control border border-border bg-surface px-4 py-2 font-medium transition-[color,box-shadow] duration-200 hover:text-primary hover:shadow-glow ${focus}`}
                >
                  <Icon name={s.icon} />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center font-mono text-xs text-muted">
        © {profile.name} ·{" "}
        <a className={link} href={projects[0].repo} target="_blank" rel="noopener noreferrer">
          self-hosted on my homelab
        </a>
      </footer>
    </>
  );
}
