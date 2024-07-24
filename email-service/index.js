const cheerio = require("cheerio");
const { google } = require("googleapis");
const { base64decode } = require("nodejs-base64");
const emojiStrip = require("emoji-strip");

class EmailService {
  constructor(accessToken, refreshToken) {
    this.client = new google.auth.OAuth2(
      "1076096933698-skmbks3tnj34d30reganfpr62a5sju1b.apps.googleusercontent.com",
      "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"
    );
    this.client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    this.gmail = google.gmail({ version: "v1", auth: this.client });
  }

  // Fetches emails from the Gmail API, processes and cleans them.
  async fetchEmails() {
    // Fetch a list of email messages from the Gmail API
    const response = await this.gmail.users.messages.list({
      userId: "me",
      maxResults: 15,
    });

    // Process each email message
    let emails = await Promise.all(
      response.data.messages.map(async (msg) => {
        // Retrieve the full message details
        const message = await this.gmail.users.messages.get({
          userId: "me",
          id: msg.id,
        });

        // Extract headers and relevant information
        const headers = message.data.payload.headers;
        const fromHeader = headers.find((header) => header.name === "From");
        const senderEmail = fromHeader ? fromHeader.value : "Unknown";
        const subjectHeader = headers.find(
          (header) => header.name === "Subject"
        );
        const subject = subjectHeader ? subjectHeader.value : "No Subject";

        let emailText = "";

        // Extract and process email parts
        const parts = message.data.payload.parts;
        if (parts) {
          for (let part of parts) {
            if (part.body && part.body.data) {
              const htmlContent = base64decode(part.body.data);
              const parsedContent = this.parseEmailContent(htmlContent);
              emailText += parsedContent + " ";
            }
          }
        }

        return {
          id: message.data.id,
          senderEmail: senderEmail,
          subject: subject,
          snippet: message.data.snippet,
          textContent: emailText,
        };
      })
    );

    // Create a deep copy of emails
    let updatedEmails = JSON.parse(JSON.stringify(emails));

    // Process each email to clean and truncate text content
    const promises = emails.map(async (email) => {
      try {
        email.snippet = this.truncateText(this.cleanText(email.snippet));
        email.textContent = this.truncateText(
          this.cleanText(email.textContent || email.snippet)
        );
      } catch (error) {
        console.error(`Error processing email with ID ${email.id}:`, error);
        email.snippet = this.cleanText(email.snippet);
        email.textContent = this.cleanText(email.textContent);
      }

      delete email.id;
      delete email.subject;
      return email;
    });

    const responses = await Promise.all(promises);

    return { trimmedEmails: responses, emails: updatedEmails };
  }

  // Cleans the provided text by removing emojis, URLs, HTML entities, and special characters.
  cleanText(text) {
    if (text === undefined || text === null) {
      return "";
    }

    if (typeof text !== "string") {
      text = String(text);
    }

    try {
      text = emojiStrip(text);
      text = text.replace(/https?:\/\/\S+|www\.\S+/g, "");
      text = text.replace(/&\w+;/g, "");
      text = text.replace(/[^\w\s]/gi, "");
      text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");
      text = text.replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error("Error cleaning text:", error);
      text = "";
    }

    return text;
  }

  //Parses HTML content to extract plain text.

  parseEmailContent(htmlContent) {
    const $ = cheerio.load(htmlContent);
    let parsedContent = "";

    $("body")
      .children()
      .each((index, element) => {
        const text = $(element).text().trim().replace(/\n/g, " ");
        parsedContent += text;
      });

    return parsedContent.trim();
  }

  //Truncates the provided text to a maximum length of 700 characters.

  truncateText(text) {
    if (text.length > 700) {
      return text.slice(0, 700) + "...";
    }
    return text;
  }
}

module.exports = EmailService;
