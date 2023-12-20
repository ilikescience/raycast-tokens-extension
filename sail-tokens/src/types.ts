export type TokenValue = string | number | object;

export interface Token {
  $value: TokenValue;
  $type?: string;
  $description?: string;
  $extensions?: {
    [key: string]: unknown;
  };
}

export interface TokenMap {
  [key: string]: Token | TokenGroup; // Token or nested TokenGroup
}

// TokenGroup is a Token and a TokenMap
export type TokenGroup = Token & TokenMap;