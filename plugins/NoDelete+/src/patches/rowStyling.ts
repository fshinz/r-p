import { ReactNative } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";

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

    // Deleted
    if (deletedMessages.has(message.id)) {
      const info = deletedMessages.get(message.id);
      message.textColor = ReactNative.processColor("#E44043"); // red
      if (Array.isArray(message.content)) {
        message.content.push(textNode(" (deleted)"));
      } else {
        const oldContent = message.content || "";
        message.content = [textNode(oldContent), textNode(" (deleted)")];
      }
      if (info?.timestamp) {
        message.content.push(textNode(` *${info.timestamp}*`));
      }
      return;
    }

    // Edited
    if (editedMessages.has(message.id)) {
      const info = editedMessages.get(message.id);
      const editedColor = ReactNative.processColor("#949BA4");
      applyEditHistory(message, info, editedColor);
      return;
    }
  }

  // Try NativeModules.DCDChatManager.updateRows first
  const { NativeModules } = ReactNative;
  if (NativeModules?.DCDChatManager?.updateRows) {
    cleanups.push(
      before("updateRows", NativeModules.DCDChatManager, (args: any[]) => {
        try {
          const rows = JSON.parse(args[1]);
          for (const row of rows) handleRow(row);
          args[1] = JSON.stringify(rows);
        } catch {}
      })
    );
  } else {
    // Fallback: RowManager.prototype.generate
    const RowManager = findByProps("RowManager") || findByName("RowManager");
    if (RowManager?.prototype?.generate) {
      cleanups.push(
        after("generate", RowManager.prototype, (_args: any[], row: any) => {
          try {
            handleRow(row);
          } catch {}
        })
      );
    } else {
      console.warn(TAG, "No row patching method found – styling disabled.");
    }
  }

  return () => {
    for (const fn of cleanups) fn();
  };
}