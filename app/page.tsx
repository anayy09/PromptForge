import { ForgeWorkbench } from "@/components/ForgeWorkbench";

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Improve your prompt</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Describe what you want the AI to do and PromptForge rewrites it into a clear, effective
          prompt you can paste into any assistant. It improves your prompt; it does not answer it.
        </p>
      </div>
      <ForgeWorkbench />
    </div>
  );
}
