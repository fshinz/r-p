(function(h,f,s,n,b,l,c,I,A,R){"use strict";const{FormText:D,FormSection:$,FormRow:u}=I.Forms;let S;function _(){S??=f.findByStoreName("UserStore"),A.useProxy(n.storage),n.storage.ignore??={users:[],bots:!1};const[r,e]=s.React.useState(n.storage.ignore.users||[]),t=function(a){const i=r.filter(function(y){return y!==a});n.storage.ignore.users=i,e(i),c.showToast("User removed from ignore list",l.getAssetIDByName("Check"))},o=function(){R.showConfirmationAlert({title:"Clear Ignored Users",content:`Remove all ${r.length} users from ignore list?`,confirmText:"Clear",cancelText:"Cancel",onConfirm:function(){n.storage.ignore.users=[],e([]),c.showToast("Cleared all ignored users",l.getAssetIDByName("Check"))}})};return s.React.createElement(s.ReactNative.ScrollView,{style:{flex:1}},s.React.createElement($,{title:"Message Logger Settings"},s.React.createElement(u,{label:"Ignore Bots",subLabel:"Don't log messages from bots",trailing:s.React.createElement(I.Forms.FormSwitch,{value:n.storage.ignore.bots,onValueChange:function(a){n.storage.ignore.bots=a}})})),s.React.createElement($,{title:"Ignored Users"},s.React.createElement(u,{label:"Clear All Ignored Users",subLabel:`${r.length} users ignored`,trailing:s.React.createElement(u.Icon,{source:l.getAssetIDByName("ic_trash_24px")}),onPress:o}),r.length===0?s.React.createElement(D,{style:{padding:10}},"No users ignored."):r.map(function(a){const i=S?.getUser(a)?.username||a;return s.React.createElement(u,{key:a,label:i,trailing:s.React.createElement(s.ReactNative.TouchableOpacity,{onPress:function(){return t(a)}},s.React.createElement(u.Icon,{source:l.getAssetIDByName("ic_close_24px")}))})}),s.React.createElement(D,{style:{padding:10,color:"#999"}},'Right-click a user and select "Ignore User" to add them to this list.')))}let m,F;const d=[],g=[];n.storage.ignore??={users:[],bots:!1};const M=function(r){if(!r||r.length===0)return"";let e=`\u{1F4CE} **Embeds:**
`;return r.forEach(function(t,o){e+=`
**Embed ${o+1}:**`,t.title&&(e+=`
\u2022 Title: ${t.title}`),t.description&&(e+=`
\u2022 Description: ${t.description}`),t.url&&(e+=`
\u2022 URL: ${t.url}`),t.author?.name&&(e+=`
\u2022 Author: ${t.author.name}`),t.footer?.text&&(e+=`
\u2022 Footer: ${t.footer.text}`),t.fields?.length>0&&(e+=`
\u2022 Fields:`,t.fields.forEach(function(a){e+=`
  - ${a.name}: ${a.value}`})),t.image?.url&&(e+=`
\u2022 Image: ${t.image.url}`),t.thumbnail?.url&&(e+=`
\u2022 Thumbnail: ${t.thumbnail.url}`)}),e},v=function(r){if(!r||r.length===0)return"";let e=`\u{1F4C1} **Attachments:**
`;return r.forEach(function(t){e+=`\u2022 ${t.filename} (${Math.round(t.size/1024)}KB)
`,t.url&&(e+=`  ${t.url}
`)}),e},E=function(r){let e="";return r.content&&(e+=r.content),r.embeds?.length>0&&(e+=e?`

`:"",e+=M(r.embeds)),r.attachments?.length>0&&(e+=e?`

`:"",e+=v(r.attachments)),e||"(empty message)"};var T={onLoad(){try{m=f.findByStoreName("MessageStore"),F=f.findByStoreName("ChannelStore"),d.push(b.before("dispatch",s.FluxDispatcher,function(r){try{const e=r[0];if(!e||e?.type!=="MESSAGE_DELETE"||!e?.id||!e?.channelId)return;const t=m?.getMessage(e.channelId,e.id);if(!t||n.storage.ignore?.users?.includes(t.author?.id)||n.storage.ignore?.bots&&t.author?.bot)return;if(g.includes(e.id)){g.splice(g.indexOf(e.id),1);return}g.push(e.id);const o=E(t),a=t.author?.username||"Unknown",i=s.moment().format("HH:mm:ss");r[0]={type:"MESSAGE_EDIT_FAILED_AUTOMOD",messageData:{type:1,message:{channelId:e.channelId,messageId:e.id}},errorResponseBody:{code:2e5,message:`\u{1F6AB} **${a}** deleted a message:
${o}

_Deleted at ${i}_`}}}catch(e){console.error("[MessageLogger] Delete error:",e)}})),d.push(b.before("dispatch",s.FluxDispatcher,function(r){try{const e=r[0];if(!e||e?.type!=="MESSAGE_UPDATE"||!e?.message)return;const t=e.message;if(!t.id||!t.channel_id||n.storage.ignore?.users?.includes(t.author?.id)||n.storage.ignore?.bots&&t.author?.bot)return;const o=m?.getMessage(t.channel_id,t.id);if(!o||o.content===t.content&&JSON.stringify(o.embeds)===JSON.stringify(t.embeds))return;const a=E(o),i=E(t),y=t.author?.username||"Unknown",p=s.moment().format("HH:mm:ss");r[0]={type:"MESSAGE_EDIT_FAILED_AUTOMOD",messageData:{type:1,message:{channelId:t.channel_id,messageId:t.id}},errorResponseBody:{code:2e5,message:`\u270F\uFE0F **${y}** edited a message:

**Before:**
${a}

**After:**
${i}

_Edited at ${p}_`}}}catch(e){console.error("[MessageLogger] Edit error:",e)}})),c.showToast("Message Logger loaded",l.getAssetIDByName("Check"))}catch(r){console.error("[MessageLogger] Failed to load:",r),c.showToast("Failed to load Message Logger",l.getAssetIDByName("Small"))}},onUnload(){for(const r of d)try{r()}catch{}d.length=0,g.length=0,c.showToast("Message Logger unloaded",l.getAssetIDByName("Check"))},settings:_};return h.default=T,Object.defineProperty(h,"__esModule",{value:!0}),h})({},vendetta.metro,vendetta.metro.common,vendetta.plugin,vendetta.patcher,vendetta.ui.assets,vendetta.ui.toasts,vendetta.ui.components,vendetta.storage,vendetta.ui.alerts);
