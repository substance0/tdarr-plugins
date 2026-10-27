const https = require("https");
const { URL } = require("url");

const CONSTANTS = {
  COLORS: {
    PROCESSING: 0x3498db,
    SUCCESS: 0x2ecc71,
    ERROR: 0xe74c3c,
    CANCELLED: 0x95a5a6,
  },
  TIMEOUTS: {
    OMDB_REQUEST: 5000,
    DISCORD_WEBHOOK: 10000,
  },
  LIMITS: {
    PAYLOAD_SIZE: 50000,
    RESPONSE_SIZE: 10000,
    FIELD_NAME_LENGTH: 256,
    FIELD_VALUE_LENGTH: 1024,
    DESCRIPTION_LENGTH: 4000,
    FOOTER_LENGTH: 2048,
  },
  CHANNEL_NAMES: {
    1: "Mono",
    2: "Stereo",
    6: "5.1",
    8: "7.1",
  },
  LANGUAGE_FLAGS: {
    EN: "🇺🇸",
    FR: "🇫🇷",
    ES: "🇪🇸",
    DE: "🇩🇪",
    IT: "🇮🇹",
    JA: "🇯🇵",
    KO: "🇰🇷",
    ZH: "🇨🇳",
  },
  DEFAULTS: {
    USER_AGENT: "Tdarr-Discord-Plugin/2.0.0",
    UNKNOWN_LIBRARY: "Unknown Library",
    POSTER_URL:
      "https://github.com/HaveAGitGat/Tdarr/raw/master/src/assets/images/favicon.png",
  },
};

const NOTIFICATION_CONFIGS = {
  start_processing: {
    title: "Started processing file",
    color: CONSTANTS.COLORS.PROCESSING,
    emoji: "🚀",
  },
  transcode_success: {
    title: "Transcode completed",
    color: CONSTANTS.COLORS.SUCCESS,
    emoji: "✅",
  },
  transcode_error: {
    title: "Transcode failed",
    color: CONSTANTS.COLORS.ERROR,
    emoji: "❌",
  },
};

const MEDIA_PATTERNS = {
  TV_WITH_YEAR:
    /^(.+?)[\s\.\-]*[\(\[]?(\d{4})[\)\]]?[\s\.\-]*S(\d+)E(\d+)[\s\.\-]*(.*)$/i,
  TV_NO_YEAR: /^(.+?)[\s\.\-]*S(\d+)E(\d+)[\s\.\-]*(.*)$/i,
  TV_SEASON_EPISODE:
    /^(.+?)[\s\.\-]*Season[\s\.\-]*(\d+)[\s\.\-]*Episode[\s\.\-]*(\d+)[\s\.\-]*(.*)$/i,
  MOVIE: /^(.+?)[\s\.\-]*[\(\[]?(\d{4})[\)\]]?/i,
  IMDB_ID: /(?:\[|\{|\()?(?:imdb[-\s]?)?(?:id[-\s]?)?(tt\d{7,8})(?:\]|\}|\))?/i,
};

const details = () => ({
  name: "Discord Webhook Notification",
  description:
    "Send rich Discord notifications for Tdarr processing events with clean, professional formatting. Supports message editing for real-time progress updates - completion/error notifications will update the original start message instead of creating new ones.",
  style: { borderColor: "#5865F2" },
  tags: "video,notification,discord",
  isStartPlugin: false,
  pType: "",
  requiresVersion: "2.11.01",
  sidebarPosition: -1,
  icon: "faDiscord",
  inputs: [
    {
      label: "Discord Webhook URL",
      name: "webhook_url",
      type: "string",
      defaultValue: "",
      inputUI: { type: "text" },
      tooltip:
        "The Discord webhook URL to send notifications to. Get this from Discord Server Settings > Integrations > Webhooks",
    },
    {
      label: "Notification Type",
      name: "notification_type",
      type: "string",
      defaultValue: "start_processing",
      inputUI: {
        type: "dropdown",
        options: [
          { value: "start_processing", label: "🚀 Started processing file" },
          { value: "transcode_success", label: "✅ Transcode completed" },
          { value: "transcode_error", label: "❌ Transcode failed" },
        ],
      },
      tooltip: "Select the type of notification to send",
    },
    {
      label: "Tdarr Server URL (Optional)",
      name: "tdarr_server_url",
      type: "string",
      defaultValue: "",
      inputUI: { type: "text" },
      tooltip:
        "Tdarr web interface URL (e.g., http://localhost:8265) to include management link. Leave empty to disable.",
    },
    {
      label: "OMDb API Key (Optional)",
      name: "omdb_api_key",
      type: "string",
      defaultValue: "",
      inputUI: { type: "text" },
      tooltip:
        "OMDb API key to fetch movie/TV show posters. Get free API key (1000 requests/day) at https://www.omdbapi.com/apikey.aspx",
    },
    {
      label: "Notification Mode",
      name: "notification_mode",
      type: "string",
      defaultValue: "updates",
      inputUI: {
        type: "dropdown",
        options: [
          { value: "updates", label: "📝 Updates (Edit existing messages)" },
          { value: "sequential", label: "📨 Sequential (Send new messages)" },
        ],
      },
      tooltip:
        "Choose notification mode: Updates will edit existing messages for progress tracking. Sequential will send separate messages for each notification.",
    },
  ],
  outputs: [
    {
      number: 1,
      tooltip: "Continue to next plugin (notification sent successfully)",
    },
    {
      number: 2,
      tooltip:
        "Continue to next plugin (notification failed but processing continues)",
    },
  ],
});

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const cleanString = (str) => str.replace(/[\.\-_]/g, " ").trim();

const redactSensitiveData = (value, type = "key") => {
  if (!value || typeof value !== "string") return "[INVALID]";

  if (type === "webhook") {
    const match = value.match(
      /^(https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/).+$/,
    );
    if (match) return `${match[1]}***`;
    return "***[INVALID_WEBHOOK]***";
  }

  if (type === "apikey") {
    if (value.length > 6) {
      return `${value.slice(0, 4)}***${value.slice(-2)}`;
    }
    return "***";
  }

  return value.length > 4 ? `${value.slice(0, 2)}***${value.slice(-2)}` : "***";
};

const validateInputs = (inputs, args) => {
  const errors = [];

  if (!inputs.webhook_url) {
    errors.push("Discord webhook URL is required");
  } else if (typeof inputs.webhook_url !== "string") {
    errors.push("Discord webhook URL must be a string");
  } else {
    try {
      new URL(inputs.webhook_url);
      if (
        !inputs.webhook_url.match(
          /^https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/,
        )
      ) {
        errors.push(
          `Invalid Discord webhook URL format: ${redactSensitiveData(inputs.webhook_url, "webhook")}`,
        );
      }
    } catch {
      errors.push(
        `Invalid URL format: ${redactSensitiveData(inputs.webhook_url, "webhook")}`,
      );
    }
  }

  if (
    inputs.notification_type &&
    !NOTIFICATION_CONFIGS[inputs.notification_type]
  ) {
    errors.push(
      `Invalid notification type: ${inputs.notification_type}. Valid types: ${Object.keys(NOTIFICATION_CONFIGS).join(", ")}`,
    );
  }

  if (inputs.omdb_api_key) {
    if (typeof inputs.omdb_api_key !== "string") {
      errors.push("OMDb API key must be a string");
    } else if (inputs.omdb_api_key.trim().length === 0) {
      errors.push("OMDb API key cannot be empty");
    } else if (
      inputs.omdb_api_key.length < 8 ||
      inputs.omdb_api_key.length > 50
    ) {
      errors.push(
        `OMDb API key has invalid length: ${redactSensitiveData(inputs.omdb_api_key, "apikey")}`,
      );
    } else if (!/^[a-zA-Z0-9]+$/.test(inputs.omdb_api_key)) {
      errors.push(
        `OMDb API key contains invalid characters: ${redactSensitiveData(inputs.omdb_api_key, "apikey")}`,
      );
    }
  }

  if (inputs.tdarr_server_url) {
    if (typeof inputs.tdarr_server_url !== "string") {
      errors.push("Tdarr server URL must be a string");
    } else {
      try {
        new URL(inputs.tdarr_server_url);
      } catch {
        errors.push(
          `Invalid Tdarr server URL format: ${inputs.tdarr_server_url}`,
        );
      }
    }
  }

  if (inputs.notification_mode) {
    if (typeof inputs.notification_mode !== "string") {
      errors.push("Notification mode must be a string");
    } else if (!["updates", "sequential"].includes(inputs.notification_mode)) {
      errors.push(
        `Invalid notification mode: ${inputs.notification_mode}. Valid modes: updates, sequential`,
      );
    }
  }

  if (errors.length > 0) {
    errors.forEach((error) => args.jobLog(`❌ Validation error: ${error}`));
    return false;
  }

  return true;
};

const parseMediaInfo = (filePath) => {
  const fileName = filePath.split("/").pop() || "";

  for (const [key, pattern] of Object.entries(MEDIA_PATTERNS)) {
    if (key === "IMDB_ID") continue;

    const match = fileName.match(pattern);
    if (match) {
      if (key.startsWith("TV")) {
        const hasYear = match.length === 6;
        const [, title, year, season, episode] = hasYear
          ? match
          : [, match[1], undefined, match[2], match[3]];
        return {
          type: "tv",
          title: cleanString(title),
          year: hasYear ? year : undefined,
          season: season.padStart(2, "0"),
          episode: episode.padStart(2, "0"),
        };
      } else if (key === "MOVIE") {
        const [, title, year] = match;
        return {
          type: "movie",
          title: cleanString(title),
          year,
        };
      }
    }
  }

  return {
    type: "unknown",
    title: fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[\.\-_]/g, " ")
      .trim(),
  };
};

const getLibraryName = (args) => {
  return args.librarySettings?.name || CONSTANTS.DEFAULTS.UNKNOWN_LIBRARY;
};

const formatAudioStream = (stream) => {
  const codec = (stream.codec_name || "Unknown").toUpperCase();
  const channels = stream.channels || 0;
  const channelInfo =
    CONSTANTS.CHANNEL_NAMES[channels] || (channels ? `${channels}ch` : "");

  let trackType = "";
  if (stream.disposition) {
    const dispositionMap = {
      comment: "Commentary",
      default: "Main",
      dub: "Dubbed",
      original: "Original",
      hearing_impaired: "Audio Description",
    };
    for (const [key, value] of Object.entries(dispositionMap)) {
      if (stream.disposition[key] === 1) {
        trackType = ` (${value})`;
        break;
      }
    }
  }

  let language = "";
  if (stream.tags?.language) {
    const lang = stream.tags.language.toUpperCase();
    const flag = CONSTANTS.LANGUAGE_FLAGS[lang] || "🌐";
    language = ` ${flag} ${lang}`;
  }

  return `${codec}${channelInfo ? ` ${channelInfo}` : ""}${trackType}${language}`;
};

const getAudioCodecInfo = (ffProbeData) => {
  if (!ffProbeData?.streams) return null;

  const audioStreams = ffProbeData.streams.filter(
    (s) => s.codec_type === "audio",
  );
  if (audioStreams.length === 0) return null;

  const audioInfos = audioStreams.map(formatAudioStream);
  return (
    "\n" + audioInfos.map((info, index) => `${index + 1}. ${info}`).join("\n")
  );
};

const getFileBasicInfo = (fileInfo) => {
  const details = [];

  if (fileInfo.file) {
    details.push(`File: ${fileInfo.file}`);
  }

  return details;
};

const getVideoInfo = (ffProbeData) => {
  if (!ffProbeData?.streams) return null;

  const videoStream = ffProbeData.streams.find((s) => s.codec_type === "video");

  if (!videoStream) return null;

  const codec = (videoStream.codec_name || "Unknown").toUpperCase();
  const resolution =
    videoStream.width && videoStream.height
      ? `${videoStream.width}x${videoStream.height}`
      : "Unknown";

  return `Video: ${codec} • ${resolution}`;
};

const getMediaStreamInfo = (fileInfo) => {
  const details = [];

  if (fileInfo.ffProbeData?.streams) {
    const videoInfo = getVideoInfo(fileInfo.ffProbeData);
    if (videoInfo) {
      details.push(videoInfo);
    }

    const audioInfo = getAudioCodecInfo(fileInfo.ffProbeData);
    if (audioInfo) {
      const label = audioInfo.includes("\n") ? "Audio Tracks:" : "Audio:";
      details.push(`${label}${audioInfo}`);
    }
  }

  return details;
};

const buildNotificationDetails = (fileInfo) => {
  return [...getFileBasicInfo(fileInfo), ...getMediaStreamInfo(fileInfo)];
};

const createHttpClient = () => {
  const makeRequest = (
    options,
    data = null,
    timeout = CONSTANTS.TIMEOUTS.OMDB_REQUEST,
  ) => {
    return new Promise((resolve) => {
      let isResolved = false;
      let req = null;

      const cleanup = () => {
        if (req && !req.destroyed) req.destroy();
      };

      const resolveOnce = (result) => {
        if (!isResolved) {
          isResolved = true;
          resolve(result);
        }
      };

      try {
        req = https.request({ ...options, timeout }, (res) => {
          if (isResolved) return;

          let responseData = "";
          res.on("data", (chunk) => {
            responseData += chunk;
            if (responseData.length > CONSTANTS.LIMITS.RESPONSE_SIZE) {
              responseData =
                responseData.slice(0, CONSTANTS.LIMITS.RESPONSE_SIZE) +
                "...[truncated]";
            }
          });

          res.on("end", () => {
            if (isResolved) return;
            resolveOnce({
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              data: responseData,
            });
          });

          res.on("error", (error) => {
            if (!isResolved)
              resolveOnce({ success: false, error: error.message });
          });
        });

        req.on("error", (error) => {
          if (!isResolved) {
            cleanup();
            resolveOnce({ success: false, error: error.message });
          }
        });

        req.on("timeout", () => {
          if (!isResolved) {
            cleanup();
            resolveOnce({
              success: false,
              error: `Request timeout after ${timeout}ms`,
            });
          }
        });

        if (data) req.write(data);
        req.end();
      } catch (error) {
        if (!isResolved) resolveOnce({ success: false, error: error.message });
      }
    });
  };

  return { makeRequest };
};

const httpClient = createHttpClient();

const makeHttpRequest = async (
  url,
  timeout = CONSTANTS.TIMEOUTS.OMDB_REQUEST,
) => {
  const urlObj = new URL(url);
  const options = {
    hostname: urlObj.hostname,
    path: urlObj.pathname + urlObj.search,
    method: "GET",
  };

  const result = await httpClient.makeRequest(options, null, timeout);
  if (!result.success) {
    throw new Error(result.error);
  }

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`HTTP ${result.statusCode}: ${result.data.slice(0, 100)}`);
  }

  try {
    return JSON.parse(result.data);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${error.message}`);
  }
};

const fetchPosterImage = async (
  title,
  year,
  type,
  omdbApiKey,
  filename,
  args,
) => {
  if (
    !omdbApiKey ||
    typeof omdbApiKey !== "string" ||
    omdbApiKey.trim().length === 0
  ) {
    args.jobLog("🔍 No OMDb API key provided, skipping poster fetch");
    return null;
  }

  try {
    const imdbId = filename?.match(MEDIA_PATTERNS.IMDB_ID)?.[1];

    if (imdbId) {
      args.jobLog(`🎬 Found IMDb ID: ${imdbId}`);
      const idUrl = `https://www.omdbapi.com/?i=${imdbId}&apikey=${omdbApiKey}`;
      const result = await makeHttpRequest(idUrl);

      if (
        result.Response === "True" &&
        result.Poster &&
        result.Poster !== "N/A"
      ) {
        return result.Poster;
      }
    }

    const searchUrl = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}${year ? `&y=${year}` : ""}&type=${type === "tv" ? "series" : "movie"}&apikey=${omdbApiKey}`;
    const result = await makeHttpRequest(searchUrl);

    if (
      result.Response === "True" &&
      result.Poster &&
      result.Poster !== "N/A"
    ) {
      return result.Poster;
    }

    return null;
  } catch (error) {
    args.jobLog(
      `❌ OMDb error (API key: ${redactSensitiveData(omdbApiKey, "apikey")}): ${error.message}`,
    );
    return null;
  }
};

const editDiscordWebhookMessage = async (
  webhookUrl,
  messageId,
  payload,
  args,
) => {
  try {
    const postData = JSON.stringify(payload);
    if (postData.length > CONSTANTS.LIMITS.PAYLOAD_SIZE) {
      args.jobLog(
        `❌ Payload too large (${postData.length} chars) for Discord webhook edit`,
      );
      return false;
    }

    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: `${url.pathname}/messages/${messageId}${url.search}`,
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": CONSTANTS.DEFAULTS.USER_AGENT,
      },
    };

    const result = await httpClient.makeRequest(
      options,
      postData,
      CONSTANTS.TIMEOUTS.DISCORD_WEBHOOK,
    );
    const success =
      result.success && result.statusCode >= 200 && result.statusCode < 300;

    const message = success
      ? `✅ Discord message edited successfully (${result.statusCode})`
      : `❌ Discord message edit failed: ${result.statusCode}${result.data ? ` - ${result.data.slice(0, 100)}` : ""}`;

    args.jobLog(message);
    return success;
  } catch (error) {
    args.jobLog(`❌ Discord webhook edit error: ${error.message}`);
    return false;
  }
};

const validateDiscordPayload = (payload, args) => {
  if (!payload || typeof payload !== "object") {
    args.jobLog(`❌ Invalid payload structure: ${typeof payload}`);
    return false;
  }

  if (!payload.embeds || !Array.isArray(payload.embeds)) {
    args.jobLog(`❌ Invalid embeds structure: ${typeof payload.embeds}`);
    return false;
  }

  for (let i = 0; i < payload.embeds.length; i++) {
    const embed = payload.embeds[i];
    if (!embed || typeof embed !== "object") {
      args.jobLog(`❌ Invalid embed ${i} structure: ${typeof embed}`);
      return false;
    }
  }

  return true;
};

const sendDiscordWebhook = async (webhookUrl, payload, args) => {
  try {
    if (!validateDiscordPayload(payload, args)) {
      return { success: false, messageId: null };
    }

    const postData = JSON.stringify(payload);
    if (postData.length > CONSTANTS.LIMITS.PAYLOAD_SIZE) {
      args.jobLog(
        `❌ Payload too large (${postData.length} chars) for Discord webhook`,
      );
      return { success: false, messageId: null };
    }

    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": CONSTANTS.DEFAULTS.USER_AGENT,
      },
    };

    const result = await httpClient.makeRequest(
      options,
      postData,
      CONSTANTS.TIMEOUTS.DISCORD_WEBHOOK,
    );
    const success =
      result.success && result.statusCode >= 200 && result.statusCode < 300;

    if (success) {
      args.jobLog(
        `✅ Discord notification sent to ${redactSensitiveData(webhookUrl, "webhook")} (${result.statusCode})`,
      );

      if (result.data && result.data.trim().length > 0) {
        try {
          const messageData = JSON.parse(result.data);
          return { success: true, messageId: messageData.id };
        } catch (parseError) {
          args.jobLog(
            `⚠️ Discord notification sent but failed to parse response: ${parseError.message}`,
          );
          return { success: true, messageId: null };
        }
      } else {
        args.jobLog(
          `⚠️ Discord notification sent but no response data received (may not have ?wait=true parameter)`,
        );
        return { success: true, messageId: null };
      }
    } else {
      const message = `❌ Discord webhook failed to ${redactSensitiveData(webhookUrl, "webhook")}: ${result.statusCode}${result.data ? ` - ${result.data.slice(0, 100)}` : ""}`;
      args.jobLog(message);
      return { success: false, messageId: null };
    }
  } catch (error) {
    args.jobLog(
      `❌ Discord webhook error to ${redactSensitiveData(webhookUrl, "webhook")}: ${error.message}`,
    );
    return { success: false, messageId: null };
  }
};

const storeMessageId = (args, jobId, messageId) => {
  if (!args || !jobId || !messageId) return;

  if (!args.variables) args.variables = {};
  if (!args.variables.user) args.variables.user = {};

  const flowVariableName = `discordMessage_${jobId}`;
  args.variables.user[flowVariableName] = messageId;

  args.jobLog(`💾 Stored Discord message ID for future updates`);
};

const getStoredMessageId = (args, jobId) => {
  if (!args || !jobId) return null;

  const flowVariableName = `discordMessage_${jobId}`;
  const messageId = args.variables?.user?.[flowVariableName];

  if (messageId) {
    args.jobLog(
      `📝 Found existing Discord message - updating instead of creating new`,
    );
  }

  return messageId;
};

const createDiscordEmbed = (
  config,
  mainTitle,
  description,
  posterUrl,
  libraryName,
  jobId,
  notificationType = "start_processing",
  args,
) => {
  const libraryPrefix = libraryName ? `\`${libraryName}\`\n` : "";
  const footerText = jobId ? `Job ID: ${jobId}` : "Job ID: Unknown";

  const embedTitle = "File Processing Status";

  const jobStartTime = getJobStartTime(args);
  const processingDuration = getProcessingDuration(args, notificationType);

  const statusEmoji = getStatusEmoji(notificationType);

  const fileDuration = args.inputFileObj?.duration || 0;

  let currentFileSize = 0;
  let originalFileSize = 0;

  if (notificationType === "transcode_success") {
    currentFileSize = args.inputFileObj?.file_size || 0;
    originalFileSize = args.originalLibraryFile?.file_size || 0;
  } else {
    currentFileSize = args.inputFileObj?.file_size || 0;
  }

  const durationText =
    fileDuration > 0 ? formatDuration(fileDuration) : "Unknown";

  let fileSizeFields = [];

  if (notificationType === "start_processing" && currentFileSize > 0) {
    fileSizeFields = [
      {
        name: "Original Size",
        value: `${currentFileSize.toFixed(2)} MB`,
        inline: true,
      },
    ];
  } else if (notificationType === "transcode_success") {
    if (currentFileSize > 0 && originalFileSize > 0) {
      const ratio =
        ((originalFileSize - currentFileSize) / originalFileSize) * 100;
      const savings = originalFileSize - currentFileSize;

      fileSizeFields = [
        {
          name: "Original Size",
          value: `${originalFileSize.toFixed(2)} MB`,
          inline: true,
        },
        {
          name: "New Size",
          value: `${currentFileSize.toFixed(2)} MB`,
          inline: true,
        },
        {
          name: "Compression",
          value: `${ratio > 0 ? ratio.toFixed(1) : "+" + Math.abs(ratio).toFixed(1)}% (${savings > 0 ? savings.toFixed(2) + " MB saved" : Math.abs(savings).toFixed(2) + " MB larger"})`,
          inline: true,
        },
      ];
    } else {
      fileSizeFields = [
        {
          name: "New Size",
          value:
            currentFileSize > 0
              ? `${currentFileSize.toFixed(2)} MB`
              : "Unknown",
          inline: true,
        },
      ];
    }
  } else if (currentFileSize > 0) {
    fileSizeFields = [
      {
        name: "File Size",
        value: `${currentFileSize.toFixed(2)} MB`,
        inline: true,
      },
    ];
  }

  const fields = [
    {
      name: "Current Status",
      value: `${statusEmoji} ${config.title}`,
      inline: true,
    },
    {
      name: "Started",
      value: jobStartTime,
      inline: true,
    },
    {
      name: "Processing Time",
      value: processingDuration,
      inline: true,
    },
    {
      name: "File Duration",
      value: durationText,
      inline: true,
    },
    ...fileSizeFields,
    {
      name: "Details",
      value: description || "Processing file...",
      inline: false,
    },
  ];

  const sanitizedFields = fields.map((field) => ({
    name: String(field.name).slice(0, CONSTANTS.LIMITS.FIELD_NAME_LENGTH),
    value: String(field.value).slice(0, CONSTANTS.LIMITS.FIELD_VALUE_LENGTH),
    inline: Boolean(field.inline),
  }));

  const fullDescription = `${libraryPrefix}### ${mainTitle}`;
  const sanitizedDescription =
    fullDescription.length > CONSTANTS.LIMITS.DESCRIPTION_LENGTH
      ? fullDescription.slice(0, CONSTANTS.LIMITS.DESCRIPTION_LENGTH) + "..."
      : fullDescription;

  return {
    color: config.color,
    title: String(embedTitle).slice(0, CONSTANTS.LIMITS.FIELD_NAME_LENGTH),
    description: sanitizedDescription,
    fields: sanitizedFields,
    thumbnail: { url: posterUrl || CONSTANTS.DEFAULTS.POSTER_URL },
    footer: {
      text: String(footerText).slice(0, CONSTANTS.LIMITS.FOOTER_LENGTH),
    },
    timestamp: new Date().toISOString(),
  };
};

const getJobStartTime = (args) => {
  if (args.job?.start) {
    return new Date(args.job.start).toLocaleTimeString("en-GB", {
      hour12: false,
    });
  }
  return new Date().toLocaleTimeString("en-GB", { hour12: false });
};

const getProcessingDuration = (args, notificationType) => {
  if (notificationType === "start_processing") {
    return "Starting...";
  }

  if (!args.job?.start) {
    return "Unknown";
  }

  const startTime = new Date(args.job.start);

  const duration = Date.now() - startTime.getTime();
  const seconds = Math.floor(Math.abs(duration) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

const getStatusEmoji = (notificationType) => {
  const emojiMap = {
    start_processing: "🚀",
    transcode_success: "✅",
    transcode_error: "❌",
  };
  return emojiMap[notificationType] || "📄";
};

const buildNotificationContent = (mediaInfo, fileInfo) => {
  let mainTitle = mediaInfo.title;
  if (mediaInfo.year) mainTitle += ` (${mediaInfo.year})`;

  let description = "";
  if (mediaInfo.type === "tv" && mediaInfo.season && mediaInfo.episode) {
    description = `**Season ${mediaInfo.season} • Episode ${mediaInfo.episode}**`;
  }

  const notificationDetails = buildNotificationDetails(fileInfo);
  if (notificationDetails.length > 0) {
    const cleanDetails = notificationDetails.map((detail) =>
      detail.replace(/\*\*(.*?)\*\*/g, "$1"),
    );
    const spacing = mediaInfo.type === "movie" ? "" : "\n";
    description += `${spacing}\`\`\`\n${cleanDetails.join("\n")}\n\`\`\``;
  }

  return { mainTitle, description };
};

const handleUpdateMode = async (embed, webhookUrlWithWait, jobId, args) => {
  const existingMessageId = getStoredMessageId(args, jobId);
  const embeds = [embed];

  if (existingMessageId) {
    const editSuccess = await editDiscordWebhookMessage(
      webhookUrlWithWait,
      existingMessageId,
      { embeds },
      args,
    );

    if (editSuccess) {
      return { success: true, messageId: existingMessageId };
    }
  }

  const result = await sendDiscordWebhook(webhookUrlWithWait, { embeds }, args);
  if (result.success && result.messageId) {
    storeMessageId(args, jobId, result.messageId);
  }
  return result;
};

const handleSequentialMode = async (embed, webhookUrlWithWait, args) => {
  const embeds = [embed];
  return await sendDiscordWebhook(webhookUrlWithWait, { embeds }, args);
};

const createPluginResponse = (success, args) => ({
  outputFileObj: args.inputFileObj,
  outputNumber: success ? 1 : 2,
  variables: args.variables,
});

const plugin = async (args) => {
  const lib = require("../../../../../methods/lib")();
  args.inputs = lib.loadDefaultValues(args.inputs, details);

  if (!validateInputs(args.inputs, args)) {
    return createPluginResponse(false, args);
  }

  const {
    webhook_url: webhookUrl,
    notification_type: notificationType = "start_processing",
    omdb_api_key: omdbApiKey,
    notification_mode: notificationMode = "updates",
  } = args.inputs;

  const config =
    NOTIFICATION_CONFIGS[notificationType] ||
    NOTIFICATION_CONFIGS.start_processing;
  const webhookUrlWithWait = webhookUrl.includes("?")
    ? `${webhookUrl}&wait=true`
    : `${webhookUrl}?wait=true`;

  try {
    const fileInfo = args.inputFileObj;
    const mediaInfo = parseMediaInfo(fileInfo.file || "");
    const libraryName = getLibraryName(args);
    const { mainTitle, description } = buildNotificationContent(
      mediaInfo,
      fileInfo,
    );

    const posterUrl = omdbApiKey
      ? await fetchPosterImage(
          mediaInfo.title,
          mediaInfo.year,
          mediaInfo.type,
          omdbApiKey,
          fileInfo.file,
          args,
        )
      : null;

    const embed = createDiscordEmbed(
      config,
      mainTitle,
      description,
      posterUrl,
      libraryName,
      args.job?.jobId,
      notificationType,
      args,
    );

    const jobId = args.job?.jobId;
    const result =
      jobId && notificationMode === "updates"
        ? await handleUpdateMode(embed, webhookUrlWithWait, jobId, args)
        : await handleSequentialMode(embed, webhookUrlWithWait, args);

    return createPluginResponse(result.success, args);
  } catch (error) {
    args.jobLog(
      `❌ Discord notification failed to ${redactSensitiveData(webhookUrl, "webhook")}: ${error.message}`,
    );
    return createPluginResponse(false, args);
  }
};

module.exports.details = details;
module.exports.plugin = plugin;
