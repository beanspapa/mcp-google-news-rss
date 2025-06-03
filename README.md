# Google News RSS Server

This project implements a simple server that fetches news articles from the Google News RSS feed based on provided parameters. It is designed to be used with the MCP context request mechanism.

## MCP Context Request

MCP clients can request context from this server using the `context/request` method. The request should contain an array of context request objects. Each object specifies the parameters for fetching news from Google News.

### Request Parameters

Each context request object in the array should include the following parameters:

- `hl`: (string) The language code for the news feed (e.g., "en-GB"). This corresponds to the `hl` parameter in the Google News RSS URL.
- `gl`: (string) The country code for the news feed (e.g., "GB"). This corresponds to the `gl` parameter in the Google News RSS URL.
- `count`: (number) The maximum number of news articles to fetch.
- `keyword`: (string, optional) A keyword to search for within the news feed. If provided, the server will construct a search URL for Google News RSS.

### How it Works

The server receives the context request, which is an array of request objects. For each request object:

1.  It extracts the `hl`, `gl`, `count`, and optional `keyword` parameters.
2.  It constructs the appropriate Google News RSS URL.
    - If a `keyword` is provided, the URL format is `https://news.google.com/rss?search?q=<keyword>&hl=<hl>&gl=<gl>&ceid=<gl>:<hl>`.
    - If no `keyword` is provided, the URL is typically `https://news.google.com/rss?hl=<hl>&gl=<gl>&ceid=<gl>:<hl>` (or a similar default structure depending on Google's RSS implementation for non-search feeds).
3.  It fetches the RSS feed from the constructed URL.
4.  It parses the RSS feed to extract the specified `count` of news articles, each with a `title` and `link`.
5.  It formats the results into an object including the request parameters and the fetched `articles`.

The server returns an array of these result objects, corresponding to the array of request objects in the input.

### Example Request

Here is an example of an MCP context request targeting this server with a keyword:

```json
[
  {
    "hl": "en-GB",
    "gl": "GB",
    "count": 5,
    "keyword": "test"
  }
]
```

This request asks for up to 5 news articles from the United Kingdom in English, searching for the keyword "test". The corresponding Google News RSS URL constructed by the server would be similar to `https://news.google.com/rss?search?q=test&hl=en-GB&gl=GB&ceid=GB:en`.

### Example Response

The server will return a response that is an array of result objects. For the example request above, a possible response could be:

```json
[
  {
    "hl": "en-GB",
    "gl": "GB",
    "count": 5,
    "keyword": "test",
    "articles": [
      {
        "title": "News Title 1 Related to Test",
        "link": "https://news.google.com/articles/..."
      },
      {
        "title": "Another News Article About Testing",
        "link": "https://news.google.com/articles/..."
      },
      {
        "title": "Third Test-Related News",
        "link": "https://news.google.com/articles/..."
      }
    ]
  }
]
```

Each object in the `articles` array contains the `title` and `link` of a news article. Note that the number of returned articles may be less than the requested `count` if fewer articles are available in the feed.
