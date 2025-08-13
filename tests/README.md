# Test Files Organization

This directory contains organized test files for the MCSChat application.

## Directory Structure

### `/components/`
Component-specific tests and diagnostics:
- `localStorage-diagnostic.html` - Local storage functionality testing
- `clear-storage-test.html` - Storage clearing functionality
- `complete-message-test.html` - Message completion testing

### `/features/`
Feature-specific tests:
- `test-katex-local.html` - KaTeX rendering tests
- `test-kpi-explanation.html` - KPI explanation functionality
- `test-unified-api.html` - Unified API testing
- `test-unified-messages.html` - Unified messaging system
- `test-unified-notifications.html` - Notification system tests
- `welcome-message-test.html` - Welcome message functionality
- `test-expand-feature.html` - Panel expansion features
- `test-icon-storage.html` - Icon storage functionality
- `test-init-migration.html` - Initialization migration tests
- `test-logging-migration.html` - Logging system migration
- `test-progress-visual.html` - Progress visualization tests
- `test-sidebar.html` - Sidebar functionality
- `test-timeout-behavior.html` - Timeout behavior tests
- `test-title-generation.html` - Title generation functionality
- `test-latex-currency.html` - LaTeX currency rendering
- `test-citations.html` - Citation functionality
- `test-suggested-actions.html` - Suggested actions feature

### `/icons/`
Icon-related tests:
- `test-icons.html` - SVG icon system testing
- `test-kpi-icon.html` - KPI icon testing

### `/ui/`
User interface tests:
- `test-ai-companion-bubble-styling.html` - AI companion bubble styling
- `test-ai-companion-message-styling.html` - AI companion message styling
- `test-theme-gallery.html` - Theme gallery functionality
- `test-theme-persistence.html` - Theme persistence testing
- `test-theme-selection.html` - Theme selection interface

## Usage

To run these tests, serve the HTML files through a local server and access them via browser. Most tests are standalone and don't require the main application to be running.

## Maintenance

- Keep tests organized by their primary functionality
- Remove outdated or duplicate test files
- Update this README when adding new test categories
