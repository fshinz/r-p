import { findByProps } from "@vendetta/metro";
import { findInReactTree } from "@vendetta/utils";
import { storage } from "@vendetta/plugin";
import { showToast } from "@vendetta/ui/toasts";
import { before as patchBefore } from "@vendetta/patcher";

const ContextMenu = findByProps("render", "ScrollView");

export function patchContextMenu() {
  return patchBefore("render", ContextMenu.View, (args) => {
    try {
      const tree = findInReactTree(args, (r) => r.key === ".$UserProfileOverflow");
      if (!tree || !tree.props || tree.props.sheetKey !== "UserProfileOverflow") return;
      
      const props = tree.props.content.props;
      
      if (props.options.some((opt: any) => 
        opt?.label === "Ignore User" || opt?.label === "Unignore User"
      )) return;

      const userId = Object.keys(tree._owner.stateNode._keyChildMapping)
        .find(str => tree._owner.stateNode._keyChildMapping[str] && str.match(/(?<=\$UserProfile)\d+/))
        ?.slice?.(".$UserProfile".length);

      if (!userId) return;

      const isIgnored = storage.ignore?.users?.includes(userId);
      const optionPosition = props.options.findLastIndex((opt: any) => opt.isDestructive);

      props.options.splice(optionPosition + 1, 0, {
        isDestructive: !isIgnored,
        label: isIgnored ? "Unignore User" : "Ignore User",
        onPress: () => {
          if (isIgnored) {
            storage.ignore.users = storage.ignore.users.filter((id: string) => id !== userId);
            showToast(`Unignored ${props.header.title}`);
          } else {
            storage.ignore.users.push(userId);
            showToast(`Ignoring ${props.header.title}`);
          }
          props.hideActionSheet();
        },
      });
    } catch (e) {
      console.error("[MessageLogger] Context menu error:", e);
    }
  });
}