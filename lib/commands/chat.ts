import Clapp = require('../modules/clapp-discord');
import {Configuration, OpenAIApi} from "openai";
import Config from '../../config'

module.exports = new Clapp.Command({
  name: "chat",
  desc: "chat with the bot's ai chat interface",
  fn: async (argv:any, context:any) => {
    // const channel = context.channel.name;
    // const author = context.author.username;

    async function aiReply(): Promise<string> {
      const userPrompt = `Human: ${argv.args.message}`;
      const engineId = Config.openAiEngine;

      const configuration = new Configuration({
        apiKey: Config.openAiApiKey,
      });
      const openai = new OpenAIApi(configuration);

      const prompt = "The following is a conversation Human and Got Bot.\n\nHuman: Hello, who are you?\nGot Bot: I am an android built by Glorat of Borg. I live in the Star Trek universe. I have been programmed to assist GoT with questions about Star Trek.\n"
        + userPrompt + "\nGot Bot: ";
      //
      // const  prompt = "I am a highly intelligent question answering bot. If you ask me a question that is rooted in truth, I will give you the answer. If you ask me a question that is nonsense, trickery, or has no clear answer, I will respond with \"Unknown\".\n\nQ: What is human life expectancy in the United States?\nA: Human life expectancy in the United States is 78 years.\n\nQ: Who was president of the United States in 1955?\nA: Dwight D. Eisenhower was president of the United States in 1955.\n\nQ: Which party did he belong to?\nA: He belonged to the Republican Party.\n\nQ: What is the square root of banana?\nA: Unknown\n\nQ: How does a telescope work?\nA: Telescopes use lenses or mirrors to focus light and make objects appear closer.\n\nQ: Where were the 1992 Olympics held?\nA: The 1992 Olympics were held in Barcelona, Spain.\n\nQ: How many squigs are in a bonk?\nA: Unknown\n\nQ: what is 1+1";

      console.log(prompt);

      const response = await openai.createCompletion(engineId, {
        prompt,
        temperature: 0.9,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ["Human:", "AI:", "Got Bot:"],
      });

      let res:string = response.data!.choices![0].text ?? '';
      res = ((/^\s*$/g).test(res) ? argv.args.fallback : res);
      return res;
    }

    //235536091011088394
    // This output will be redirected to your app's onReply function
    // let guild = msg.channel.guild;
    //var ret = `Hi ${author} (${msg.author.id}). Thanks for sending in channel ${channel} of guild ${guild.name} (${guild.id}) owned by ${guild.owner.user.username} (${guild.ownerID})\n`;

    // const input = `${author}: ${argv.args.message}`;

    if (context.isEntitled(context.author.id) && argv.args.message) {
      return await aiReply();
    } else {
      return argv.args.fallback
    }

  },
  args: [
    {
      name: 'message',
      desc: 'What you want to say to the bot',
      type: 'string',
      required: true,
      default: 'message isn\'t defined'
    },
    {
      name: 'fallback',
      desc: 'What the bot should say if it has nothing to say',
      type: 'string',
      required: false,
      default: '??????'
    },
  ]
});
