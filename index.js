const express = require("express");
const cors = require("cors");
const EmailService = require("./email-service/index");
const OpenAIClient = require("./openAI-service/index");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/email", async (req, res) => {
  console.log("email start");
  const emailService = new EmailService(
    req.body.accessToken,
    req.body.refreshToken
  );
  const emails = await emailService.fetchEmails();
  res.send(emails);
});

app.post("/classify", async (req, res) => {
  const openAIClient = new OpenAIClient(req.body.apikey);
  let emails = req.body.emails;
  const categorizes = await openAIClient.categorizeEmails(emails);

  //Updating email categories
  categorizes.map((category, index) => {
    if (category) {
      emails[index].category = category;
    }
  });
  res.send(emails);
});

app.listen(4000, () => {
  console.log("server running on port 4000");
});
