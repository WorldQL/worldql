/**
 * Shared HTTP client for calling the game API.
 */

const GAME_API_BASE =
  "http://localhost:8001/api/v1/instance/00000000-0000-0000-0000-000000000000/call";

export interface GameAPIResponse {
  result?: unknown;
  error?: string;
}

/**
 * Call the game API with an identifier and parameters.
 *
 * @param identifier - The API method identifier (e.g., "spawn-player", "move-player")
 * @param params - Array of parameters to pass to the API method
 * @returns The JSON response from the API
 */
export async function callGameAPI(
  identifier: string,
  params: unknown[]
): Promise<GameAPIResponse> {
  const response = await fetch(GAME_API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, params }),
  });

  return await response.json();
}
