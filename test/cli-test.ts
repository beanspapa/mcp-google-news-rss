import { NewsRssService } from "../src/services/newsRssService.js";
import { Input } from "../src/types/index.js"; // Import Input from types

async function runCliTest(input: Input) {
  const newsRssService = new NewsRssService();

  const { hl, gl, count, keyword } = input;
  console.log(`Fetching news for language: ${hl}, country: ${gl}, count: ${count || 'default'}, keyword: ${keyword || 'none'}`);
  try {
    console.log(`Fetching news for language: ${hl}, country: ${gl}, count: ${count || 'default'}, keyword: ${keyword || 'none'}`);
    const result = await newsRssService.getNewsRss(input); // Pass a single config in an array
    if (result) {
      console.log("News RSS Feed Result:", result);
    } else {
      console.log("No results received.");
    }
  } catch (error) {
    console.error(`Error fetching news RSS for hl=${hl}, gl=${gl},  keyword=${keyword}:`, error);
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
const inputConfig: Input = { // Specify the type of the object within the array
  hl: languageArg,
  gl: countryArg,
  count: parseInt(countArgStr, 10),
  keyword: keywordArg
};

// Add keyword if provided
if (keywordArg !== undefined) {
  inputConfig.keyword = keywordArg;
}

// Call the test function with an array containing the input config
runCliTest(inputConfig);
