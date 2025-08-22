# Enhanced Speech Engine Documentation

## Overview

The MCSChat application now features a comprehensive multi-provider speech engine that supports three different speech providers with varying levels of quality, performance, and cost.

## Speech Providers

### 1. Enhanced Web Speech API (Free)
- **Description**: Improved version of the browser's built-in speech capabilities
- **Quality**: Standard to Good
- **Cost**: Free
- **Offline**: No
- **Features**:
  - Intelligent voice selection based on naturalness scores
  - Optimized speech parameters for more natural delivery
  - Advanced voice ranking algorithm
  - Enhanced error handling and fallback mechanisms
  - Support for multiple languages

### 2. Local AI Models (Offline)
- **Description**: Uses Transformers.js with Whisper and SpeechT5 models
- **Quality**: High
- **Cost**: Free (after initial model download)
- **Offline**: Yes
- **Features**:
  - Completely offline processing
  - High-quality neural text-to-speech
  - Accurate speech recognition with Whisper
  - Web Worker implementation for performance
  - Chunked processing for longer texts
  - No data sent to external servers

### 3. Azure Speech Services (Premium)
- **Description**: Microsoft's cloud-based neural voice technology
- **Quality**: Premium
- **Cost**: Pay-per-use (see Azure pricing)
- **Offline**: No
- **Features**:
  - State-of-the-art neural voices
  - SSML support for expressive speech
  - Multiple voice styles and emotions
  - High accuracy speech recognition
  - Support for 100+ languages and voices

## Configuration

### Basic Settings
All providers support these common settings:
- **Auto-speak**: Automatically read agent responses aloud
- **Voice Input**: Enable microphone input for voice commands
- **Speaking Rate**: Adjust speech speed (0.5x to 2.0x)
- **Volume**: Control speech volume (0% to 100%)
- **Naturalness**: Balance between quality and performance (0% to 100%)

### Provider-Specific Settings

#### Enhanced Web Speech API
- **Voice Selection**: Choose from available system voices
- **Language**: Automatic detection with fallback options

#### Local AI Models
- **Model Path**: Location of AI models (default: `/models/`)
- **Web Worker**: Use separate thread for processing (recommended)
- **Chunk Size**: Text processing chunk size (default: 200 characters)

#### Azure Speech Services
- **Subscription Key**: Your Azure Speech Services API key
- **Region**: Azure service region (e.g., eastus, westus2)
- **Voice Name**: Specific neural voice (e.g., en-US-JennyNeural)

## Implementation Details

### Architecture
```
AICompanion (main interface)
    ↓
SpeechEngine (provider manager)
    ├── EnhancedWebSpeechProvider
    ├── LocalAISpeechProvider
    └── AzureSpeechProvider
```

### Provider Switching
The speech engine supports dynamic provider switching:
```javascript
// Switch to local AI models
await speechEngine.switchProvider('azure');

// Switch to Azure Speech Services
await speechEngine.switchProvider('azure');

// Switch back to enhanced Web Speech API
await speechEngine.switchProvider('web_speech');
```

### Capabilities Detection
Each provider reports its capabilities:
```javascript
const capabilities = speechEngine.getCapabilities();
// Returns:
// {
//   supportsTextToSpeech: boolean,
//   supportsSpeechRecognition: boolean,
//   supportsVoiceSelection: boolean,
//   supportsNaturalness: boolean,
//   supportsSSML: boolean,
//   isOffline: boolean,
//   quality: 'standard' | 'high' | 'premium'
// }
```

## Usage Examples

### Text-to-Speech
```javascript
// Basic speech synthesis
await aiCompanion.speakText("Hello, this is a test message");

// Force speech even if auto-speak is disabled
await aiCompanion.speakText("Important message", true);

// With custom options
await speechEngine.speakText("Hello world", {
    rate: 1.2,
    volume: 0.8,
    naturalness: 0.9
});
```

### Speech Recognition
```javascript
// Start voice input
await aiCompanion.startVoiceInput();

// Advanced recognition with options
const transcript = await speechEngine.startSpeechRecognition({
    language: 'en-US',
    interimResults: false
});
```

### Provider-Specific Features

#### Azure SSML Support
```javascript
// Azure provider supports SSML for expressive speech
const ssmlText = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
    <voice name="en-US-JennyNeural">
        <prosody rate="medium" pitch="medium">
            Hello, this is a more expressive message.
        </prosody>
    </voice>
</speak>
`;
```

## Performance Considerations

### Model Loading
- **Local AI**: Initial model download may take time (50-200MB)
- **Web Workers**: Recommended for local AI to prevent UI blocking
- **Caching**: Models are cached after first download

### Quality vs Performance
- **Web Speech API**: Fastest, lowest quality
- **Local AI**: Good balance, offline capability
- **Azure**: Highest quality, requires internet

### Memory Usage
- **Web Speech API**: Minimal memory usage
- **Local AI**: 200-500MB for loaded models
- **Azure**: Minimal local memory usage

## Error Handling

The speech engine includes comprehensive error handling:
- **Network errors** (for cloud providers)
- **Permission errors** (microphone access)
- **Model loading errors** (for local AI)
- **Quota exceeded errors** (for Azure)
- **Language not supported errors**

## Browser Compatibility

### Web Speech API
- Chrome: Full support
- Firefox: Partial support
- Safari: Basic support
- Edge: Full support

### Local AI Models
- Chrome: Full support
- Firefox: Limited support
- Safari: Limited support
- Edge: Full support

### Azure Speech Services
- All modern browsers with JavaScript support

## Security and Privacy

### Data Processing
- **Web Speech API**: Data sent to browser's speech service
- **Local AI**: All processing happens locally
- **Azure**: Data sent to Microsoft's secure cloud service

### API Key Security
- Azure subscription keys are stored locally only
- No keys are transmitted in URLs or logs
- Input validation prevents key exposure

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Solution: Allow microphone access in browser settings

2. **Local AI Models Not Loading**
   - Check network connection for initial download
   - Verify model path configuration
   - Clear browser cache and retry

3. **Azure Speech Not Working**
   - Verify subscription key and region
   - Check Azure service status
   - Ensure subscription has available quota

4. **No Audio Output**
   - Check system volume settings
   - Verify speaker/headphone connection
   - Test with different provider

### Debug Mode
Enable debug logging in browser console:
```javascript
// View current speech engine state
console.log(speechEngine.state);

// View available voices
console.log(speechEngine.getAvailableVoices());

// View provider capabilities
console.log(speechEngine.getCapabilities());
```

## Future Enhancements

### Planned Features
- Additional voice providers (Google Cloud TTS, Amazon Polly)
- Voice cloning capabilities
- Real-time voice effects
- Multi-speaker support
- Custom voice training

### Performance Optimizations
- Progressive model loading
- Voice caching strategies
- Adaptive quality selection
- Bandwidth optimization

## API Reference

### Main Methods
- `speakText(text, options)`: Synthesize speech
- `startSpeechRecognition(options)`: Start voice input
- `switchProvider(providerName)`: Change speech provider
- `getCapabilities()`: Get provider capabilities
- `getAvailableVoices()`: List available voices
- `stopSpeaking()`: Stop current speech
- `stopRecognition()`: Stop voice input

### Events
- `speechStarted`: Speech synthesis begins
- `speechEnded`: Speech synthesis completes
- `speechError`: Speech synthesis error
- `recognitionStarted`: Voice recognition begins
- `recognitionResult`: Voice recognition result
- `recognitionError`: Voice recognition error

## Getting Started

1. **Basic Setup**: The enhanced speech engine is already integrated into MCSChat
2. **Choose Provider**: Select your preferred provider in Agent Management settings
3. **Configure Options**: Adjust rate, volume, and naturalness to your preference
4. **Test Speech**: Use the "Test Voice" button to verify configuration
5. **Enable Features**: Turn on auto-speak and/or voice input as desired

For Azure integration, you'll need to:
1. Create an Azure Speech Services resource
2. Copy your subscription key and region
3. Configure these in the Azure settings panel
4. Select Azure as your speech provider

The enhanced speech engine provides a seamless upgrade to your MCSChat experience with multiple options to suit different needs and preferences.
