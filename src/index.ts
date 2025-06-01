import { Client, GatewayIntentBits } from "discord.js"
import puppeteer from "puppeteer"
import * as cheerio from "cheerio"
import * as dotenv from "dotenv"

dotenv.config()

const WEBSITE_URL = process.env.WEBSITE_URL || "https://www.example.com" // Replace with the actual URL
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || ""
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || ""
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || "60000", 10) // Default to 60 seconds

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
})

client.once("ready", () => {
  console.log("Discord bot is ready!")
  startMonitoring()
})

async function startMonitoring() {
  console.log(
    `Starting to monitor ${WEBSITE_URL} every ${
      CHECK_INTERVAL_MS / 1000
    } seconds.`
  )
  checkWebsite() // Initial check before starting the interval
  setInterval(checkWebsite, CHECK_INTERVAL_MS)
}

async function checkWebsite() {
  console.log(`Checking website: ${WEBSITE_URL}`)
  let browser
  try {
    browser = await puppeteer.launch({
      headless: false, // Keep false for virtual display
      executablePath: process.env.CHROME_BIN,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process", // This might be useful for smaller containers
        "--disable-gpu",
      ],
    })
    const page = await browser.newPage()
    await page.goto(WEBSITE_URL, { waitUntil: "networkidle2" })
    await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait for 10 seconds

    const htmlContent = await page.content()
    const $ = cheerio.load(htmlContent)

    // Find the button with the data-test-id property
    const button = $("[data-test-id]")

    if (button.length > 0) {
      const dataTestIdValue = button.attr("data-test-id")
      console.log(`Found button with data-test-id: ${dataTestIdValue}`)

      if (dataTestIdValue !== "coming-soon") {
        const message = `ALERT: The button's data-test-id is "${dataTestIdValue}" (not "coming-soon") on ${WEBSITE_URL}`
        await sendDiscordAlert(message)
      } else {
        console.log('Button data-test-id is "coming-soon". No alert sent.')
      }
    } else {
      console.log("No button with data-test-id found on the page.")
      await sendDiscordAlert(
        `WARNING: No button with data-test-id found on ${WEBSITE_URL}`
      )
    }
  } catch (error) {
    console.error("Error checking website:", error)
    await sendDiscordAlert(
      `ERROR: Failed to check ${WEBSITE_URL}. Error: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

async function sendDiscordAlert(message: string) {
  try {
    const channel = await client.channels.fetch(DISCORD_CHANNEL_ID)
    if (channel && channel.isTextBased()) {
      // Type assertion to ensure TypeScript knows it's a text-based channel
      const textChannel = channel as any // Using 'any' for simplicity, more specific type narrowing can be done if needed
      await textChannel.send(message)
      console.log("Discord alert sent successfully.")
    } else {
      console.error(
        "Could not find the specified Discord channel or it is not a text channel."
      )
    }
  } catch (error) {
    console.error("Error sending Discord alert:", error)
  }
}

client.login(DISCORD_BOT_TOKEN)
