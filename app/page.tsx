import { ForgeWorkbench } from "@/components/ForgeWorkbench";

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-ink">
            Forge a prompt
          </h1>
          <p className="mt-0.5 text-xs text-muted">
            Rough in, sharp out. PromptForge rewrites your prompt for the target model. It does
            not answer it.
          </p>
        </div>
      </div>
      <ForgeWorkbench />
    </div>
  );
}
