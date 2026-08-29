import React from "react";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";

// Metro component lookups
const find = (prop: string): any => findByProps(prop)?.[prop];
const TableFamily: any = findByProps("TableRowGroup", "Stack");

const TableRowGroup: any = TableFamily?.TableRowGroup;
const TableRow: any = find("TableRow");
const TableRowIcon: any = find("TableRowIcon");
const TableSwitchRow: any = find("TableSwitchRow");
const Stack: any = TableFamily?.Stack;
const ScrollView: any = find("ScrollView");

let UserStore: any;

export default function Settings() {
  UserStore ??= findByStoreName("UserStore");
  useProxy(storage);

  storage.ignore ??= { users: [], bots: false, ownMessages: false };
  const [users, setUsers] = React.useState<string[]>(storage.ignore.users || []);

  const handleRemoveUser = (userId: string) => {
    const newArr = users.filter((id: string) => id !== userId);
    storage.ignore.users = newArr;
    setUsers(newArr);
    showToast("User removed from ignore list", getAssetIDByName("Check"));
  };

  const handleClearUsers = () => {
    if (users.length === 0) return;
    showConfirmationAlert({
      title: "Clear Ignored Users",
      content: `Remove all ${users.length} users from ignore list?`,
      confirmText: "Clear",
      cancelText: "Cancel",
      onConfirm: () => {
        storage.ignore.users = [];
        setUsers([]);
        showToast("Cleared all ignored users", getAssetIDByName("Check"));
      },
    });
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
      <Stack spacing={12}>
        <TableRowGroup title="Filters">
          <TableSwitchRow
            label="Ignore Bots"
            subLabel="Don't log messages sent by bot accounts"
            value={!!storage.ignore.bots}
            onValueChange={(v: boolean) => {
              storage.ignore.bots = v;
            }}
          />
          <TableSwitchRow
            label="Ignore My Own Messages"
            subLabel="Don't log deletions or edits of your own messages"
            value={!!storage.ignore.ownMessages}
            onValueChange={(v: boolean) => {
              storage.ignore.ownMessages = v;
            }}
          />
        </TableRowGroup>

        <TableRowGroup title="Ignored Users">
          <TableRow
            label="Clear All Ignored Users"
            subLabel={`${users.length} user${users.length === 1 ? "" : "s"} ignored`}
            icon={<TableRowIcon source={getAssetIDByName("ic_trash_24px")} />}
            onPress={handleClearUsers}
          />

          {users.map((id: string) => {
            const user = UserStore?.getUser(id);
            const name = user?.username ? `@${user.username}` : `User ID: ${id}`;
            return (
              <TableRow
                key={id}
                label={name}
                icon={<TableRowIcon source={getAssetIDByName("ic_close_24px")} />}
                onPress={() => handleRemoveUser(id)}
              />
            );
          })}
        </TableRowGroup>
      </Stack>
    </ScrollView>
  );
}
