// Placeholder until the real content lands (#74).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 py-32 text-center font-sans dark:bg-black">
      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Josue Lopez
      </h1>
      <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Portfolio coming soon.
      </p>
      <a
        className="font-medium text-zinc-950 underline underline-offset-4 dark:text-zinc-50"
        href="https://github.com/josue270193/homelab"
        target="_blank"
        rel="noopener noreferrer"
      >
        Meanwhile: the homelab this site runs on
      </a>
    </main>
  );
}
