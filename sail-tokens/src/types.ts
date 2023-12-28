export type TokenValue = string | number | object;

export interface Token {
  $value: TokenValue;
  $type?: string;
  $description?: string;
  $extensions?: {
    "com.stripe"?: {
      "tokenName"?: string,
      "valuePath"?: TokenValue[],
      "resolvedToken"?: Token
    },
    [key: string]: unknown;
  };
}

// Represents the structure of a token group, without the index signature
export interface TokenGroupBase {
  $value?: TokenValue;
  $type?: string;
  $description?: string;
  $extensions?: {
    "com.stripe"?: {
      "tokenName"?: string,
      "valuePath"?: [],
      "resolvedToken"?: Token
    },
    [key: string]: unknown;
  };
}

// Represents the index signature for nested tokens or token groups
export interface TokenMap {
  [key: string]: Token | TokenGroup;
}

// TokenGroup is an intersection of TokenGroupBase and NestedTokenMap
export type TokenGroup = TokenGroupBase & TokenMap;