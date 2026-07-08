import {
    hideSheet,
    showSheet
} from "@vendetta/api/ui/sheets";

import { findByProps } from "@vendetta/metro";

import {
    constants,
    ReactNative as RN
} from "@vendetta/metro/common";


import {
    ActionSheet,
    Text,
    TextInput
} from "@vendetta/metro/common/components";


import {
    useState
} from "react";


import {
    ScrollView,
    View
} from "react-native";


import {
    GuildStore,
    PermissionsStore
} from "../../modules";


import AddToServerRow
from "../components/AddToServerRow";



const {
    ActionSheetCloseButton
} =
findByProps(
    "ActionSheetCloseButton"
);



const {
    TableRowGroup
}
=
findByProps(
    "TableRow"
);



function AddToServerContent(
    {
        emoji
    }:{
        emoji:any
    }
){


    const [emojiName,setEmojiName] =
        useState(
            emoji.name ??
            "emoji"
        );


    const guilds =
        Object.values(
            GuildStore?.getGuilds?.()
            ??
            {}
        )
        .filter(
            (guild:any)=>
                PermissionsStore?.can(
                    constants.Permissions
                    .CREATE_GUILD_EXPRESSIONS,
                    guild
                )
        );



    return (

        <ActionSheet>


            <ScrollView>


                <View
                    style={{
                        flexDirection:"row",
                        alignItems:"center",
                        padding:16
                    }}
                >

                    <RN.Image

                        source={{
                            uri:emoji.src
                        }}

                        style={{
                            width:32,
                            height:32
                        }}

                    />


                    <Text
                        variant="heading-md/semibold"
                        style={{
                            flex:1,
                            textAlign:"center"
                        }}
                    >
                        Add Emoji
                    </Text>


                    <ActionSheetCloseButton

                        onPress={()=>
                            hideSheet(
                                "AddToServerActionSheet"
                            )
                        }

                    />

                </View>



                <View
                    style={{
                        padding:16
                    }}
                >

                    <TextInput

                        value={emojiName}

                        onChange={setEmojiName}

                        placeholder="Emoji name"

                    />

                </View>



                <TableRowGroup>

                    {
                        guilds.map(
                            (guild:any)=>(

                                <AddToServerRow

                                    key={guild.id}

                                    guild={guild}

                                    emoji={emoji}

                                    emojiName={emojiName}

                                />

                            )
                        )
                    }

                </TableRowGroup>



            </ScrollView>


        </ActionSheet>

    );

}



export function showAddToServerActionSheet(
    emoji:any
){

    showSheet(
        "AddToServerActionSheet",
        AddToServerContent,
        {
            emoji
        }
    );

}