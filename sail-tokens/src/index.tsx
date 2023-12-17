import { ActionPanel, Detail, List, Action, showToast, Toast, Icon } from "@raycast/api";
import React, { useState } from "react";

import designTokens from "./tokens.json";

// token input can be a string, number, or object
// we want to always return a string, without the quotation marks that come from JSON.stringify.
function formatTokenValue(tokenValue) {
  if (typeof tokenValue === "string") {
    return tokenValue;
  }

  if (typeof tokenValue === "number") {
    return tokenValue.toString();
  }

  if (typeof tokenValue === "object") {
    // truncate the string if it's longer than 40 characters, and add an ellipsis
    const stringValue = JSON.stringify(tokenValue);
    return stringValue.length > 40 ? stringValue.substring(0, 40) + "..." : stringValue;
  }

  return "Unknown Value";
}

function Command() {
  const [searchText, setSearchText] = useState("");

  // Test to see if token value is an alias or not
  function isTokenAlias(tokenValue) {
    return typeof tokenValue === "string" && tokenValue.startsWith("{") && tokenValue.endsWith("}");
  }

  function resolveTokenValue(tokenValue, tokens) {
    const valuePath = [tokenValue];
    let resolvedToken;

    while (isTokenAlias(tokenValue)) {
      const tokenName = tokenValue.substring(1, tokenValue.length - 1);
      const tokenParts = tokenName.split(".");

      resolvedToken = tokens; // Start at the root of the tokens object
      for (const part of tokenParts) {
        resolvedToken = resolvedToken[part];
        if (!resolvedToken) {
          return { value: "Unknown Value", valuePath };
        }
      }

      tokenValue = resolvedToken.$value;
      valuePath.push(tokenValue); // Track the path of values
    }
    return {
      value: tokenValue,
      type: resolvedToken?.$type || "unknown", // Use the resolvedToken here
      valuePath,
    };
  }

  function flattenTokens(obj, parentKey = "", tokensRoot = obj) {
    let result = [];

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (typeof obj[key] === "object" && obj[key] !== null) {
        if (Object.prototype.hasOwnProperty.call(obj[key], "$value")) {
          const isAlias = isTokenAlias(obj[key].$value);
          let resolvedValueInfo;

          if (isAlias) {
            resolvedValueInfo = resolveTokenValue(obj[key].$value, tokensRoot);
          }

          result.push({
            name: fullKey,
            value: obj[key].$value,
            type: obj[key].$type || (isAlias ? "alias" : "unknown"),
            ...(isAlias && { resolvedValue: resolvedValueInfo }), // Include resolved value info for aliases
          });
        } else {
          const nestedObjects = flattenTokens(obj[key], fullKey, tokensRoot);
          result = result.concat(nestedObjects);
        }
      } else {
        result.push({ name: fullKey, value: obj[key] });
      }
    }
    return result;
  }

  const tokens = flattenTokens(designTokens);
  const filteredTokens = searchText
    ? tokens.filter((token) => token.name.toLowerCase().includes(searchText.toLowerCase()))
    : tokens;

  return (
    <List onSearchTextChange={setSearchText} searchBarPlaceholder="Search design tokens...">
      {filteredTokens.map((token) => (
        <List.Item
          key={token.name}
          title={token.name}
          accessories={[{ text: formatTokenValue(token.value) }]}
          icon={ token.type === "color" ? "type-color.svg" : Icon.Circle}
          detail={<TokenDetail token={token} />}
          actions={
            <ActionPanel>
              <Action.Push title="See Details" target={<TokenDetail token={token} />} />
              <Action.CopyToClipboard
                title="Copy Value"
                content={token.value}
                onCopy={() => showToast(Toast.Style.Success, "Copied to Clipboard")}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function TokenDetail(props) {
  const { token } = props;
  return (
    <Detail
      markdown={`
## Name

${token.name}

## Value

${formatTokenValue(token.value)}

## Type

${token.type}
      `}
    />
  );
}
export default Command;
