# Google News RSS Server

This project implements a Google News RSS server with three main tools for fetching and extracting news articles. It is designed to be used with the MCP (Model Context Protocol) framework.

## Available Tools

### 1. getGoogleNewsItems (Fast)

Retrieves basic news information from Google News RSS feed - titles, links, and publication dates.

**Parameters:**

- `hl`: (string, required) ISO 639-1 language code (e.g., "en", "ko")
- `gl`: (string, required) ISO 3166-1 alpha-2 country code (e.g., "US", "KR")
- `keyword`: (string, optional) Search keyword
- `count`: (number, optional) Maximum number of results (default: 10)

**Example Request:**

```json
{
  "hl": "en",
  "gl": "US",
  "keyword": "artificial intelligence",
  "count": 5
}
```

**Example Response:**

```json
[
  {
    "title": "Google unveils new AI model",
    "link": "https://news.google.com/articles/...",
    "pubDate": "2025-01-08T10:30:00Z"
  },
  {
    "title": "AI trends in 2025",
    "link": "https://news.google.com/articles/...",
    "pubDate": "2025-01-08T09:15:00Z"
  }
]
```

### 2. extractNewsContents (Slow, Targeted)

Extracts full article content from a provided list of news article links. This is useful when you already have a list of URLs (e.g., from `getGoogleNewsItems`) and want to get their full content.

**Parameters:**

- `articles`: (array, required) An array of article objects to extract. Each object should contain:
  - `link`: (string, required) The URL of the article.
  - `title`: (string, optional) The title of the article.
  - `pubDate`: (string, optional) The publication date.

**Example Request:**

```json
{
  "articles": [
    { "link": "https://news.google.com/articles/..." },
    { "link": "https://some-other-news.com/article/..." }
  ]
}
```

**Example Response:**

```json
[
  {
    "title": "Google unveils new AI model",
    "link": "https://news.google.com/articles/...",
    "content": "The full content of the article...",
    "author": "Jane Doe",
    "publishDate": "2025-01-08T10:30:00Z",
    "description": "A summary of the article."
  }
]
```

### 3. searchAndExtractNews (Comprehensive)

Searches Google News and extracts full article content including text, author, and metadata using web scraping. This combines the functionality of the other two tools into a single call.

**Parameters:**

- `hl`: (string, required) ISO 639-1 language code (e.g., "en", "ko")
- `gl`: (string, required) ISO 3166-1 alpha-2 country code (e.g., "US", "KR")
- `keyword`: (string, optional) Search keyword
- `count`: (number, optional) Maximum number of articles to extract (default: 5)

**Example Request:**

```json
{
  "hl": "ko",
  "gl": "KR",
  "keyword": "인공지능",
  "count": 3
}
```

**Example Response:**

```json
[
  {
    "title": "AI 기술의 새로운 발전",
    "link": "https://news.google.com/articles/...",
    "content": "인공지능 기술이 새로운 단계로 발전하면서...",
    "author": "홍길동",
    "publishDate": "2025-01-08T10:30:00Z",
    "description": "AI 기술 발전에 대한 최신 소식"
  }
]
```

## Performance Comparison

| Tool                   | Speed   | Data                    | Use Case                                      |
| ---------------------- | ------- | ----------------------- | --------------------------------------------- |
| `getGoogleNewsItems`   | ⚡ Fast | Title, Link, Date       | Quick news overview                           |
| `extractNewsContents`  | 🐌 Slow | Full content from URLs  | Detailed analysis of a known list of articles |
| `searchAndExtractNews` | 🐌 Slow | Full content + metadata | One-shot search and detailed analysis         |

## Installation & Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
git clone <repository-url>
cd mcp-google-news-rss
npm install
npm run build
```

### Usage with MCP Clients

This server implements the MCP (Model Context Protocol) and can be used with MCP-compatible clients like Claude Desktop.

Add to your MCP client configuration:

```json
{
  "servers": {
    "google-news-rss": {
      "command": "node",
      "args": ["dist/server.js"]
    }
  }
}
```

## Development

### Logging with mcps-logger

This project uses `mcps-logger` to safely handle console output during development without interfering with the MCP JSON-RPC protocol.

**Important**: MCP servers communicate via JSON-RPC over stdio. Any `console.log` output to stdout will corrupt the protocol and cause parsing errors in MCP clients.

#### Setup for Development

1. **Install dependencies** (already included):

   ```bash
   npm install
   ```

2. **Start the logger terminal** (in a separate terminal window):

   ```bash
   npx mcps-logger
   ```

3. **Run your MCP server** (in your main terminal):
   ```bash
   npm run build && npm run dev
   ```

#### How it Works

- The `mcps-logger/console` import redirects all console output to a separate terminal
- This keeps the MCP protocol communication clean on stdout
- You can safely use `console.log`, `console.warn`, `console.error` in your code
- All log output will appear in the mcps-logger terminal instead of the main process

#### Without mcps-logger

If you don't use mcps-logger, you should:

- Avoid using `console.log` in production code
- Use `console.error` only for critical errors (stderr)
- Or remove all console statements entirely

This logging setup ensures your MCP server works correctly with MCP clients like Claude Desktop and MCP Inspector.
