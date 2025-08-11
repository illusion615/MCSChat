/**
 * Centralized Prompt Management System for AI Companion
 * Handles all prompts with user customization capabilities
 */

import { DOMUtils } from '../utils/domUtils.js';

export class PromptManager {
    constructor() {
        this.defaultPrompts = {
            // Thinking content generation prompt
            thinkingGeneration: {
                name: 'Thinking Content Generation',
                description: 'Prompt for generating AI companion thinking messages',
                template: `You're a knowledge agent conversation assistant, your target is to improve user conversation experience. Now user asked a question "{userMessage}", I want you to simulate a thinking progress while waiting for query response from knowledge library to improve the user waiting experience. You can leverage your general knowledge to describe your understanding of user question, and analyze how would you to resolve or answer the user request.{contextPart}

** Important Rules **
1. {languageInstruction}
2. You should put yourself in the agent's shoes and generate content in the second person.
3. Output and only output your generated response, don't add your summary and analysis content.
4. Use only ONE language consistently throughout all thinking statements.

Format your response as 3-4 short thinking statements, each on a new line, that show your thought process about approaching this question.`
            },

            // KPI explanation generation prompt
            kpiExplanation: {
                name: 'KPI Explanation Generation',
                description: 'Prompt for generating KPI explanations for user understanding',
                template: `You are an AI assistant helping users understand KPI changes in their system. A KPI value has been calculated and you need to provide a brief, user-friendly explanation.

KPI Details:
- Name: {kpiName}
- Value: {kpiValue}
- Context: {kpiContext}
- Previous conversations: {conversationContext}

** Important Rules **
1. Keep the explanation brief (2-3 sentences maximum)
2. Use simple, non-technical language
3. Focus on what this KPI means for the user
4. Match the language of the user's conversation context
5. Be encouraging and helpful in tone

Provide a clear explanation of what this KPI represents and why it might be valuable for the user to know.`
            },

            // Question analysis for thinking
            questionAnalysis: {
                name: 'Question Analysis',
                description: 'Prompt for analyzing user question to generate contextual thinking',
                template: `Analyze this user question: "{userMessage}"

Generate a single thinking statement that shows deeper analysis of this specific question. Consider the question type, domain, and what aspects need careful consideration. Be specific to this question, not generic.

Rules:
1. Match the language of the user question
2. Be specific and contextual, not generic
3. Show thoughtful analysis of the question
4. Keep it conversational and natural`
            },

            // Contextual thinking continuation
            contextualThinking: {
                name: 'Contextual Thinking',
                description: 'Prompt for generating context-aware thinking statements',
                template: `User asked: "{userMessage}".{contextPart} Generate a thinking statement that shows consideration of context, related concepts, or similar scenarios relevant to this specific question. Be specific and contextual, not generic.

Rules:
1. Consider the conversation context
2. Match the user's language
3. Show connection to related concepts
4. Be specific to this situation`
            },

            // Practical thinking generation
            practicalThinking: {
                name: 'Practical Thinking',
                description: 'Prompt for generating practical implementation-focused thinking',
                template: `User asked: "{userMessage}". Generate a thinking statement that shows consideration of practical aspects, implementation details, or real-world applications specific to this question.

Rules:
1. Focus on practical applications
2. Consider implementation challenges
3. Match the user's language
4. Be specific and actionable`
            },

            // Simple continuation thinking
            simpleContinuation: {
                name: 'Simple Continuation',
                description: 'Prompt for generating brief continuation thinking statements',
                template: `Generate a single brief thinking statement (one sentence) that shows continued analysis or consideration. The statement should be natural and show ongoing thought process. Don't use quotes or special formatting, just return the thinking statement directly.

Context: User asked about "{userMessage}"

Rules:
1. Keep it brief (one sentence)
2. Show ongoing analysis
3. Be natural and conversational
4. Match the conversation language`
            },

            // Synthesis thinking generation
            synthesisThinking: {
                name: 'Synthesis Thinking',
                description: 'Prompt for generating comprehensive synthesis thinking statements',
                template: `User asked: "{userMessage}".{thinkingProgressSummary} Generate a thinking statement that shows synthesis, bringing together different aspects, or preparing a comprehensive response specific to this question.

Examples:
- "Let me integrate all these considerations into a comprehensive approach..."
- "I'm bringing together the key factors for this specific scenario..."
- "Synthesizing the best practices and contextual factors for this case..."

Generate one contextual thinking statement (one sentence, no quotes):`
            }
        };

        this.userPrompts = this.loadUserPrompts();
    }

    /**
     * Load user-customized prompts from localStorage
     * @returns {Object} User prompts or empty object
     */
    loadUserPrompts() {
        try {
            const saved = localStorage.getItem('aiCompanion_userPrompts');
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.error('[PromptManager] Error loading user prompts:', error);
            return {};
        }
    }

    /**
     * Save user prompts to localStorage
     */
    saveUserPrompts() {
        try {
            localStorage.setItem('aiCompanion_userPrompts', JSON.stringify(this.userPrompts));
        } catch (error) {
            console.error('[PromptManager] Error saving user prompts:', error);
        }
    }

    /**
     * Get a prompt template (user customized or default)
     * @param {string} promptKey - The prompt key
     * @returns {string} The prompt template
     */
    getPrompt(promptKey) {
        const userPrompt = this.userPrompts[promptKey];
        const defaultPrompt = this.defaultPrompts[promptKey];

        if (userPrompt && userPrompt.template) {
            return userPrompt.template;
        }

        if (defaultPrompt && defaultPrompt.template) {
            return defaultPrompt.template;
        }

        throw new Error(`Prompt not found: ${promptKey}`);
    }

    /**
     * Get prompt with variables replaced
     * @param {string} promptKey - The prompt key
     * @param {Object} variables - Variables to replace in the template
     * @returns {string} The formatted prompt
     */
    getFormattedPrompt(promptKey, variables = {}) {
        let prompt = this.getPrompt(promptKey);

        // Replace variables in the template
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            prompt = prompt.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
        });

        return prompt;
    }

    /**
     * Update a user prompt
     * @param {string} promptKey - The prompt key
     * @param {string} template - The new template
     */
    updateUserPrompt(promptKey, template) {
        if (!this.defaultPrompts[promptKey]) {
            throw new Error(`Unknown prompt key: ${promptKey}`);
        }

        this.userPrompts[promptKey] = {
            template: template,
            lastModified: new Date().toISOString()
        };

        this.saveUserPrompts();
    }

    /**
     * Reset a prompt to default
     * @param {string} promptKey - The prompt key
     */
    resetPromptToDefault(promptKey) {
        delete this.userPrompts[promptKey];
        this.saveUserPrompts();
    }

    /**
     * Get all prompts with their metadata
     * @returns {Object} All prompts with metadata
     */
    getAllPrompts() {
        const prompts = {};

        Object.entries(this.defaultPrompts).forEach(([key, defaultData]) => {
            const userData = this.userPrompts[key];
            prompts[key] = {
                key: key,
                name: defaultData.name,
                description: defaultData.description,
                defaultTemplate: defaultData.template,
                userTemplate: userData ? userData.template : null,
                isCustomized: !!userData,
                lastModified: userData ? userData.lastModified : null
            };
        });

        return prompts;
    }

    /**
     * Create the prompt management UI
     * @returns {HTMLElement} The prompt management interface
     */
    createPromptManagementUI() {
        const container = DOMUtils.createElement('div', {
            className: 'prompt-management-container'
        });

        const header = DOMUtils.createElement('div', {
            className: 'prompt-management-header'
        });

        header.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #333;">AI Companion Prompt Management</h3>
            <p style="margin: 0; color: #666; font-size: 14px;">Customize AI companion prompts to better suit your needs. Changes are saved automatically and only affect your experience.</p>
        `;

        container.appendChild(header);

        const allPrompts = this.getAllPrompts();

        Object.values(allPrompts).forEach(promptData => {
            const promptSection = this.createPromptSection(promptData);
            container.appendChild(promptSection);
        });

        return container;
    }

    /**
     * Create a single prompt section in the UI
     * @param {Object} promptData - The prompt data
     * @returns {HTMLElement} The prompt section element
     */
    createPromptSection(promptData) {
        const section = DOMUtils.createElement('div', {
            className: 'prompt-section'
        });

        const header = DOMUtils.createElement('div', {
            className: 'prompt-section-header'
        });

        const titleInfo = DOMUtils.createElement('div', {
            className: 'prompt-title-info'
        });
        titleInfo.innerHTML = `
            <h4>${promptData.name}</h4>
            <p>${promptData.description}</p>
            ${promptData.isCustomized ? '<span class="prompt-status-customized">✓ Customized</span>' : '<span class="prompt-status-default">Default</span>'}
        `;

        const buttons = DOMUtils.createElement('div', {
            className: 'prompt-buttons'
        });

        const editBtn = DOMUtils.createElement('button', {
            className: 'prompt-btn prompt-btn-primary'
        });
        editBtn.textContent = promptData.isCustomized ? '✏️ Edit Custom' : '🎨 Customize';

        editBtn.addEventListener('click', () => {
            this.openPromptEditor(promptData);
        });

        buttons.appendChild(editBtn);

        if (promptData.isCustomized) {
            const resetBtn = DOMUtils.createElement('button', {
                className: 'prompt-btn prompt-btn-danger'
            });
            resetBtn.textContent = '🔄 Reset';

            resetBtn.addEventListener('click', () => {
                if (confirm(`Reset "${promptData.name}" to default?`)) {
                    this.resetPromptToDefault(promptData.key);
                    location.reload(); // Simple way to refresh the UI
                }
            });

            buttons.appendChild(resetBtn);
        }

        header.appendChild(titleInfo);
        header.appendChild(buttons);

        const preview = DOMUtils.createElement('div', {
            className: 'prompt-preview'
        });

        const currentTemplate = promptData.isCustomized ? promptData.userTemplate : promptData.defaultTemplate;

        // Show more content with better formatting
        let previewText = currentTemplate;
        if (currentTemplate.length > 500) {
            previewText = currentTemplate.substring(0, 500) + '\n\n... (click Edit to see full content)';
        }

        preview.textContent = previewText;

        // Add expand/collapse functionality for long prompts
        if (currentTemplate.length > 500) {
            const expandBtn = DOMUtils.createElement('button', {
                className: 'prompt-expand-btn'
            });
            expandBtn.textContent = '📖 Show Full Preview';

            let isExpanded = false;
            expandBtn.addEventListener('click', () => {
                if (isExpanded) {
                    preview.textContent = currentTemplate.substring(0, 500) + '\n\n... (click Edit to see full content)';
                    expandBtn.textContent = '📖 Show Full Preview';
                    preview.style.maxHeight = '200px';
                } else {
                    preview.textContent = currentTemplate;
                    expandBtn.textContent = '📕 Show Less';
                    preview.style.maxHeight = '400px';
                }
                isExpanded = !isExpanded;
            });

            section.appendChild(header);
            section.appendChild(preview);
            section.appendChild(expandBtn);
        } else {
            section.appendChild(header);
            section.appendChild(preview);
        }

        return section;
    }

    /**
     * Open the prompt editor modal
     * @param {Object} promptData - The prompt data to edit
     */
    openPromptEditor(promptData) {
        const modal = DOMUtils.createElement('div', {
            className: 'prompt-editor-modal'
        });

        const editor = DOMUtils.createElement('div', {
            className: 'prompt-editor'
        });

        const header = DOMUtils.createElement('div', {
            className: 'prompt-editor-header'
        });

        header.innerHTML = `
            <h3>Edit Prompt: ${promptData.name}</h3>
            <p>${promptData.description}</p>
        `;

        const textarea = DOMUtils.createElement('textarea', {
            className: 'prompt-editor-textarea'
        });

        // Set the textarea value correctly - use textContent for textarea
        textarea.value = promptData.isCustomized ? promptData.userTemplate : promptData.defaultTemplate;

        // Add focus effects
        textarea.addEventListener('focus', () => {
            textarea.style.borderColor = '#007acc';
            textarea.style.boxShadow = '0 0 0 3px rgba(0,122,204,0.1)';
        });

        textarea.addEventListener('blur', () => {
            textarea.style.borderColor = '#ddd';
            textarea.style.boxShadow = 'none';
        });

        const footer = DOMUtils.createElement('div', {
            className: 'prompt-editor-footer'
        });

        const info = DOMUtils.createElement('div', {
            className: 'prompt-editor-info'
        });
        info.innerHTML = `
            <strong>💡 Tips:</strong> Use {variableName} for template variables. 
            <br>Changes save automatically and only affect your experience.
        `;

        const buttons = DOMUtils.createElement('div', {
            className: 'prompt-editor-buttons'
        });

        const saveBtn = DOMUtils.createElement('button', {
            className: 'prompt-editor-btn prompt-editor-btn-save'
        });
        saveBtn.textContent = '💾 Save Changes';

        const cancelBtn = DOMUtils.createElement('button', {
            className: 'prompt-editor-btn prompt-editor-btn-cancel'
        });
        cancelBtn.textContent = '❌ Cancel';

        saveBtn.addEventListener('click', () => {
            try {
                this.updateUserPrompt(promptData.key, textarea.value);
                modal.remove();
                alert('Prompt saved successfully!');
                location.reload(); // Simple way to refresh the UI
            } catch (error) {
                alert('Error saving prompt: ' + error.message);
            }
        });

        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        buttons.appendChild(cancelBtn);
        buttons.appendChild(saveBtn);
        footer.appendChild(info);
        footer.appendChild(buttons);

        editor.appendChild(header);
        editor.appendChild(textarea);
        editor.appendChild(footer);
        modal.appendChild(editor);

        document.body.appendChild(modal);
        textarea.focus();
    }
}

// Create singleton instance
export const promptManager = new PromptManager();
