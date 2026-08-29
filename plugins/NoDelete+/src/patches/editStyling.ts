import { ReactNative } from "@vendetta/metro/common";
import { before, after } from "@vendetta/patcher";
import { findByProps, findByName } from "@vendetta/metro";

const TAG = "[MessageLogger]";

function textNode(text: string) {
  return { content: text, type: "text" };
}

function editedTagNode() {
  return {
    type: "link",
    target: "edited",
    context: {
      username: 1,
      usernameOnClick: {
        action: "0",
        userId: "0",
        linkColor: ReactNative.processColor("#949BA4"),
        messageChannelId: "0",
      },
      medium: true,
    },
    content: [textNode(" (edited)")],
  };
}

export function patchEditStyling(editMap: Map<string, { oldContent: string; newContent: string }>) {
  const cleanups: (() => void)[] = [];

  function handleRow(row: any) {
    const message = row?.message;
    if (!message?.id) return;

    const edit = editMap.get(message.id);
    if (!edit) return;
    if (message.__loggerEditApplied) return;
    message.__loggerEditApplied = true;

    const nodes: any[] = [];
    nodes.push(textNode(edit.oldContent || "(empty)"));
    nodes.push(editedTagNode());
    nodes.push(textNode("\n↓\n"));
    nodes.push(textNode(edit.newContent || "(empty)"));
    nodes.push(editedTagNode());
    // No timestamp – as requested
    message.content = nodes;
  }

  // Try DCDChatManager first
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
    // Fallback: RowManager
    const RowManager = findByProps("RowManager") || findByName("RowManager");
    if (RowManager?.prototype?.generate) {
      cleanups.push(
        after("generate", RowManager.prototype, (_args: any[], row: any) => {
          try { handleRow(row); } catch {}
        })
      );
    } else {
      console.warn(TAG, "Row styling unavailable");
    }
  }

  return () => { for (const fn of cleanups) fn(); };
}