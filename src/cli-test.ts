import { NewsRssService } from "./services/newsRssService";
import { Input } from "./types"; // Import Input from types

async function runCliTest(inputConfigs: Input[]) {
  const newsRssService = new NewsRssService();

  for (const config of inputConfigs) {
    const { hl, gl, count, keyword } = config;
    try {
      console.log(`Fetching news for language: ${hl}, country: ${gl}, count: ${count || 'default'}, keyword: ${keyword || 'none'}`);
      const results = await newsRssService.getNewsRss([config]); // Pass a single config in an array
      if (results && results.length > 0) {
        console.log("News RSS Feed Result:", results[0]);
      } else {
        console.log("No results received.");
      }
    } catch (error) {
      console.error(`Error fetching news RSS for gl=${gl}, hl=${hl}, keyword=${keyword}:`, error);
    }
  }
}

// Read arguments from command line
const args = process.argv.slice(2);

// Check for required arguments (language, country, count)
if (args.length < 3) {
  console.error("Usage: node src/cli-test.js <language> <country> <count> [keyword]");
  process.exit(1);
}

const languageArg = args[0]; // hl
const countryArg = args[1]; // gl
const countArgStr = args[2]; // count as string
const keywordArg = args[3]; // keyword (optional)

const countArg = parseInt(countArgStr, 10);

if (isNaN(countArg) || countArg <= 0) {
    console.error("Error: Count must be a positive number.");
    console.error("Usage: node src/cli-test.js <language> <country> <count> [keyword]");
    process.exit(1);
}


// Create the input configuration object
const inputConfig: Input[0] = { // Specify the type of the object within the array
  hl: languageArg,
  gl: countryArg,
  count: countArg,
};

// Add keyword if provided
if (keywordArg !== undefined) {
  inputConfig.keyword = keywordArg;
}

// Call the test function with an array containing the input config
runCliTest([inputConfig]);
