import { after } from "@vendetta/patcher";
import { findByName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";

const NAMES = ["UserProfileOverflowMenu", "BotUserProfileOverflowMenu"];

function getMainItems(ret: any): any[] | null {
    let items = ret?.props?.items;
    if (Array.isArray(items) && Array.isArray(items[0])) return items[0];
    items = ret?.props?.children?.props?.items;
    if (Array.isArray(items) && Array.isArray(items[0])) return items[0];
    return null;
}

function patchFn(args: any[], ret: any) {
    try {
        const props = args[0] ?? {};
        const userId = props.user?.id;
        if (!userId) return;
        
        const items = getMainItems(ret);
        if (!items) return;
        
        if (items.some((i: any) => i?.label === "Ignore User" || i?.label === "Unignore User")) return;
        
        const isIgnored = storage.ignore?.users?.includes(userId);
        const insertIndex = items.findIndex((i: any) => i?.isDestructive);
        const index = insertIndex === -1 ? items.length : insertIndex;
        
        items.splice(index, 0, {
            label: isIgnored ? "Unignore User" : "Ignore User",
            isDestructive: !isIgnored,
            action: () => {
                if (isIgnored) {
                    storage.ignore.users = storage.ignore.users.filter((id: string) => id !== userId);
                    showToast(`Unignored ${props.user?.username || "user"}`);
                } else {
                    if (!storage.ignore.users) storage.ignore.users = [];
                    storage.ignore.users.push(userId);
                    showToast(`Ignoring ${props.user?.username || "user"}`);
                }
            }
        });
    } catch (e) {
        console.error("[MessageLogger] Context menu error:", e);
    }
}

export function patchContextMenu() {
    const unpatches: (() => void)[] = [];

    for (const name of NAMES) {
        const mod = findByName(name, false);
        if (mod) unpatches.push(after("default", mod, patchFn));
    }

    return () => { for (const fn of unpatches) fn(); };
}