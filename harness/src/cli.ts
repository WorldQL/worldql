import type {
  Message,
  MessageContent,
  Tool,
  ToolHandler,
  ToolResultContent,
} from "./llm/types.ts";
import type { LLMWrapper } from "./llm/wrapper.ts";

/**
 * CLI class that manages the interactive REPL and conversation with the LLM.
 */
export class CLI {
  private messages: Message[] = [];

  constructor(
    private llm: LLMWrapper,
    private tools: Tool[],
    private toolRegistry: Record<string, ToolHandler>,
  ) {}

  /**
   * Run the interactive CLI session.
   */
  async runInteractive(): Promise<void> {
    console.log(
      "Type 'quit' to exit, '/new' for new conversation, '/load <filename>' to load a file, or '/tools' to reconfigure tools",
    );

    const decoder = new TextDecoder();
    const buffer = new Uint8Array(1024);

    while (true) {
      try {
        // Write prompt
        await Deno.stdout.write(new TextEncoder().encode("> "));

        // Read input
        const n = await Deno.stdin.read(buffer);
        if (n === null) break;

        const input = decoder.decode(buffer.subarray(0, n)).trim();

        if (input === "quit" || input === "exit") {
          break;
        }

        if (input) {
          await this.processMessage(input);
        }
      } catch (error) {
        if (error instanceof Deno.errors.Interrupted) {
          console.log("\nGoodbye!");
          break;
        }
        throw error;
      }
    }
  }

  /**
   * Process a user message through the LLM.
   */
  private async processMessage(message: string): Promise<void> {
    // Handle slash commands
    if (message.startsWith("/")) {
      await this.handleCommand(message);
      return;
    }

    // Add user message to history
    this.messages.push({
      role: "user",
      content: [
        {
          type: "text",
          text: message,
        },
      ],
    });

    console.log();

    // Stream response
    const encoder = new TextEncoder();
    for await (const text of this.llm.streamMessages(this.messages, {
      maxTokens: 10000,
      tools: this.tools,
    })) {
      await Deno.stdout.write(encoder.encode(text));
    }

    // Get final message and add to history
    const final = this.llm.getFinalMessage();
    this.messages.push(final);

    // Handle tool calls
    await this.handleToolCalls(final);
  }

  /**
   * Handle slash commands.
   */
  private async handleCommand(command: string): Promise<void> {
    const parts = command.trim().split(/\s+/, 2);
    const cmd = parts[0].toLowerCase();

    if (cmd === "/new") {
      this.messages = [];
      console.log("Started new conversation");
    } else if (cmd === "/load") {
      if (parts.length < 2) {
        console.log("Usage: /load <filename>");
        return;
      }
      await this.loadFile(parts[1]);
    } else if (cmd === "/tools") {
      await this.reconfigureTools();
    } else {
      console.log(`Unknown command: ${command}`);
    }
  }

  /**
   * Load a file from the current path and use its contents as a prompt.
   */
  private async loadFile(filename: string): Promise<void> {
    try {
      const content = await Deno.readTextFile(filename);
      console.log(`Loaded ${content.length} characters from ${filename}`);
      await this.processMessage(content);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log(`Error: File '${filename}' not found`);
      } else {
        console.log(`Error reading file: ${error}`);
      }
    }
  }

  /**
   * Handle any tool calls in the final message.
   */
  private async handleToolCalls(finalMessage: Message): Promise<void> {
    if (typeof finalMessage.content === "string") {
      return;
    }

    const toolResults: ToolResultContent[] = [];

    for (const contentBlock of finalMessage.content) {
      if (contentBlock.type === "tool_use") {
        const handler = this.toolRegistry[contentBlock.name];

        if (handler) {
          const result = await handler(contentBlock.input);
          console.log(result);
          toolResults.push({
            type: "tool_result",
            tool_use_id: contentBlock.id,
            content: result,
          });
        } else {
          console.log(`Unknown tool: ${contentBlock.name}`);
        }
      }
    }

    if (toolResults.length > 0) {
      this.messages.push({
        role: "user",
        content: toolResults,
      });
      await this.processToolResponse();
    }
  }

  /**
   * Process the response after tool execution.
   */
  private async processToolResponse(): Promise<void> {
    console.log();

    const encoder = new TextEncoder();
    for await (const text of this.llm.streamMessages(this.messages, {
      maxTokens: 4096,
      tools: this.tools,
    })) {
      await Deno.stdout.write(encoder.encode(text));
    }

    console.log();
    const final = this.llm.getFinalMessage();
    this.messages.push(final);

    // Recursively handle additional tool calls
    await this.handleToolCalls(final);
  }

  /**
   * Reconfigure tools during the session.
   */
  private async reconfigureTools(): Promise<void> {
    const { promptForTools, buildToolRegistry } = await import(
      "./interactive-prompts.ts"
    );

    this.tools = await promptForTools(this.tools);
    this.toolRegistry = buildToolRegistry(this.tools);

    console.log(
      `\n✓ Updated tools: ${this.tools.map((t) => t.name).join(", ")}\n`,
    );
  }

  /**
   * Process an initial message before entering the interactive loop.
   * Useful for loading initial prompts.
   */
  async processInitialMessage(message: string): Promise<void> {
    await this.processMessage(message);
  }
}
