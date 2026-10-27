/* eslint-disable max-len */
/**
 * Fixed version of Tdarr_Plugin_scha_rename_based_on_codec_schadi.
 * - Support files (.srt/.nfo) are matched by the video's name up to its first "[" (series, episode and title),
 *   so one video no longer renames every subtitle in the folder when its name has dots inside the codec tags.
 * - A matched support file is renamed to the video's new name plus its own language/extension suffix,
 *   so it always lines up with the renamed video. An existing target file is never overwritten.
 */

// tdarrSkipTest
const details = () => ({
  id: 'Tdarr_Plugin_scha_rename_based_on_codec_schadi_Fixed',
  Stage: 'Post-processing',
  Name: 'Rename Based On Codec Video And Audio',
  Type: 'Video',
  Operation: 'Transcode',
  Description: `
    If the filename contains a codec information like h264, av1 or similar for video and AC3, AAC or trueHD \n\n
    the plugin will read the codec info from the file and rename it accordingly. \n\n
    It also takes care off addiotnal files deffined in the input Option.\n\n`,
  Version: '1.10',
  Tags: 'post-processing',
  Inputs: [
    {
      name: 'rename_audio',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: `Will Rename According to Audio Codec after x264 or x265.
                   \\nExample:\\n
                   true
                   \\nExample:\\n
                   false`,
    },
    {
      name: 'rename_video',
      type: 'boolean',
      defaultValue: false,
      inputUI: {
        type: 'dropdown',
        options: [
          'false',
          'true',
        ],
      },
      tooltip: `Will Rename According to Video Codec after x264 or x265.
                   \\nExample:\\n
                   true
                   \\nExample:\\n
                   false`,
    },
    {
      name: 'additional_extensions',
      type: 'string',
      defaultValue: '.nfo,.srt',
      inputUI: {
        type: 'text',
      },
      tooltip: `Additional file extensions to rename (comma-separated).
                   \\nExample:\\n
                   .nfo,.srt`,
    },
  ],
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const plugin = (file, librarySettings, inputs, otherArguments) => {
  const lib = require('../methods/lib')();
  // eslint-disable-next-line no-unused-vars,no-param-reassign
  inputs = lib.loadDefaultValues(inputs, details);

  const fs = require('fs');
  const path = require('path');

  const fileNameOld = file._id;

  const response = {
    file,
    removeFromDB: false,
    updateDB: true,
    infoLog: '',
    processFile: false,
  };

  const codecMap = {
    aac: 'AAC',
    ac3: 'AC3',
    av1: 'AV1',
    avc: 'h264',
    dts: 'DTS',
    eac3: 'EAC3',
    flac: 'FLAC',
    hevc: 'h265',
    mp2: 'MP2',
    mp3: 'MP3',
    mpeg2: 'MPEG2',
    truehd: 'TrueHD',
    x264: 'h264',
    x265: 'h265',
    h264: 'h264',
    h265: 'h265',
    // dts: 'DTS-X',
    'dts-hd ma': 'DTS-HD MA',
    'dts-es': 'DTS-HD ES',
    'dts-hd hra': 'DTS-HD HRA',
    'dts express ': 'DTS Express',
    'dts 96/24': 'DTS',
  };

  const videoCodecRegex = /(h264|h265|x264|x265|avc|hevc|mpeg2|av1)/gi;
  const audioCodecRegex = /(aac|ac3|eac3|flac|mp2|mp3|truehd|dts[-. ]hd[-. ]ma|dts[-. ]hd[-. ]es|dts[-. ]hd[-. ]hra|dts[-. ]express|dts)/gi;

  const videoStream = file.ffProbeData.streams.find((stream) => stream.codec_type === 'video');

  if (videoStream && inputs.rename_video) {
    const videoCodec = videoStream.codec_name.toLowerCase();

    if (videoCodec in codecMap) {
      const renamedCodec = codecMap[videoCodec];
      // eslint-disable-next-line no-param-reassign
      file._id = file._id.replace(videoCodecRegex, renamedCodec);
      // eslint-disable-next-line no-param-reassign
      file.file = file.file.replace(videoCodecRegex, renamedCodec);
    }
  }

  const audioStream = file.ffProbeData.streams.find((stream) => stream.codec_type === 'audio');

  if (audioStream && inputs.rename_audio) {
    const audioCodec = audioStream.codec_name.toLowerCase();

    if (audioCodec in codecMap) {
      const renamedCodec = codecMap[audioCodec];
      // eslint-disable-next-line no-param-reassign
      file._id = file._id.replace(audioCodecRegex, renamedCodec);
      // eslint-disable-next-line no-param-reassign
      file.file = file.file.replace(audioCodecRegex, renamedCodec);
    }
  }

  let additionalFilesCount = 0; // Counter for additional files found

  if (((audioStream && inputs.rename_audio) || (videoStream && inputs.rename_video)) && fileNameOld !== file._id) {
    const fileDir = path.dirname(fileNameOld);
    const oldBase = path.parse(fileNameOld).name;
    const newBase = path.parse(file._id).name;

    // Series, episode and title: everything before the first "[" tag.
    const matchPrefix = oldBase.split('[')[0].trim();

    const extensionList = inputs.additional_extensions.split(',').map((extension) => extension.trim()).filter(Boolean);
    const regex = new RegExp(`(${extensionList.map((extension) => extension.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`, 'i');

    if (matchPrefix.length >= 5) {
      fs.readdirSync(fileDir).forEach((supportFile) => {
        if (supportFile === path.basename(fileNameOld) || !supportFile.startsWith(matchPrefix) || !regex.test(supportFile)) {
          return;
        }

        // Language and extension, e.g. ".en.hi.srt": everything from the first dot after the last "]".
        const lastBracket = supportFile.lastIndexOf(']');
        const suffixStart = supportFile.indexOf('.', lastBracket + 1);
        if (suffixStart === -1) {
          return;
        }

        const renamedSupportFile = `${newBase}${supportFile.slice(suffixStart)}`;
        if (renamedSupportFile === supportFile || fs.existsSync(`${fileDir}/${renamedSupportFile}`)) {
          return;
        }

        fs.renameSync(`${fileDir}/${supportFile}`, `${fileDir}/${renamedSupportFile}`);

        response.infoLog += `${fileDir}/${supportFile} renamed to ${fileDir}/${renamedSupportFile}\n`;
        additionalFilesCount += 1; // Increment the count for each additional file found
      });
    }
  }

  if (fileNameOld !== file._id) {
    fs.renameSync(fileNameOld, file._id);
    response.infoLog += `Renamed file to: ${file._id}\n`;
    if (additionalFilesCount > 0) {
      response.infoLog += `and: ${additionalFilesCount} additional Files!\n`;
    }
    return response;
  }

  response.infoLog += 'Video File not renamed!\n';
  if (additionalFilesCount > 0) {
    response.infoLog += `But: ${additionalFilesCount} additional Files!\n`;
  }
  return response;
};

module.exports.details = details;
module.exports.plugin = plugin;
