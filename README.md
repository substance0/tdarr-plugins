# Tdarr Plugins Repository

A collection of custom Tdarr plugins for automated media processing, audio transcoding, and flow automation.

## 📦 Available Plugins

### Classic Plugins

**Audio Stream Transcoding Plugin** (`Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs_Fixed`)

Fixed version of the Community plugin that addresses stream mapping issues with files containing embedded cover art or multiple video streams. Original: [HaveAGitGat/Tdarr_Plugins](https://github.com/HaveAGitGat/Tdarr_Plugins/blob/master/Community/Tdarr_Plugin_a9hd_FFMPEG_Transcode_Specific_Audio_Stream_Codecs.js)

- Transcodes audio streams to specific codecs (EAC3, DTS, AAC, FLAC, etc.)
- Configurable bitrate per stream
- Corrects stream mapping for files with embedded cover art

### Flow Plugins

**Discord Webhook Notifications** (`discord`)

- Sends rich Discord notifications for media processing events (start, success, error)
- Real-time message updates with processing progress
- Optional OMDb integration for media artwork
- Configurable notification modes and formatting

## 📋 Flow Templates

**DTS to Dolby with Discord Notifications** (`dts-to-dolby-with-notifications`)

- End-to-end workflow for converting DTS/DCA audio to EAC3
- Includes Discord notifications at each stage
- Integrates with Sonarr and Plex for library updates
- Validates audio codec before processing
- Ready-to-use template with global variable configuration

## 🛠 Installation

Copy plugins to your Tdarr server:

- Classic plugins: `Plugins/Local/` → `Tdarr/Plugins/local/`
- Flow plugins: `Plugins/FlowPlugins/LocalFlowPlugins/` → `Tdarr/Plugins/FlowPlugins/LocalFlowPlugins/`
- Templates: `Plugins/FlowPlugins/LocalFlowTemplates/` → `Tdarr/Plugins/FlowPlugins/LocalFlowTemplates/`

Restart Tdarr to load the plugins.

## 📋 Requirements

- Tdarr v2.11.01+ (for Flow plugin support)
- Node.js environment for plugin execution
