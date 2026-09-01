import { React } from "@vendetta/metro/common";
import { findByProps, findByStoreName } from "@vendetta/metro";
import { storage } from "@vendetta/plugin";
import { useProxy } from "@vendetta/storage";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { showToast } from "@vendetta/ui/toasts";
import { showConfirmationAlert } from "@vendetta/ui/alerts";
import { Forms } from "@vendetta/ui/components";

const { FormText, FormRow, FormSwitchRow, FormSection } = Forms;

const TableRowGroupComponent =
  findByProps("TableRowGroup")?.TableRowGroup ||
  findByProps("TableGroup")?.TableGroup ||
  FormSection;

const TableSwitchRowComponent =
  findByProps("TableSwitchRow")?.TableSwitchRow ||
  findByProps("TableRowExtra")?.TableSwitchRow ||
  FormSwitchRow;

const StackComponent =
  findByProps("Stack")?.Stack ||
  findByProps("TableRowGroup", "Stack")?.Stack ||
  (({ children }: any) => children);

const ScrollViewComponent =
  findByProps("ScrollView")?.ScrollView ||
  findByProps("TableScrollView")?.ScrollView ||
  require("react-native").ScrollView;

let UserStore: any;

export default function Settings() {
  UserStore ??= findByStoreName("UserStore");
  useProxy(storage);

  storage.ignore ??= { users: [], bots: false, ownMessages: false };
  storage.logEdits ??= true;
  storage.showToast ??= false;

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

  const TableRowGroup = TableRowGroupComponent;
  const TableSwitchRow = TableSwitchRowComponent;
  const Stack = StackComponent;
  const ScrollView = ScrollViewComponent;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 10 }}>
      <Stack spacing={8}>
        <TableRowGroup title="General Settings">
          <TableSwitchRow
            label="Log Edited Messages"
            subLabel="Track edit history and original message content"
            value={!!storage.logEdits}
            onValueChange={(v: boolean) => {
              storage.logEdits = v;
            }}
          />
          <TableSwitchRow
            label="Show Load Toast"
            subLabel="Display a toast notification when plugin is loaded"
            value={!!storage.showToast}
            onValueChange={(v: boolean) => {
              storage.showToast = v;
            }}
          />
        </TableRowGroup>

        <TableRowGroup title="Filters">
          <TableSwitchRow
            label="Ignore Bots"
            subLabel="Don't log messages from bots"
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

        <TableRowGroup title={`Ignored Users (${users.length})`}>
          {users.length > 0 && (
            <FormRow
              label="Clear Ignored List"
              subLabel="Remove all currently ignored users"
              trailing={<FormRow.Icon source={getAssetIDByName("ic_trash_24px")} />}
              onPress={handleClearUsers}
            />
          )}

          {users.length === 0 ? (
            <FormText style={{ padding: 16, opacity: 0.6 }}>
              No users are currently ignored.
            </FormText>
          ) : (
            users.map((id: string) => {
              const user = UserStore?.getUser(id);
              const name = user?.username ? `@${user.username}` : id;
              return (
                <FormRow
                  key={id}
                  label={name}
                  subLabel={`ID: ${id}`}
                  trailing={
                    <FormRow.Icon
                      source={getAssetIDByName("ic_close_24px")}
                      onPress={() => handleRemoveUser(id)}
                    />
                  }
                />
              );
            })
          )}
        </TableRowGroup>
      </Stack>
    </ScrollView>
  );
}
