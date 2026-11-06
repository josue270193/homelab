import { notFound } from "next/navigation";
import { getDictionary } from "@/content/dictionaries";
import { hasLocale } from "@/content/i18n";
import { profile, projects, socials } from "@/content/profile";
import { LanguageSwitcher } from "../language-switcher";
import { LinkButton } from "../link-button";
import { ThemeToggle } from "../theme-toggle";

// Colors, radii and glow come from the design-system tokens in globals.css (#85).
// Every visible string comes from the locale's dictionary (#90).
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

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = getDictionary(lang);

  return (
    <>
      <a
        href="#main"
        className={`sr-only rounded-control bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:absolute focus:left-4 focus:top-4 ${focus}`}
      >
        {t.skipToContent}
      </a>

      <header className="relative mx-auto w-full max-w-3xl px-6 pt-20 pb-12 sm:pt-28">
        <div className="absolute right-6 top-6 flex items-center gap-2">
          <LanguageSwitcher current={lang} label={t.languageLabel} />
          <ThemeToggle labels={t.theme} />
        </div>
        <p className="font-mono text-sm text-primary">
          &gt; {t.greeting}<span aria-hidden="true" className="caret">_</span>
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{profile.name}</h1>
        <p className="mt-4 text-xl">{t.headline}</p>
        <p className="mt-1 text-muted">
          {t.studying} · {t.location}
        </p>
        <nav aria-label={t.sectionsLabel} className="mt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm">
            <li><a className={link} href="#about">{t.nav.about}</a></li>
            <li><a className={link} href="#projects">{t.nav.projects}</a></li>
            <li><a className={link} href="#contact">{t.nav.contact}</a></li>
          </ul>
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl flex-1 space-y-16 px-6 pb-20">
        <section id="about" aria-labelledby="about-title" className="scroll-mt-8">
          <SectionTitle id="about-title" index="01">{t.sections.about}</SectionTitle>
          {t.about.map((p) => (
            <p key={p} className="mt-4 leading-7 text-muted">{p}</p>
          ))}
        </section>

        <section id="projects" aria-labelledby="projects-title" className="scroll-mt-8">
          <SectionTitle id="projects-title" index="02">{t.sections.projects}</SectionTitle>
          <ul className="mt-6 space-y-6">
            {projects.map((project) => {
              const texts = t.projects[project.id];
              return (
                <li
                  key={project.id}
                  className="hud-corners rounded-card border border-border bg-surface p-6 transition-shadow duration-200 hover:shadow-glow"
                >
                  <article aria-labelledby={`project-${project.id}`}>
                    <h3 id={`project-${project.id}`} className="text-lg font-semibold">
                      {project.name}
                    </h3>
                    <p className="mt-2 leading-7 text-muted">{texts.description}</p>
                    <ul aria-label={t.technologies} className="mt-4 flex flex-wrap gap-2">
                      {project.tech.map((tech) => (
                        <li
                          key={tech}
                          className="rounded-control border border-border px-2.5 py-1 font-mono text-xs text-muted"
                        >
                          {tech}
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-5 flex flex-wrap gap-3">
                      <li>
                        <LinkButton
                          href={project.repo}
                          variant="primary"
                          size="sm"
                          icon="github"
                          srLabel={t.sourceCodeOf(project.name)}
                          newTabHint={t.opensInNewTab}
                        >
                          {t.sourceCode}
                        </LinkButton>
                      </li>
                      {project.demos?.map((demo) => (
                        <li key={demo.id}>
                          <LinkButton href={demo.href} size="sm" newTabHint={t.opensInNewTab}>
                            {t.live}: {texts.demos[demo.id]}
                          </LinkButton>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>

        <section id="contact" aria-labelledby="contact-title" className="scroll-mt-8">
          <SectionTitle id="contact-title" index="03">{t.sections.contact}</SectionTitle>
          <p className="mt-4 leading-7 text-muted">{t.contactIntro}</p>
          <ul className="mt-6 flex flex-wrap gap-4">
            {socials.map((s) => (
              <li key={s.label}>
                <LinkButton href={s.href} icon={s.icon} rel="me" newTabHint={t.opensInNewTab}>
                  {s.label}
                </LinkButton>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center font-mono text-xs text-muted">
        © {profile.name} ·{" "}
        <a className={link} href={projects[0].repo} target="_blank" rel="noopener noreferrer">
          {t.footer}<span className="sr-only"> {t.opensInNewTab}</span>
        </a>
      </footer>
    </>
  );
}
