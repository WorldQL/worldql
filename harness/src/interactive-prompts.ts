import * as p from "@clack/prompts";
import type { Tool, ToolHandler } from "./llm/types.ts";
import { ALL_TOOLS, ALL_TOOL_HANDLERS } from "./tools/registry.ts";

/**
 * Model choices per provider
 */
const MODEL_CHOICES = {
  openai: [
    { value: "gpt-5.2", label: "GPT 5.2" },
    { value: "__CUSTOM__", label: "Custom..." },
  ],
  openrouter: [
    { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
    { value: "openai/gpt-5.2", label: "GPT 5.2" },
    { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro" },
    { value: "google/gemini-2.0-flash-exp", label: "Gemini 2.0 Flash" },
    { value: "__CUSTOM__", label: "Custom..." },
  ],
};

/**
 * Default tool names (matches Python DEFAULT_TOOLS)
 */
const DEFAULT_TOOL_NAMES = ["MovePlayer", "SpawnPlayer", "ObserveWorld"];

/**
 * Prompt user to select a provider
 */
export async function promptForProvider(): Promise<string> {
  const provider = await p.select({
    message: "Select a provider:",
    options: [
      { value: "openrouter", label: "OpenRouter" },

      { value: "openai", label: "OpenAI-compatible (Local supported)" },
    ],
  });

  if (p.isCancel(provider)) {
    p.cancel("Operation cancelled.");
    Deno.exit(0);
  }

  return provider as string;
}

/**
 * Prompt user to select or enter a model name
 */
export async function promptForModel(provider: string): Promise<string> {
  const choices =
    MODEL_CHOICES[provider as keyof typeof MODEL_CHOICES] ||
    MODEL_CHOICES.openrouter;

  const model = await p.select({
    message: "Select a model:",
    options: choices,
  });

  if (p.isCancel(model)) {
    p.cancel("Operation cancelled.");
    Deno.exit(0);
  }

  if (model === "__CUSTOM__") {
    const customModel = await p.text({
      message: "Enter model name:",
      placeholder: "e.g., gpt-4o-mini",
    });

    if (p.isCancel(customModel)) {
      p.cancel("Operation cancelled.");
      Deno.exit(0);
    }

    if (!customModel || !customModel.trim()) {
      console.log(`\nNo model entered. Using default for ${provider}`);
      if (provider === "anthropic") {
        return "claude-sonnet-4-5-20250929";
      } else if (provider === "openai") {
        return "gpt-4o";
      } else {
        return "anthropic/claude-sonnet-4-5";
      }
    }

    return customModel.trim();
  }

  return model as string;
}

/**
 * Prompt user to select tools via checkbox interface
 */
export async function promptForTools(defaultTools?: Tool[]): Promise<Tool[]> {
  const defaultNames = new Set(
    defaultTools?.map((t) => t.name) || DEFAULT_TOOL_NAMES
  );

  const options = ALL_TOOLS.map((tool) => {
    let description = tool.description || "No description";
    if (description.length > 80) {
      description = description.slice(0, 77) + "...";
    }

    return {
      value: tool.name,
      label: `${tool.name}: ${description}`,
      hint: defaultNames.has(tool.name) ? "default" : undefined,
    };
  });

  const selectedNames = await p.multiselect({
    message: "Select tools to enable (Space to toggle, Enter to confirm):",
    options,
    initialValues: Array.from(defaultNames),
  });

  if (p.isCancel(selectedNames)) {
    p.cancel("Operation cancelled.");
    Deno.exit(0);
  }

  if (!selectedNames || selectedNames.length === 0) {
    console.log(
      "\n⚠️  Warning: No tools selected. The assistant will have limited capabilities."
    );
    const proceed = await p.confirm({
      message: "Continue anyway?",
      initialValue: false,
    });

    if (p.isCancel(proceed)) {
      p.cancel("Operation cancelled.");
      Deno.exit(0);
    }

    if (!proceed) {
      console.log("Please select at least one tool.");
      return promptForTools(defaultTools);
    }
  }

  return ALL_TOOLS.filter((t) => (selectedNames as string[]).includes(t.name));
}

/**
 * Prompt user to select an initial prompt file from the prompts directory
 */
export async function promptForInitialPrompt(): Promise<string | null> {
  const promptsDir = "./prompts";

  try {
    // Check if prompts directory exists
    const dirInfo = await Deno.stat(promptsDir);
    if (!dirInfo.isDirectory) {
      console.log(
        `\n⚠️  '${promptsDir}' is not a directory. Skipping prompt selection.`
      );
      return null;
    }
  } catch {
    console.log(
      `\n⚠️  Prompts directory '${promptsDir}' not found. Skipping prompt selection.`
    );
    return null;
  }

  // Find all .txt files
  const promptFiles: string[] = [];
  for await (const entry of Deno.readDir(promptsDir)) {
    if (entry.isFile && entry.name.endsWith(".txt")) {
      promptFiles.push(`${promptsDir}/${entry.name}`);
    }
  }

  if (promptFiles.length === 0) {
    console.log(
      `\n⚠️  No .txt files found in '${promptsDir}' directory. Skipping prompt selection.`
    );
    return null;
  }

  // Sort files alphabetically
  promptFiles.sort();

  const options = promptFiles.map((path) => {
    const name = path.split("/").pop()?.replace(".txt", "") || path;
    return { value: path, label: name };
  });

  options.push({ value: "__SKIP__", label: "Skip (no initial prompt)" });

  const selected = await p.select({
    message: "Select an initial prompt (or skip):",
    options,
  });

  if (p.isCancel(selected) || selected === "__SKIP__") {
    return null;
  }

  return selected as string;
}

/**
 * Validate that the required API key exists for the provider
 */
export function validateApiKey(provider: string): void {
  let key: string | undefined;
  let keyName: string;

  if (provider === "anthropic") {
    key = Deno.env.get("ANTHROPIC_API_KEY");
    keyName = "ANTHROPIC_API_KEY";
  } else if (provider === "openrouter") {
    key = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENAI_API_KEY");
    keyName = "OPENROUTER_API_KEY";
  } else if (provider === "openai") {
    key = Deno.env.get("OPENAI_API_KEY");
    keyName = "OPENAI_API_KEY";
  } else {
    return;
  }

  if (!key) {
    p.cancel(`❌ ERROR: ${keyName} not found in environment`);
    console.log(`Please add to .env.local: ${keyName}=your-key-here`);
    Deno.exit(1);
  }
}

/**
 * Build tool registry mapping names to handlers for selected tools
 */
export function buildToolRegistry(
  selectedTools: Tool[]
): Record<string, ToolHandler> {
  const selectedNames = selectedTools.map((t) => t.name);
  const registry: Record<string, ToolHandler> = {};

  for (const [name, handler] of Object.entries(ALL_TOOL_HANDLERS)) {
    if (selectedNames.includes(name)) {
      registry[name] = handler;
    }
  }

  return registry;
}
