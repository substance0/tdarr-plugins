/* eslint-disable */
/**
 * Fixed version of: Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs
 * Original: https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs.js
 *
 * Bug Fix Summary:
 * - Changed -map 0:v to -map 0 (preserves all stream indices, fixes cover art handling)
 * - Removed redundant audio stream mappings and subtitle/data mappings
 * - Changed -b:a to -b:a:${i} (applies bitrate to specific audio stream)
 */
const details = () => {
  return {
    id: "Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs_Fixed",
    Stage: "Pre-processing",
    Name: "Transcode Specific Audio Stream Codecs",
    Type: "Audio",
    Operation: "Transcode",
    Description: `[Contains built-in filter] Transcode audio streams with specific codecs into another codec.  \n\n`,
    Version: "1.1.0",
    Tags: "pre-processing,audio only,ffmpeg,configurable",
    Inputs: [
      {
        name: "codecs_to_transcode",
        type: "string",
        defaultValue: "ac3",
        inputUI: {
          type: "text",
        },
        tooltip: `Specifiy the codecs which you'd like to transcode
        \\nExample:\\n
        ac3
        \\nExample:\\n
        eac3,ac3,aac
        `,
      },
      {
        name: "codec",
        type: "string",
        defaultValue: "aac",
        inputUI: {
          type: "text",
        },
        tooltip: `Specify the codec you'd like to transcode into:
        \\n aac
        \\n ac3
        \\n eac3
        \\n dts
        \\n flac
        \\n mp2
        \\n mp3
        \\n truehd
        \\nExample:\\n
        eac3

        `,
      },
      {
        name: "bitrate",
        type: "string",
        defaultValue: "",
        inputUI: {
          type: "text",
        },
        tooltip: `Specify the transcoded audio bitrate (optional):
        \\n 384k
        \\n 640k
        \\nExample:\\n
        640k

        `,
      },
    ],
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require("../methods/lib")();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);
  //Must return this object

  var response = {
    processFile: false,
    preset: "",
    container: ".mp4",
    handBrakeMode: false,
    FFmpegMode: false,
    reQueueAfter: false,
    infoLog: "",
  };

  if (inputs.codecs_to_transcode === undefined || inputs.codec === undefined) {
    response.processFile = false;
    response.infoLog += "☒ Inputs not entered! \n";
    return response;
  }

  var encoder = inputs.codec;

  if (encoder == "mp3") {
    encoder = `libmp3lame`;
  } else if (encoder == "dts") {
    encoder = `dca`;
  }

  var codecs_to_transcode = inputs.codecs_to_transcode.split(",");
  var hasStreamsToTranscode = false;

  // FIX: Use -map 0 instead of -map 0:v
  // Original used -map 0:v which only maps video streams.
  // Files with embedded cover art (treated as mjpeg video stream) caused incorrect output stream ordering:
  // - Output stream 0: Main video (HEVC)
  // - Output stream 1: Cover art (MJPEG) <- WRONG! Should be audio
  // - Output stream 2: Audio (DTS/AC3) <- Wrong index
  // Using -map 0 preserves all streams in order, keeping audio at the correct index.
  var ffmpegCommand = `, -c copy -map 0`;

  for (var i = 0; i < file.ffProbeData.streams.length; i++) {
    if (
      file.ffProbeData.streams[i].codec_type.toLowerCase() == "audio" &&
      file.ffProbeData.streams[i].codec_name &&
      codecs_to_transcode.includes(
        file.ffProbeData.streams[i].codec_name.toLowerCase(),
      )
    ) {
      // FIX: Only apply codec specification for streams needing transcoding
      // Removed: -map 0:${i} (now handled by -map 0 at the start)
      ffmpegCommand += ` -c:${i} ${encoder}`;

      // FIX: Use -b:a:${i} instead of -b:a
      // Targets bitrate to specific audio stream index, preventing conflicts with multiple audio streams
      if (inputs.bitrate !== "") {
        ffmpegCommand += ` -b:a:${i} ${inputs.bitrate}`;
      }
      hasStreamsToTranscode = true;
    }
    // FIX: Removed else if block that mapped audio streams with -map 0:${i}
    // No longer needed since -map 0 already includes all audio streams
  }

  // FIX: Removed -map 0:s? -map 0:d? (subtitles and data streams)
  // No longer needed since -map 0 already includes subtitles, data streams, and all other streams
  ffmpegCommand += ` -max_muxing_queue_size 9999`;

  if (hasStreamsToTranscode == false) {
    response.processFile = false;
    response.infoLog +=
      "☑ File does not have any streams that need to be transcoded! \n";
    return response;
  } else {
    response.processFile = true;
    response.preset = ffmpegCommand;
    response.container = "." + file.container;
    response.handBrakeMode = false;
    response.FFmpegMode = true;
    response.reQueueAfter = true;
    response.infoLog += `☒ File has streams which aren't in desired codec! \n`;
    return response;
  }
};

module.exports.details = details;
module.exports.plugin = plugin;
