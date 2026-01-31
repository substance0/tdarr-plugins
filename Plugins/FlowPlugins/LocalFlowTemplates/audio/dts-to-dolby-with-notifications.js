"use strict";
/* eslint-disable no-template-curly-in-string */
/* eslint-disable import/prefer-default-export */
Object.defineProperty(exports, "__esModule", { value: true });
exports.details = void 0;

/**
 * DTS to Dolby with Discord Notifications Flow Template
 *
 * A comprehensive audio transcoding template that:
 * - Converts DTS/DCA audio streams to EAC3 (Dolby Digital Plus)
 * - Sends Discord notifications for start, success, and error events
 * - Updates Sonarr with processing status
 * - Refreshes Plex library after completion
 * - Renames files based on audio codec changes
 *
 * Template Variables (configure in Tdarr UI):
 * - {{{args.userVariables.global.discord_webhook_url}}} - Discord webhook URL
 * - {{{args.userVariables.global.omdb_api_key}}} - OMDb API key (optional)
 * - {{{args.userVariables.global.sonarr_host}}} - Sonarr server URL
 * - {{{args.userVariables.global.sonarr_api_key}}} - Sonarr API key
 * - {{{args.userVariables.global.plex_host}}} - Plex server IP
 * - {{{args.userVariables.global.plex_token}}} - Plex authentication token
 * - {{{args.userVariables.global.tdarr_server_url}}} - Tdarr web interface URL
 *
 * @author Hugo
 * @version 1.0.0
 */
var details = function () {
  return {
    name: "DTS to Dolby with Discord Notifications",
    description:
      "Convert DTS/DCA audio to EAC3 with comprehensive Discord notifications, Sonarr integration, and Plex refresh. Uses global variables for configuration.",
    tags: "audio,transcoding,discord,sonarr,plex,dts,eac3,dolby",
    flowPlugins: [
      {
        name: "Input File",
        sourceRepo: "Community",
        pluginName: "inputFile",
        version: "1.0.0",
        id: "input-file",
        position: {
          x: 100,
          y: 100,
        },
      },
      {
        name: "Discord Start Notification",
        sourceRepo: "Local",
        pluginName: "discord",
        version: "1.1.0",
        id: "discord-start",
        position: {
          x: 300,
          y: 100,
        },
        inputsDB: {
          webhook_url: "{{{args.userVariables.global.discord_webhook_url}}}",
          notification_type: "start_processing",
          show_file_details: "true",
          show_processing_stats: "true",
          show_technical_details: "true",
          tdarr_server_url: "{{{args.userVariables.global.tdarr_server_url}}}",
          enable_cancel_button: "true",
          omdb_api_key: "{{{args.userVariables.global.omdb_api_key}}}",
          enable_message_editing: "true",
          enable_debug_info: "true",
        },
      },
      {
        name: "Check Audio Codec is DTS",
        sourceRepo: "Community",
        pluginName: "checkAudioCodec",
        version: "1.0.0",
        id: "check-dts",
        position: {
          x: 300,
          y: 100,
        },
        inputsDB: {
          codec: "dts",
        },
      },
      {
        name: "Check Audio Codec is DCA",
        sourceRepo: "Community",
        pluginName: "checkAudioCodec",
        version: "1.0.0",
        id: "check-dca",
        position: {
          x: 300,
          y: 150,
        },
        inputsDB: {
          codec: "dca",
        },
      },
      {
        name: "Transcode DTS/DCA to EAC3 (Fixed)",
        sourceRepo: "Community",
        pluginName: "runClassicTranscodePlugin",
        version: "2.0.0",
        id: "audio-transcode",
        position: {
          x: 500,
          y: 100,
        },
        inputsDB: {
          pluginSourceId:
            "Local:Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs_Fixed",
          codecs_to_transcode: "dca,dts",
          codec: "eac3",
          bitrate: "640k",
        },
      },
      {
        name: "Discord Success Notification",
        sourceRepo: "Local",
        pluginName: "discord",
        version: "1.1.0",
        id: "discord-success",
        position: {
          x: 700,
          y: 100,
        },
        inputsDB: {
          webhook_url: "{{{args.userVariables.global.discord_webhook_url}}}",
          notification_type: "transcode_success",
          tdarr_server_url: "{{{args.userVariables.global.tdarr_server_url}}}",
          omdb_api_key: "{{{args.userVariables.global.omdb_api_key}}}",
        },
      },
      {
        name: "Discord Error Notification",
        sourceRepo: "Local",
        pluginName: "discord",
        version: "1.1.0",
        id: "discord-error",
        position: {
          x: 700,
          y: 200,
        },
        inputsDB: {
          webhook_url: "{{{args.userVariables.global.discord_webhook_url}}}",
          notification_type: "transcode_error",
          show_file_details: "true",
          show_processing_stats: "true",
          show_technical_details: "true",
          tdarr_server_url: "{{{args.userVariables.global.tdarr_server_url}}}",
          enable_cancel_button: "true",
          omdb_api_key: "{{{args.userVariables.global.omdb_api_key}}}",
          enable_message_editing: "true",
          enable_debug_info: "true",
        },
      },
      {
        name: "Replace Original File",
        sourceRepo: "Community",
        pluginName: "replaceOriginalFile",
        version: "1.0.0",
        id: "replace-file",
        position: {
          x: 900,
          y: 100,
        },
      },
      {
        name: "Detect and Rename Audio Codecs",
        sourceRepo: "Community",
        pluginName: "runClassicTranscodePlugin",
        version: "2.0.0",
        id: "rename-codecs",
        position: {
          x: 1100,
          y: 100,
        },
        inputsDB: {
          pluginSourceId:
            "Community:Tdarr_Plugin_scha_rename_based_on_codec_schadi",
          rename_audio: "true",
        },
      },
      {
        name: "Notify Sonarr",
        sourceRepo: "Community",
        pluginName: "notifyRadarrOrSonarr",
        version: "2.0.0",
        id: "notify-sonarr",
        position: {
          x: 1300,
          y: 100,
        },
        inputsDB: {
          arr_host: "{{{args.userVariables.global.sonarr_host}}}",
          arr_api_key: "{{{args.userVariables.global.sonarr_api_key}}}",
          arr: "sonarr",
        },
      },
      {
        name: "Refresh Plex Library",
        sourceRepo: "Community",
        pluginName: "runClassicTranscodePlugin",
        version: "2.0.0",
        id: "plex-refresh",
        position: {
          x: 1500,
          y: 100,
        },
        inputsDB: {
          pluginSourceId: "Community:Tdarr_Plugin_goof1_URL_Plex_Refresh",
          Url_Protocol: "http",
          Plex_Url: "{{{args.userVariables.global.plex_host}}}",
          Plex_Token: "{{{args.userVariables.global.plex_token}}}",
        },
      },
    ],
    flowEdges: [
      {
        source: "input-file",
        sourceHandle: "1",
        target: "check-dts",
        targetHandle: null,
        id: "edge-check-dts",
      },
      {
        source: "input-file",
        sourceHandle: "1",
        target: "check-dca",
        targetHandle: null,
        id: "edge-check-dca",
      },
      {
        source: "check-dts",
        sourceHandle: "1",
        target: "discord-start",
        targetHandle: null,
        id: "edge-1",
      },
      {
        source: "check-dca",
        sourceHandle: "1",
        target: "discord-start",
        targetHandle: null,
        id: "edge-1-alt",
      },
      {
        source: "discord-start",
        sourceHandle: "1",
        target: "audio-transcode",
        targetHandle: null,
        id: "edge-2",
      },
      {
        source: "audio-transcode",
        sourceHandle: "1",
        target: "replace-file",
        targetHandle: null,
        id: "edge-3",
      },
      {
        source: "audio-transcode",
        sourceHandle: "err1",
        target: "discord-error",
        targetHandle: null,
        id: "edge-4",
      },
      {
        source: "replace-file",
        sourceHandle: "1",
        target: "rename-codecs",
        targetHandle: null,
        id: "edge-5",
      },
      {
        source: "rename-codecs",
        sourceHandle: "2",
        target: "discord-success",
        targetHandle: null,
        id: "edge-5b",
      },
      {
        source: "discord-success",
        sourceHandle: "1",
        target: "notify-sonarr",
        targetHandle: null,
        id: "edge-5c",
      },
      {
        source: "notify-sonarr",
        sourceHandle: "1",
        target: "plex-refresh",
        targetHandle: null,
        id: "edge-8",
      },
    ],
  };
};

exports.details = details;
