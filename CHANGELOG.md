# CHANGELOG

All notable changes to MCS Chat will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Microsoft Copilot Studio Branding**: Updated splash screen with official Microsoft Copilot gradient colors and SVG agent icon for professional Microsoft Copilot Studio Companion branding
- **Enhanced Splash Screen System**: Intelligent loading progress tracking with library detection (marked, DOMPurify, katex) and smooth fade transitions
- **CSS Thinking Message Fix**: Resolved CSS cascade conflicts affecting thinking message display using semantic design tokens instead of !important declarations
- **Project Structure Optimization**: Complete cleanup of root directory with documentation consolidation and removal of development artifacts

### Removed  
- **Tests Directory Cleanup**: Removed entire `/tests/` folder (41 test files) with zero impact on main application functionality after comprehensive dependency analysis
- **Development Artifacts**: Eliminated test-related documentation sections and references for cleaner production-ready codebase

### Changed
- **Documentation Consolidation**: Reorganized all migration and development documentation following English/Chinese bilingual structure in `docs/` folder
- **Root Directory Cleanup**: Moved all non-essential markdown files to appropriate documentation folders for cleaner project structure
- **CSS Architecture Enhancement**: Implemented design token system in `css/base/variables.css` with Microsoft Copilot gradient support
- **Splash Screen Integration**: Unified loading experience with Microsoft branding and intelligent progress tracking

### Fixed
- **CSS Cascade Issues**: Resolved thinking message display problems using proper CSS specificity and semantic design tokens
- **Splash Screen Timing**: Fixed element reference and initialization timing issues in splash screen system
- **Documentation Organization**: Standardized bilingual documentation structure for better maintainability

- **KPI Grid Layout Optimization**: Improved agent KPI section from 4 columns to 3 columns in non-expanded state for better visual balance and readability
- **Enhanced Speech Recognition Error Handling**: Fixed critical bug where transcript processing could fail with non-string data types, improving voice input reliability across all speech providers
- **Robust Speech Input Validation**: Added comprehensive type checking and data sanitization for speech recognition results, supporting string, object, and mixed-type responses
- **Azure Speech Recognition Compatibility**: Fixed Azure Speech SDK initialization errors with proper constructor usage for language detection features
- **Smart Timeout Notification System**: Intelligent state-aware timeout management that only shows notifications while waiting for LLM response and clears them immediately when content streaming starts
- **Enhanced Notification Lifecycle**: Proper cleanup and state management preventing notification pollution during active streaming operations
- **Unified Notification System for AI Companion**: Fixed notification area positioned above quick action area, providing clean separation between valuable AI output and system notifications
- **Enhanced A/B Test Streaming**: Real-time streaming implementation for benchmark comparisons with progressive content building for better user engagement
- **Clean UI Design**: Removed status spinner from AI companion chat window, leveraging unified notification system for all progress indicators
- **Real-time Streaming Speech Feature**: Revolutionary speech synthesis that starts speaking immediately as text streams, eliminating wait times and creating a responsive conversational experience
- **Intelligent Sentence Boundary Detection**: Advanced text parsing to identify complete sentences during streaming for natural speech flow
- **Speech Queue Management System**: Sequential processing of speech chunks with proper timing and error handling
- **Multi-Provider Speech Engine Fallbacks**: Robust error handling with automatic fallback from Local AI → Web Speech API when models fail to load
- **Enhanced Speech Provider Architecture**: Improved initialization with timeout handling, error recovery, and user notifications
- **Streaming Speech State Management**: Comprehensive state tracking for speech processing during text streaming
- **Progressive Speech Enhancement**: Text cleaning and markdown processing optimized for speech synthesis
- **Streaming Speech Test Page**: Comprehensive testing interface (`test-streaming-speech.html`) for validating speech functionality across providers
- **Speech Provider Status Notifications**: Real-time user feedback for provider fallbacks and initialization issues
- **Comprehensive KPI Explanation System**: Integrated guide explaining the meaning and benefits of all performance metrics, especially the "CHANGES" KPI
- **Interactive Performance Guide**: Added "📖 Guide" button in Performance Metrics section with real-world examples and usage patterns
- **Enhanced CHANGES KPI Modal**: Detailed explanation of conversation evolution tracking, trend analysis, and optimization strategies
- **User Benefit Examples**: Practical scenarios showing how different change counts and trends indicate conversation effectiveness
- **Progressive Response Notifications**: User-friendly notification system that provides helpful guidance during long AI model processing without imposing hard timeouts
- **Deep Thinking Model Support**: Respectful approach that allows unlimited processing time for complex reasoning models while offering lighter model suggestions
- **First-Use Model Detection**: Enhanced tracking of model usage to provide appropriate expectations for initial model loading vs. subsequent requests
- **Non-Intrusive Performance Guidance**: Progressive notifications at 15s, 30s, 60s, and 120s intervals with helpful model recommendations
- **First-Invocation Performance Optimization**: Intelligent model loading detection with extended timeouts and retry logic for first-time model use
- **Model Performance State Tracking**: Track model usage history to optimize subsequent invocations and provide appropriate user feedback
- **Adaptive KPI Analysis**: Skip heavy LLM analysis during first model invocation to reduce initial response time
- **Enhanced Loading Indicators**: Context-aware typing indicators that inform users about model loading states
- **Debug Utilities**: Developer console tools for troubleshooting AI companion performance (`window.aiCompanionDebug`)
- **Mobile Responsive Design**: Complete mobile-friendly interface with touch optimization
- **Mobile AI Companion**: Floating action button for easy AI companion access on mobile devices
- **Swipe Gestures**: Intuitive navigation with swipe-to-open/close panel functionality
- **Mobile Utilities Class**: Comprehensive mobile state management and event handling
- **Touch-Optimized Controls**: 44px minimum touch targets and iOS-friendly input handling
- **Adaptive Layout System**: Intelligent panel management across different screen sizes
- **Mobile Documentation**: Comprehensive guides for mobile features and troubleshooting
- Comprehensive documentation restructure with organized sections
- AI Companion system with auto title generation and suggested actions
- User icon selection system with 10 pre-built avatars
- Custom user icon upload functionality
- Enhanced message icon positioning and alignment
- Improved localStorage management with consistent key naming

### Changed
- **AI Companion Approach**: Completely redesigned from timeout-based to notification-based system that respects user model choices and supports deep thinking models
- **Response Time Management**: Removed aggressive timeout controls in favor of progressive user notifications with helpful suggestions
- **Model Processing Freedom**: Eliminated artificial constraints on model processing time to support legitimate deep reasoning models
- **User Experience**: Enhanced feedback system that informs without interrupting, providing model recommendations for users seeking faster responses
- **AI Companion Performance**: Optimized first-time model invocation with 60-second timeout instead of 30 seconds
- **KPI Analysis Efficiency**: Deferred heavy LLM analysis during first model use to prioritize response speed
- **Error Handling**: Enhanced retry logic with up to 2 retries for first-time model loading failures
- Updated mobile breakpoints for better responsive behavior (768px tablet, 480px mobile)
- Enhanced CSS media queries with landscape mode optimizations  
- Improved mobile panel animations with hardware acceleration
- Restructured documentation from single README to modular doc system
- Updated icon positioning CSS for better visual alignment
- Improved user icon application logic with automatic persistence

### Fixed
- **Model Processing Constraints**: Removed inappropriate timeout controls that interfered with legitimate deep thinking model usage
- **User Choice Respect**: Fixed system behavior to honor user model selection without artificial processing limitations  
- **First Invocation Experience**: Improved user feedback during initial model loading without forcing premature timeouts
- **Progressive Guidance**: Implemented helpful notifications that guide users toward faster models without restricting their choices
- **First Invocation Delays**: Resolved performance issues where first-time AI model invocation could timeout or take excessively long
- **Model Loading Feedback**: Added proper user feedback during model loading states to reduce perceived wait time
- AI companion panel completely hidden on mobile devices
- Mobile layout conflicts and overlapping UI elements
- Touch gesture detection and panel management issues
- Responsive design inconsistencies across different devices
- User icon selection not applying automatically to messages
- Inconsistent localStorage key handling between components
- Message icon alignment issues with message content
- Auto title generation being inadvertently disabled

## [2.0.0] - 2024-01-15

### Added
- **Multi-Provider AI Support**: OpenAI, Anthropic, Ollama, and Azure OpenAI
- **Agent Management System**: Pre-configured and custom agents
- **AI Companion Features**: Auto title generation and suggested actions
- **Progressive Web App**: PWA support with offline capabilities
- **Advanced Message Rendering**: Markdown, syntax highlighting, and interactive features
- **Theme System**: Dark, light, and custom theme support
- **Export/Import**: Multiple formats including JSON, Markdown, and Plain Text
- **Search Functionality**: Full-text search across conversations
- **Local Storage**: Secure local data storage with encryption options

### Changed
- **Complete Architecture Rewrite**: Modular, component-based architecture
- **Modern JavaScript**: ES6+ modules and async/await patterns
- **Enhanced UI/UX**: Responsive design with mobile optimization
- **Performance Improvements**: Virtual scrolling and lazy loading
- **Security Enhancements**: Content sanitization and secure storage

### Removed
- **Legacy Dependencies**: Removed outdated libraries and polyfills
- **Single Provider Limitation**: No longer limited to one AI provider

## [1.5.2] - 2023-12-20

### Fixed
- Conversation loading performance issues
- Message rendering bugs with code blocks
- Export functionality edge cases

### Changed
- Improved error handling and user feedback
- Updated dependencies for security patches

## [1.5.1] - 2023-12-10

### Added
- Basic conversation search functionality
- Message copy buttons for code blocks
- Improved keyboard navigation

### Fixed
- Session persistence issues in certain browsers
- CSS styling conflicts with user themes

## [1.5.0] - 2023-11-25

### Added
- **Conversation Management**: Save, load, and organize multiple conversations
- **Message History**: Persistent conversation history
- **Basic Themes**: Dark and light theme options
- **Settings Panel**: Centralized configuration interface

### Changed
- Improved message rendering performance
- Enhanced mobile responsiveness
- Better error handling and user feedback

### Fixed
- Memory leaks in long conversations
- Scroll position issues in message view

## [1.4.1] - 2023-11-10

### Fixed
- API key storage and retrieval issues
- Message formatting edge cases
- Browser compatibility issues with older versions

### Security
- Enhanced input sanitization
- Improved XSS protection measures

## [1.4.0] - 2023-10-28

### Added
- **Multiple AI Providers**: Support for OpenAI and Anthropic
- **Streaming Responses**: Real-time response streaming
- **Message Actions**: Edit, delete, and regenerate messages
- **Code Syntax Highlighting**: Enhanced code block rendering

### Changed
- Redesigned user interface with modern styling
- Improved message layout and readability
- Better mobile device support

### Deprecated
- Legacy API configuration methods

## [1.3.2] - 2023-10-15

### Fixed
- Message persistence bugs
- UI responsiveness issues
- API rate limiting edge cases

### Changed
- Optimized bundle size and loading performance
- Updated styling for better accessibility

## [1.3.1] - 2023-10-05

### Added
- Basic conversation export functionality
- Improved error messages and user guidance

### Fixed
- Session management edge cases
- Cross-browser compatibility issues

## [1.3.0] - 2023-09-20

### Added
- **Local Storage**: Conversations now persist locally
- **Session Management**: Basic session handling
- **Settings Persistence**: User preferences saved across sessions

### Changed
- Improved application startup performance
- Enhanced error handling and recovery
- Better user feedback for API errors

### Fixed
- Message ordering issues in fast typing scenarios
- Memory usage optimization

## [1.2.1] - 2023-09-10

### Fixed
- Critical bug in message sending functionality
- CSS styling issues on mobile devices
- Performance issues with long conversations

### Security
- Fixed potential XSS vulnerability in message rendering

## [1.2.0] - 2023-08-25

### Added
- **Markdown Support**: Full markdown rendering in messages
- **Message Formatting**: Rich text formatting options
- **Copy Functionality**: Copy messages and code blocks
- **Responsive Design**: Mobile and tablet optimization

### Changed
- Improved user interface design
- Better message bubble styling
- Enhanced readability and typography

### Fixed
- Text input performance issues
- Message rendering bugs

## [1.1.2] - 2023-08-15

### Fixed
- API connection timeout issues
- User input validation edge cases
- Browser compatibility problems

### Changed
- Improved error messages for better user guidance
- Enhanced loading indicators

## [1.1.1] - 2023-08-05

### Fixed
- Critical bug preventing message sending
- Styling issues in certain browsers
- Memory leak in message handling

### Added
- Basic error logging for debugging

## [1.1.0] - 2023-07-20

### Added
- **User Interface**: Modern chat interface design
- **Message History**: Basic conversation tracking
- **Input Validation**: User input sanitization and validation
- **Error Handling**: Basic error handling and user feedback

### Changed
- Improved application structure and organization
- Better separation of concerns in codebase
- Enhanced user experience flows

### Fixed
- Message display formatting issues
- Input field focus problems

## [1.0.1] - 2023-07-10

### Fixed
- Initial release bug fixes
- Documentation updates
- Performance optimizations

### Security
- Added basic input sanitization
- Implemented secure API key handling

## [1.0.0] - 2023-07-01

### Added
- **Initial Release**: Basic chat functionality with OpenAI integration
- **Core Features**:
  - Single conversation interface
  - OpenAI GPT integration
  - Basic message sending and receiving
  - Simple HTML/CSS interface
- **Documentation**: Basic setup and usage instructions
- **License**: MIT license for open source distribution

### Technical Details
- Pure HTML, CSS, and JavaScript implementation
- Client-side only architecture
- Local browser storage for API keys
- Responsive web design principles

---

## Release Notes

### Version 2.0.0 - Major Rewrite
This version represents a complete rewrite of the application with modern architecture, enhanced features, and improved performance. The transition from v1.x to v2.0 includes:

- **Breaking Changes**: Configuration format changes require migration
- **New Features**: Extensive new functionality and capabilities
- **Performance**: Significant performance improvements
- **Security**: Enhanced security measures and best practices

### Migration Guide (v1.x to v2.0)
1. **Settings Migration**: Export settings from v1.x before upgrading
2. **Conversation Data**: Conversations from v1.x can be imported using the new import feature
3. **API Configuration**: Reconfigure API providers using the new settings interface
4. **Custom Themes**: Custom themes need to be adapted to the new theme system

### Deprecation Notice
- **v1.x Support**: v1.x will receive security updates only until July 2024
- **Legacy Features**: Some v1.x features may not be available in v2.0
- **Migration Tools**: Automated migration tools available in the application

### Future Releases

#### v2.1.0 (Planned - Q2 2024)
- Voice input and output capabilities
- Enhanced mobile experience
- File upload and processing
- Advanced AI provider features

#### v2.2.0 (Planned - Q3 2024)
- Team collaboration features
- Enhanced security options
- Performance optimizations
- Additional AI providers

#### v3.0.0 (Planned - Q4 2024)
- Desktop application
- Cloud synchronization options
- Enterprise features
- Plugin ecosystem

---

## Contributing to Changelog

When contributing to this project:

1. **Version Numbering**: Follow semantic versioning (MAJOR.MINOR.PATCH)
2. **Change Categories**: Use standard categories (Added, Changed, Deprecated, Removed, Fixed, Security)
3. **Description Format**: Write clear, concise descriptions of changes
4. **Links and References**: Include relevant issue/PR numbers
5. **Breaking Changes**: Clearly mark breaking changes and provide migration guidance

### Change Categories

- **Added**: New features and capabilities
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Features removed in this release
- **Fixed**: Bug fixes and corrections
- **Security**: Security-related changes and fixes

### Example Entry
```markdown
## [1.2.3] - 2023-XX-XX

### Added
- New feature description (#123)
- Another feature with clear benefits

### Changed
- Modified existing behavior with rationale
- Updated dependency with version info

### Fixed
- Bug fix description (#456)
- Performance improvement details

### Security
- Security vulnerability fix (CVE-XXXX-XXXX)
```

---

For the complete history and detailed technical changes, see the [GitHub commit history](https://github.com/illusion615/MCSChat/commits/main).
