# Local AI Speech - Console Messages and Troubleshooting

## When Local AI Loads Successfully

If you see messages like this in your browser console:

```
2025-08-04 01:10:14.129100 [W:onnxruntime:, graph.cc:3490 CleanUnusedInitializersAndNodeArgs] 
Removing initializer '/wrapped_decoder/Shape_3_output_0'. It is not used by any node and should 
be removed from the model.
```

**This is GOOD NEWS!** 🎉

## Common Issues and Solutions

### Speaker Embeddings Error
If you see:
```
[SpeechWorker] Text synthesis failed: Error: Speaker embeddings must be a `Tensor`, `Float32Array`, `string`, or `URL`.
```

**This indicates successful model loading** but missing speaker embeddings for SpeechT5. The system will:
1. Automatically generate default speaker embeddings
2. Try alternative TTS models (MMS-TTS) that don't require embeddings
3. Fall back to Enhanced Web Speech API if synthesis fails

### Expected Model Loading Process
```
[SpeechWorker] Trying TTS model: Xenova/mms-tts-eng
[SpeechWorker] Successfully loaded TTS model: Xenova/mms-tts-eng
```

OR

```
[SpeechWorker] Trying TTS model: Xenova/speecht5_tts
[SpeechWorker] Using default speaker embeddings for SpeechT5
```

## What This Means

### ✅ Success Indicators
- **Model Loading**: Transformers.js successfully loaded in Web Worker
- **ONNX Runtime Active**: AI models are initializing with WebAssembly
- **Optimization Working**: Runtime is optimizing models for better performance
- **Memory Management**: Unused model components being removed to save memory

### Expected Process
1. **Dynamic Import**: ES module successfully loads in Web Worker
2. **Model Download**: Large AI models download from CDN (may take 30-60 seconds)
3. **ONNX Initialization**: WebAssembly runtime loads and optimizes models
4. **Optimization Warnings**: Normal warnings about model optimization
5. **Ready for Use**: Local AI speech synthesis becomes available

## Timeline Expectations

### Initial Load (First Time)
- **0-10s**: Loading Transformers.js library
- **10-30s**: Downloading speech synthesis models (100-300MB)
- **30-60s**: ONNX model optimization and initialization
- **60s+**: Ready for speech synthesis

### Subsequent Uses
- **0-5s**: Models cached, quick initialization
- **5s+**: Ready for immediate use

## Performance Notes

### What You'll See
- ONNX Runtime warnings (normal optimization messages)
- WebAssembly stack traces (normal initialization)
- Progress indicators in browser console
- Memory usage increase during model loading

### Quality Benefits
- **Offline Capability**: Works without internet after initial load
- **Privacy**: No data sent to external services
- **Customization**: Potential for voice customization
- **No Rate Limits**: Unlimited local usage

## Troubleshooting

### If Loading Fails
- Check browser console for specific error messages
- Ensure stable internet connection for initial model download
- Verify sufficient device memory (2GB+ recommended)
- Try refreshing page if loading seems stuck

### Browser Compatibility
- **Best**: Chrome/Edge with WebAssembly support
- **Good**: Firefox with WASM enabled
- **Limited**: Safari (varies by version)
- **Challenging**: Mobile browsers (memory constraints)

## Recommendation

Local AI is now working better than initially expected! However, for most users, the **Enhanced Web Speech API** still provides the best balance of:
- ✅ Immediate availability (no download wait)
- ✅ Reliable cross-browser support
- ✅ High-quality natural voices
- ✅ Low memory usage
- ✅ Perfect streaming speech integration

Use Local AI when you specifically need offline capability or want to experiment with cutting-edge browser-based AI models.
