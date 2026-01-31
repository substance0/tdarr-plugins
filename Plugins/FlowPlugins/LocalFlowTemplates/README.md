# Tdarr Flow Templates

Collection of reusable Flow Templates for common media processing workflows.

## 📋 Available Templates

### DTS to Dolby with Discord Notifications

**File**: `audio/dts-to-dolby-with-notifications.js`

A comprehensive audio transcoding template that:

- **Converts** DTS/DCA audio streams to EAC3 (Dolby Digital Plus)
- **Sends** Discord notifications for start, success, and error events
- **Updates** Sonarr with processing status
- **Refreshes** Plex library after completion
- **Renames** files based on audio codec changes

#### Features:

- ✅ **Rich Discord Notifications** with OMDb poster integration
- ✅ **Message Updates** instead of spam (single message thread)
- ✅ **Parameterized Variables** for easy customization
- ✅ **Error Handling** with proper notification routing
- ✅ **Post-Processing** file replacement and renaming
- ✅ **Integration** with Sonarr and Plex

#### Global Variables Required:

Set these in Tdarr Tools tab → Global Variables:

- `discord_webhook_url` - Discord webhook for notifications (required)
- `omdb_api_key` - OMDb API key for posters (optional)
- `sonarr_host` - Sonarr server URL (required)
- `sonarr_api_key` - Sonarr API key (required)
- `plex_host` - Plex server IP (required)
- `plex_token` - Plex authentication token (required)
- `tdarr_server_url` - Tdarr web interface URL (optional)

## 🛠 How to Use Templates

### Method 1: Import via Tdarr UI

1. **Set Global Variables** in Tdarr Tools tab first
2. **Go to** Flows tab in Tdarr
3. **Click** Flow+ to create new flow
4. **Select** "Import Template"
5. **Browse** to template .js file
6. **Import** and the global variables will be automatically used

### Method 2: Manual Copy

1. **Copy** template .js file to your LocalFlowTemplates folder
2. **Restart** Tdarr to load new template
3. **Create** new Flow and select the template
4. **Global variables** will be automatically populated

### Global Variable Setup:

Set these in Tdarr **Tools** → **Global Variables**:

```
discord_webhook_url = https://discord.com/api/webhooks/1234567890/your-webhook-token
omdb_api_key = your_omdb_api_key
sonarr_host = http://192.168.1.3:8989
sonarr_api_key = your_sonarr_api_key
plex_host = 192.168.1.3
plex_token = your_plex_token
tdarr_server_url = http://192.168.1.3:8265/
```

## 🔧 Template Structure

Templates are JavaScript files that export a `details` function:

```javascript
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.details = void 0;

var details = function () {
  return {
    name: "Template Name",
    description: "Template description",
    tags: "tag1,tag2,tag3",
    flowPlugins: [
      // Plugin configurations
    ],
    flowEdges: [
      // Plugin connections
    ],
  };
};

exports.details = details;
```

## 📝 Creating Your Own Templates

1. **Export** your existing flow from Tdarr (JSON format)
2. **Convert** to JavaScript template format
3. **Replace** hardcoded values with global variables
4. **Test** template by copying to LocalFlowTemplates
5. **Document** required global variables

### Global Variable Usage:

Replace hardcoded values with global variable references:

```javascript
// Instead of:
webhook_url: "https://discord.com/api/webhooks/123/abc";

// Use:
webhook_url: "{{{args.userVariables.global.discord_webhook_url}}}";
```

## 🚀 Best Practices

- **Use** descriptive variable names
- **Provide** clear descriptions and examples
- **Set** sensible defaults where possible
- **Group** related functionality logically
- **Test** templates thoroughly before sharing
- **Document** requirements and dependencies

## 📄 Template Sharing

Templates can be:

- **Shared** via GitHub repositories
- **Distributed** through Tdarr community
- **Customized** for specific use cases
- **Version controlled** for updates

---

**Note**: Always test templates in a safe environment before using with production media files.
