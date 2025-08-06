# TODO
## General instuction
- You should always analyze the todo item, explain your design and plan of implementation, and waiting for my feedback, you should adapt your design with my feedback, and only start your task after my confirmation.
- You should review the code carefully after you resolved the todo item to avoid
  - Broken current functons
  - Adopt new issue
- You should ask me to test your new release and waiting for my feedback, and then check, anlayze, explain and imporve or fix bug with my feedback
- Repeat until i confirmed the compeltion of your task, then you can mark item as completed.
- And you should always update the document when you completed the todo items to reflect the latest changes.
- When you're updating the introdoction and design document, you should cross check the content to make sure only reflect the latest design and implementation results, and replace/remove outaged content. 
- Update the changelog to keep trace on all implementation histories, only append to log and don't change existing log content.

## TODO Task Items
### User experience
[x] Add a setting option to turn message icon on/off
[x] allow to minimal/expand the left conversation panel, move the setting button to the side command bar. move ai companion button to agent chat window, put on right side of agent name;
[x] remove markdown format from generated title as it will not show on history conversation button.
[x] Fix the left panel width and don't let it be impacted by chat window size,
[x] wrap the title in conversation list to let user see full title, this changes also apply for both mobile and desktop layout.
[x] change the new chat icon to a more easy to understand icon, for example, a chat bubble with a + inside.
[x] change the ai companion icon is not beautiful, list some option icon let me to choose.
[x] Move "Show Message Icon" from agent management to appearance and put before user icon setting. If it's now selected, hide the user icon setting section.
[ ] Add color theme in setting panel to allow user choose background color theme from various candidates.

## Message Rendering
[x] Skip the streaming rendering for URL in markdown and directly output the completed URL part.
[x] LaTex support in markdown rendering
[x] Hide the typing indicator when currently there is any message rendering
[x] improve the typing indicator to make it more nature, the current typing indicator text pattern is too regular and user will soon relize it's fake, i want this indicator can take context of conversation to represent the processing/thinking process behind to disturbe the user concern on waiting time.
[x] Don't create conversation item if user didn't send anything to agent, current it created many meaniness conversation item only contains greeting message from agent.
[x] the message meta should align with the left border of message bubble. If it shows in full width model, it align with the left of message.

## AI Companion
[x] Add consumed token to let user understand how many token used in current conversation in AI companion.
[x] Change the icon in AI companion chat window to make it looks beautiful, now it's not fasion engough
[x] Align the available models dropdown box and refresh models button vertical central
[x] The current model should by default display in the available model dropdown as selected.
[x] Now the first time invoke AI model usually tooks long time even never success, and the invoke afterwards will behave normal, it's doesn't behave like almost instant response before, check the code to see if there're some modification to lower down the efficiency.
[x] Explain the kpi meaning and mechanism behind "CHANGES", how user can benefit from this kpi?
[x] Improve KPI caculation efficiency.
[x] Add a quick action "Benchmark with general knowledge", when click this action, only use general knowledge from selected model, and then compare with agent response in context, then evalaute the two answer to give rate which one is better, why, and which improvement can make. All quick action should apply current enable/disable hehavior rules.
[x] When i select other ai companion llm model from the available models dropdown box, the token consumption metrics section should change to relevant data accordingly, and the model name on ai companion header should also change to reflect the change.
[x] You should restrict generated title within 20 words to avoid too long title.
[x] Keep ai companion progress indicator, notifications on a fixed area(just above the quick action area) to leave a clean window for valuable ai companion output(Don't mix the system notification with valuable content together.)
[x] Disable the timeout notification. Only show timeout notification while waiting for response from llm model and disable it once received content and start processing streaming output.
[ ] add an expand icon button to ai companion panel header to make it expand wider as 50/50 with agent chat panel, this icon button click will restore the default width.

### Agent Message Speaking
[x] Speak the message
[x] Receive audio command and convert to text and send
[x] Upgrade to enhanced Web Speech API with better voice selection and natural speech parameters
[x] Add local AI models support (Transformers.js with Whisper and SpeechT5)
[x] Add Azure Speech Services integration as premium option
[x] Multi-provider speech engine with quality/performance trade-offs
[x] Real-time streaming speech - Start speaking while text is streaming instead of waiting for completion

### DirectLine
[ ] Print directline response into console so i can know what data returned for better debug.
[ ] Support adaptive card submition
[ ] Sometimes miss the returned entity when initiate the conversation, to investigate with directline protocal to see if there's some shcema didn't appropriately processed, find out why it's happened.