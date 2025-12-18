let modelName = "Puppet";

export function setModelName(name: string): void {
  modelName = name;
}

export function getModelName(): string {
  return modelName;
}

export function extractShortModelName(model: string): string {
  const modelLower = model.toLowerCase();

  if (modelLower.includes("gpt-4o")) {
    return "GPT4o";
  } else if (modelLower.includes("gpt-4")) {
    return "GPT4";
  } else if (modelLower.includes("gpt-3.5") || modelLower.includes("gpt-35")) {
    return "GPT35";
  } else if (modelLower.includes("o1") || modelLower.includes("o3")) {
    return modelLower.includes("o1") ? "O1" : "O3";
  } else if (modelLower.includes("claude")) {
    if (modelLower.includes("opus")) {
      return "Opus";
    } else if (modelLower.includes("sonnet")) {
      return "Sonnet";
    } else if (modelLower.includes("haiku")) {
      return "Haiku";
    } else {
      return "Claude";
    }
  } else if (modelLower.includes("gemini")) {
    if (modelLower.includes("flash")) {
      return "GeminiFlash";
    } else if (modelLower.includes("pro")) {
      return "Gemini Pro 3";
    } else {
      return "Gemini";
    }
  } else if (modelLower.includes("llama")) {
    return "Llama";
  } else if (modelLower.includes("mistral")) {
    return "Mistral";
  } else if (modelLower.includes("deepseek")) {
    return "DeepSeek";
  } else {
    const parts = model.split("/");
    const lastPart = parts[parts.length - 1];
    const firstWord = lastPart.split("-")[0];
    return (
      firstWord.substring(0, 10).charAt(0).toUpperCase() +
      firstWord.substring(1, 10)
    );
  }
}
