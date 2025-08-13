# TODO

## General Instructions
- You should always analyze the todo item, explain your design and plan of implementation, and wait for my feedback. You should adapt your design with my feedback, and only start your task after my confirmation.
- You should review the code carefully after you resolve the todo item to avoid:
  - Breaking current functions
  - Introducing new issues
- You should ask me to test your new release and wait for my feedback, then check, analyze, explain and improve or fix bugs with my feedback
- Repeat until I confirm the completion of your task, then you can mark item as completed.
- You should always update the documentation when you complete todo items to reflect the latest changes.
- When you're updating the introduction and design documents, you should cross-check the content to make sure it only reflects the latest design and implementation results, and replace/remove outdated content.
- Update the changelog to keep track of all implementation histories - only append to log and don't change existing log content.

## TODO Task Items

### User Experience
[x] Add a setting option to turn message icon on/off
[x] Allow to minimize/expand the left conversation panel, move the setting button to the side command bar. Move ai companion button to agent chat window, put on right side of agent name
[x] Remove markdown format from generated title as it will not show on history conversation button
[x] Fix the left panel width and don't let it be impacted by chat window size
[x] Wrap the title in conversation list to let user see full title, this changes also apply for both mobile and desktop layout
[x] Change the new chat icon to a more easy to understand icon, for example, a chat bubble with a + inside
[x] Change the ai companion icon as it's not beautiful, list some option icons let me choose
[x] Move "Show Message Icon" from agent management to appearance and put before user icon setting. If it's not selected, hide the user icon setting section
[ ] Add color theme in setting panel to allow user choose background color theme from various candidates

### Message Rendering
[x] Skip the streaming rendering for URL in markdown and directly output the completed URL part
[x] LaTeX support in markdown rendering
[x] Hide the typing indicator when currently there is any message rendering
[x] Improve the typing indicator to make it more natural, the current typing indicator text pattern is too regular and user will soon realize it's fake, I want this indicator can take context of conversation to represent the processing/thinking process behind to reduce user concern on waiting time
[x] Don't create conversation item if user didn't send anything to agent, currently it creates many meaningless conversation items only containing greeting message from agent
[x] The message meta should align with the left border of message bubble. If it shows in full width mode, it aligns with the left of message

### AI Companion
[x] Add consumed token to let user understand how many tokens used in current conversation in AI companion
[x] Change the icon in AI companion chat window to make it look beautiful, now it's not stylish enough
[x] Align the available models dropdown box and refresh models button vertically central
[x] The current model should by default display in the available model dropdown as selected
[x] Now the first time invoke AI model usually takes long time even never succeeds, and the invoke afterwards will behave normal, it doesn't behave like almost instant response before, check the code to see if there are some modifications to lower the efficiency
[x] Explain the KPI meaning and mechanism behind "CHANGES", how user can benefit from this KPI
[x] Improve KPI calculation efficiency
[x] Add a quick action "Benchmark with general knowledge", when click this action, only use general knowledge from selected model, and then compare with agent response in context, then evaluate the two answers to give rate which one is better, why, and which improvement can make. All quick actions should apply current enable/disable behavior rules
[x] When I select other AI companion LLM model from the available models dropdown box, the token consumption metrics section should change to relevant data accordingly, and the model name on AI companion header should also change to reflect the change
[x] You should restrict generated title within 20 words to avoid too long title
[x] Keep AI companion progress indicator, notifications on a fixed area (just above the quick action area) to leave a clean window for valuable AI companion output (Don't mix the system notification with valuable content together)
[x] Disable the timeout notification. Only show timeout notification while waiting for response from LLM model and disable it once received content and start processing streaming output
[ ] Add an expand icon button to AI companion panel header to make it expand wider as 50/50 with agent chat panel, this icon button click will restore the default width

### Agent Message Speaking
[x] Speak the message
[x] Receive audio command and convert to text and send

### Project Organization
[x] Scan all codebase to make sure legacy icon code has been completely removed and migrated to new unified SVG icon manager solution
[x] Add KPI icon to SVG library named 'kpi'
[x] Change the button icon of toggleLLMPanelBtn to 'kpi' and change the name to togglerightpanelbtn
[x] Clean up test HTML files in project, delete those not necessary and move rest needed to keep to test folder
[x] Clean markdown files, just keep README and TODO in the root, and move rest to docs folder, keep component-relevant docs in component folder
[x] Review all documents, make sure they reflect the latest status (except changelog), remove deprecated content, make it well organized, easy to read, simple and clean

## Recently Completed (August 2025)

### ✅ Project Organization & Documentation Cleanup
- **Icon System Unification**: Successfully migrated all legacy icon code to unified SVG icon manager
- **KPI Icon Integration**: Added KPI icon to SVG library and updated button functionality
- **Button Updates**: Changed toggleLLMPanelBtn to togglerightpanelbtn with KPI icon
- **Test File Organization**: Organized 34 test files into structured directories (components/, features/, icons/, ui/)
- **Documentation Restructure**: Moved all documentation to organized docs/ folder structure
- **README Modernization**: Updated main README to reflect current project state and clean architecture
- **Legacy Code Removal**: Cleaned up deprecated files and outdated content

### ✅ Icon System & UI Improvements
- **Unified Icon Management**: Implemented consistent SVG icon system across all components
- **Async Icon Loading**: Added proper fallback mechanisms for icon loading
- **Performance Optimization**: Reduced icon-related code complexity and improved loading times
- **Visual Consistency**: Ensured consistent iconography throughout the application

## Current Status
The project is now well-organized with:
- ✅ Clean file structure with proper documentation organization
- ✅ Unified icon system with consistent styling
- ✅ Structured test suite for better maintainability
- ✅ Updated documentation reflecting current implementation
- ✅ Streamlined codebase with reduced technical debt

## Next Priority
- [ ] Color theme implementation for enhanced user customization
- [ ] AI companion panel expansion functionality
- [ ] Continue feature development based on user feedback
[x] Upgrade to enhanced Web Speech API with better voice selection and natural speech parameters
[x] Add local AI models support (Transformers.js with Whisper and SpeechT5)
[x] Add Azure Speech Services integration as premium option
[x] Multi-provider speech engine with quality/performance trade-offs
[x] Real-time streaming speech - Start speaking while text is streaming instead of waiting for completion

### DirectLine
[ ] Print directline response into console so i can know what data returned for better debug.
[ ] Support adaptive card submition
[ ] Sometimes miss the returned entity when initiate the conversation, to investigate with directline protocal to see if there's some shcema didn't appropriately processed, find out why it's happened.