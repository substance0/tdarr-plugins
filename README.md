# Tdarr Flow Plugins Repository

A collection of custom Tdarr Flow plugins for automated media processing and transcoding workflows.

## 📁 Repository Structure

```
├── LocalFlowPlugins/         # Custom Flow plugins
│   └── tools/
│       └── discord/          # Discord webhook notifications
```

## 🚀 Featured Plugin: Discord Webhook Notifications

**Location**: `LocalFlowPlugins/tools/discord/1.0.0/`

A comprehensive Discord webhook notification system for Tdarr Flow that provides:

- **Rich Notifications**: Beautiful Discord embeds with media information and progress tracking
- **Message Updates**: Edit existing messages for real-time progress instead of creating new ones
- **OMDb Integration**: Automatic movie/TV show poster fetching
- **Compression Tracking**: Calculate and display file size reduction ratios
- **Flow Variables**: Persistent message ID storage across plugin instances
- **Multiple Modes**: Choose between message updates or sequential notifications

### Features:
- ✅ **Processing Events**: Start, Success, and Error notifications
- ✅ **Media Detection**: Automatic parsing of movie/TV show information from filenames
- ✅ **Poster Fetching**: Optional OMDb API integration for artwork
- ✅ **Compression Metrics**: Display original vs transcoded file sizes with savings
- ✅ **Error Handling**: Comprehensive validation and graceful error recovery
- ✅ **Security**: Sensitive data redaction in logs
- ✅ **Refactored Code**: Clean, maintainable, and well-documented codebase

### Usage:
1. Add the Discord plugin to your Tdarr Flow
2. Configure webhook URL from Discord server settings
3. Set notification type (start_processing, transcode_success, transcode_error)
4. Choose notification mode (updates vs sequential)
5. Optionally add OMDb API key for poster images

## 🛠 Installation

1. **Clone this repository** to your Tdarr server
2. **Copy LocalFlowPlugins/** to your Tdarr Flow plugins directory
3. **Restart Tdarr** to load new plugins
4. **Configure plugins** in your Flow workflows

## 📋 Requirements

- **Tdarr v2.11.01+** for Flow plugin support
- **Node.js** environment for plugin execution
- **Discord webhook URL** for notification plugins
- **OMDb API key** (optional) for poster fetching

## 🔧 Configuration

### Discord Webhook Setup:
1. Go to Discord Server Settings → Integrations → Webhooks
2. Create a new webhook or use existing one
3. Copy the webhook URL
4. Add URL to plugin configuration

### Flow Variables:
The Discord plugin uses Flow Variables (`args.variables.user`) to share message IDs between plugin instances, enabling message updates across different notification types.

## 📊 Performance Features

- **HTTP Client**: Unified request handling with proper timeouts and cleanup
- **Memory Efficient**: Response size limits and payload validation
- **Error Recovery**: Graceful fallbacks for network failures
- **Code Quality**: Refactored for maintainability and readability

## 🤝 Contributing

1. **Fork** this repository
2. **Create** a feature branch (`git checkout -b feature/amazing-plugin`)
3. **Commit** your changes (`git commit -m 'Add amazing plugin'`)
4. **Push** to the branch (`git push origin feature/amazing-plugin`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- **Tdarr Team** for creating an amazing media processing platform
- **Discord** for webhook API enabling rich notifications

---

**Note**: This repository contains custom plugins for Tdarr Flow. Always test plugins in a safe environment before deploying to production media libraries.
