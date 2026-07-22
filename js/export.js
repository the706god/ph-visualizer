import { state, $, FORMATS, getFreqDataForFrame } from './state.js';
import { renderCanvas } from './visualizer.js';

// Static image export
export function setupExportButtons() {
  $("#exportImage").addEventListener("click", () => {
    renderCanvas(true);
    const canvas = $("#mainCanvas");
    const link = document.createElement("a");
    link.download = 'prompthaus-' + (state.mood || "content") + '-' + state.format.replace(":", "x") + '.png';
    link.href = canvas.toDataURL("image/png");
    link.click();
    renderCanvas(false);
  });

  // MP4 export
  $("#exportVideo").addEventListener("click", async () => {
    if (state.exporting) return;
    state.exporting = true;

    const btn = $("#exportVideo");
    btn.disabled = true;
    $("#exportImage").disabled = true;
    const progressEl = $("#exportProgress");
    const progressText = $("#exportProgressText");
    const progressFill = $("#exportProgressFill");
    progressEl.classList.add("visible");
    progressText.textContent = "Loading MP4 encoder...";
    progressFill.style.width = "0%";

    if (typeof VideoEncoder === "undefined") {
      progressText.textContent = "Your browser does not support video encoding. Please use Chrome, Edge, or Safari 16.4+.";
      setTimeout(() => { progressEl.classList.remove("visible"); btn.disabled = false; $("#exportImage").disabled = false; state.exporting = false; }, 3000);
      return;
    }

    let Mp4Muxer;
    try {
      Mp4Muxer = await import("https://cdn.jsdelivr.net/npm/mp4-muxer@5/+esm");
    } catch (e) {
      console.error("Failed to load mp4-muxer:", e);
      progressText.textContent = "Failed to load MP4 library. Check connection.";
      setTimeout(() => { progressEl.classList.remove("visible"); btn.disabled = false; $("#exportImage").disabled = false; state.exporting = false; }, 3000);
      return;
    }

    const { w, h } = FORMATS[state.format];
    const fps = 30;
    const durationSec = Math.max(3, Math.min(300, parseInt($("#exportDuration").value) || 15));
    const totalFrames = durationSec * fps;
    const encW = w % 2 === 0 ? w : w - 1;
    const encH = h % 2 === 0 ? h : h - 1;

    const numCh = state.audioBuffer ? Math.min(state.audioBuffer.numberOfChannels, 2) : 2;
    const sampleRate = state.audioBuffer ? state.audioBuffer.sampleRate : 44100;

    progressText.textContent = "Initializing encoders...";
    progressFill.style.width = "3%";

    const muxer = new Mp4Muxer.Muxer({
      target: new Mp4Muxer.ArrayBufferTarget(),
      video: { codec: "avc", width: encW, height: encH },
      audio: { codec: "aac", numberOfChannels: numCh, sampleRate: sampleRate },
      fastStart: "in-memory",
      firstTimestampBehavior: "offset",
    });

    const videoEncoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => console.error("VideoEncoder error:", e),
    });

    let videoCodec = "avc1.640028";
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec: videoCodec, width: encW, height: encH, bitrate: 5000000, framerate: fps,
      });
      if (!support.supported) videoCodec = "avc1.42001e";
    } catch (e) {
      videoCodec = "avc1.42001e";
    }

    videoEncoder.configure({
      codec: videoCodec,
      width: encW,
      height: encH,
      bitrate: 5000000,
      framerate: fps,
      latencyMode: "quality",
    });

    const audioEncoder = new AudioEncoder({
      output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
      error: (e) => console.error("AudioEncoder error:", e),
    });

    audioEncoder.configure({
      codec: "mp4a.40.2",
      numberOfChannels: numCh,
      sampleRate: sampleRate,
      bitrate: 192000,
    });

    const canvas = $("#mainCanvas");
    canvas.width = encW;
    canvas.height = encH;

    if (state.audioElement && state.isPlaying) {
      state.audioElement.pause();
      state.isPlaying = false;
      $("#playPauseBtn").innerHTML = "&#9654;";
    }

    state.revealStartTime = 0;
    const frameInterval = 1000 / fps;
    const audioSamplesPerFrame = Math.floor(sampleRate / fps);

    progressText.textContent = "Encoding frames... 0 / " + totalFrames;

    for (let frame = 0; frame < totalFrames; frame++) {
      const timestampUs = Math.round(frame * (1000000 / fps));
      const fakeTimestamp = frame * frameInterval;

      const freqData = getFreqDataForFrame(frame, fps);
      renderCanvas(true, fakeTimestamp, freqData);

      const videoFrame = new VideoFrame(canvas, { timestamp: timestampUs });
      const keyFrame = frame % (fps * 2) === 0;
      videoEncoder.encode(videoFrame, { keyFrame: keyFrame });
      videoFrame.close();

      if (state.audioBuffer) {
        const audioStart = frame * audioSamplesPerFrame;
        const chunkSize = audioSamplesPerFrame;
        const audioChunkData = new Float32Array(chunkSize * numCh);

        for (let ch = 0; ch < numCh; ch++) {
          const srcCh = state.audioBuffer.getChannelData(Math.min(ch, state.audioBuffer.numberOfChannels - 1));
          const offset = ch * chunkSize;
          for (let s = 0; s < chunkSize; s++) {
            audioChunkData[offset + s] = (audioStart + s < srcCh.length) ? srcCh[audioStart + s] : 0;
          }
        }

        const audioData = new AudioData({
          format: "f32-planar",
          sampleRate: sampleRate,
          numberOfFrames: chunkSize,
          numberOfChannels: numCh,
          timestamp: timestampUs,
          data: audioChunkData,
        });
        audioEncoder.encode(audioData);
        audioData.close();
      }

      if (frame % 5 === 0) {
        const pct = 3 + Math.floor((frame / totalFrames) * 87);
        progressFill.style.width = pct + "%";
        progressText.textContent = "Encoding frame " + (frame + 1) + " / " + totalFrames;
        await new Promise(r => setTimeout(r, 0));
      }

      if (frame % 90 === 89) {
        await videoEncoder.flush();
        await audioEncoder.flush();
      }
    }

    progressText.textContent = "Finalizing MP4...";
    progressFill.style.width = "92%";

    await videoEncoder.flush();
    await audioEncoder.flush();
    videoEncoder.close();
    audioEncoder.close();
    muxer.finalize();

    progressFill.style.width = "98%";
    progressText.textContent = "Downloading...";

    const mp4Blob = new Blob([muxer.target.buffer], { type: "video/mp4" });
    const filename = "prompthaus-" + (state.mood || "content") + "-" + state.format.replace(":", "x") + ".mp4";

    const link = document.createElement("a");
    link.download = filename;
    link.href = URL.createObjectURL(mp4Blob);
    link.click();
    URL.revokeObjectURL(link.href);

    progressFill.style.width = "100%";
    progressText.textContent = "MP4 exported with audio.";

    setTimeout(() => {
      progressEl.classList.remove("visible");
      btn.disabled = false;
      $("#exportImage").disabled = false;
      state.exporting = false;
      state.revealStartTime = null;
      renderCanvas(false);
    }, 1500);
  });
}
