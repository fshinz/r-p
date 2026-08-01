import { findByTypeName, findByProps } from '@revenge-mod/metro'
import { React } from '@revenge-mod/metro/common'
import { instead } from '@vendetta/patcher'
import { storage } from '@vendetta/plugin'
import { getAssetIDByName } from '@vendetta/ui/assets'
import { showToast } from '@vendetta/ui/toasts'
import { findInReactTree } from '@vendetta/utils'

export let updateInviteEmbed = () => {}

export default function patchInviteEmbed() {
    // Find the InviteEmbed component
    const InviteEmbed = findByTypeName('InviteEmbed')
    
    if (!InviteEmbed) {
        console.warn('[InviteEmbedButton] Could not find InviteEmbed component')
        return () => {}
    }

    // Try to find button components
    const ButtonComponent = findByProps('Button')?.Button || findByTypeName('Button')
    const ActionRow = findByTypeName('ActionRow') || findByProps('ActionRow')

    // Icon for the button
    const CustomButtonIcon = getAssetIDByName('PlusIcon') || getAssetIDByName('ic_plus_24px')

    return instead('type', InviteEmbed, (args, OriginalRender) => {
        const [, forceUpdate] = React.useReducer((x: number) => ~x, 0)
        updateInviteEmbed = () => forceUpdate()

        const res = OriginalRender(...args)
        
        if (!res?.props?.children) return res

        // Find where the "Join Server" button lives
        const buttonContainer = findInReactTree(
            res,
            (x) => {
                if (!x?.props?.children) return false
                const children = Array.isArray(x.props.children) ? x.props.children : [x.props.children]
                return children.some((child: any) => 
                    child?.props?.label === "Join Server" ||
                    child?.props?.text === "Join Server" ||
                    child?.props?.children?.includes?.("Join")
                )
            }
        )

        if (buttonContainer && storage.showCustomButton !== false) {
            const children = Array.isArray(buttonContainer.props.children) 
                ? buttonContainer.props.children 
                : [buttonContainer.props.children]

            // Check if button already exists
            const alreadyExists = children.some((c: any) => c?.props?.label === "My Custom Button")
            
            if (!alreadyExists) {
                const customButton = React.createElement(
                    ButtonComponent || ActionRow || 'Button',
                    {
                        label: "My Button",
                        text: "My Button",
                        icon: CustomButtonIcon,
                        onPress: () => {
                            showToast("Custom button pressed!", getAssetIDByName("toast_copy_link"))
                        },
                        style: { marginLeft: 8 }
                    }
                )

                if (Array.isArray(buttonContainer.props.children)) {
                    buttonContainer.props.children.push(customButton)
                } else {
                    buttonContainer.props.children = [buttonContainer.props.children, customButton]
                }
            }
        }

        return res
    })
}