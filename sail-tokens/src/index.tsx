// import types
import { TokenValue, Token, TokenMap, TokenGroup } from "./types";

import { ActionPanel, Detail, List, Action, showToast, Toast, Icon, Color, showHUD } from "@raycast/api";
import { useState } from "react";

import designTokens from "./tokens.json";

import beautify from "js-beautify";
import ColorJS from "colorjs.io";

// token input can be a string, number, or object
// we want to always return a string, without the quotation marks that come from JSON.stringify.
function formatTokenValue(token: Token, truncate?: boolean): string {
  const tokenValue = token.$value;
  switch (token.$type) {
    case "string":
      return tokenValue as string;

    case "dimension":
      return tokenValue as string;

    case "alias":
      return tokenValue as string;

    case "number":
      return tokenValue.toString();

    case "color":
      return tokenValue as string;

    case "fontWeight":
      return tokenValue.toString();

    case "shadow": {
      const stringValue = JSON.stringify(tokenValue);
      if (truncate && stringValue.length > 40) {
        return stringValue.substring(0, 40) + "...";
      } else {
        return beautify(stringValue);
      }
    }

    case "fontFamily": {
      const stringValue = JSON.stringify(tokenValue);
      if (truncate && stringValue.length > 40) {
        return stringValue.substring(0, 40) + "...";
      } else {
        return beautify(stringValue);
      }
    }

    case "typography": {
      const stringValue = JSON.stringify(tokenValue);
      if (truncate && stringValue.length > 40) {
        return stringValue.substring(0, 40) + "...";
      } else {
        return beautify(stringValue);
      }
    }

    default:
      return "Unknown Value";
  }
}

// Test to see if token value is an alias or not
function isTokenAlias(tokenValue: TokenValue): boolean {
  return typeof tokenValue === "string" && tokenValue.startsWith("{") && tokenValue.endsWith("}");
}

function resolveAlias(alias: TokenValue, tokens: TokenGroup): [Token, TokenValue[]] {
  const valuePath: TokenValue[] = [alias];
  let tokenValue = alias;
  let resolvedToken: Token = { $value: alias, $type: "string" };

  while (isTokenAlias(tokenValue)) {
    const tokenName = (tokenValue as string).substring(1, (tokenValue as string).length - 1); // removes brackets from alias name
    const tokenParts = tokenName.split(".");

    resolvedToken = tokenParts.reduce((acc: object, part: string) => (acc as TokenGroup)[part], tokens) as Token;
    tokenValue = resolvedToken.$value;

    valuePath.push(tokenValue);
  }
  // add the resolved token's name in its extensions
  const nextToLastValue = valuePath.at(-2) as string;
  resolvedToken.$extensions = {
    "com.stripe": {
      tokenName: (nextToLastValue.substring(1, nextToLastValue.length - 1))
    },
  };
  return [resolvedToken, valuePath];
}

function flattenTokens(tokenGroup: TokenGroup, parentKey = "", parentType = ""): TokenMap {
  let result: TokenMap = {};

  for (const key in tokenGroup) {
    if (!Object.prototype.hasOwnProperty.call(tokenGroup, key)) continue;
    let returnToken: Token | undefined;

    const fullKey = parentKey ? `${parentKey}.${key}` : key;
    const originalToken = tokenGroup[key];

    if (isTokenGroup(originalToken)) {
      // extract the root token's $value, $type, $description, and $extensions,
      // leaving the rest of the token object to be flattened
      const { $value, $type, $description, $extensions, ...rest } = originalToken;
      const tokenType = $type || parentType;
      // Add the root token if it exists
      if ($value) {
        returnToken = {
          $value: $value,
          $type: isTokenAlias($value) ? "alias" : tokenType,
          $description,
          $extensions,
        };
      }

      // Flatten the rest of the token object
      const flattenedTokens = flattenTokens(rest, fullKey, tokenType);
      result = { ...result, ...flattenedTokens };
    } else {
      // Check if it's an alias
      if (isTokenAlias(originalToken.$value)) {
        result[fullKey] = {
          $value: originalToken.$value,
          $type: "alias",
          $extensions: {
            "com.stripe": {
              tokenName: fullKey,
              resolvedToken: resolveAlias(originalToken.$value, designTokens)[0],
              valuePath: resolveAlias(originalToken.$value, designTokens)[1],
            },
          },
        };
      }
      // Check if it's a string or a number
      else if (typeof originalToken === "string" || typeof originalToken === "number") {
        returnToken = { $value: originalToken, $type: parentType };
      } else {
        // It's an object, so use the spread operator
        returnToken = {
          ...originalToken,
          $type: originalToken.$type || parentType,
        };
      }
    }

    if (returnToken && returnToken.$value) {
      if (!returnToken.$extensions) {
        returnToken.$extensions = {};
      }

      if (!returnToken.$extensions["com.stripe"]) {
        returnToken.$extensions["com.stripe"] = {};
      }

      returnToken.$extensions["com.stripe"].tokenName = fullKey;

      result[fullKey] = returnToken;
    }
  }
  return result;
}

// A token group is an object with at least one nested object that does not start with a "$"
function isTokenGroup(obj: unknown): obj is TokenGroup {
  return (
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).some((k) => !k.startsWith("$") && typeof (obj as TokenGroup)[k] === "object")
  );
}

function Command() {
  const [searchText, setSearchText] = useState<string>("");

  const tokens = flattenTokens(designTokens);

  // Convert object into an array of token objects
  const tokensArray: Token[] = Object.values(tokens) as Token[];

  // Apply search filter
  const filteredTokens = searchText
    ? tokensArray.filter((token) => {
        const tokenName = token.$extensions?.["com.stripe"]?.tokenName;
        return (tokenName as string).toLowerCase().includes(searchText.toLowerCase());
      })
    : tokensArray;

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search design tokens...">
      {filteredTokens.map((token) => {
        const tokenName = token.$extensions?.["com.stripe"]?.tokenName;
        let tokenIcon;
        switch (token.$type) {
          case "color":
            tokenIcon = {
              source: Icon.CircleFilled,
              tintColor: {
                light: token.$value.toString(),
                dark: token.$value.toString(),
                adjustContrast: false,
              },
            };
            break;
          case "string":
            tokenIcon = { source: Icon.Text };
            break;
          case "number":
            tokenIcon = { source: Icon.Hashtag };
            break;
          case "alias":
            tokenIcon = { source: Icon.AtSymbol };
            break;
          case "dimension":
            tokenIcon = { source: Icon.Ruler };
            break;
          case "shadow":
            tokenIcon = { source: Icon.Sun };
            break;
          case "fontFamily":
            tokenIcon = { source: Icon.Lowercase };
            break;
          case "fontWeight":
            tokenIcon = { source: Icon.Bold };
            break;
          case "duration":
            tokenIcon = { source: Icon.Clock };
            break;
          case "cubicBezier":
            tokenIcon = { source: Icon.LineChart };
            break;
          default:
            tokenIcon = { source: Icon.Text };
        }

        return (
          <List.Item
            key={tokenName}
            title={tokenName as string}
            accessories={[{ text: formatTokenValue(token, true) }]}
            icon={tokenIcon}
            actions={<TokenActionPanel token={token} isRootView={true} />}
          />
        );
      })}
    </List>
  );
}

function TokenDetail({ token }: { token: Token }) {
  const tokenName = token.$extensions?.["com.stripe"]?.tokenName;

  // Determine if the token type is one of the specific types
  const isSpecialType = ["shadow", "typography", "fontFamily"].includes(token.$type as string);
  let formattedValue = formatTokenValue(token, false);
  // Wrap the value in code fences if it's a special type
  if (isSpecialType) {
    formattedValue = `\`\`\`\n${formattedValue}\n\`\`\``;
  }

  // Conditionally build the section for alias token details
  let aliasDetails = "";
  if (token.$type === "alias" && token.$extensions?.["com.stripe"]) {
    const resolvedValue = formatTokenValue(token.$extensions["com.stripe"].resolvedToken as Token) || "N/A";
    const valuePath = token.$extensions["com.stripe"].valuePath?.join(" → ") || "N/A";

    aliasDetails = `
### Resolved Token Value

${resolvedValue}

### Resolution Path

${valuePath}
    `;
  }

  return (
    <Detail
      markdown={`
# ${tokenName}

### Value

${formattedValue}

### Type

${token.$type}

${aliasDetails}
      `}
      actions={<TokenActionPanel token={token} isRootView={false} />}
    />
  );
}

function TokenActionPanel({ token, isRootView }: { token: Token; isRootView: boolean }) {
  const colorActions =
    token.$type === "color" ? (
      <>
        <Action.CopyToClipboard
          title="Copy as HEX"
          content={new ColorJS(token.$value as string).to("sRGB").toString({ format: "hex" })}
        />
        <Action.CopyToClipboard
          title="Copy as RGB"
          content={new ColorJS(token.$value as string).to("sRGB").toString({ format: "rgb" })}
        />
        <Action.CopyToClipboard
          title="Copy as HSL"
          content={new ColorJS(token.$value as string).to("sRGB").toString({ format: "hsl" })}
        />
      </>
    ) : null;

  const detailAction = isRootView ? (
    <Action.Push title="See Details" target={<TokenDetail token={token} />} />
  ) : null;

  const aliasAction = token.$type === "alias" ? (
      <Action.Push title="Go to Resolved Token" target={<TokenDetail token={token.$extensions?.["com.stripe"]?.resolvedToken as Token} />} />
  ) : null;

  return (
    <ActionPanel>
      {detailAction}
      {aliasAction}
      {colorActions}
    </ActionPanel>
  );
}

export default Command;
