import { ReactNative } from "@vendetta/metro/common";
import { before } from "@vendetta/patcher";

export function patchRowStyling(deletedIds: Set<string>, editMap: Map<string, string[]>) {
    const { NativeModules } = ReactNative;
    const DCDChatManager = NativeModules?.DCDChatManager;
    const cleanups: (() => void)[] = [];

    if (!DCDChatManager?.updateRows) return () => {};

    cleanups.push(
        before("updateRows", DCDChatManager, (args: any[]) => {
            if (!deletedIds.size && !editMap.size) return;
            
            try {
                const rows = JSON.parse(args[1]);
                
                // Resolve colors once per batch to prevent lag
                const deletedBgColor = ReactNative.processColor("#da373c22");
                const deletedGutterColor = ReactNative.processColor("#da373cff");

                for (const row of rows) {
                    const message = row?.message;
                    if (!message?.id) continue;

                    // If the message ID is in our deleted Set, apply native red highlight safely
                    if (deletedIds.has(message.id)) {
                        message.edited = "deleted"; // Triggers native Discord (deleted) tag
                        row.backgroundHighlight = {
                            backgroundColor: deletedBgColor,
                            gutterColor: deletedGutterColor
                        };
                    }
                }
                
                args[1] = JSON.stringify(rows);
            } catch (e) {
                // Failsafe: let UI render normally if parse fails
            }
        })
    );
    
    return () => cleanups.forEach(c => c());
}
