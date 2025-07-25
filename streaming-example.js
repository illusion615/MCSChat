// Example: True streaming with OpenAI API (or similar)
async function sendStreamingMessage(userMessage) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: userMessage }],
            stream: true // Enable streaming
        })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let messageId = generateGUID();
    
    // Start streaming message
    startStreamingMessage({ id: messageId, text: '' });
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonData = line.slice(6);
                if (jsonData === '[DONE]') {
                    finalizeStreamingMessage();
                    return;
                }
                
                try {
                    const data = JSON.parse(jsonData);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) {
                        // Update streaming message with new content
                        updateStreamingMessage({ id: messageId, text: content });
                    }
                } catch (e) {
                    console.warn('Parse error:', e);
                }
            }
        }
    }
}
