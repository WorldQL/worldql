import { load as loadEnv } from "@std/dotenv";
import { parseArgs } from "@std/cli";
import * as p from "@clack/prompts";
import { OpenAIWrapper } from "./src/llm/openai-wrapper.ts";
import { CLI } from "./src/cli.ts";
import type { Tool } from "./src/llm/types.ts";
import {
  buildToolRegistry,
  promptForInitialPrompt,
  promptForModel,
  promptForProvider,
  promptForTools,
  validateApiKey,
} from "./src/interactive-prompts.ts";
import { ALL_TOOLS } from "./src/tools/registry.ts";

// Load environment variables
await loadEnv({ envPath: ".env.local", export: true });
await loadEnv({ envPath: ".env", export: true });

// Parse CLI arguments
const args = parseArgs(Deno.args, {
  string: ["provider", "model", "base-url"],
  alias: {
    p: "provider",
    m: "model",
    b: "base-url",
  },
});

// Determine if interactive mode (no CLI args provided)
const useInteractive = !args.provider && !args.model;

let provider: string;
let model: string;
let selectedTools: Tool[];
let selectedPrompt: string | null = null;

if (useInteractive) {
  // Interactive mode with Clack prompts
  p.intro("WorldQL");

  provider = await promptForProvider();
  validateApiKey(provider);
  model = await promptForModel(provider);

  // Get default tools (matches Python DEFAULT_TOOLS)
  const defaultTools = ALL_TOOLS.filter((t) =>
    ["MovePlayer", "SpawnPlayer", "ObserveWorld"].includes(t.name)
  );
  selectedTools = await promptForTools(defaultTools);

  selectedPrompt = await promptForInitialPrompt();

  // Show configuration summary
  const toolsList = selectedTools.map((t) => t.name).join(", ");
  const promptInfo = selectedPrompt
    ? `\nPrompt: ${selectedPrompt.split("/").pop()}`
    : "";
  p.note(
    `Provider: ${provider}\nModel: ${model}\nTools: ${toolsList}${promptInfo}`,
    "Configuration"
  );

  console.log();
} else {
  // Non-interactive mode (CLI arguments)
  provider = args.provider || Deno.env.get("LLM_PROVIDER") || "openrouter";
  validateApiKey(provider);

  if (args.model) {
    model = args.model;
  } else if (provider === "openai") {
    model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";
  } else {
    model = Deno.env.get("OPENAI_MODEL") || "gpt-4o";
  }

  // Use default tools
  selectedTools = ALL_TOOLS.filter((t) =>
    ["MovePlayer", "SpawnPlayer", "ObserveWorld"].includes(t.name)
  );

  console.log(`\n✓ Using ${provider} with model: ${model}`);
  console.log(
    `✓ Enabled tools: ${selectedTools.map((t) => t.name).join(", ")}`
  );
  console.log();
}

// Get API key and base URL based on provider
let apiKey: string;
let baseURL: string;

if (provider === "openrouter") {
  apiKey =
    Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENAI_API_KEY") || "";
  baseURL =
    args["base-url"] ||
    Deno.env.get("OPENAI_BASE_URL") ||
    "https://openrouter.ai/api/v1";
} else if (provider === "openai") {
  apiKey = Deno.env.get("OPENAI_API_KEY") || "";
  baseURL =
    args["base-url"] ||
    Deno.env.get("OPENAI_BASE_URL") ||
    "https://api.openai.com/v1";
} else if (provider === "anthropic") {
  // Anthropic via OpenRouter (no native wrapper yet)
  apiKey =
    Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("OPENAI_API_KEY") || "";
  baseURL = args["base-url"] || "https://openrouter.ai/api/v1";
} else {
  console.error(
    `Error: Unknown provider '${provider}'. Use 'openai', 'openrouter', or 'anthropic'`
  );
  Deno.exit(1);
}

// Create LLM wrapper
const llm = new OpenAIWrapper(apiKey, model, baseURL);

// Build tool registry
const toolRegistry = buildToolRegistry(selectedTools);

// Create CLI with tools
const cli = new CLI(llm, selectedTools, toolRegistry);

// Load initial prompt if selected
if (selectedPrompt) {
  try {
    const content = await Deno.readTextFile(selectedPrompt);
    console.log(
      `\nLoaded ${content.length} characters from ${selectedPrompt}\n`
    );
    await cli.processInitialMessage(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`⚠️  Warning: Could not load prompt file: ${message}\n`);
  }
}

// Run interactive CLI
await cli.runInteractive();
