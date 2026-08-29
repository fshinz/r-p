import { ReactNative } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";

const TAG = "[MessageLogger]";

function textNode(text: string) {
  return { content: text, type: "text" };
}

function coloredTag(text: string, hexColor: string) {
  return {
    type: "link",
    target: "usernameOnClick",
    context: {
      username: 1,
      usernameOnClick: {
        action: "0",
        userId: "0",
        linkColor: ReactNative.processColor(hexColor),
        messageChannelId: "0",
      },
      medium: true,
    },
    content: [textNode(text)],
  };
}

function flattenEmbedToNodes(embed: any): any[] {
  const nodes: any[] = [];
  if (!embed) return nodes;

  nodes.push(coloredTag("▌ Embed (deleted)\n", "#da373c"));

  const title = embed.rawTitle ?? embed.title;
  if (title) nodes.push(textNode(`${title}\n`));

  const description = embed.rawDescription ?? embed.description;
  if (description) nodes.push(textNode(`${description}\n`));

  if (Array.isArray(embed.fields)) {
    for (const field of embed.fields) {
      const name = field.rawName ?? field.name;
      const value = field.rawValue ?? field.value;
      if (name || value) nodes.push(textNode(`${name ?? ""}: ${value ?? ""}\n`));
    }
  }

  if (embed.image?.url) nodes.push(textNode(`[image] ${embed.image.url}\n`));
  if (embed.thumbnail?.url) nodes.push(textNode(`[thumbnail] ${embed.thumbnail.url}\n`));

  return nodes;
}

function buildDeletedEmbedBlock(embeds: any[]): any[] {
  const nodes: any[] = [];
  for (const embed of embeds) {
    nodes.push(...flattenEmbedToNodes(embed));
    nodes.push(textNode("\n"));
  }
  return nodes;
}

function handleRow(row: any, deletedEmbedMap: Map<string, any[]>) {
  const message = row?.message;
  if (!message?.id) return;

  const embeds = deletedEmbedMap.get(message.id);
  if (!embeds?.length) return;
  if (message.__loggerEmbedApplied) return;
  message.__loggerEmbedApplied = true;

  const currentContent: any[] = Array.isArray(message.content)
    ? message.content
    : [textNode(String(message.content ?? ""))];

  message.content = [...currentContent, textNode("\n"), ...buildDeletedEmbedBlock(embeds)];
}

export function patchEmbedFallback(deletedEmbedMap: Map<string, any[]>) {
  const cleanups: (() => void)[] = [];

  const { NativeModules } = ReactNative;
  if (NativeModules?.DCDChatManager?.updateRows) {
    cleanups.push(
      before("updateRows", NativeModules.DCDChatManager, (args: any[]) => {
        if (!deletedEmbedMap.size) return;
        try {
          const rows = JSON.parse(args[1]);
          for (const row of rows) handleRow(row, deletedEmbedMap);
          args[1] = JSON.stringify(rows);
        } catch {}
      })
    );
  } else {
    const RowManager = findByProps("RowManager") || findByName("RowManager");
    if (RowManager?.prototype?.generate) {
      cleanups.push(
        after("generate", RowManager.prototype, (_args: any[], row: any) => {
          try { handleRow(row, deletedEmbedMap); } catch {}
        })
      );
    } else {
      console.warn(TAG, "Embed fallback row styling unavailable");
    }
  }

  return () => { for (const fn of cleanups) fn(); };
}