import { ReactNative } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";
import { waitFor } from "@shared/lib/waitFor";
import { rawFind } from "@shared/lib/rawFind";
import { resolveSemanticColorSafe } from "@shared/lib/color";

const TAG = "[MessageLogger]";

function textNode(text: string) {
  return { content: text, type: "text" };
}

function editedTagNode(processedColor: any) {
  return {
    type: "link",
    target: "usernameOnClick",
    context: {
      username: 1,
      usernameOnClick: {
        action: "0",
        userId: "0",
        linkColor: processedColor,
        messageChannelId: "0",
      },
      medium: true,
    },
    content: [textNode(" (edited)")],
  };
}

function applyEditHistory(message: any, history: { oldContent: string; newContent: string; timestamp: string }, editedColor: any) {
  if (message.__loggerEditApplied) return;
  message.__loggerEditApplied = true;

  const currentContent: any[] = Array.isArray(message.content) ? message.content : [textNode(String(message.content ?? ""))];
  const nodes: any[] = [];
  // Show old content with (edited) tag
  nodes.push(textNode(history.oldContent || "(empty)"));
  nodes.push(editedTagNode(editedColor));
  nodes.push(textNode("\n↓\n"));
  nodes.push(textNode(history.newContent || "(empty)"));
  nodes.push(editedTagNode(editedColor));
  nodes.push(textNode(`\n*${history.timestamp}*`));
  message.content = nodes;
}

export function patchRowStyling(deletedMessages: Map<string, any>, editedMessages: Map<string, any>) {
  const cleanups: (() => void)[] = [];

  function handleRow(row: any) {
    const message = row?.message;
    if (!message?.id) return;

    // Check if this message was deleted
    if (deletedMessages.has(message.id)) {
      const info = deletedMessages.get(message.id);
      // Replace content with a red style – we'll set textColor and append a deletion note
      // We can either change the text color or add a prefix. Here we set textColor.
      message.textColor = ReactNative.processColor("#E44043"); // red
      // Also add a small "(deleted)" tag at the end of content
      if (Array.isArray(message.content)) {
        message.content.push(textNode(" (deleted)"));
      } else {
        // If it's a plain string, convert to array
        const oldContent = message.content || "";
        message.content = [textNode(oldContent), textNode(" (deleted)")];
      }
      // Add timestamp
      if (info?.timestamp) {
        message.content.push(textNode(` *${info.timestamp}*`));
      }
      return;
    }

    // Check if this message was edited
    if (editedMessages.has(message.id)) {
      const info = editedMessages.get(message.id);
      const editedColor = ReactNative.processColor(resolveSemanticColorSafe(["TEXT_MUTED"], "#949BA4"));
      applyEditHistory(message, info, editedColor);
      return;
    }
  }

  // Find the updateRows method
  const isNativeUpdateRows = (m: any) =>
    typeof m?.updateRows === "function" && m.updateRows.toString().includes("[native code]");

  const immediate = rawFind<any>(isNativeUpdateRows);
  if (immediate) {
    cleanups.push(
      before("updateRows", immediate, (args: any[]) => {
        try {
          const rows = JSON.parse(args[1]);
          for (const row of rows) handleRow(row);
          args[1] = JSON.stringify(rows);
        } catch {
          // fail silently
        }
      })
    );
  } else {
    // Fallback: wait for the module
    const handle = waitFor(
      () => rawFind<any>(isNativeUpdateRows),
      (target) => {
        cleanups.push(
          before("updateRows", target, (args: any[]) => {
            try {
              const rows = JSON.parse(args[1]);
              for (const row of rows) handleRow(row);
              args[1] = JSON.stringify(rows);
            } catch {}
          })
        );
      }
    );
    cleanups.push(() => handle.cancel());
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}