import { profile, projects, socials } from "@/content/profile";
import { Icon } from "./icons";

const link =
  "rounded-sm underline underline-offset-4 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:hover:text-teal-300";

export default function Home() {
  return (
    <>
      <a
        href="#main"
        className="sr-only rounded bg-teal-700 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="mx-auto w-full max-w-3xl px-6 pt-20 pb-12 sm:pt-28">
        <p className="font-mono text-sm text-teal-700 dark:text-teal-300">Hi, I&apos;m</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
        <p className="mt-4 text-xl text-zinc-700 dark:text-zinc-300">{profile.headline}</p>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {profile.studying} · {profile.location}
        </p>
        <nav aria-label="Sections" className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
            <li><a className={link} href="#about">About</a></li>
            <li><a className={link} href="#projects">Projects</a></li>
            <li><a className={link} href="#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-16 px-6 pb-20">
        <section id="about" aria-labelledby="about-title" className="scroll-mt-8">
          <h2 id="about-title" className="text-2xl font-semibold tracking-tight">About</h2>
          {profile.about.map((p) => (
            <p key={p} className="mt-4 leading-7 text-zinc-700 dark:text-zinc-300">{p}</p>
          ))}
        </section>

        <section id="projects" aria-labelledby="projects-title" className="scroll-mt-8">
          <h2 id="projects-title" className="text-2xl font-semibold tracking-tight">Projects</h2>
          <ul className="mt-6 space-y-6">
            {projects.map((project) => (
              <li
                key={project.name}
                className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800"
              >
                <article aria-labelledby={`project-${project.name}`}>
                  <h3 id={`project-${project.name}`} className="text-lg font-semibold">
                    {project.name}
                  </h3>
                  <p className="mt-2 leading-7 text-zinc-700 dark:text-zinc-300">{project.description}</p>
                  <ul aria-label="Technologies" className="mt-4 flex flex-wrap gap-2">
                    {project.tech.map((t) => (
                      <li
                        key={t}
                        className="rounded-full bg-zinc-100 px-3 py-1 font-mono text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
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
          <h2 id="contact-title" className="text-2xl font-semibold tracking-tight">Contact</h2>
          <p className="mt-4 leading-7 text-zinc-700 dark:text-zinc-300">
            Want to work together or just say hi? Find me here:
          </p>
          <ul className="mt-6 flex flex-wrap gap-4">
            {socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  {...(s.href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer me" })}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:border-teal-600 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-zinc-700 dark:hover:text-teal-300"
                >
                  <Icon name={s.icon} />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        © {profile.name} ·{" "}
        <a className={link} href={projects[0].repo} target="_blank" rel="noopener noreferrer">
          Self-hosted on my homelab
        </a>
      </footer>
    </>
  );
}
