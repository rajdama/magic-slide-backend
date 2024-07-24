const { OpenAI } = require("openai");

class OpenAIClient {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  async categorizeEmails(emails) {
    try {
      const prompt = require("./prompt.json").instructions.join(" ");

      const promises = emails.map(async (email, index) => {
        //We will only categorize those mails for whom category is not present
        if (!email.category) {
          // Create concurrent request for each email to get fast results
          const response = await this.openai.chat.completions.create({
            model: "gpt-4",
            messages: [
              {
                role: "user",
                content: `${prompt} email object is ${JSON.stringify(email)}`,
              },
            ],
            max_tokens: 10,
          });
          return response.choices[0].message.content;
        } else {
          return false;
        }
      });

      // Wait for all promises to complete
      const responses = await Promise.all(promises);
      return responses;
    } catch (error) {
      console.error("Error fetching response from OpenAI:", error);
    }
  }
}

module.exports = OpenAIClient;
